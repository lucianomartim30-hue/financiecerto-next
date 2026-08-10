/**
 * lib/favoritos.ts
 * Favoritos sem conta — vive só no navegador (localStorage). Fase 2 do
 * roadmap estratégico: retenção sem exigir identificação, o usuário só é
 * convidado a se identificar depois de já perceber o valor da funcionalidade.
 */

const KEY = 'fc_favoritos';
const EVENT = 'fc_favoritos_change';

export interface FavoritoItem {
  id: string;
  addedAt: string;
}

function readAll(): FavoritoItem[] {
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

function writeAll(items: FavoritoItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch { /* storage indisponível (modo privado etc.) — falha silenciosa */ }
}

export function getFavoritoIds(): string[] {
  return readAll().map(f => f.id);
}

export function isFavorito(id: string): boolean {
  return readAll().some(f => f.id === id);
}

export function getFavoritosCount(): number {
  return readAll().length;
}

/** Alterna favorito e retorna o novo estado (true = favoritado). */
export function toggleFavorito(id: string): boolean {
  const items = readAll();
  const idx = items.findIndex(f => f.id === id);
  if (idx >= 0) {
    items.splice(idx, 1);
    writeAll(items);
    return false;
  }
  items.unshift({ id, addedAt: new Date().toISOString() });
  writeAll(items);
  return true;
}

/** Escuta mudanças nos favoritos — inclusive entre componentes/abas diferentes. */
export function onFavoritosChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener('storage', handler); // sincroniza entre abas
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
