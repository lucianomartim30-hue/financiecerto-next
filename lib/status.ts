/**
 * lib/status.ts
 * Normalização e exibição do status de um empreendimento — fonte única.
 * Antes desta consolidação, a mesma lógica (com pequenas variações) estava
 * duplicada em orulo-api.ts, ImovelDetailClient.tsx, RegiaoContent.tsx e
 * BairroContent.tsx — risco real de divergência ao tratar um caso novo.
 */

export type StatusNorm = 'na planta' | 'em obras' | 'pronto' | 'unknown';

/**
 * "Breve Lançamento", "Em Construção", "Pronto para morar" → 'na planta' | 'em obras' | 'pronto'.
 * Um status vazio ou não reconhecido NUNCA deve virar 'pronto' silenciosamente — isso mudaria
 * o cálculo financeiro (assume imóvel já entregue) e o caminho do simulador sem base real.
 * Nesses casos retorna 'unknown' explicitamente; quem consome decide o fallback (ver isNaPlanta,
 * isStatusDesconhecido, buildSimuladorLink).
 */
export function normalizeStatus(raw: string): StatusNorm {
  const s = (raw || '')
    .toLowerCase()
    .replace(/[áàãâ]/g, 'a').replace(/[éèê]/g, 'e').replace(/[íìî]/g, 'i')
    .replace(/[óòõô]/g, 'o').replace(/[úùû]/g, 'u').replace(/ç/g, 'c')
    .trim();
  if (!s) return 'unknown';
  if (s.includes('planta') || s.includes('lanca') || s.includes('lancamento') || s === 'pre-lancamento') return 'na planta';
  if (s.includes('obra') || s.includes('constru') || s.includes('andamento') || s === 'under_construction') return 'em obras';
  if (s.includes('pronto') || s.includes('entreg') || s.includes('conclui') || s === 'novo' || s === 'new' || s === 'ready') return 'pronto';
  return 'unknown';
}

/** True se o status (bruto ou já normalizado) representa "ainda não pronto" — usado para decidir /simulador vs /simulador/na-planta. */
export function isNaPlanta(status: string): boolean {
  const n = normalizeStatus(status);
  return n === 'na planta' || n === 'em obras';
}

/** True quando não foi possível identificar com segurança o estágio do empreendimento. */
export function isStatusDesconhecido(status: string): boolean {
  return normalizeStatus(status) === 'unknown';
}

export interface StatusCfg {
  cor: string;
  bg: string;
  label: string;
}

const STATUS_CFG: Record<string, StatusCfg> = {
  'na planta':      { cor: '#2563eb', bg: 'rgba(37,99,235,.15)',  label: 'Na Planta' },
  'planta':         { cor: '#2563eb', bg: 'rgba(37,99,235,.15)',  label: 'Na Planta' },
  // Mesmo estágio da Orulo que 'na planta' (stage="Lançamento"), mas sem
  // tabela de preço publicada ainda (min_price sentinela, ver
  // lib/filtro-breve-lancamento.ts) — badge própria pra não passar a
  // impressão de que o preço mostrado é real quando na verdade é só um
  // placeholder.
  'breve lançamento': { cor: '#0891b2', bg: 'rgba(8,145,178,.15)', label: 'Breve Lançamento' },
  'pre-lançamento': { cor: '#7c3aed', bg: 'rgba(124,58,237,.15)', label: 'Pré-Lançamento' },
  'lançamento':     { cor: '#7c3aed', bg: 'rgba(124,58,237,.15)', label: 'Lançamento' },
  'lancamento':     { cor: '#7c3aed', bg: 'rgba(124,58,237,.15)', label: 'Lançamento' },
  'em obras':       { cor: '#d97706', bg: 'rgba(217,119,6,.15)',  label: 'Em Obras' },
  'em construção':  { cor: '#d97706', bg: 'rgba(217,119,6,.15)',  label: 'Em Construção' },
  'em andamento':   { cor: '#d97706', bg: 'rgba(217,119,6,.15)',  label: 'Em Andamento' },
  'pronto':         { cor: '#16a34a', bg: 'rgba(22,163,74,.15)',  label: 'Pronto' },
  'entregue':       { cor: '#16a34a', bg: 'rgba(22,163,74,.15)',  label: 'Entregue' },
  'unknown':        { cor: '#475569', bg: 'rgba(71,85,105,.18)',  label: 'Estágio a confirmar' },
};

const FALLBACK_CFG: StatusCfg = { cor: '#475569', bg: 'rgba(71,85,105,.18)', label: '' };

/** Preço abaixo disso é sentinela de "sem tabela publicada" da Orulo, não um preço real. */
const PRECO_MINIMO_REAL = 100;

/**
 * Cor/fundo/label para exibir um status (aceita bruto ou já normalizado).
 * `minPrice`, quando informado, distingue "Breve Lançamento" (na planta sem
 * preço real ainda) do "Na Planta" comum — a Orulo não tem um campo próprio
 * pra isso, o preço sentinela é o único sinal disponível.
 */
export function getStatusCfg(status: string, minPrice?: number | null): StatusCfg {
  // minPrice === undefined → chamador não opinou (ex: chip de filtro
  // genérico) — mantém o comportamento normal, sem a distinção.
  if (minPrice !== undefined && normalizeStatus(status) === 'na planta' && !(minPrice && minPrice >= PRECO_MINIMO_REAL)) {
    return STATUS_CFG['breve lançamento'];
  }
  const k = (status || '').toLowerCase().trim();
  if (STATUS_CFG[k]) return STATUS_CFG[k];
  const n = normalizeStatus(status);
  if (STATUS_CFG[n]) return STATUS_CFG[n];
  return { ...FALLBACK_CFG, label: status || '' };
}
