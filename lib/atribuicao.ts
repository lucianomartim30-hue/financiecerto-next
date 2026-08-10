/**
 * lib/atribuicao.ts
 * Modelo de first-touch attribution: registra a ORIGEM da visita (de onde o
 * usuário veio) uma única vez por sessão de navegador e nunca sobrescreve —
 * mesmo que o usuário navegue por várias páginas antes de virar lead, o dado
 * de origem deve continuar sendo o da primeira entrada, não da última página
 * vista antes do contato.
 *
 * Guarda só o necessário para atribuição (fonte, meio, domínio do referrer,
 * primeira página vista, UTMs) — nunca a URL externa completa, por privacidade.
 *
 * Ausência de document.referrer NÃO é prova de acesso direto (pode ser app
 * nativo, HTTPS→HTTP, navegador que oculta referrer, etc.) — por isso o
 * fallback é 'direct/unknown', não 'direct'.
 */

const STORAGE_KEY = 'fc_first_touch';

export interface PrimeiraOrigem {
  first_source: string;
  first_medium: string;
  first_referrer_domain: string | null;
  first_landing_page: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

export interface Conversao {
  conversion_page: string;
  conversion_imovel_id: string | null;
  conversion_action: string;
}

function normalizarDominio(hostname: string): { source: string; medium: string } {
  const h = hostname.toLowerCase().replace(/^www\./, '');
  if (h.includes('chat.openai.com') || h.includes('chatgpt.com')) return { source: 'chatgpt', medium: 'referral' };
  if (h.includes('gemini.google.com')) return { source: 'gemini', medium: 'referral' };
  if (h.includes('bing.com')) return { source: 'bing', medium: 'organic' };
  if (h.includes('yahoo.com')) return { source: 'yahoo', medium: 'organic' };
  if (h.includes('google.')) return { source: 'google', medium: 'organic' };
  if (h.includes('duckduckgo.com')) return { source: 'duckduckgo', medium: 'organic' };
  if (h.includes('facebook.com') || h.includes('instagram.com') || h.includes('fb.com')) return { source: h.includes('instagram') ? 'instagram' : 'facebook', medium: 'social' };
  if (h.includes('whatsapp.com') || h.includes('wa.me')) return { source: 'whatsapp', medium: 'social' };
  if (h.includes('linkedin.com')) return { source: 'linkedin', medium: 'social' };
  return { source: h, medium: 'referral' };
}

/**
 * Captura a origem da visita se ainda não houver uma registrada nesta sessão
 * de navegador (sessionStorage — dura a aba, não sobrevive ao fechamento).
 * Chamar uma vez, o mais cedo possível (ex: montado no layout raiz).
 */
export function capturarPrimeiraOrigem(): void {
  if (typeof window === 'undefined') return;
  try {
    if (sessionStorage.getItem(STORAGE_KEY)) return; // já capturado — first-touch, não sobrescreve

    const params = new URLSearchParams(window.location.search);
    const utm_source = params.get('utm_source');
    const utm_medium = params.get('utm_medium');
    const utm_campaign = params.get('utm_campaign');

    let first_source = 'direct/unknown';
    let first_medium = 'direct/unknown';
    let first_referrer_domain: string | null = null;

    if (document.referrer) {
      try {
        const refHost = new URL(document.referrer).hostname;
        // Ignora referrer do próprio site (navegação interna não é "origem").
        if (refHost && refHost !== window.location.hostname) {
          first_referrer_domain = refHost.toLowerCase().replace(/^www\./, '');
          const norm = normalizarDominio(refHost);
          first_source = norm.source;
          first_medium = norm.medium;
        }
      } catch { /* referrer malformado — mantém direct/unknown */ }
    }

    // UTM explícito tem prioridade sobre a inferência por referrer.
    if (utm_source) {
      first_source = utm_source;
      first_medium = utm_medium || 'campaign';
    }

    const origem: PrimeiraOrigem = {
      first_source,
      first_medium,
      first_referrer_domain,
      first_landing_page: window.location.pathname,
      utm_source,
      utm_medium,
      utm_campaign,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(origem));
  } catch { /* sessionStorage indisponível (modo privado etc.) — segue sem atribuição */ }
}

/** Lê a origem já capturada nesta sessão, se houver. */
export function getPrimeiraOrigem(): PrimeiraOrigem | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Monta o dado de conversão (página/ação/imóvel no momento do lead) — separado da origem. */
export function buildConversao(params: { imovelId?: string | null; action: string }): Conversao {
  return {
    conversion_page: typeof window !== 'undefined' ? window.location.pathname : '',
    conversion_imovel_id: params.imovelId || null,
    conversion_action: params.action,
  };
}
