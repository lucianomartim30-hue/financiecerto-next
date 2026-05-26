/**
 * lib/orulo-api.ts
 * Funções compartilhadas para integração com a API Orulo v2.
 * Documentação oficial: https://www.orulo.com.br/api/v2/documentation
 */

import { lookupSPCoords } from '@/lib/sp-neighborhoods';

export const ORULO_BASE = 'https://www.orulo.com.br';
export const SITE_BASE  = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.financiecerto.com.br';

// ── Token cache (warm por instância) ─────────────────────────────────────────
let _tokenCache = { token: null as string | null, expiresAt: 0 };

export async function getToken(): Promise<string> {
  const now = Date.now();
  if (_tokenCache.token && now < _tokenCache.expiresAt) return _tokenCache.token;
  const clientId     = process.env.ORULO_CLIENT_ID;
  const clientSecret = process.env.ORULO_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    throw new Error('ORULO_CLIENT_ID ou ORULO_CLIENT_SECRET não configurados.');
  const resp = await fetch(`${ORULO_BASE}/oauth/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }).toString(),
  });
  if (!resp.ok) throw new Error(`Orulo token error ${resp.status}`);
  const data = await resp.json();
  if (!data.access_token) throw new Error('Token não retornado.');
  _tokenCache = { token: data.access_token, expiresAt: now + 20 * 60 * 60 * 1000 };
  return data.access_token;
}

export function invalidateToken() {
  _tokenCache = { token: null, expiresAt: 0 };
}

// ── Normalização ──────────────────────────────────────────────────────────────

export function normalizeFinality(raw: string): string {
  const s = (raw || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim();
  if (s.includes('residencial') || s === 'residential') return 'residencial';
  if (
    s.includes('comercial') || s === 'commercial' ||
    s.includes('loja') || s.includes('retail') ||
    s.includes('nr') || s.includes('nao residencial') ||
    s.includes('misto') || s.includes('mixed')
  ) return 'comercial';
  return s;
}

/**
 * Infere a finalidade pelo nome do empreendimento quando a API Orulo
 * não retorna o campo finality.
 * Usa palavras-chave inequivocamente comerciais para evitar falsos
 * positivos em imóveis residenciais.
 */
export function inferFinalityFromName(name: string, developer = ''): string {
  const t = `${name} ${developer}`
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (
    t.includes('sala comercial') || t.includes('salas comerciais') ||
    t.includes('sala de escritorio') || t.includes('salas de escritorio') ||
    t.includes('escritorio') ||
    /\bloja\b/.test(t) || /\blojas\b/.test(t) ||
    /\boffice\b/.test(t) ||
    t.includes('centro empresarial') || t.includes('centro comercial') ||
    t.includes('torre comercial') || t.includes('torres comerciais') ||
    t.includes('nao residencial') ||
    /\bnr\b/.test(t) ||
    t.includes('salas nr') ||
    t.includes('laje corporativa') || t.includes('corporate')
  ) return 'comercial';
  return '';
}

export function normalizeStatus(raw: string): string {
  const s = (raw || '')
    .toLowerCase()
    .replace(/[áàãâ]/g, 'a').replace(/[éèê]/g, 'e').replace(/[íìî]/g, 'i')
    .replace(/[óòõô]/g, 'o').replace(/[úùû]/g, 'u').replace(/ç/g, 'c')
    .trim();
  if (s.includes('planta') || s.includes('lanca') || s.includes('lancamento') || s === 'pre-lancamento') return 'na planta';
  if (s.includes('obra') || s.includes('constru') || s.includes('andamento') || s === 'under_construction') return 'em obras';
  if (s.includes('pronto') || s.includes('entreg') || s.includes('conclui') || s === 'novo' || s === 'new' || s === 'ready') return 'pronto';
  return s;
}

function extractNeighborhood(address: Record<string, unknown>): string {
  return (
    (address.area          as string) ||
    (address.neighborhood  as string) ||
    (address.neighbourhood as string) ||
    (address.district      as string) ||
    (address.region        as string) ||
    ''
  );
}

function parseCoord(v: unknown): number | null {
  if (v === null || v === undefined || v === '' || v === 0) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return isFinite(n) && n !== 0 ? n : null;
}

export function normalizeBuilding(b: Record<string, unknown>) {
  const developer = (b.developer as Record<string, string> | null)?.name || (b.developer_name as string) || '';
  const address   = (b.address   as Record<string, unknown>) || {};
  const img       = (b.default_image as Record<string, string>) || {};

  let lat = parseCoord(
    b.latitude ?? b.lat ??
    (b.coordinates as Record<string,unknown>)?.lat ??
    (b.coordinate  as Record<string,unknown>)?.lat ??
    (b.location    as Record<string,unknown>)?.lat ??
    address.latitude ?? address.lat
  );
  let lng = parseCoord(
    b.longitude ?? b.lng ??
    (b.coordinates as Record<string,unknown>)?.lng ??
    (b.coordinate  as Record<string,unknown>)?.lng ??
    (b.location    as Record<string,unknown>)?.lng ??
    address.longitude ?? address.lng
  );
  if (!lat || !lng) {
    const fb = lookupSPCoords(extractNeighborhood(address), (address.city as string) || '');
    if (fb) { lat = fb.lat; lng = fb.lng; }
  }

  return {
    id:            String(b.id),
    name:          (b.name as string) || 'Empreendimento',
    developer,
    min_price:     (b.min_price     as number) ?? null,
    max_price:     (b.max_price     as number) ?? null,
    bedrooms_min:  (b.min_bedrooms  as number) ?? null,
    bedrooms_max:  (b.max_bedrooms  as number) ?? null,
    area_min:      (b.min_area      as number) ?? (b.area_min  as number) ?? null,
    area_max:      (b.max_area      as number) ?? (b.area_max  as number) ?? null,
    bathrooms_min: (b.min_bathrooms as number) ?? (b.bathrooms_min as number) ?? null,
    bathrooms_max: (b.max_bathrooms as number) ?? (b.bathrooms_max as number) ?? null,
    vagas_min:     (b.min_parking_spots as number) ?? (b.min_garages as number) ?? (b.parking_spots_min as number) ?? (b.min_parking as number) ?? (b.vagas_min as number) ?? null,
    vagas_max:     (b.max_parking_spots as number) ?? (b.max_garages as number) ?? (b.parking_spots_max as number) ?? (b.max_parking as number) ?? (b.vagas_max as number) ?? null,
    neighborhood:  extractNeighborhood(address),
    address_full:  [address.street as string, address.number as string].filter(Boolean).join(', ') || '',
    street:        (address.street  as string) || '',
    number:        (address.number  as string) || '',
    city:          (address.city    as string) || '',
    state:         (address.state   as string) || '',
    lat,
    lng,
    delivery_date: (b.delivery_date   as string) ?? (b.expected_delivery as string) ?? (b.completion_date as string) ?? null,
    photo:         img['520x280'] || img['840x560'] || img['200x140'] || null,
    sharing_url:   (b.sharing_url as string) || null,
    orulo_url:     (b.sharing_url as string) || `${ORULO_BASE}/buildings/${b.id}`,
    status:        (b.stage  as string) || (b.status as string) || '',
    status_norm:   normalizeStatus((b.stage as string) || (b.status as string) || ''),
    // A Orulo pode retornar finalidade em campos com nomes variados.
    // Tenta todos os candidatos antes de cair no fallback por nome.
    finality: (
      (b.finality as string) ||
      (b.finality_type as string) ||
      (b.property_type as string) ||
      (b.type as string) ||
      ''
    ),
    finality_norm: (() => {
      const raw =
        (b.finality      as string) ||
        (b.finality_type as string) ||
        (b.property_type as string) ||
        (b.type          as string) ||
        '';
      const norm = normalizeFinality(raw);
      if (norm === 'residencial' || norm === 'comercial') return norm;
      // Último recurso: inferir pelo nome quando a API não informa
      const name      = (b.name      as string) || '';
      const developer = (b.developer as Record<string,string>|null)?.name || (b.developer_name as string) || '';
      return inferFinalityFromName(name, developer);
    })(),
    updated_at:    (b.updated_at as string) || null,
  };
}

export type NormalizedBuilding = ReturnType<typeof normalizeBuilding>;

// ── IDs ativos (endpoint correto do fluxo de catálogo) ───────────────────────
// GET /api/v2/buildings/ids/active — retorna até 500 IDs por página
// Resposta: { building_ids: [{id, updated_at}], total, page, total_pages }
// (algumas versões retornam "buildings" em vez de "building_ids")

export interface OruloIdEntry {
  id:         number;
  updated_at: string;
}

export async function fetchAllActiveIds(token: string): Promise<OruloIdEntry[]> {
  const PER_PAGE = 500;
  const allIds: OruloIdEntry[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    try {
      const resp = await fetch(
        `${ORULO_BASE}/api/v2/buildings/ids/active?results_per_page=${PER_PAGE}&page=${page}`,
        { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) },
      );
      if (!resp.ok) { console.error('[ids/active] HTTP', resp.status, 'page', page); break; }
      const data = await resp.json();

      // A API pode retornar building_ids ou buildings (ambos são suportados)
      const list = (data.building_ids ?? data.buildings ?? []) as OruloIdEntry[];
      allIds.push(...list);

      // Tenta ler total_pages por vários nomes de campo possíveis.
      // Fallback: calcula a partir de total / PER_PAGE.
      const rawTotalPages =
        data.total_pages ?? data.totalPages ?? data.pages ??
        data.meta?.total_pages ?? data.meta?.pages;
      const rawTotal =
        data.total ?? data.total_count ?? data.meta?.total;

      if (rawTotalPages != null) {
        totalPages = Math.max(totalPages, Number(rawTotalPages));
      } else if (rawTotal != null) {
        totalPages = Math.max(totalPages, Math.ceil(Number(rawTotal) / PER_PAGE));
      }

      console.log(`[ids/active] page ${page}/${totalPages} → ${list.length} IDs (total: ${allIds.length})`);
      page++;
    } catch (e) {
      console.error('[ids/active] error page', page, e);
      break;
    }
  }

  return allIds;
}

// ── Detalhe de empreendimento individual ─────────────────────────────────────
// GET /api/v2/buildings/{buildingId}

// Contador de erros por status (diagnóstico de rate limit)
const _errCount: Record<number, number> = {};
let   _errLogTimer: ReturnType<typeof setTimeout> | null = null;
function _logErr(status: number) {
  _errCount[status] = (_errCount[status] ?? 0) + 1;
  if (!_errLogTimer) {
    _errLogTimer = setTimeout(() => {
      if (Object.keys(_errCount).length > 0)
        console.warn('[building-detail] erros acumulados:', JSON.stringify(_errCount));
      Object.keys(_errCount).forEach(k => delete _errCount[Number(k)]);
      _errLogTimer = null;
    }, 5000);
  }
}

export async function fetchBuildingDetail(
  token: string,
  id: string | number,
): Promise<NormalizedBuilding | null> {
  try {
    const resp = await fetch(
      `${ORULO_BASE}/api/v2/buildings/${id}`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(4000) },
    );
    if (!resp.ok) { _logErr(resp.status); return null; }
    const data = await resp.json() as Record<string, unknown>;
    return normalizeBuilding(data);
  } catch {
    return null;
  }
}

// ── Busca em lote paralela ────────────────────────────────────────────────────

export async function fetchBuildingsBatch(
  token:    string,
  ids:      Array<string | number>,
  parallel  = 15,
): Promise<NormalizedBuilding[]> {
  const results: NormalizedBuilding[] = [];
  for (let i = 0; i < ids.length; i += parallel) {
    const chunk   = ids.slice(i, i + parallel);
    const fetched = await Promise.all(chunk.map(id => fetchBuildingDetail(token, id)));
    results.push(...(fetched.filter(Boolean) as NormalizedBuilding[]));
  }
  return results;
}

// ── Publication links (obrigatório pela Orulo) ────────────────────────────────
// PUT /api/v2/buildings/{buildingId}/publication_links
// Deve ser chamado sempre que um imóvel for publicado ou despublicado.
// O não-envio pode causar restrições no acesso à API.

export async function reportPublicationLink(
  token:      string,
  buildingId: string,
  url:        string,
  active      = true,
): Promise<boolean> {
  try {
    const resp = await fetch(
      `${ORULO_BASE}/api/v2/buildings/${buildingId}/publication_links`,
      {
        method:  'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ publication_links: [{ url, active }] }),
        signal:  AbortSignal.timeout(8000),
      },
    );
    return resp.ok;
  } catch (e) {
    console.error('[publication_links]', buildingId, e);
    return false;
  }
}

// ── Busca paginada de empreendimentos (endpoint de busca — fallback) ──────────
// GET /api/v2/buildings?city=...&state=...
// Nota: retorna fixo 10 por página independente de per_page

export interface PageResult {
  buildings:  NormalizedBuilding[];
  rawCount:   number;
  rawTotal:   number;
  rawPages:   number;
  httpStatus: number;
  rawSample:  Record<string, unknown> | null;
  error?:     string;
}

export async function fetchSearchPage(
  token: string,
  city:  string | null,
  page:  number,
): Promise<PageResult> {
  try {
    const params: Record<string, string> = { state: 'SP', per_page: '200', page: String(page) };
    if (city) params.city = city;
    const qs   = new URLSearchParams(params);
    const resp = await fetch(`${ORULO_BASE}/api/v2/buildings?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal:  AbortSignal.timeout(8000),
    });
    if (!resp.ok) return { buildings: [], rawCount: 0, rawTotal: 0, rawPages: 0, httpStatus: resp.status, rawSample: null, error: `HTTP ${resp.status}` };
    const raw  = await resp.json();
    const list = (raw.buildings ?? raw.data ?? raw.results ?? []) as Record<string, unknown>[];
    return {
      buildings:  list.map(normalizeBuilding),
      rawCount:   list.length,
      rawTotal:   Number(raw.total_count ?? raw.total ?? raw.meta?.total ?? 0),
      rawPages:   Number(raw.total_pages ?? raw.pages ?? raw.meta?.total_pages ?? 0),
      httpStatus: resp.status,
      rawSample:  list[0] ?? null,
    };
  } catch (e) {
    return { buildings: [], rawCount: 0, rawTotal: 0, rawPages: 0, httpStatus: 0, rawSample: null, error: String(e) };
  }
}
