/**
 * lib/vistos-recentemente.ts
 * Histórico local de imóveis vistos — só no navegador (localStorage), sem
 * identificação. Ajuda quem está navegando vários empreendimentos a retomar
 * a pesquisa de onde parou.
 */

const KEY = 'fc_vistos_recentemente';
const MAX_ITEMS = 12;

export interface VistoItem {
  id: string;
  viewedAt: string;
}

function readAll(): VistoItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Registra a visualização de um imóvel — move para o topo se já existia. */
export function registrarVisto(id: string): void {
  if (typeof window === 'undefined' || !id) return;
  try {
    const items = readAll().filter(v => v.id !== id);
    items.unshift({ id, viewedAt: new Date().toISOString() });
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch { /* storage indisponível — falha silenciosa */ }
}

/** IDs vistos recentemente, mais recente primeiro — exclui opcionalmente o imóvel atual. */
export function getVistosIds(excludeId?: string): string[] {
  return readAll().map(v => v.id).filter(id => id !== excludeId);
}
