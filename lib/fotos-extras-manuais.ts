/**
 * lib/fotos-extras-manuais.ts
 *
 * Fotos/artes adicionadas manualmente a imóveis que vêm da Órulo — usado
 * quando a Órulo não tem material bom (ex.: Califórnia/Tegra só tinha o logo
 * da construtora cortado como foto). Arquivos ficam em public/fotos-extras/<id>/.
 * Entram NO INÍCIO da galeria da ficha, antes das fotos da Órulo.
 */

export const FOTOS_EXTRAS_MANUAIS: Record<string, string[]> = {
  // Califórnia - Breve Lançamento (Tegra) — arte oficial de divulgação
  '83922': ['/fotos-extras/83922/breve-lancamento.jpg'],
};

export function comFotosExtras(id: string, photos: string[]): string[] {
  const extras = FOTOS_EXTRAS_MANUAIS[String(id)];
  if (!extras || extras.length === 0) return photos;
  return [...extras, ...photos.filter(p => !extras.includes(p))];
}
