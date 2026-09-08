/** Helpers puros para URLs e nomes públicos de construtoras. */

const SUFIXO_REGIONAL = /(?:\s*[-–—|/]\s*|\s+)(?:SP|RJ|MG|PR|SC|RS|BA|PE|GO|DF)$/i;

export function nomePublicoConstrutora(nome: string): string {
  return nome.trim().replace(SUFIXO_REGIONAL, '').trim();
}
export function construtoraToSlug(nome: string): string {
  return nomePublicoConstrutora(nome)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

