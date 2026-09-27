/**
 * lib/finalidade-nr.ts
 * Detecta, pelo nome/título de um empreendimento ou de uma tipologia, se a
 * unidade é NR (Não Residencial) ou comercial — a Orulo confirmadamente
 * retorna finality "Residencial" errado nesses casos (ex.: empreendimento
 * "Mirad - NR"), então o nome tem prioridade sobre o campo cru da API.
 * Uma unidade NR nunca é elegível a MCMV/FGTS/SBPE residencial, só SFI.
 *
 * Sem dependências de propósito: usado tanto no servidor (lib/orulo-api.ts,
 * app/api/orulo/[id]/route.ts) quanto em componentes client (ficha do
 * imóvel), sem risco de puxar código server-only pro bundle do navegador.
 */
export function pareceNaoResidencial(...textos: (string | null | undefined)[]): boolean {
  const t = textos.filter(Boolean).join(' ')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
  return (
    t.includes('sala comercial') || t.includes('salas comerciais') ||
    t.includes('sala de escritorio') || t.includes('salas de escritorio') ||
    t.includes('escritorio') ||
    /\bloja\b/.test(t) || /\blojas\b/.test(t) ||
    /\boffice\b/.test(t) ||
    t.includes('centro empresarial') || t.includes('centro comercial') ||
    t.includes('torre comercial') || t.includes('torres comerciais') ||
    t.includes('nao residencial') ||
    /\bnr\b/.test(t) ||
    t.includes('salas nr') ||
    t.includes('laje corporativa') || t.includes('corporate')
  );
}
