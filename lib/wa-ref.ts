'use client';

/**
 * Código curto ("ref") que vai na mensagem pré-escrita do WhatsApp e no lead
 * gravado (KV e HubSpot). Quando a conversa chega ao WhatsApp, o código na
 * mensagem permite achar o clique/lead certo — o clique em si não traz nome nem
 * telefone. Um mesmo botão na mesma página usa sempre o mesmo código (a chave
 * do lead já é registrada uma única vez por botão).
 */

// Sem 0/O/1/I/L — não confunde quando lido ou digitado.
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const porChave = new Map<string, string>();

export function refDoLead(chave: string): string {
  let ref = porChave.get(chave);
  if (!ref) {
    const bytes = crypto.getRandomValues(new Uint8Array(4));
    ref = Array.from(bytes, b => ALFABETO[b % ALFABETO.length]).join('');
    porChave.set(chave, ref);
  }
  return ref;
}

/** Acrescenta "(ref. XXXX)" ao texto do link wa.me no momento do clique. */
export function aplicarRefNoLink(link: HTMLAnchorElement, ref: string): void {
  try {
    const i = link.href.indexOf('text=');
    if (i === -1) return;
    const base = link.href.slice(0, i);
    const texto = decodeURIComponent(link.href.slice(i + 5).split('&')[0]);
    if (texto.includes(`(ref. ${ref})`)) return;
    link.href = `${base}text=${encodeURIComponent(`${texto}\n\n(ref. ${ref})`)}`;
  } catch { /* link segue sem ref */ }
}
