/**
 * lib/orulo-kv.ts
 * Wrapper de Vercel KV para cache do catálogo Orulo.
 * Degrada graciosamente — sem KV configurado, todas as operações são no-op.
 *
 * Variáveis de ambiente necessárias (adicionadas automaticamente pelo Vercel KV):
 *   KV_REST_API_URL, KV_REST_API_TOKEN, KV_REST_API_READ_ONLY_TOKEN
 */

import type { NormalizedBuilding, OruloIdEntry } from './orulo-api';

// ── Chaves KV ─────────────────────────────────────────────────────────────────
export const KV_CATALOG_KEY  = 'orulo:catalog';   // NormalizedBuilding[]
export const KV_IDS_KEY      = 'orulo:ids';        // OruloIdEntry[]
export const KV_PROGRESS_KEY = 'orulo:progress';   // number (IDs já processados)
export const KV_META_KEY     = 'orulo:meta';        // SyncMeta

// TTLs
export const KV_TTL_CATALOG  = 86400;      // 24 h — catálogo
export const KV_TTL_IDS      = 86400 * 7;  // 7 dias — lista de IDs

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

// ── Catálogo completo ─────────────────────────────────────────────────────────

export async function kvGetCatalog(): Promise<NormalizedBuilding[] | null> {
  return kvGet<NormalizedBuilding[]>(KV_CATALOG_KEY);
}

export async function kvSetCatalog(buildings: NormalizedBuilding[]): Promise<void> {
  return kvSet(KV_CATALOG_KEY, buildings, KV_TTL_CATALOG);
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
  await Promise.all([
    kvDel(KV_CATALOG_KEY),
    kvDel(KV_IDS_KEY),
    kvDel(KV_PROGRESS_KEY),
    kvDel(KV_META_KEY),
  ]);
}

// ── Operações individuais (usadas pelo webhook) ───────────────────────────────

export async function kvUpsertBuilding(building: NormalizedBuilding): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  try {
    const catalog: NormalizedBuilding[] = (await kv.get<NormalizedBuilding[]>(KV_CATALOG_KEY)) ?? [];
    const idx = catalog.findIndex(b => b.id === building.id);
    if (idx >= 0) catalog[idx] = building;
    else          catalog.push(building);
    await kv.set(KV_CATALOG_KEY, catalog, { ex: KV_TTL_CATALOG });
  } catch (e) { console.error('[kv.upsertBuilding]', building.id, e); }
}

export async function kvRemoveBuilding(id: string): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  try {
    const catalog: NormalizedBuilding[] = (await kv.get<NormalizedBuilding[]>(KV_CATALOG_KEY)) ?? [];
    const filtered = catalog.filter(b => b.id !== id);
    if (filtered.length < catalog.length)
      await kv.set(KV_CATALOG_KEY, filtered, { ex: KV_TTL_CATALOG });
  } catch (e) { console.error('[kv.removeBuilding]', id, e); }
}

// ── Verificação de disponibilidade ────────────────────────────────────────────

export async function kvIsAvailable(): Promise<boolean> {
  const kv = await getKv();
  return kv !== null;
}
