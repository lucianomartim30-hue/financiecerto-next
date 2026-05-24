/**
 * GET /api/orulo/sync
 *
 * Sincronização do catálogo Orulo → Vercel KV.
 *
 * Estratégia ATÔMICA (não apaga o catálogo antigo antes de ter o novo pronto):
 *  1. Busca todas as páginas enquanto o catálogo antigo permanece disponível
 *  2. Grava os chunks novos sobreescrevendo os antigos
 *  3. Só após gravar tudo atualiza a contagem (swap atômico)
 *
 * Isso evita que um timeout do Vercel (60s Hobby) deixe o site com zero imóveis.
 *
 * Parâmetros:
 *  secret=xxx    — proteção
 *  city=xxx      — cidade opcional (sem valor = todo o estado SP)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken, invalidateToken, fetchSearchPage, SITE_BASE } from '@/lib/orulo-api';
import { kvSetCatalog, kvSetMeta } from '@/lib/orulo-kv';

export const maxDuration = 60;

const MAX_PAGES = 250; // teto de segurança
const PARALLEL  = 30;  // lotes menores para caber nos 60s do Hobby

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const providedSecret   = searchParams.get('secret') ?? '';
  const city             = searchParams.get('city') || null; // null = todo SP

  const syncSecret = process.env.ORULO_SYNC_SECRET ?? '';
  if (syncSecret && providedSecret !== syncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startTime = Date.now();
    const token     = await getToken();

    // ── Passo 1: descobrir quantas páginas existem ─────────────────────────────
    const p1         = await fetchSearchPage(token, city, 1);
    const totalPages = Math.min(p1.rawPages > 0 ? p1.rawPages : MAX_PAGES, MAX_PAGES);

    // ── Passo 2: buscar páginas em lotes menores (respeita timeout 60s) ────────
    // Nota: a API Orulo retorna ~10 imóveis/página independente de per_page
    const remaining  = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    const allResults = [p1];

    for (let i = 0; i < remaining.length; i += PARALLEL) {
      // Verifica se ainda temos tempo (~10s de margem para gravar no KV)
      if (Date.now() - startTime > 48_000) {
        console.warn(`[sync] approaching timeout after ${i + 1} pages — saving partial catalog`);
        break;
      }
      const batch   = remaining.slice(i, i + PARALLEL);
      const fetched = await Promise.all(batch.map(p => fetchSearchPage(token, city, p)));
      allResults.push(...fetched);
    }

    // ── Passo 3: agregar e deduplicar ──────────────────────────────────────────
    const seen    = new Set<string>();
    const catalog = allResults
      .flatMap(r => r.buildings)
      .filter(b => { if (seen.has(b.id)) return false; seen.add(b.id); return true; });

    // ── Passo 4: gravar no KV (swap atômico — catálogo antigo permanece válido
    //             até que kvSetCatalog conclua e atualize o count) ──────────────
    await kvSetCatalog(catalog);
    await kvSetMeta({
      total_ids:     catalog.length,
      synced_count:  catalog.length,
      is_complete:   true,
      started_at:    new Date().toISOString(),
      last_chunk_at: new Date().toISOString(),
    });

    const elapsed    = Date.now() - startTime;
    const pagesUsed  = allResults.filter(r => r.rawCount > 0).length;
    const isPartial  = pagesUsed < totalPages;

    return NextResponse.json({
      status:        isPartial ? 'partial' : 'complete',
      catalog_size:  catalog.length,
      pages_fetched: pagesUsed,
      total_pages:   totalPages,
      city:          city ?? 'todo SP',
      elapsed_ms:    elapsed,
      site_base:     SITE_BASE,
      note:          isPartial ? 'Catálogo parcial salvo. Execute novamente para completar.' : undefined,
    });

  } catch (err) {
    const message = String(err);
    if (message.includes('401') || message.includes('403')) invalidateToken();
    console.error('[sync]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
