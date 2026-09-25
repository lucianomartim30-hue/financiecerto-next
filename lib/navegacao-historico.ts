'use client';

/**
 * Rastreio do histórico de navegação da aba — permite mostrar uma seta de
 * "avançar" (além da de voltar) e devolver a pessoa exatamente onde estava,
 * inclusive a posição de rolagem.
 *
 * O navegador não diz se existe "próxima página" no histórico (só a Navigation
 * API, que ainda não está em todos os aparelhos). Aqui cada entrada do histórico
 * recebe um índice (`fcIdx`, gravado no history.state) e o maior índice já
 * visitado fica em sessionStorage — se o índice atual é menor que o maior, dá
 * pra avançar. Um pushState novo descarta as entradas "à frente", igual ao
 * navegador.
 */

const CHAVE_MAX = 'fc_nav_max';
const CHAVE_ATUAL = 'fc_nav_cur';
const CHAVE_SCROLL = 'fc_scroll:';
export const EVENTO_NAV = 'fc:navchange';

type HistWindow = Window & { __fcHistInstalado?: boolean };

function objeto(state: unknown): Record<string, unknown> {
  return state && typeof state === 'object' ? (state as Record<string, unknown>) : {};
}
function idxDe(state: unknown): number {
  const v = objeto(state).fcIdx;
  return typeof v === 'number' ? v : 0;
}

export function indiceAtual(): number {
  return idxDe(window.history.state);
}
function indiceMaximo(): number {
  try { return Number(sessionStorage.getItem(CHAVE_MAX) ?? 0) || 0; } catch { return 0; }
}
export function podeAvancar(): boolean {
  return indiceAtual() < indiceMaximo();
}
export function podeVoltarNoSite(): boolean {
  return indiceAtual() > 0;
}

// ── Rolagem por entrada do histórico ─────────────────────────────────────────
let idxCorrente = 0;
let travaSalvarScroll = false;
let cancelarRestauro: (() => void) | null = null;

function salvarScroll(idx: number) {
  try { sessionStorage.setItem(CHAVE_SCROLL + idx, String(Math.round(window.scrollY))); } catch { /* ignore */ }
}

function restaurarScroll(idx: number) {
  cancelarRestauro?.();
  let y: number | null = null;
  try {
    const raw = sessionStorage.getItem(CHAVE_SCROLL + idx);
    y = raw === null ? null : Number(raw);
  } catch { /* ignore */ }
  if (y === null || !Number.isFinite(y) || y <= 0) return;
  // O conteúdo de várias páginas chega depois (fetch) — tenta por até ~3s, até a
  // página ficar alta o bastante, e desiste se a pessoa mexer na rolagem.
  travaSalvarScroll = true;
  let tentativas = 0;
  const alvo = y;
  const parar = () => {
    clearInterval(timer);
    window.removeEventListener('wheel', parar);
    window.removeEventListener('touchstart', parar);
    window.removeEventListener('keydown', parar);
    travaSalvarScroll = false;
    cancelarRestauro = null;
  };
  const timer = setInterval(() => {
    tentativas++;
    window.scrollTo(0, alvo);
    if (Math.abs(window.scrollY - alvo) < 4 || tentativas >= 30) parar();
  }, 100);
  window.addEventListener('wheel', parar, { passive: true, once: true });
  window.addEventListener('touchstart', parar, { passive: true, once: true });
  window.addEventListener('keydown', parar, { once: true });
  cancelarRestauro = parar;
}

function guardarAtual(idx: number) {
  try { sessionStorage.setItem(CHAVE_ATUAL, String(idx)); } catch { /* ignore */ }
}

function notificar() {
  // Adiado de propósito: o Next chama history.pushState DENTRO de um
  // useInsertionEffect, e o React proíbe agendar atualização de estado ali
  // ("useInsertionEffect must not schedule updates"). Fora dessa pilha é seguro.
  setTimeout(() => window.dispatchEvent(new Event(EVENTO_NAV)), 0);
}

export function instalarRastreioDeHistorico() {
  const w = window as HistWindow;
  if (w.__fcHistInstalado) return;
  w.__fcHistInstalado = true;

  const push = window.history.pushState.bind(window.history);
  const replace = window.history.replaceState.bind(window.history);
  // Carga "nova" da página (digitou o endereço, link externo ou <a> comum) cria uma
  // entrada nova no navegador e descarta as que estavam à frente — o pushState não
  // passa por aqui, então numera essa entrada como a seguinte à última conhecida
  // (senão o "avançar" ficaria ativo apontando pra nada).
  const tipoCarga = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type;
  if (tipoCarga === 'navigate' && typeof objeto(window.history.state).fcIdx !== 'number') {
    let ultimo = -1;
    try { ultimo = Number(sessionStorage.getItem(CHAVE_ATUAL) ?? -1); } catch { /* ignore */ }
    if (Number.isFinite(ultimo) && ultimo >= 0) {
      const idx = ultimo + 1;
      replace({ ...objeto(window.history.state), fcIdx: idx }, '', window.location.href);
      try { sessionStorage.setItem(CHAVE_MAX, String(idx)); } catch { /* ignore */ }
    } else {
      // Sem histórico conhecido nesta aba: não há nada "à frente".
      try { sessionStorage.setItem(CHAVE_MAX, String(indiceAtual())); } catch { /* ignore */ }
    }
  }
  idxCorrente = indiceAtual();
  guardarAtual(idxCorrente);

  window.history.pushState = (state, unused, url) => {
    salvarScroll(idxCorrente);
    cancelarRestauro?.();
    const idx = indiceAtual() + 1;
    try { sessionStorage.setItem(CHAVE_MAX, String(idx)); } catch { /* ignore */ }
    push({ ...objeto(state), fcIdx: idx }, unused, url);
    idxCorrente = idx;
    guardarAtual(idx);
    notificar();
  };
  // O Next também chama replaceState (sem o nosso índice) — preserva o da entrada atual.
  window.history.replaceState = (state, unused, url) => {
    replace({ ...objeto(state), fcIdx: indiceAtual() }, unused, url);
  };

  window.addEventListener('popstate', () => {
    idxCorrente = indiceAtual();
    guardarAtual(idxCorrente);
    notificar();
    restaurarScroll(idxCorrente);
  });

  let agendado = false;
  window.addEventListener('scroll', () => {
    if (travaSalvarScroll || agendado) return;
    agendado = true;
    setTimeout(() => { agendado = false; if (!travaSalvarScroll) salvarScroll(idxCorrente); }, 150);
  }, { passive: true });
  window.addEventListener('pagehide', () => { if (!travaSalvarScroll) salvarScroll(idxCorrente); });
}
