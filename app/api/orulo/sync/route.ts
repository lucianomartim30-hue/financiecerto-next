/**
 * GET /api/orulo/sync
 *
 * Sincronização INCREMENTAL do catálogo Orulo → Vercel KV.
 *
 * Estratégia:
 *  1. Busca todos os IDs ativos + updated_at via /api/v2/buildings/ids/active
 *  2. Compara com o catálogo em cache:
 *     - IDs novos ou com updated_at mais recente → busca detalhes
 *     - IDs removidos da lista ativa → remove do catálogo
 *     - Demais → mantém como estão (zero chamadas extras)
 *  3. Merge e salva — catálogo antigo permanece válido até o final (swap atômico)
 *  4. Se ainda há imóveis para buscar (parcial), agenda a próxima execução
 *     automaticamente via self-request (sem precisar de cron manual).
 *
 * Com maxDuration=300 (Vercel Pro) e 50 paralelos por lote, uma única execução
 * consegue buscar todos os 2000+ imóveis em ~80-160s.
 *
 * Parâmetros:
 *  secret=xxx  — proteção
 *  full=true   — ignora cache e re-busca todos os detalhes
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

// Vercel Pro suporta até 300s. Com 2000 imóveis × 20 paralelos: ~100-150s por run.
export const maxDuration = 300;

// IMPORTANTE: Orulo tem rate limit. Com > 20 paralelos a API rejeita a maioria
// das requisições silenciosamente (retorna rápido com erro → null). 20 é o
// limite seguro testado — todos os 2000+ imóveis são buscados em ~100-150s.
const BATCH_SIZE  = 20;  // imóveis por lote (paralelo)
const TIMEOUT_MS  = 260_000; // 260s — deixa 40s de buffer para salvar no KV

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const providedSecret   = searchParams.get('secret') ?? '';
  const forceFull        = searchParams.get('full') === 'true';
  const isChained        = searchParams.get('chained') === '1'; // chamada encadeada

  const syncSecret = process.env.ORULO_SYNC_SECRET ?? '';
  if (syncSecret && providedSecret !== syncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startTime = Date.now();
    const token     = await getToken();

    // ── Passo 1: buscar todos os IDs ativos ───────────────────────────────────
    const activeIdEntries = await fetchAllActiveIds(token);
    const totalActive     = activeIdEntries.length;

    if (totalActive === 0) {
      return NextResponse.json(
        { error: 'Orulo retornou 0 IDs ativos — problema de autenticação ou API.' },
        { status: 502 },
      );
    }

    const activeIdSet = new Set(activeIdEntries.map(e => String(e.id)));
    const activeIdMap = new Map(activeIdEntries.map(e => [String(e.id), e.updated_at]));

    // ── Passo 2: catálogo atual no KV ─────────────────────────────────────────
    const existing    = forceFull ? [] : ((await kvGetCatalog()) ?? []);
    const existingMap = new Map(existing.map(b => [b.id, b]));

    // ── Passo 3: identificar o que precisa ser (re)buscado ────────────────────
    const toFetch: string[] = [];
    for (const [id, updatedAt] of activeIdMap) {
      const cached        = existingMap.get(id);
      const needsFinality = cached && (cached.finality === undefined || cached.finality === null);
      if (!cached || !cached.updated_at || updatedAt > cached.updated_at || needsFinality) {
        toFetch.push(id);
      }
    }

    // ── Passo 4: remover os que saíram da lista ativa ─────────────────────────
    const retained = existing.filter(b => activeIdSet.has(b.id));

    // ── Passo 5: buscar detalhes em paralelo ──────────────────────────────────
    const fetched: Awaited<ReturnType<typeof fetchBuildingsBatch>> = [];
    let   fetchedCount = 0;
    let   timedOut     = false;

    for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
      if (Date.now() - startTime > TIMEOUT_MS) {
        timedOut = true;
        console.warn(`[sync] guarda de tempo atingida após ${fetchedCount} detalhes`);
        break;
      }
      const results = await fetchBuildingsBatch(token, toFetch.slice(i, i + BATCH_SIZE), BATCH_SIZE);
      fetched.push(...results);
      fetchedCount += results.length;
    }

    // ── Passo 6: merge ────────────────────────────────────────────────────────
    const fetchedMap = new Map(fetched.map(b => [b.id, b]));
    const merged     = retained.map(b => fetchedMap.get(b.id) ?? b);
    for (const b of fetched) {
      if (!existingMap.has(b.id)) merged.push(b);
    }

    // ── Passo 7: salvar ───────────────────────────────────────────────────────
    await kvSetCatalog(merged);
    await kvSetMeta({
      total_ids:     totalActive,
      synced_count:  merged.length,
      is_complete:   !timedOut,
      started_at:    new Date().toISOString(),
      last_chunk_at: new Date().toISOString(),
    });

    const elapsed = Date.now() - startTime;

    // ── Passo 8: se parcial, encadeia próxima execução automaticamente ────────
    // (sem precisar de cron ou intervenção manual)
    if (timedOut && !isChained) {
      const nextUrl = new URL(req.url);
      nextUrl.searchParams.set('chained', '1');
      nextUrl.searchParams.delete('full'); // próximas runs são incrementais
      // Fire-and-forget — não aguarda resposta
      fetch(nextUrl.toString(), { signal: AbortSignal.timeout(2000) }).catch(() => {});
      console.log(`[sync] encadeando próxima execução: ${merged.length}/${totalActive} imóveis`);
    }

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
      chained:         isChained,
      note: timedOut
        ? `Parcial: ${fetchedCount}/${toFetch.length}. Próxima execução encadeada automaticamente.`
        : `Catálogo completo: ${merged.length} imóveis.`,
    });

  } catch (err) {
    const message = String(err);
    if (message.includes('401') || message.includes('403')) invalidateToken();
    console.error('[sync]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
