/**
 * lib/fotos-extras-manuais.ts
 *
 * Ajustes manuais na galeria de imóveis que vêm da Órulo — usado quando a
 * Órulo não tem material bom (ex.: Califórnia/Tegra só tinha o logo da
 * construtora como "foto", que aparecia gigante e cortado no topo da ficha).
 *
 *  - FOTOS_EXTRAS_MANUAIS: arquivos em public/fotos-extras/<id>/, entram NO
 *    INÍCIO da galeria, antes das fotos da Órulo.
 *  - FOTOS_REMOVIDAS_MANUAIS: fotos da Órulo que não são foto do imóvel
 *    (logo, banner) — removidas da galeria por trecho da URL.
 */

export const FOTOS_EXTRAS_MANUAIS: Record<string, string[]> = {
  // Califórnia - Breve Lançamento (Tegra) — arte oficial de divulgação,
  // já no formato do topo da ficha (arte inteira, fundo desfocado nas laterais).
  '83922': ['/fotos-extras/83922/breve-lancamento.jpg'],
};

export const FOTOS_REMOVIDAS_MANUAIS: Record<string, string[]> = {
  // Logo "Tegra Parcerias" cadastrado como foto na Órulo.
  '83922': ['ta5nklh7qdhk4n8hsqjs4xv86ypz'],
};

export function comFotosExtras(id: string, photos: string[]): string[] {
  const chave = String(id);
  const removidas = FOTOS_REMOVIDAS_MANUAIS[chave] ?? [];
  const extras = FOTOS_EXTRAS_MANUAIS[chave] ?? [];
  if (removidas.length === 0 && extras.length === 0) return photos;
  const restantes = photos.filter(p => !extras.includes(p) && !removidas.some(r => p.includes(r)));
  return [...extras, ...restantes];
}
