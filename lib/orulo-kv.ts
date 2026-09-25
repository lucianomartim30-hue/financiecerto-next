/**
 * lib/orulo-kv.ts
 * Wrapper de Vercel KV para cache do catálogo Orulo.
 * Degrada graciosamente — sem KV configurado, todas as operações são no-op.
 *
 * Variáveis de ambiente necessárias (adicionadas automaticamente pelo Vercel KV):
 *   KV_REST_API_URL, KV_REST_API_TOKEN, KV_REST_API_READ_ONLY_TOKEN
 *
 * Estratégia de chunks:
 *   O limite do Vercel KV via REST API é ~1MB por chave.
 *   Com 2000+ imóveis × ~600 bytes = ~1.2MB+, o catálogo precisa ser dividido.
 *   Usamos orulo:catalog:count (número de chunks) + orulo:catalog:0, :1, :2...
 *   cada chunk com até CHUNK_SIZE imóveis (~300 × 600B = ~180KB — bem abaixo do limite).
 */

import type { NormalizedBuilding, OruloIdEntry } from './orulo-api';

// ── Ciclo de vida SEO de cada imóvel no catálogo ────────────────────────────
// Calculado pelo sync (app/api/orulo/sync/route.ts), nunca por uma requisição
// de página — ver comentário detalhado lá. Persistido junto com o resto do
// registro do imóvel (mesmo array salvo por kvSetCatalog), sem chave nova.
//
//  active             → confirmado na lista de ativos da Orulo no último sync, com estoque
//  out_of_stock       → confirmado ativo, mas sem unidades disponíveis (stock=0)
//  suspected_missing  → ausente da lista de ativos há menos de 30 dias corridos
//  removed_confirmed  → ausente da lista de ativos por 30+ dias em syncs sucessivos
export type SeoStatus = 'active' | 'out_of_stock' | 'suspected_missing' | 'removed_confirmed';

export type CatalogEntry = NormalizedBuilding & {
  seo_status?: SeoStatus;
  /** ISO date da primeira vez que o imóvel não apareceu na lista de ativos da Orulo. null quando confirmado ativo. */
  first_missing_at?: string | null;
  /** ISO date da última vez que o imóvel foi confirmado ativo (visto na lista de ativos). */
  last_confirmed_at?: string;
};

// ── Chaves KV ─────────────────────────────────────────────────────────────────
export const KV_CATALOG_KEY        = 'orulo:catalog';        // chave legada (fallback de leitura)
export const KV_CATALOG_COUNT_KEY  = 'orulo:catalog:count';  // número de chunks
const        kvChunkKey = (i: number) => `orulo:catalog:${i}`;

export const KV_IDS_KEY      = 'orulo:ids';        // OruloIdEntry[]
export const KV_PROGRESS_KEY = 'orulo:progress';   // number (IDs já processados)
export const KV_META_KEY     = 'orulo:meta';        // SyncMeta

// TTLs
// 30 dias (era 7): o sync diário renova tudo, mas se ele falhar por uma semana o portal
// NÃO pode virar "1 imóvel" (incidentes de 18/09 e 25/09/2026). Um mês dá folga pra achar e consertar.
export const KV_TTL_CATALOG  = 86400 * 30;
export const KV_TTL_IDS      = 86400 * 30;

// Tamanho de cada chunk (imóveis por chave KV)
const CHUNK_SIZE = 300;

export interface SyncMeta {
  total_ids:    number;
  synced_count: number;
  is_complete:  boolean;
  started_at:   string;
  last_chunk_at: string;
}

// ── Instância lazy ────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getKv(): Promise<any | null> {
  const hasConfig = !!(process.env.KV_REST_API_URL || process.env.KV_URL);
  if (!hasConfig) return null;
  try {
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch {
    return null;
  }
}

// ── Helpers genéricos ─────────────────────────────────────────────────────────

async function kvGet<T>(key: string): Promise<T | null> {
  const kv = await getKv();
  if (!kv) return null;
  try { return await kv.get<T>(key); } catch { return null; }
}

async function kvSet(key: string, value: unknown, ex?: number): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  try {
    if (ex) await kv.set(key, value, { ex });
    else    await kv.set(key, value);
  } catch (e) { console.error('[kv.set]', key, e); }
}

async function kvDel(key: string): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  try { await kv.del(key); } catch {}
}

// ── Catálogo completo (armazenamento em chunks) ───────────────────────────────

export async function kvSetCatalog(buildings: CatalogEntry[]): Promise<void> {
  const kv = await getKv();
  if (!kv) return;

  // Dividir em chunks
  const chunks: CatalogEntry[][] = [];
  for (let i = 0; i < buildings.length; i += CHUNK_SIZE) {
    chunks.push(buildings.slice(i, i + CHUNK_SIZE));
  }

  // Apagar chunks antigos que possam sobrar de syncs anteriores
  const prevCount = await kvGet<number>(KV_CATALOG_COUNT_KEY) ?? 0;
  const delOld: Promise<void>[] = [];
  for (let i = chunks.length; i < prevCount; i++) {
    delOld.push(kvDel(kvChunkKey(i)));
  }
  if (delOld.length > 0) await Promise.all(delOld);

  // Gravar novos chunks em paralelo
  await Promise.all(
    chunks.map((chunk, i) => kvSet(kvChunkKey(i), chunk, KV_TTL_CATALOG)),
  );

  // Salvar contagem de chunks
  await kvSet(KV_CATALOG_COUNT_KEY, chunks.length, KV_TTL_CATALOG);

  // Apagar chave legada (se existir) para evitar confusão
  await kvDel(KV_CATALOG_KEY);

  console.log(`[kv] catalog saved: ${buildings.length} buildings in ${chunks.length} chunks`);
}

export async function kvGetCatalog(): Promise<CatalogEntry[] | null> {
  const count = await kvGet<number>(KV_CATALOG_COUNT_KEY);

  // Novo formato: chunks
  if (count && count > 0) {
    const lerTodos = () => Promise.all(Array.from({ length: count }, (_, i) => kvGet<CatalogEntry[]>(kvChunkKey(i))));
    let chunks = await lerTodos();
    // Falha momentânea de leitura do KV parecia "chunk faltando" — e quem gravava
    // depois a partir dessa leitura vazia apagava o catálogo. Tenta de novo antes.
    if (chunks.some(c => !c)) {
      await new Promise(r => setTimeout(r, 400));
      chunks = await lerTodos();
    }

    // Se algum chunk estiver faltando, retorna null (forçar re-sync)
    if (chunks.some(c => !c)) {
      console.warn('[kv] missing chunk(s), returning null to trigger live fallback');
      return null;
    }

    return chunks.flat() as CatalogEntry[];
  }

  // Fallback legado: chave única 'orulo:catalog'
  return kvGet<CatalogEntry[]>(KV_CATALOG_KEY);
}

// ── Lista de IDs ativos ───────────────────────────────────────────────────────

export async function kvGetIds(): Promise<OruloIdEntry[] | null> {
  return kvGet<OruloIdEntry[]>(KV_IDS_KEY);
}

export async function kvSetIds(ids: OruloIdEntry[]): Promise<void> {
  return kvSet(KV_IDS_KEY, ids, KV_TTL_IDS);
}

// ── Progresso do sync ─────────────────────────────────────────────────────────

export async function kvGetProgress(): Promise<number> {
  return (await kvGet<number>(KV_PROGRESS_KEY)) ?? 0;
}

export async function kvSetProgress(progress: number): Promise<void> {
  return kvSet(KV_PROGRESS_KEY, progress, KV_TTL_IDS);
}

// ── Metadados do sync ─────────────────────────────────────────────────────────

export async function kvGetMeta(): Promise<SyncMeta | null> {
  return kvGet<SyncMeta>(KV_META_KEY);
}

export async function kvSetMeta(meta: SyncMeta): Promise<void> {
  return kvSet(KV_META_KEY, meta, KV_TTL_IDS);
}

// ── Reset completo ────────────────────────────────────────────────────────────

export async function kvResetSync(): Promise<void> {
  // Apagar todos os chunks
  const count = await kvGet<number>(KV_CATALOG_COUNT_KEY) ?? 0;
  const chunkDels = Array.from({ length: count }, (_, i) => kvDel(kvChunkKey(i)));

  await Promise.all([
    ...chunkDels,
    kvDel(KV_CATALOG_COUNT_KEY),
    kvDel(KV_CATALOG_KEY),   // chave legada
    kvDel(KV_IDS_KEY),
    kvDel(KV_PROGRESS_KEY),
    kvDel(KV_META_KEY),
  ]);
}

// ── Cadeado de escrita do catálogo ────────────────────────────────────────────
// O catálogo é um único bloco lido, alterado e regravado por inteiro. Sem exclusão
// mútua, o webhook da Orulo (que muda 1 imóvel) e o sync (que muda milhares) se
// atropelavam: quem terminava por último regravava a versão que leu ANTES do outro
// — e o catálogo encolhia pela metade. Só quem tem o cadeado grava.
const KV_LOCK_KEY = 'orulo:catalog:lock';

export async function kvAcquireCatalogLock(ttlSec: number, waitMs = 0): Promise<string | null> {
  const kv = await getKv();
  if (!kv) return 'sem-kv';
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const limite = Date.now() + waitMs;
  for (;;) {
    try {
      const ok = await kv.set(KV_LOCK_KEY, token, { nx: true, ex: ttlSec });
      if (ok) return token;
    } catch (e) { console.error('[kv.lock]', e); return null; }
    if (Date.now() >= limite) return null;
    await new Promise(r => setTimeout(r, 400));
  }
}

export async function kvReleaseCatalogLock(token: string | null): Promise<void> {
  if (!token || token === 'sem-kv') return;
  const kv = await getKv();
  if (!kv) return;
  try {
    // Só solta se ainda for o dono (o cadeado expira sozinho e outro pode ter assumido).
    if ((await kv.get(KV_LOCK_KEY)) === token) await kv.del(KV_LOCK_KEY);
  } catch { /* expira sozinho */ }
}

// ── Operações individuais (usadas pelo webhook) ───────────────────────────────

/** Retorna false se não gravou (cadeado ocupado por um sync ou catálogo ilegível) — o próximo sync recupera pela data de atualização. */
export async function kvUpsertBuilding(building: CatalogEntry): Promise<boolean> {
  const token = await kvAcquireCatalogLock(30, 8000);
  if (!token) { console.warn('[kv] upsert ignorado: catálogo em atualização (o sync recupera)'); return false; }
  try {
    const catalog = await kvGetCatalog();
    // NUNCA partir de lista vazia: gravar só este imóvel apagava o catálogo inteiro.
    if (!catalog) { console.warn('[kv] upsert ignorado: catálogo ilegível — não sobrescrevo'); return false; }
    const idx = catalog.findIndex(b => b.id === building.id);
    if (idx >= 0) catalog[idx] = building;
    else          catalog.push(building);
    await kvSetCatalog(catalog);
    return true;
  } finally {
    await kvReleaseCatalogLock(token);
  }
}

export async function kvRemoveBuilding(id: string): Promise<boolean> {
  const token = await kvAcquireCatalogLock(30, 8000);
  if (!token) { console.warn('[kv] remoção ignorada: catálogo em atualização (o sync recupera)'); return false; }
  try {
    const catalog = await kvGetCatalog();
    if (!catalog) return false;
    const filtered = catalog.filter(b => b.id !== id);
    if (filtered.length < catalog.length) await kvSetCatalog(filtered);
    return true;
  } finally {
    await kvReleaseCatalogLock(token);
  }
}

// ── Verificação de disponibilidade ────────────────────────────────────────────

export async function kvIsAvailable(): Promise<boolean> {
  const kv = await getKv();
  return kv !== null;
}
