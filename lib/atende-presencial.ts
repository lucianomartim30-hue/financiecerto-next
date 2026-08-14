/**
 * lib/atende-presencial.ts
 * Decide se um imóvel oferece "Agendar visita" (só onde o corretor atende
 * presencialmente — São Paulo e Grande São Paulo — e só quando já existe
 * preço real publicado; "Breve Lançamento" sem tabela de preço não tem
 * como ser visitado ainda). Fora disso, o CTA continua "Falar com consultor".
 */

import { GRANDE_SP } from './cidades-liberadas';

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

// GRANDE_SP guarda os nomes com acento ("são paulo") — comparar contra uma
// string já normalizada (sem acento) nunca bate. Normaliza o set uma vez aqui.
const GRANDE_SP_NORMALIZADO = new Set([...GRANDE_SP].map(normalize));

export function ofereceAgendarVisita(city: string | null | undefined, minPrice: number | null | undefined): boolean {
  return GRANDE_SP_NORMALIZADO.has(normalize(city || '')) && !!minPrice;
}

/**
 * Fora do estado de SP, o corretor não tem como atender presencialmente nem
 * fechar sozinho — precisaria intermediar com a incorporadora local, o que
 * consome tempo sem garantia de retorno. Nesses estados o CTA vira um
 * formulário (nome/e-mail/WhatsApp) em vez de abrir o WhatsApp dele direto:
 * o lead vira um registro que ele decide depois se vale repassar ou atender,
 * sem expor o número pra quem ele não vai conseguir atender.
 */
export function precisaFormularioContato(state: string | null | undefined): boolean {
  return normalize(state || '') !== normalize('SP');
}
