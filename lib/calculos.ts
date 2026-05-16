// ─── Faixas MCMV (referência São Paulo, abril/2026) ──────────────────────────
export interface FaixaMCMV {
  numero: number;
  rendaMax: number;
  taxaRef: number;    // taxa nominal a.a. usada no cálculo (SIOPI, cotista FGTS, SP capital)
  taxaMin: number;
  taxaMax: number;
  teto: number;       // teto do valor do imóvel (SP, abril/2026)
  ltvMax: number;     // LTV máximo (fração do valor do imóvel que pode ser financiado)
  subsidioMax: number;
  label: string;
}

export const FAIXAS_MCMV: FaixaMCMV[] = [
  {
    numero: 1, rendaMax: 3200,
    taxaRef: 4.50, taxaMin: 4.00, taxaMax: 5.00,
    teto: 275000, ltvMax: 0.95, subsidioMax: 55000,
    label: 'Faixa 1',
  },
  {
    numero: 2, rendaMax: 5000,
    taxaRef: 6.50, taxaMin: 4.75, taxaMax: 7.00,
    teto: 275000, ltvMax: 0.90, subsidioMax: 29000,
    label: 'Faixa 2',
  },
  {
    numero: 3, rendaMax: 9600,
    taxaRef: 7.66, taxaMin: 7.66, taxaMax: 8.16,
    teto: 400000, ltvMax: 0.80, subsidioMax: 0,
    label: 'Faixa 3',
  },
  {
    numero: 4, rendaMax: 13000,
    taxaRef: 10.50, taxaMin: 9.00, taxaMax: 10.50,
    teto: 600000, ltvMax: 0.80, subsidioMax: 0,
    label: 'Faixa 4',
  },
];

// ─── Constantes gerais ────────────────────────────────────────────────────────
export const TAXA_SBPE_ANUAL  = 10.5;   // % a.a. referência mercado 2026
export const PRAZO_MAX_MESES  = 420;    // 35 anos
export const TR_MENSAL        = 0.1679; // % ao mês (abril/2026) — atualiza saldo devedor

// Legado — mantidos para não quebrar imports existentes
export const TETO_MCMV     = 350000;
export const TAXA_MCMV_ANUAL = 7.66;

// ─── Detectar faixa MCMV pela renda ─────────────────────────────────────────
export function detectarFaixaMCMV(rendaBruta: number): FaixaMCMV | null {
  return FAIXAS_MCMV.find(f => rendaBruta <= f.rendaMax) ?? null;
}

// ─── Curva de obra (dados reais SIOPI/Caixa) ─────────────────────────────────
const KP: [number, number][] = [
  [0, 0.229], [0.143, 0.306], [0.306, 0.495],
  [0.472, 0.709], [0.639, 0.846], [0.806, 0.896], [1.0, 1.0],
];

export function progCurva(m: number, n: number): number {
  if (m <= 1) return KP[0][1];
  if (m >= n) return 1.0;
  const t = (m - 1) / (n - 1);
  for (let i = 0; i < KP.length - 1; i++) {
    if (t >= KP[i][0] && t <= KP[i + 1][0]) {
      const f = (t - KP[i][0]) / (KP[i + 1][0] - KP[i][0]);
      return KP[i][1] + (KP[i + 1][1] - KP[i][1]) * f;
    }
  }
  return 1.0;
}

// ─── Parcela Price ────────────────────────────────────────────────────────────
export function parcelaPrice(pv: number, taxaAnual: number, meses: number): number {
  if (pv <= 0 || meses <= 0) return 0;
  const i = taxaAnual / 100 / 12;
  if (i === 0) return pv / meses;
  return pv * i / (1 - Math.pow(1 + i, -meses));
}

// ─── Capacidade de financiamento (renda → valor máximo financiado) ─────────────
// Versão básica (usada internamente)
export function capacidadeFinanciamento(
  rendaBruta: number,
  taxaAnual: number,
  prazoMeses: number,
  comprometimentoMax = 0.30,
): number {
  const pmMax = rendaBruta * comprometimentoMax;
  const i = taxaAnual / 100 / 12;
  if (i === 0) return pmMax * prazoMeses;
  return pmMax * (1 - Math.pow(1 + i, -prazoMeses)) / i;
}

// Versão com seguros incluídos no limite de 30% (como o banco calcula de verdade).
// Itera 3x para convergir: seguro depende do financiado, que depende do seguro.
function capacidadeComSeguros(
  rendaBruta: number,
  taxaAnual: number,
  prazoMeses: number,
  comprometimentoMax = 0.30,
): number {
  const pmMax = rendaBruta * comprometimentoMax;
  const i = taxaAnual / 100 / 12;
  const fator = i === 0 ? prazoMeses : (1 - Math.pow(1 + i, -prazoMeses)) / i;

  let cap = pmMax * fator; // estimativa inicial sem seguros
  for (let iter = 0; iter < 4; iter++) {
    const seg = calcularSeguros(cap);
    const pmAjustado = Math.max(0, pmMax - seg.total);
    cap = pmAjustado * fator;
  }
  return cap;
}

// ─── Seguros e taxa adm ───────────────────────────────────────────────────────
export function calcularSeguros(saldoDevedor: number): {
  mip: number; dfi: number; txAdm: number; total: number;
} {
  const mip   = Math.round(saldoDevedor * 0.000190);
  const dfi   = Math.round(saldoDevedor * 0.000093);
  const txAdm = 25;
  return { mip, dfi, txAdm, total: mip + dfi + txAdm };
}

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface ResultadoSimulacao {
  isMCMV: boolean;
  faixa: FaixaMCMV | null;
  valorImovel: number;
  valorFinanciado: number;
  entrada: number;
  fgts: number;
  prazoMeses: number;
  taxaAnual: number;
  parcelaPrimeiro: number;
  parcelaUltimo: number;
  seguros: ReturnType<typeof calcularSeguros>;
  comprometimento: number;
  naPlanta: boolean;
  prazoObraMeses: number;
  obraAlerta?: string;
}

export interface InputSimulacao {
  rendaBruta: number;
  fgts: number;
  entrada: number;
  valorImovel: number;
  prazoAnos: number;
  naPlanta: boolean;
  prazoObraAnos: number;
}

// ─── Simular (valor do imóvel informado) ──────────────────────────────────────
export function simular(input: InputSimulacao): ResultadoSimulacao {
  const { rendaBruta, fgts, entrada, valorImovel, prazoAnos, naPlanta, prazoObraAnos } = input;

  const prazoMeses     = prazoAnos * 12;
  const prazoObraMeses = prazoObraAnos * 12;

  const faixa   = detectarFaixaMCMV(rendaBruta);
  const isMCMV  = faixa !== null && valorImovel <= faixa.teto;
  const taxaAnual = isMCMV ? faixa!.taxaRef : TAXA_SBPE_ANUAL;

  const entradaTotal    = entrada + fgts;
  const valorFinanciado = Math.max(0, valorImovel - entradaTotal);

  const parcela1    = parcelaPrice(valorFinanciado, taxaAnual, prazoMeses);
  const saldoUltimo = valorFinanciado * 0.05;
  const parcelaU    = parcelaPrice(saldoUltimo, taxaAnual, 1);
  const seguros     = calcularSeguros(valorFinanciado);
  const comprometimento = ((parcela1 + seguros.total) / rendaBruta) * 100;

  let obraAlerta: string | undefined;
  if (naPlanta) {
    if (isMCMV) {
      const coefMedio    = 0.655;
      const encargaObra  = parcelaPrice(valorFinanciado, taxaAnual, prazoMeses);
      const encObraMedia = Math.round(encargaObra * coefMedio + seguros.total);
      obraAlerta = `Durante a obra (~${prazoObraMeses} meses), você paga juros evolutivos ao banco. Parcela média estimada: R$ ${encObraMedia.toLocaleString('pt-BR')}/mês (Crédito Associativo MCMV).`;
    } else {
      const inccMensal     = 0.006;
      const saldoConstr    = valorImovel * 0.20;
      const parcelaBase    = Math.round(saldoConstr / prazoObraMeses);
      const parcelaComINCC = Math.round(parcelaBase * (1 + inccMensal * prazoObraMeses / 2));
      obraAlerta = `No SBPE, o financiamento bancário é assinado na entrega das chaves (Habite-se). Durante a obra (~${prazoObraMeses} meses), você paga parcelas à construtora referentes à entrada parcelada, com correção pelo INCC. Parcela média estimada: R$ ${parcelaComINCC.toLocaleString('pt-BR')}/mês.`;
    }
  }

  return {
    isMCMV, faixa,
    valorImovel, valorFinanciado,
    entrada: entradaTotal, fgts,
    prazoMeses, taxaAnual,
    parcelaPrimeiro: Math.round(parcela1 + seguros.total),
    parcelaUltimo:   Math.round(parcelaU + seguros.total),
    seguros, comprometimento,
    naPlanta, prazoObraMeses, obraAlerta,
  };
}

// ─── Descobrir: renda → perfil de compra ──────────────────────────────────────
export interface ResultadoDescobrir {
  rendaBruta: number;
  fgts: number;
  entrada: number;
  faixa: FaixaMCMV | null;
  mcmv: {
    valorMaxImovel: number;
    valorFinanciado: number;
    parcela: number;
    comprometimento: number;
    elegivel: boolean;
    taxa: number;
  };
  sbpe: {
    valorMaxImovel: number;
    valorFinanciado: number;
    parcela: number;
    comprometimento: number;
  };
  oruloMinPrice: number;
  oruloMaxPrice: number;
}

export function descobrir(
  rendaBruta: number,
  fgts: number,
  entrada: number,
  prazoAnos = 35,
): ResultadoDescobrir {
  const prazoMeses   = prazoAnos * 12;
  const entradaTotal = entrada + fgts;

  // ── Faixa MCMV ──────────────────────────────────────────────────────────
  const faixa   = detectarFaixaMCMV(rendaBruta);
  const elegivel = faixa !== null;

  const taxaMCMV  = faixa?.taxaRef ?? TAXA_MCMV_ANUAL;
  const tetoMCMV  = faixa?.teto   ?? 275000;

  const capacMCMV      = elegivel ? capacidadeComSeguros(rendaBruta, taxaMCMV, prazoMeses, 0.30) : 0;
  const imovelMaxMCMV  = elegivel ? Math.min(capacMCMV + entradaTotal, tetoMCMV) : 0;
  const financiadoMCMV = elegivel ? Math.max(0, imovelMaxMCMV - entradaTotal) : 0;
  const parcelaMCMV    = parcelaPrice(financiadoMCMV, taxaMCMV, prazoMeses);
  const segurosMCMV    = calcularSeguros(financiadoMCMV);
  const comprMCMV      = financiadoMCMV > 0 ? ((parcelaMCMV + segurosMCMV.total) / rendaBruta) * 100 : 0;

  const elegMCMV = elegivel && imovelMaxMCMV >= 80000;

  // ── SBPE ────────────────────────────────────────────────────────────────
  const capacSBPE      = capacidadeComSeguros(rendaBruta, TAXA_SBPE_ANUAL, prazoMeses, 0.30);
  const imovelMaxSBPE  = Math.min(capacSBPE + entradaTotal, 2250000);
  const financiadoSBPE = Math.max(0, imovelMaxSBPE - entradaTotal);
  const parcelaSBPE    = parcelaPrice(financiadoSBPE, TAXA_SBPE_ANUAL, prazoMeses);
  const segurosSBPE    = calcularSeguros(financiadoSBPE);
  const comprSBPE      = ((parcelaSBPE + segurosSBPE.total) / rendaBruta) * 100;

  // ── Range Órulo ──────────────────────────────────────────────────────────
  const oruloMax = elegMCMV
    ? Math.round(Math.min(tetoMCMV, imovelMaxMCMV * 1.05))
    : Math.round(imovelMaxSBPE * 1.08);
  const oruloMin = elegMCMV
    ? Math.round(imovelMaxMCMV * 0.50)
    : Math.round(imovelMaxSBPE * 0.70);

  return {
    rendaBruta, fgts,
    entrada: entradaTotal,
    faixa,
    mcmv: {
      valorMaxImovel:  Math.round(imovelMaxMCMV),
      valorFinanciado: Math.round(financiadoMCMV),
      parcela:         Math.round(parcelaMCMV + segurosMCMV.total),
      comprometimento: comprMCMV,
      elegivel:        elegMCMV,
      taxa:            taxaMCMV,
    },
    sbpe: {
      valorMaxImovel:  Math.round(imovelMaxSBPE),
      valorFinanciado: Math.round(financiadoSBPE),
      parcela:         Math.round(parcelaSBPE + segurosSBPE.total),
      comprometimento: comprSBPE,
    },
    oruloMinPrice: oruloMin,
    oruloMaxPrice: oruloMax,
  };
}

// ─── Formatação ───────────────────────────────────────────────────────────────
export function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function parseBRL(str: string): number {
  return Number(str.replace(/\D/g, ''));
}
