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

export function ofereceAgendarVisita(city: string | null | undefined, minPrice: number | null | undefined): boolean {
  return GRANDE_SP.has(normalize(city || '')) && !!minPrice;
}
