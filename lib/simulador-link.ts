/**
 * lib/simulador-link.ts
 * Conector central entre a página de um imóvel e o simulador certo.
 *
 * Antes: a página do imóvel sempre linkava para `/simulador` genérico, sem
 * preço nem status, e reimplementava o cálculo localmente (BlocoFinanceiro).
 * Isso quebra o princípio de que o status do imóvel (pronto vs. na planta/
 * em obras) deve levar a jornadas financeiras diferentes (ver INFORME
 * ESTRATÉGICO, itens 11-12).
 *
 * Esta função decide o destino (`/simulador` ou `/simulador/na-planta`) e
 * monta os query params que cada um já sabe ler, para que o usuário não
 * precise redigitar nada que o site já sabe.
 */

import { normalizeStatus } from '@/lib/status';

export interface SimuladorLinkImovel {
  id?: string | null;
  name?: string | null;
  min_price?: number | null;
  max_price?: number | null;
  status?: string | null;
}

/** Contexto financeiro já conhecido do usuário (ex: sessionStorage `fc_sim_context`/`joao_sim_context`). */
export interface SimuladorLinkContext {
  renda?: number | null;
  entrada?: number | null;
  fgts?: number | null;
  idade?: number | null;
  /** Financiamento máximo já calculado (só relevante para o na-planta). */
  mcmv?: number | null;
  sbpe?: number | null;
}

function n(v: number | null | undefined): number {
  return v && v > 0 ? Math.round(v) : 0;
}

/**
 * Monta o link do simulador apropriado para um imóvel, já com o preço
 * preenchido. Imóvel pronto → `/simulador` (parcela + capacidade). Imóvel na
 * planta/em obras → `/simulador/na-planta` (fluxo de pagamento até a entrega).
 */
export function buildSimuladorLink(imovel: SimuladorLinkImovel, ctx?: SimuladorLinkContext): string {
  const valor = n(imovel.min_price) || n(imovel.max_price);
  const statusNorm = normalizeStatus(imovel.status || '');
  const naPlanta = statusNorm === 'na planta' || statusNorm === 'em obras';
  const desconhecido = statusNorm === 'unknown';

  if (naPlanta) {
    const params = new URLSearchParams();
    if (valor) params.set('valor', String(valor));
    params.set('estagio', statusNorm === 'em obras' ? 'obras' : 'lancamento');
    if (imovel.id)   params.set('imovelId', String(imovel.id));
    if (imovel.name) params.set('imovelName', imovel.name);
    if (ctx?.renda)  params.set('renda', String(n(ctx.renda)));
    if (ctx?.mcmv)   params.set('mcmv',  String(n(ctx.mcmv)));
    if (ctx?.sbpe)   params.set('sbpe',  String(n(ctx.sbpe)));
    if (ctx?.fgts)   params.set('fgts',  String(n(ctx.fgts)));
    return `/simulador/na-planta?${params.toString()}`;
  }

  // Status não identificado (Orulo não informou/valor inconsistente): cai no simulador
  // genérico como fallback seguro, mas leva um sinalizador para a página avisar o usuário
  // em vez de tratar o imóvel como "pronto" silenciosamente.
  const params = new URLSearchParams();
  if (valor) params.set('valorImovel', String(valor));
  if (imovel.id)   params.set('imovelId', String(imovel.id));
  if (imovel.name) params.set('imovelName', imovel.name);
  if (ctx?.renda)   params.set('renda', String(n(ctx.renda)));
  if (ctx?.entrada) params.set('entrada', String(n(ctx.entrada)));
  if (ctx?.idade)   params.set('idade', String(n(ctx.idade)));
  params.set('naPlanta', 'false');
  if (desconhecido) params.set('statusDesconhecido', '1');
  const qs = params.toString();
  return qs ? `/simulador?${qs}` : '/simulador';
}
