/**
 * GET /api/orulo/sync
 *
 * Sincronização incremental do catálogo Orulo → Vercel KV.
 *
 * Fluxo (conforme documentação oficial de integração):
 *  1. GET /api/v2/buildings/ids/active  → obtém todos os IDs (500/página)
 *  2. GET /api/v2/buildings/{id}         → detalhe de cada empreendimento
 *  3. Armazena em KV (chave orulo:catalog)
 *  4. PUT /api/v2/buildings/{id}/publication_links → obrigatório pela Orulo
 *
 * Parâmetros de query:
 *  secret=xxx   — proteção contra chamadas não autorizadas
 *  reset=true   — reinicia o sync do zero
 *  chunk_size=N — sobrescreve CHUNK_SIZE (padrão 200)
 *
 * Chamadas múltiplas: chame repetidamente até is_complete=true.
 * Cada chamada avança CHUNK_SIZE empreendimentos.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getToken, invalidateToken,
  fetchAllActiveIds, fetchBuildingsBatch, reportPublicationLink,
  SITE_BASE,
} from '@/lib/orulo-api';
import {
  kvGetCatalog, kvSetCatalog,
  kvGetIds,     kvSetIds,
  kvGetProgress, kvSetProgress,
  kvGetMeta,    kvSetMeta,
  kvResetSync,
} from '@/lib/orulo-kv';

// Vercel Pro suporta maxDuration maior; no Hobby é limitado a 10s (ignorado)
export const maxDuration = 60;

const CHUNK_SIZE = 200; // empreendimentos por chamada
const PARALLEL   = 15;  // fetches paralelos simultâneos

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const providedSecret   = searchParams.get('secret') ?? '';
  const reset            = searchParams.get('reset') === 'true';
  const chunkSize        = Number(searchParams.get('chunk_size') ?? CHUNK_SIZE);

  // ── Autenticação do endpoint ──────────────────────────────────────────────
  const syncSecret = process.env.ORULO_SYNC_SECRET ?? '';
  if (syncSecret && providedSecret !== syncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startTime = Date.now();
    const token     = await getToken();

    // ── Reset ─────────────────────────────────────────────────────────────────
    if (reset) {
      await kvResetSync();
    }

    // ── Passo 1: Obter lista de todos os IDs ativos ───────────────────────────
    let ids = reset ? null : await kvGetIds();

    if (!ids || ids.length === 0) {
      // Busca todos os IDs via /api/v2/buildings/ids/active (500/página)
      ids = await fetchAllActiveIds(token);
      if (ids.length === 0) {
        return NextResponse.json({
          error: 'Nenhum empreendimento retornado pela Orulo.',
          hint:  'Verifique as credenciais e se a integração está ativa.',
        }, { status: 502 });
      }
      await kvSetIds(ids);
      await kvSetProgress(0);
    }

    const totalIds = ids.length;

    // ── Passo 2: Verificar progresso atual ────────────────────────────────────
    const progress = reset ? 0 : await kvGetProgress();

    if (progress >= totalIds) {
      const catalog = await kvGetCatalog();
      const meta    = await kvGetMeta();
      return NextResponse.json({
        status:       'complete',
        total_ids:    totalIds,
        catalog_size: catalog?.length ?? 0,
        meta,
        message:      'Sync já completo. Use ?reset=true para reiniciar.',
      });
    }

    // ── Passo 3: Buscar próximo chunk de detalhes ─────────────────────────────
    const sliceIds   = ids.slice(progress, progress + chunkSize).map(e => e.id);
    const newBuildings = await fetchBuildingsBatch(token, sliceIds, PARALLEL);

    // ── Passo 4: Mesclar com catálogo existente (deduplicar por id) ───────────
    const existing   = (await kvGetCatalog()) ?? [];
    const byId       = new Map(existing.map(b => [b.id, b]));
    for (const b of newBuildings) byId.set(b.id, b);
    const catalog    = Array.from(byId.values());

    // ── Passo 5: Gravar progresso no KV ──────────────────────────────────────
    const newProgress = progress + sliceIds.length;
    const isComplete  = newProgress >= totalIds;

    await kvSetCatalog(catalog);
    await kvSetProgress(newProgress);

    const prevMeta = await kvGetMeta();
    await kvSetMeta({
      total_ids:     totalIds,
      synced_count:  catalog.length,
      is_complete:   isComplete,
      started_at:    prevMeta?.started_at ?? new Date().toISOString(),
      last_chunk_at: new Date().toISOString(),
    });

    // ── Passo 6: Publication links (obrigatório) ──────────────────────────────
    // Reporta links apenas dos buildings recém-buscados (não reprocessa tudo).
    // Conforme docs: "sempre que um imóvel for publicado ou despublicado".
    if (newBuildings.length > 0) {
      // Relatamos em paralelo, sem bloquear a resposta (fire & semi-forget)
      await Promise.allSettled(
        newBuildings.map(b =>
          reportPublicationLink(
            token,
            b.id,
            `${SITE_BASE}/imoveis/${b.id}`,
            true,
          )
        )
      );
    }

    const elapsed = Date.now() - startTime;

    return NextResponse.json({
      status:            isComplete ? 'complete' : 'in_progress',
      total_ids:         totalIds,
      progress:          newProgress,
      fetched_this_call: newBuildings.length,
      catalog_size:      catalog.length,
      is_complete:       isComplete,
      elapsed_ms:        elapsed,
      next_call:         isComplete
        ? null
        : `/api/orulo/sync${syncSecret ? `?secret=${syncSecret}` : ''}`,
    });

  } catch (err) {
    const message = String(err);
    if (message.includes('401') || message.includes('403')) {
      invalidateToken();
    }
    console.error('[sync] erro:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
