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
  _ultimoErroIdsActive, // TESTE TEMPORÁRIO — diagnóstico, remover depois de identificar a causa
} from '@/lib/orulo-api';
import { kvGetCatalog, kvSetCatalog, kvSetMeta, kvAcquireCatalogLock, kvReleaseCatalogLock, type CatalogEntry, type SeoStatus } from '@/lib/orulo-kv';

// Dias de ausência confirmada (em syncs sucessivos) antes de considerar um
// imóvel definitivamente removido da Orulo. Enquanto abaixo disso, fica
// "suspected_missing" — continua na página normalmente, sem nenhum aviso ao
// usuário, só uma suspeita interna que ainda pode se reverter no próximo sync.
const RECONFIRM_DAYS = 30;

// Vercel Pro suporta até 300s. Com 2000 imóveis × 20 paralelos + 300ms delay: ~120-180s por run.
export const maxDuration = 300;

// IMPORTANTE: Orulo tem rate limit. Com > 20 paralelos a API rejeita a maioria
// das requisições silenciosamente. 20 é o limite seguro.
// BATCH_DELAY_MS = pausa entre lotes para evitar trigger de rate limit:
// sem delay → Orulo bloqueia ~80% das requisições; com 300ms → quase todas passam.
const BATCH_SIZE      = 20;    // imóveis por lote (paralelo)
const BATCH_DELAY_MS  = 300;   // ms de respiro entre lotes — essencial anti rate-limit
const TIMEOUT_MS      = 240_000; // 240s — deixa 60s de buffer para salvar no KV

// Um sync por vez, e nenhum webhook gravando junto (ver kvAcquireCatalogLock em
// lib/orulo-kv.ts). A chamada encadeada espera o sync anterior soltar o cadeado.
export async function GET(req: NextRequest) {
  const encadeada = new URL(req.url).searchParams.get('chained') === '1';
  const lock = await kvAcquireCatalogLock(330, encadeada ? 20_000 : 0);
  if (!lock) {
    return NextResponse.json({ status: 'busy', note: 'Já existe uma sincronização (ou atualização de imóvel) em andamento — aguarde e tente de novo.' }, { status: 202 });
  }
  try {
    return await executarSync(req);
  } finally {
    await kvReleaseCatalogLock(lock);
  }
}

async function executarSync(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const providedSecret   = searchParams.get('secret') ?? '';
  const forceFull        = searchParams.get('full') === 'true';
  const isChained        = searchParams.get('chained') === '1'; // chamada encadeada

  // Auth opcional — sync só atualiza catálogo público de imóveis
  const syncSecret = process.env.ORULO_SYNC_SECRET ?? '';
  if (syncSecret && providedSecret && providedSecret !== syncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startTime = Date.now();
    const token     = await getToken();

    // ── Passo 1: buscar todos os IDs ativos ───────────────────────────────────
    const { ids: activeIdEntries, complete: idsComplete } = await fetchAllActiveIds(token);
    const totalActive     = activeIdEntries.length;

    if (totalActive === 0) {
      return NextResponse.json(
        {
          error: 'Orulo retornou 0 IDs ativos — problema de autenticação ou API.',
          diagnostico: _ultimoErroIdsActive, // TESTE TEMPORÁRIO
        },
        { status: 502 },
      );
    }

    // A paginação de /buildings/ids/active parou no meio (erro, timeout ou
    // rate-limit da Orulo) — activeIdEntries é uma lista PARCIAL, não a
    // verdade completa de quem está ativo. Seguir em frente marcaria todo
    // imóvel saudável que não coube nessa lista truncada como
    // suspected_missing (some da vitrine na hora, sem esperar os 30 dias de
    // confirmação — foi exatamente isso que aconteceu no incidente de
    // 2026-09-10, causado por chamadas de sync em sequência estourando o
    // rate-limit da Orulo). Sem uma lista completa e confiável, não dá pra
    // comparar quem saiu — aborta sem tocar no KV.
    if (!idsComplete) {
      return NextResponse.json(
        {
          error: 'Lista de imóveis ativos da Orulo veio incompleta (paginação interrompida) — sync abortado sem alterar o catálogo, pra não marcar imóveis saudáveis como removidos.',
          ids_recebidos: totalActive,
          diagnostico: _ultimoErroIdsActive,
        },
        { status: 503 },
      );
    }

    const activeIdSet = new Set(activeIdEntries.map(e => String(e.id)));
    const activeIdMap = new Map(activeIdEntries.map(e => [String(e.id), e.updated_at]));

    // ── Passo 2: catálogo atual no KV ─────────────────────────────────────────
    const rawCatalog  = forceFull ? null : await kvGetCatalog();
    const existing    = Array.isArray(rawCatalog) ? rawCatalog : [];
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

    // ── Passo 4: manter todos os existentes ───────────────────────────────────
    // Antes, um imóvel que saísse da lista de ativos era removido do catálogo
    // na mesma execução — isso é o que causava soft-404 (a página achava o
    // imóvel um instante, sumia no seguinte, sem aviso nenhum ao usuário nem
    // ao Google). A remoção definitiva agora passa pelo ciclo de vida do
    // Passo 6.5, com confirmação em syncs sucessivos ao longo de 30 dias.
    const retained = existing;

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
      // Delay entre lotes: evita rajada que dispara rate-limit da Orulo.
      // Sem esse delay, ~80% das requisições falham silenciosamente.
      if (i > 0) await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
      const results = await fetchBuildingsBatch(token, toFetch.slice(i, i + BATCH_SIZE), BATCH_SIZE);
      fetched.push(...results);
      fetchedCount += results.length;
      console.log(`[sync] lote ${Math.floor(i/BATCH_SIZE)+1}/${Math.ceil(toFetch.length/BATCH_SIZE)}: +${results.length} (total: ${fetchedCount})`);
    }

    // ── Passo 6: merge ────────────────────────────────────────────────────────
    const fetchedMap = new Map(fetched.map(b => [b.id, b]));
    const merged: CatalogEntry[] = retained.map(b => fetchedMap.get(b.id) ?? b);
    for (const b of fetched) {
      if (!existingMap.has(b.id)) merged.push(b);
    }

    // ── Passo 6.5: ciclo de vida SEO ──────────────────────────────────────────
    // activeIdSet só existe se fetchAllActiveIds (passo 1) respondeu com
    // sucesso — se a Orulo falhar, deu timeout, 429 ou 5xx, a função já
    // lançou antes de chegar aqui (catch geral lá embaixo, sem tocar no KV) ou
    // retornou 502 sem salvar nada (totalActive === 0, linhas acima). Ou seja,
    // chegar neste ponto já significa "a Orulo respondeu com uma lista de
    // ativos válida" — erro de rede/timeout/429/5xx nunca vira evidência de
    // remoção porque simplesmente nunca chega a rodar este cálculo.
    const nowIso = new Date().toISOString();
    let novasSuspeitas = 0, confirmadasRemovidas = 0, recuperadas = 0;
    const withLifecycle: CatalogEntry[] = merged.map(b => {
      const aindaAtiva = activeIdSet.has(b.id);
      if (aindaAtiva) {
        if (b.seo_status === 'suspected_missing' || b.seo_status === 'removed_confirmed') recuperadas++;
        const status: SeoStatus = b.stock === 0 ? 'out_of_stock' : 'active';
        return { ...b, seo_status: status, first_missing_at: null, last_confirmed_at: nowIso };
      }
      const firstMissingAt = b.first_missing_at ?? nowIso;
      const diasAusente    = (Date.now() - new Date(firstMissingAt).getTime()) / 86_400_000;
      const jaEraConfirmada = b.seo_status === 'removed_confirmed';
      const status: SeoStatus = diasAusente >= RECONFIRM_DAYS ? 'removed_confirmed' : 'suspected_missing';
      if (status === 'suspected_missing' && !b.first_missing_at) novasSuspeitas++;
      if (status === 'removed_confirmed' && !jaEraConfirmada) confirmadasRemovidas++;
      return { ...b, seo_status: status, first_missing_at: firstMissingAt };
    });

    // ── Passo 7: salvar ───────────────────────────────────────────────────────
    // Rate-limit da Orulo: ~400 req por janela. Se buscamos menos do que
    // precisávamos (sem ter estourado o timeout), é sinal de rate-limit.
    // Nesses casos is_complete=false para o auto-sync continuar tentando.
    const allFetched  = toFetch.length === 0 || fetchedCount >= toFetch.length;
    const isComplete  = !timedOut && allFetched;
    const rateLimited = !timedOut && !allFetched && fetchedCount < toFetch.length;

    await kvSetCatalog(withLifecycle);
    await kvSetMeta({
      total_ids:     totalActive,
      synced_count:  withLifecycle.length,
      is_complete:   isComplete,
      started_at:    new Date().toISOString(),
      last_chunk_at: new Date().toISOString(),
    });

    const elapsed = Date.now() - startTime;

    // ── Passo 8: encadeamento apenas em caso de timeout ───────────────────────
    // Rate-limit: NÃO encadeia imediatamente — o auto-sync com debounce de 5 min
    // dá tempo ao rate-limit resetar antes de tentar de novo.
    if (timedOut && !isChained) {
      const nextUrl = new URL(req.url);
      nextUrl.searchParams.set('chained', '1');
      nextUrl.searchParams.delete('full');
      fetch(nextUrl.toString(), { signal: AbortSignal.timeout(2000) }).catch(() => {});
      console.log(`[sync] encadeando próxima execução: ${withLifecycle.length}/${totalActive} imóveis`);
    }

    if (rateLimited) {
      console.warn(`[sync] rate-limit detectado: ${fetchedCount}/${toFetch.length} buscados em ${elapsed}ms. Catálogo: ${withLifecycle.length}/${totalActive}. Auto-sync irá completar.`);
    }

    const totalRemovedConfirmed = withLifecycle.filter(b => b.seo_status === 'removed_confirmed').length;
    const totalSuspectedMissing = withLifecycle.filter(b => b.seo_status === 'suspected_missing').length;

    return NextResponse.json({
      status:               timedOut ? 'partial' : isComplete ? 'complete' : 'partial',
      catalog_size:         withLifecycle.length,
      total_active:         totalActive,
      fetched_details:      fetchedCount,
      to_fetch_total:       toFetch.length,
      elapsed_ms:           elapsed,
      site_base:            SITE_BASE,
      chained:              isChained,
      rate_limited:         rateLimited,
      // Ciclo de vida SEO desta execução — ver Passo 6.5.
      lifecycle: {
        novas_suspeitas:        novasSuspeitas,        // ficaram "suspected_missing" agora pela 1ª vez
        confirmadas_removidas:  confirmadasRemovidas,  // cruzaram os 30 dias nesta execução
        recuperadas:            recuperadas,           // voltaram a aparecer como ativas
        total_suspected_missing: totalSuspectedMissing,
        total_removed_confirmed: totalRemovedConfirmed,
      },
      note: timedOut
        ? `Parcial (timeout): ${fetchedCount}/${toFetch.length}. Encadeando próxima execução.`
        : isComplete
          ? `Catálogo completo: ${withLifecycle.length} imóveis.`
          : `Parcial (rate-limit Orulo): ${fetchedCount}/${toFetch.length} buscados. Catálogo: ${withLifecycle.length}/${totalActive}. Auto-sync irá completar nos próximos acessos ao portal.`,
    });

  } catch (err) {
    const message = String(err);
    if (message.includes('401') || message.includes('403')) invalidateToken();
    console.error('[sync]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
