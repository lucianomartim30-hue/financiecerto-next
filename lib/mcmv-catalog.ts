/**
 * lib/mcmv-catalog.ts
 * Estatísticas do catálogo dentro do teto de preço de cada faixa do MCMV —
 * usado na página /imoveis/minha-casa-minha-vida. Os tetos são cumulativos
 * (Faixa 4 inclui tudo até 600 mil, o que também cobre as faixas menores):
 * quem se qualifica pra uma faixa mais alta pode comprar qualquer imóvel
 * dentro do teto dela, incluindo os mais baratos.
 */

import { kvGetCatalog } from './orulo-kv';
import { filterBreveLancamento, temPrecoReal } from './filtro-breve-lancamento';
import { filterLotesForaSP } from './filtro-lotes-fora-sp';

export interface MCMVFaixaStat {
  key: 'faixa12' | 'faixa3' | 'faixa4';
  teto: number;
  label: string;
  empreendimentos: number;
  unidades: number;
}

const TETOS: { key: MCMVFaixaStat['key']; teto: number; label: string }[] = [
  { key: 'faixa12', teto: 275000, label: 'Faixa 1 e 2' },
  { key: 'faixa3',  teto: 400000, label: 'Faixa 3' },
  { key: 'faixa4',  teto: 600000, label: 'Faixa 4' },
];

export async function getMCMVStats(): Promise<MCMVFaixaStat[]> {
  try {
    const catalog = await kvGetCatalog();
    if (!catalog || catalog.length === 0) return [];

    let base = catalog.filter(b => b.finality_norm !== 'comercial');
    base = filterBreveLancamento(base).filter(temPrecoReal);
    base = filterLotesForaSP(base);

    return TETOS.map(({ key, teto, label }) => {
      const dentro = base.filter(b => (b.min_price ?? 0) <= teto);
      const unidades = dentro.reduce((sum, b) => sum + (b.stock ?? 0), 0);
      return { key, teto, label, empreendimentos: dentro.length, unidades };
    });
  } catch {
    return [];
  }
}
