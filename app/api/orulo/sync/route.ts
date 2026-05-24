/**
 * GET /api/orulo/sync
 *
 * Sincronização do catálogo Orulo → Vercel KV.
 *
 * Estratégia: usa a API de busca paginada (todo o estado SP, sem filtro de cidade,
 * 10/página × ~250 páginas) em paralelo — retorna todos os imóveis do estado.
 * Resultado é armazenado no Vercel KV em chunks de 300 para leituras rápidas.
 *
 * Parâmetros:
 *  secret=xxx   — proteção
 *  reset=true   — reinicia o KV e refaz tudo
 *  city=xxx     — cidade opcional (sem valor = todo o estado SP)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken, invalidateToken, fetchSearchPage, SITE_BASE } from '@/lib/orulo-api';
import { kvSetCatalog, kvSetMeta, kvResetSync } from '@/lib/orulo-kv';

export const maxDuration = 60;

const MAX_PAGES = 250; // teto de segurança
const PARALLEL  = 100; // páginas em paralelo por lote

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const providedSecret   = searchParams.get('secret') ?? '';
  const reset            = searchParams.get('reset') === 'true';
  // city=null → busca todo o estado SP (sem filtro de município)
  const city             = searchParams.get('city') || null;

  const syncSecret = process.env.ORULO_SYNC_SECRET ?? '';
  if (syncSecret && providedSecret !== syncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startTime = Date.now();
    const token     = await getToken();

    if (reset) await kvResetSync();

    // ── Passo 1: descobrir quantas páginas existem ────────────────────────────
    const p1         = await fetchSearchPage(token, city, 1);
    const totalPages = Math.min(p1.rawPages > 0 ? p1.rawPages : MAX_PAGES, MAX_PAGES);

    // ── Passo 2: buscar todas as páginas restantes em paralelo ────────────────
    const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);

    const allResults = [p1];
    for (let i = 0; i < remaining.length; i += PARALLEL) {
      const batch   = remaining.slice(i, i + PARALLEL);
      const fetched = await Promise.all(batch.map(p => fetchSearchPage(token, city, p)));
      allResults.push(...fetched);
    }

    // ── Passo 3: agregar e deduplicar ─────────────────────────────────────────
    const seen    = new Set<string>();
    const catalog = allResults
      .flatMap(r => r.buildings)
      .filter(b => { if (seen.has(b.id)) return false; seen.add(b.id); return true; });

    // ── Passo 4: gravar no KV em chunks ──────────────────────────────────────
    await kvSetCatalog(catalog);
    await kvSetMeta({
      total_ids:     catalog.length,
      synced_count:  catalog.length,
      is_complete:   true,
      started_at:    new Date().toISOString(),
      last_chunk_at: new Date().toISOString(),
    });

    const elapsed = Date.now() - startTime;

    return NextResponse.json({
      status:        'complete',
      catalog_size:  catalog.length,
      pages_fetched: allResults.filter(r => r.rawCount > 0).length,
      total_pages:   totalPages,
      city:          city ?? 'todo SP',
      elapsed_ms:    elapsed,
      site_base:     SITE_BASE,
    });

  } catch (err) {
    const message = String(err);
    if (message.includes('401') || message.includes('403')) invalidateToken();
    console.error('[sync]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
