/**
 * GET /api/orulo/sync
 *
 * Sincronização INCREMENTAL do catálogo Orulo → Vercel KV.
 *
 * Estratégia:
 *  1. Busca todos os IDs ativos + updated_at via /api/v2/buildings/ids/active
 *     (~4 chamadas para 2000 imóveis — muito mais rápido que o endpoint de busca)
 *  2. Compara com o catálogo em cache:
 *     - IDs novos ou com updated_at mais recente → re-busca os detalhes
 *     - IDs removidos da lista ativa → remove do catálogo
 *     - Demais → mantém como estão (zero chamadas extras)
 *  3. Merge e salva — catálogo antigo permanece válido até o final (swap atômico)
 *
 * Resultado: primeira execução faz o full-sync, as seguintes só buscam o que mudou.
 * Timeout-safe: se a busca de detalhes for interrompida aos 48s, o catálogo parcial
 * já é salvo. O cron seguinte completa o restante.
 *
 * Parâmetros:
 *  secret=xxx    — proteção
 *  full=true     — ignora cache e re-busca todos os detalhes (forçar full-sync)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getToken,
  invalidateToken,
  fetchAllActiveIds,
  fetchBuildingsBatch,
  SITE_BASE,
} from '@/lib/orulo-api';
import { kvGetCatalog, kvSetCatalog, kvSetMeta } from '@/lib/orulo-kv';

export const maxDuration = 60;

const BATCH_SIZE = 50; // detalhes buscados por lote paralelo (50 × paralelo = ~1000/run)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const providedSecret   = searchParams.get('secret') ?? '';
  const forceFull        = searchParams.get('full') === 'true';

  const syncSecret = process.env.ORULO_SYNC_SECRET ?? '';
  if (syncSecret && providedSecret !== syncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startTime = Date.now();
    const token     = await getToken();

    // ── Passo 1: buscar todos os IDs ativos (rápido — ~4 chamadas) ────────────
    const activeIdEntries = await fetchAllActiveIds(token);
    const totalActive     = activeIdEntries.length;

    if (totalActive === 0) {
      return NextResponse.json({ error: 'Orulo retornou 0 IDs ativos — possível problema de autenticação ou API.' }, { status: 502 });
    }

    const activeIdSet = new Set(activeIdEntries.map(e => String(e.id)));
    const activeIdMap = new Map(activeIdEntries.map(e => [String(e.id), e.updated_at]));

    // ── Passo 2: catálogo atual no KV ─────────────────────────────────────────
    const existing    = (!forceFull && await kvGetCatalog()) ?? [];
    const existingMap = new Map(existing.map(b => [b.id, b]));

    // ── Passo 3: identificar o que precisa ser (re)buscado ────────────────────
    const toFetch: string[] = [];
    for (const [id, updatedAt] of activeIdMap) {
      const cached = existingMap.get(id);
      const needsFinality = cached && (cached.finality === undefined || cached.finality === null);
      if (!cached || !cached.updated_at || updatedAt > cached.updated_at || needsFinality) {
        toFetch.push(id);
      }
    }

    // ── Passo 4: remover os que saíram da lista ativa ─────────────────────────
    const retained = existing.filter(b => activeIdSet.has(b.id));

    // ── Passo 5: buscar detalhes dos novos/atualizados (com guarda de timeout) ─
    const fetched: Awaited<ReturnType<typeof fetchBuildingsBatch>> = [];
    let   fetchedCount = 0;
    let   timedOut     = false;

    for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
      if (Date.now() - startTime > 48_000) {
        timedOut = true;
        console.warn(`[sync] timeout atingido após ${fetchedCount} detalhes — salvando catálogo parcial`);
        break;
      }
      const results = await fetchBuildingsBatch(token, toFetch.slice(i, i + BATCH_SIZE), 50);
      fetched.push(...results);
      fetchedCount += results.length;
    }

    // ── Passo 6: merge — retained + recém-buscados ────────────────────────────
    const fetchedMap = new Map(fetched.map(b => [b.id, b]));

    // Atualizar os que já estavam no catálogo e foram re-buscados
    const merged = retained.map(b => fetchedMap.get(b.id) ?? b);

    // Adicionar os IDs que eram novos (não estavam no catálogo anterior)
    for (const b of fetched) {
      if (!existingMap.has(b.id)) merged.push(b);
    }

    // ── Passo 7: salvar (catálogo antigo permanece válido até aqui) ───────────
    await kvSetCatalog(merged);
    await kvSetMeta({
      total_ids:     totalActive,
      synced_count:  merged.length,
      is_complete:   !timedOut,
      started_at:    new Date().toISOString(),
      last_chunk_at: new Date().toISOString(),
    });

    const elapsed = Date.now() - startTime;

    return NextResponse.json({
      status:          timedOut ? 'partial' : 'complete',
      catalog_size:    merged.length,
      total_active:    totalActive,
      fetched_details: fetchedCount,
      retained:        retained.length,
      removed:         existing.length - retained.length,
      to_fetch_total:  toFetch.length,
      elapsed_ms:      elapsed,
      site_base:       SITE_BASE,
      note: timedOut
        ? `Parcial: ${fetchedCount}/${toFetch.length} detalhes buscados. Execute novamente para completar.`
        : undefined,
    });

  } catch (err) {
    const message = String(err);
    if (message.includes('401') || message.includes('403')) invalidateToken();
    console.error('[sync]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
