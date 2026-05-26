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

// ── Chaves KV ─────────────────────────────────────────────────────────────────
export const KV_CATALOG_KEY        = 'orulo:catalog';        // chave legada (fallback de leitura)
export const KV_CATALOG_COUNT_KEY  = 'orulo:catalog:count';  // número de chunks
const        kvChunkKey = (i: number) => `orulo:catalog:${i}`;

export const KV_IDS_KEY      = 'orulo:ids';        // OruloIdEntry[]
export const KV_PROGRESS_KEY = 'orulo:progress';   // number (IDs já processados)
export const KV_META_KEY     = 'orulo:meta';        // SyncMeta

// TTLs
export const KV_TTL_CATALOG  = 86400 * 7;  // 7 dias — catálogo (evita expiração entre runs do cron)
export const KV_TTL_IDS      = 86400 * 7;  // 7 dias — lista de IDs

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

export async function kvSetCatalog(buildings: NormalizedBuilding[]): Promise<void> {
  const kv = await getKv();
  if (!kv) return;

  // Dividir em chunks
  const chunks: NormalizedBuilding[][] = [];
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

export async function kvGetCatalog(): Promise<NormalizedBuilding[] | null> {
  const count = await kvGet<number>(KV_CATALOG_COUNT_KEY);

  // Novo formato: chunks
  if (count && count > 0) {
    const chunkPromises = Array.from({ length: count }, (_, i) =>
      kvGet<NormalizedBuilding[]>(kvChunkKey(i)),
    );
    const chunks = await Promise.all(chunkPromises);

    // Se algum chunk estiver faltando, retorna null (forçar re-sync)
    if (chunks.some(c => !c)) {
      console.warn('[kv] missing chunk(s), returning null to trigger live fallback');
      return null;
    }

    return chunks.flat() as NormalizedBuilding[];
  }

  // Fallback legado: chave única 'orulo:catalog'
  return kvGet<NormalizedBuilding[]>(KV_CATALOG_KEY);
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

// ── Operações individuais (usadas pelo webhook) ───────────────────────────────

export async function kvUpsertBuilding(building: NormalizedBuilding): Promise<void> {
  const catalog = (await kvGetCatalog()) ?? [];
  const idx = catalog.findIndex(b => b.id === building.id);
  if (idx >= 0) catalog[idx] = building;
  else          catalog.push(building);
  await kvSetCatalog(catalog);
}

export async function kvRemoveBuilding(id: string): Promise<void> {
  const catalog = await kvGetCatalog();
  if (!catalog) return;
  const filtered = catalog.filter(b => b.id !== id);
  if (filtered.length < catalog.length) await kvSetCatalog(filtered);
}

// ── Verificação de disponibilidade ────────────────────────────────────────────

export async function kvIsAvailable(): Promise<boolean> {
  const kv = await getKv();
  return kv !== null;
}
