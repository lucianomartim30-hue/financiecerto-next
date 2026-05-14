// ─── Constantes ───────────────────────────────────────────────────────────────
export const TETO_MCMV = 350000;
export const TAXA_MCMV_ANUAL = 7.66; // % a.a. referência SIOPI
export const TAXA_SBPE_ANUAL = 10.5; // % a.a. referência mercado
export const PRAZO_MAX_MESES = 420;  // 35 anos

// ─── Curva de obra (dados reais SIOPI/Caixa) ─────────────────────────────────
const KP: [number, number][] = [
  [0, 0.229], [0.143, 0.306], [0.306, 0.495],
  [0.472, 0.709], [0.639, 0.846], [0.806, 0.896], [1.0, 1.0]
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

// ─── Parcela Price (SAC simplificado via Price) ───────────────────────────────
export function parcelaPrice(pv: number, taxaAnual: number, meses: number): number {
  if (pv <= 0 || meses <= 0) return 0;
  const i = taxaAnual / 100 / 12;
  if (i === 0) return pv / meses;
  return pv * i / (1 - Math.pow(1 + i, -meses));
}

// ─── Capacidade de financiamento (renda → valor máximo) ──────────────────────
export function capacidadeFinanciamento(
  rendaBruta: number,
  taxaAnual: number,
  prazoMeses: number,
  comprometimentoMax = 0.30
): number {
  const pmMax = rendaBruta * comprometimentoMax;
  const i = taxaAnual / 100 / 12;
  if (i === 0) return pmMax * prazoMeses;
  return pmMax * (1 - Math.pow(1 + i, -prazoMeses)) / i;
}

// ─── Seguros e taxa adm ───────────────────────────────────────────────────────
export function calcularSeguros(saldoDevedor: number): { mip: number; dfi: number; txAdm: number; total: number } {
  const mip = Math.round(saldoDevedor * 0.000190);
  const dfi = Math.round(saldoDevedor * 0.000093);
  const txAdm = 25;
  return { mip, dfi, txAdm, total: mip + dfi + txAdm };
}

// ─── Resultado principal do simulador ─────────────────────────────────────────
export interface ResultadoSimulacao {
  isMCMV: boolean;
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
  // Obra (se na planta)
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

export function simular(input: InputSimulacao): ResultadoSimulacao {
  const {
    rendaBruta, fgts, entrada, valorImovel,
    prazoAnos, naPlanta, prazoObraAnos
  } = input;

  const prazoMeses = prazoAnos * 12;
  const prazoObraMeses = prazoObraAnos * 12;
  const isMCMV = valorImovel <= TETO_MCMV;
  const taxaAnual = isMCMV ? TAXA_MCMV_ANUAL : TAXA_SBPE_ANUAL;

  const entradaTotal = entrada + fgts;
  const valorFinanciado = Math.max(0, valorImovel - entradaTotal);

  const parcela1 = parcelaPrice(valorFinanciado, taxaAnual, prazoMeses);
  const saldoUltimo = valorFinanciado * 0.05; // aproximação saldo final SAC
  const parcelaU = parcelaPrice(saldoUltimo, taxaAnual, 1);
  const seguros = calcularSeguros(valorFinanciado);
  const comprometimento = ((parcela1 + seguros.total) / rendaBruta) * 100;

  // Alerta de obra
  let obraAlerta: string | undefined;
  if (naPlanta) {
    if (isMCMV) {
      // MCMV: juros evolutivos ao banco
      const coefMedio = 0.655;
      const encargaObra = parcelaPrice(valorFinanciado, taxaAnual, prazoMeses);
      const encObraMedia = Math.round(encargaObra * coefMedio + seguros.total);
      obraAlerta = `Durante a obra (~${prazoObraMeses} meses), você paga juros evolutivos ao banco. Parcela média estimada: R$ ${encObraMedia.toLocaleString('pt-BR')}/mês (Crédito Associativo MCMV).`;
    } else {
      // SBPE: INCC sobre parcelas da construtora
      const inccMensal = 0.006;
      const saldoConstr = valorImovel * 0.20;
      const parcelaBase = Math.round(saldoConstr / prazoObraMeses);
      const parcelaComINCC = Math.round(parcelaBase * (1 + inccMensal * prazoObraMeses / 2));
      obraAlerta = `No SBPE, o financiamento bancário é assinado na entrega das chaves (Emissão de Habite-se). Durante a obra (~${prazoObraMeses} meses), você paga parcelas à construtora referentes à entrada parcelada, com correção pelo INCC. Parcela média estimada: R$ ${parcelaComINCC.toLocaleString('pt-BR')}/mês.`;
    }
  }

  return {
    isMCMV,
    valorImovel,
    valorFinanciado,
    entrada: entradaTotal,
    fgts,
    prazoMeses,
    taxaAnual,
    parcelaPrimeiro: Math.round(parcela1 + seguros.total),
    parcelaUltimo: Math.round(parcelaU + seguros.total),
    seguros,
    comprometimento,
    naPlanta,
    prazoObraMeses,
    obraAlerta,
  };
}

// ─── Descobrir: renda → perfil de compra ──────────────────────────────────────
export interface ResultadoDescobrir {
  rendaBruta: number;
  fgts: number;
  entrada: number;
  // MCMV
  mcmv: {
    valorMaxImovel: number;
    valorFinanciado: number;
    parcela: number;
    comprometimento: number;
    elegivel: boolean;
  };
  // SBPE
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
  prazoAnos = 35
): ResultadoDescobrir {
  const prazoMeses = prazoAnos * 12;
  const entradaTotal = entrada + fgts;

  // MCMV
  const capacMCMV = capacidadeFinanciamento(rendaBruta, TAXA_MCMV_ANUAL, prazoMeses, 0.30);
  const imovelMaxMCMV = Math.min(capacMCMV + entradaTotal, TETO_MCMV);
  const financiadoMCMV = Math.max(0, imovelMaxMCMV - entradaTotal);
  const parcelaMCMV = parcelaPrice(financiadoMCMV, TAXA_MCMV_ANUAL, prazoMeses);
  const segurosMCMV = calcularSeguros(financiadoMCMV);
  const comprMCMV = ((parcelaMCMV + segurosMCMV.total) / rendaBruta) * 100;

  // SBPE
  const capacSBPE = capacidadeFinanciamento(rendaBruta, TAXA_SBPE_ANUAL, prazoMeses, 0.30);
  const imovelMaxSBPE = Math.min(capacSBPE + entradaTotal, 2250000);
  const financiadoSBPE = Math.max(0, imovelMaxSBPE - entradaTotal);
  const parcelaSBPE = parcelaPrice(financiadoSBPE, TAXA_SBPE_ANUAL, prazoMeses);
  const segurosSBPE = calcularSeguros(financiadoSBPE);
  const comprSBPE = ((parcelaSBPE + segurosSBPE.total) / rendaBruta) * 100;

  // Preços para Órulo
  const elegivel = imovelMaxMCMV >= 100000;
  const oruloMax = elegivel
    ? Math.round(Math.min(TETO_MCMV, imovelMaxMCMV * 1.05))
    : Math.round(imovelMaxSBPE * 1.08);
  const oruloMin = elegivel
    ? Math.round(imovelMaxMCMV * 0.50)
    : Math.round(imovelMaxSBPE * 0.70);

  return {
    rendaBruta,
    fgts,
    entrada: entradaTotal,
    mcmv: {
      valorMaxImovel: Math.round(imovelMaxMCMV),
      valorFinanciado: Math.round(financiadoMCMV),
      parcela: Math.round(parcelaMCMV + segurosMCMV.total),
      comprometimento: comprMCMV,
      elegivel,
    },
    sbpe: {
      valorMaxImovel: Math.round(imovelMaxSBPE),
      valorFinanciado: Math.round(financiadoSBPE),
      parcela: Math.round(parcelaSBPE + segurosSBPE.total),
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
