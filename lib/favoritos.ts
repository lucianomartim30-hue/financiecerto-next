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
    // Espelha no servidor — permite ver os mesmos favoritos em qualquer
    // aparelho depois de logar (ver lib/favoritos-kv.ts). Nunca bloqueia a
    // ação local: se falhar, os favoritos continuam funcionando por aqui.
    fetch('/api/favoritos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: items.map(i => i.id) }),
    }).catch(() => { /* ignore */ });
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

/**
 * Traz de volta pro localStorage os favoritos já salvos no servidor pra esse
 * dono (ver GET /api/favoritos) — chamado uma vez por sessão em
 * components/FavoritosSync.tsx. Sem isso, um aparelho novo (ou localStorage
 * limpo) não mostrava os favoritos de uma conta já logada em nenhum lugar do
 * site fora de /conta, mesmo eles existindo no servidor.
 */
export function mesclarFavoritosDoServidor(idsServidor: string[]): void {
  if (idsServidor.length === 0) return;
  const locais = readAll();
  const idsLocais = new Set(locais.map(f => f.id));
  const novos = idsServidor.filter(id => !idsLocais.has(id));
  if (novos.length === 0) return;
  const agora = new Date().toISOString();
  writeAll([...locais, ...novos.map(id => ({ id, addedAt: agora }))]);
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
