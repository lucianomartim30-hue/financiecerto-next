'use client';

/**
 * Estado que sobrevive a sair da página e voltar (pela seta, pelo menu, por
 * link) dentro da mesma aba: simuladores, filtros de imóveis, formulários.
 *
 * `usePersistedState` é um `useState` que guarda o valor em sessionStorage e o
 * devolve quando a pessoa volta à mesma página. A chave inclui o caminho E a
 * query string — /simulador/na-planta e /simulador/na-planta?valor=300000 (que
 * veio da ficha de um imóvel) são "lugares" diferentes e não misturam dados.
 *
 * sessionStorage (e não localStorage) de propósito: renda e FGTS são dados
 * financeiros — ficam só nesta aba e somem quando ela fecha, sem sobrar em
 * computador compartilhado.
 *
 * A restauração roda em useLayoutEffect, antes da primeira pintura: a pessoa
 * nunca vê a tela "zerada" piscar antes de o que ela preencheu aparecer. O
 * servidor sempre renderiza o valor inicial (HTML igual pra todo mundo).
 */

import { useCallback, useLayoutEffect, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

const PREFIXO = 'fc_state:';

function chaveBase(): string {
  return `${PREFIXO}${window.location.pathname}${window.location.search}#`;
}

/** True se este campo, na página atual, já tem algo PREENCHIDO guardado (vazio/falso/zero não contam). */
export function temEstadoGuardado(campo: string): boolean {
  try {
    const raw = sessionStorage.getItem(chaveBase() + campo);
    return raw !== null && !['""', 'null', 'false', '0'].includes(raw);
  } catch { return false; }
}

/** Apaga tudo o que foi guardado pra página atual (usado por "fazer nova simulação"). */
export function limparEstadoDaPagina(): void {
  try {
    const base = chaveBase();
    const apagar: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(base)) apagar.push(k);
    }
    apagar.forEach(k => sessionStorage.removeItem(k));
  } catch { /* ignore */ }
}

export function usePersistedState<T>(campo: string, inicial: T): [T, Dispatch<SetStateAction<T>>] {
  const [valor, setValor] = useState<T>(inicial);
  const [hidratado, setHidratado] = useState(false);
  const chave = useRef('');

  useLayoutEffect(() => {
    chave.current = chaveBase() + campo;
    try {
      const raw = sessionStorage.getItem(chave.current);
      if (raw !== null) setValor(JSON.parse(raw) as T);
    } catch { /* JSON inválido / storage bloqueado: segue com o valor inicial */ }
    setHidratado(true);
  }, [campo]);

  // Só grava depois da restauração — senão o valor inicial sobrescreveria o guardado.
  useEffect(() => {
    if (!hidratado || !chave.current) return;
    try { sessionStorage.setItem(chave.current, JSON.stringify(valor)); } catch { /* cheio/bloqueado */ }
  }, [valor, hidratado]);

  return [valor, setValor];
}

/** Recomeça a página: apaga o que foi guardado e recarrega já com os valores iniciais. */
export function useRecomecarPagina(): () => void {
  return useCallback(() => {
    limparEstadoDaPagina();
    window.location.reload();
  }, []);
}
