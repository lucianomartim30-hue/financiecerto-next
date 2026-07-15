// ─── Faixas MCMV (referência São Paulo — Portaria MCID nº 333/2026) ──────────
// Fonte: Portaria MCID nº 333, de 30/03/2026 (vigente desde 22/04/2026) e Caixa Econômica Federal
// F1: até R$ 3.200 | F2: R$ 3.200 – R$ 5.000 | F3: até R$ 9.600 | F4: até R$ 13.000
export interface FaixaMCMV {
  numero: number;
  rendaMax: number;
  taxaRef: number;
  taxaMin: number;
  taxaMax: number;
  teto: number;
  ltvMax: number;
  ltvSAC: number;
  subsidioMax: number;
  label: string;
}

export const FAIXAS_MCMV: FaixaMCMV[] = [
  {
    // Faixa 1 — subsídio até R$ 55.000 · juros 4,00–5,00% a.a.
    numero: 1, rendaMax: 3200,
    taxaRef: 4.50, taxaMin: 4.00, taxaMax: 5.00,
    teto: 275000, ltvMax: 0.95, ltvSAC: 0.95, subsidioMax: 55000,
    label: 'Faixa 1',
  },
  {
    // Faixa 2 — subsídio decrescente · escala deslizante por renda (Portaria MCID 333/2026)
    // SP/Sul/Sudeste: cotista 5,00% (renda R$3.200) → 6,50% (renda R$5.000)
    //                 sem FGTS  5,50% (renda R$3.200) → 7,00% (renda R$5.000)
    // taxaRef = referência visual (topo cotista SP) | taxaMin/taxaMax = extremos da faixa
    numero: 2, rendaMax: 5000,
    taxaRef: 6.50, taxaMin: 5.00, taxaMax: 7.00,
    teto: 275000, ltvMax: 0.90, ltvSAC: 0.90, subsidioMax: 55000,
    label: 'Faixa 2',
  },
  {
    // Faixa 3 — sem subsídio · cotista 7,66% | sem FGTS 8,16% (Portaria MCID 333/2026)
    // A distinção cotista/não-cotista persiste na F3 (diferença de 0,5 p.p.)
    numero: 3, rendaMax: 9600,
    taxaRef: 8.16, taxaMin: 7.66, taxaMax: 8.16,
    teto: 400000, ltvMax: 0.80, ltvSAC: 0.80, subsidioMax: 0,
    label: 'Faixa 3',
  },
  {
    // Faixa 4 — sem subsídio · 10,50% a.a. flat (sem distinção cotista — Portaria 333/2026)
    numero: 4, rendaMax: 13000,
    taxaRef: 10.50, taxaMin: 10.50, taxaMax: 10.50,
    teto: 600000, ltvMax: 0.80, ltvSAC: 0.80, subsidioMax: 0,
    label: 'Faixa 4',
  },
];

// ─── Constantes gerais ────────────────────────────────────────────────────────
export const TAXA_SBPE_ANUAL  = 11.19;  // Caixa — correntista (referência 2026)
export const TAXA_SBPE_BALCAO = 11.49;  // Caixa — balcão
export const TAXA_SFI_ANUAL   = 12.5;
export const TETO_SFH         = 2_250_000;

// ─── Taxas SBPE dos principais bancos (referência julho/2026 + TR) ────────────
// Fonte: simuladores oficiais dos bancos. Podem variar por perfil, LTV e relacionamento.
export interface BancoSBPE {
  banco: string;
  taxa: number;       // % a.a. nominal
  destaque?: boolean; // menor taxa / mais vantajoso
  obs?: string;
}
export const BANCOS_SBPE: BancoSBPE[] = [
  { banco: 'Caixa Econômica Federal', taxa: 11.19, destaque: true, obs: 'Correntista' },
  { banco: 'Caixa Econômica Federal', taxa: 11.49, obs: 'Balcão (sem conta)' },
  { banco: 'Banco Inter',             taxa: 11.49, obs: 'Digital — sem tarifa de adm' },
  { banco: 'Bradesco',                taxa: 11.69 },
  { banco: 'Santander',               taxa: 11.74 },
  { banco: 'Itaú',                    taxa: 11.89 },
  { banco: 'Banco do Brasil',         taxa: 11.97, obs: 'Correntista BB' },
];
export const LTV_SBPE_PRICE   = 0.70;
export const LTV_SBPE_SAC     = 0.80;
export const PRAZO_MAX_MESES  = 420;
export const TR_MENSAL        = 0.17;

// Legado
export const TETO_MCMV     = 350000;
export const TAXA_MCMV_ANUAL = 7.91; // fallback F3 médio cotista/sem-FGTS (7,66+8,16)/2

// ─── TR histórica — últimos 36 meses (Jun/2023 → Mai/2026) ───────────────────
// Fonte: Banco Central do Brasil — Série 226 | Atualizado: Mai/2026
export const TR_HISTORICO_36M: { label: string; tr: number }[] = [
  { label: 'Jun/23', tr: 0.1799 }, { label: 'Jul/23', tr: 0.1581 },
  { label: 'Ago/23', tr: 0.2160 }, { label: 'Set/23', tr: 0.1130 },
  { label: 'Out/23', tr: 0.1056 }, { label: 'Nov/23', tr: 0.0775 },
  { label: 'Dez/23', tr: 0.0690 }, { label: 'Jan/24', tr: 0.0875 },
  { label: 'Fev/24', tr: 0.0079 }, { label: 'Mar/24', tr: 0.0331 },
  { label: 'Abr/24', tr: 0.1023 }, { label: 'Mai/24', tr: 0.0870 },
  { label: 'Jun/24', tr: 0.0365 }, { label: 'Jul/24', tr: 0.0739 },
  { label: 'Ago/24', tr: 0.0707 }, { label: 'Set/24', tr: 0.0675 },
  { label: 'Out/24', tr: 0.0977 }, { label: 'Nov/24', tr: 0.0649 },
  { label: 'Dez/24', tr: 0.0822 }, { label: 'Jan/25', tr: 0.1690 },
  { label: 'Fev/25', tr: 0.1324 }, { label: 'Mar/25', tr: 0.1092 },
  { label: 'Abr/25', tr: 0.1689 }, { label: 'Mai/25', tr: 0.1712 },
  { label: 'Jun/25', tr: 0.1699 }, { label: 'Jul/25', tr: 0.1758 },
  { label: 'Ago/25', tr: 0.1722 }, { label: 'Set/25', tr: 0.1742 },
  { label: 'Out/25', tr: 0.1758 }, { label: 'Nov/25', tr: 0.1634 },
  { label: 'Dez/25', tr: 0.1742 }, { label: 'Jan/26', tr: 0.1718 },
  { label: 'Fev/26', tr: 0.1207 }, { label: 'Mar/26', tr: 0.1735 },
  { label: 'Abr/26', tr: 0.1679 }, { label: 'Mai/26', tr: 0.1687 },
];

export interface MesHistoricoTR {
  label: string;
  tr: number;               // TR do mês (%)
  saldoInicial: number;     // saldo devedor antes da correção TR
  correcaoTR: number;       // R$ adicionados ao saldo pela TR
  saldoCorrigido: number;   // saldo após correção TR
  amort: number;            // amortização mensal fixa (SAC)
  jurosComTR: number;       // juros sobre saldo corrigido
  parcelaComTR: number;     // parcela real (com TR)
  parcelaSemTR: number;     // parcela hipotética sem TR (comparação)
  diferencaTR: number;      // impacto da TR nesta parcela (R$)
}

export interface ResultadoHistoricoTR {
  meses: MesHistoricoTR[];
  totalCorrecaoSaldo: number;   // soma das correções mensais ao saldo devedor
  totalImpactoParcelas: number; // soma dos impactos nas parcelas (total a mais pago)
  saldoFinalComTR: number;      // saldo devedor ao final do período com TR
  saldoFinalSemTR: number;      // saldo devedor ao final do período sem TR
  diferencaSaldo: number;       // saldo maior por causa da TR acumulada
}

// Simula um financiamento SAC aplicando a TR histórica real mês a mês.
// Retorna a evolução de 36 meses comparando COM TR vs SEM TR.
export function simularHistoricoTR(
  pv: number,
  taxaAnualPct: number,
  prazoMeses: number,
): ResultadoHistoricoTR {
  const taxaMensal = (1 + taxaAnualPct / 100) ** (1 / 12) - 1;
  const amort = pv / prazoMeses; // amortização mensal fixa — SAC

  let saldoComTR = pv;
  let saldoSemTR = pv;

  let totalCorrecaoSaldo = 0;
  let totalImpactoParcelas = 0;

  const meses: MesHistoricoTR[] = [];

  for (const { label, tr } of TR_HISTORICO_36M) {
    // ── COM TR ────────────────────────────────────────────────────────────────
    const saldoInicial   = saldoComTR;
    const correcaoTR     = saldoComTR * (tr / 100);
    const saldoCorrigido = saldoComTR + correcaoTR;
    const jurosComTR     = saldoCorrigido * taxaMensal;
    const parcelaComTR   = amort + jurosComTR;
    saldoComTR = Math.max(0, saldoCorrigido - amort);

    // ── SEM TR (hipotético) ───────────────────────────────────────────────────
    const jurosSemTR   = saldoSemTR * taxaMensal;
    const parcelaSemTR = amort + jurosSemTR;
    saldoSemTR = Math.max(0, saldoSemTR - amort);

    totalCorrecaoSaldo   += correcaoTR;
    totalImpactoParcelas += parcelaComTR - parcelaSemTR;

    meses.push({
      label, tr,
      saldoInicial, correcaoTR, saldoCorrigido,
      amort, jurosComTR, parcelaComTR, parcelaSemTR,
      diferencaTR: parcelaComTR - parcelaSemTR,
    });
  }

  return {
    meses,
    totalCorrecaoSaldo,
    totalImpactoParcelas,
    saldoFinalComTR: saldoComTR,
    saldoFinalSemTR: saldoSemTR,
    diferencaSaldo: saldoComTR - saldoSemTR,
  };
}

// ─── Taxa efetiva MCMV (escala deslizante F2 + taxa flat F3/F4) ──────────────
// Portaria MCID 333/2026 — São Paulo / Sul / Sudeste / Centro-Oeste
// F2: escala linear por renda (5,00%→6,50% cotista | 5,50%→7,00% sem FGTS)
// F3: 8,16% flat (sem distinção cotista)  |  F4: 10,50% flat
export function taxaEfetivaMCMV(
  faixa: FaixaMCMV,
  rendaBruta: number,
  cotista: boolean,
): number {
  if (faixa.numero === 2) {
    // Interpolação linear dentro da Faixa 2
    const t = Math.min(1, Math.max(0, (rendaBruta - 3200) / (5000 - 3200)));
    const taxa = cotista
      ? 5.00 + t * 1.50  // 5,00% (R$3.200) → 6,50% (R$5.000)
      : 5.50 + t * 1.50; // 5,50% (R$3.200) → 7,00% (R$5.000)
    return Math.round(taxa * 1000) / 1000; // arredonda para 3 casas
  }
  // F1, F3, F4: taxa única por cotista/não-cotista
  return cotista ? faixa.taxaMin : faixa.taxaMax;
}

// ─── Detectar faixa MCMV ─────────────────────────────────────────────────────
export function detectarFaixaMCMV(rendaBruta: number): FaixaMCMV | null {
  if (rendaBruta <= 0) return null;
  return FAIXAS_MCMV.find(f => rendaBruta <= f.rendaMax) ?? null;
}

// Explica por que o financiamento e SBPE (nao MCMV)
// renda alta OU valor do imovel acima do teto da faixa
export function motivoSBPE(rendaBruta: number, valorImovel: number): string {
  if (rendaBruta <= 0) return 'Informe a renda para verificar elegibilidade no MCMV';
  const faixa = FAIXAS_MCMV.find(f => rendaBruta <= f.rendaMax);
  if (!faixa) {
    const maxRenda = FAIXAS_MCMV[FAIXAS_MCMV.length - 1].rendaMax;
    return 'Renda acima do limite MCMV (max ' + maxRenda.toLocaleString('pt-BR') + '/mes) - use o SBPE';
  }
  if (valorImovel > faixa.teto) {
    return 'Imovel acima do teto ' + faixa.label + ' MCMV (' + faixa.teto.toLocaleString('pt-BR') + ') - use o SBPE';
  }
  return 'SBPE';
}

// ─── MIP por faixa etária (coeficientes reais SIOPI/Caixa) ───────────────────
// Âncoras do contrato: 41–45 anos = 0,000190 (fase obra); 46–50 = 0,000297 (amort.)
// Calibrado: Σ(413 meses, PV=267k, idadeInício=46) = R$ 906.528,36
export function getMIPCoeff(idade: number): number {
  if (idade <= 25) return 0.000041;
  if (idade <= 30) return 0.000055;
  if (idade <= 35) return 0.000078;
  if (idade <= 40) return 0.000119;
  if (idade <= 45) return 0.000190;
  if (idade <= 50) return 0.000297;
  if (idade <= 55) return 0.000739;
  if (idade <= 60) return 0.001139;
  if (idade <= 65) return 0.001801;
  if (idade <= 70) return 0.002737;
  if (idade <= 75) return 0.004174;
  if (idade <= 80) return 0.006526;
  return 0.009321;
}

// ─── Seguros com MIP etário ───────────────────────────────────────────────────
export function calcularSeguros(saldoDevedor: number, idade?: number): {
  mip: number; dfi: number; txAdm: number; total: number;
} {
  const mipCoeff = idade ? getMIPCoeff(idade) : 0.000190;
  const mip   = Math.round(saldoDevedor * mipCoeff);
  const dfi   = Math.round(saldoDevedor * 0.000093);
  const txAdm = 25;
  return { mip, dfi, txAdm, total: mip + dfi + txAdm };
}

// ─── Parcela Price ────────────────────────────────────────────────────────────
export function parcelaPrice(pv: number, taxaAnual: number, meses: number): number {
  if (pv <= 0 || meses <= 0) return 0;
  const i = taxaAnual / 100 / 12;
  if (i === 0) return pv / meses;
  return pv * i / (1 - Math.pow(1 + i, -meses));
}

// ─── Primeira parcela SAC ─────────────────────────────────────────────────────
export function parcelaSAC1(pv: number, taxaAnual: number, meses: number): number {
  if (pv <= 0 || meses <= 0) return 0;
  const i = taxaAnual / 100 / 12;
  return (pv / meses) + (pv * i);
}

// ─── Última parcela SAC ───────────────────────────────────────────────────────
export function parcelaSACUltima(pv: number, taxaAnual: number, meses: number): number {
  if (pv <= 0 || meses <= 0) return 0;
  const i = taxaAnual / 100 / 12;
  const amort = pv / meses;
  const saldoUltimo = amort; // saldo antes da última parcela
  return amort + saldoUltimo * i;
}

// ─── Total pago Price (sem seguros) ──────────────────────────────────────────
export function totalPagoPrice(pv: number, taxaAnual: number, meses: number): number {
  return parcelaPrice(pv, taxaAnual, meses) * meses;
}

// ─── Total pago SAC (sem seguros) ─────────────────────────────────────────────
export function totalPagoSAC(pv: number, taxaAnual: number, meses: number): number {
  if (pv <= 0 || meses <= 0) return 0;
  const i = taxaAnual / 100 / 12;
  const amort = pv / meses;
  let total = 0;
  let saldo = pv;
  for (let t = 0; t < meses; t++) {
    total += amort + saldo * i;
    saldo -= amort;
  }
  return total;
}

// ─── Subsídio estimado (portado do contrato SIOPI/Caixa) ─────────────────────
// F1/F2 elegíveis; requer cotista + primeiroImovel + sem benefício anterior
export function calcSubsidioEstimado(
  faixa: FaixaMCMV,
  rendaBruta: number,
  valorImovel: number,
  cotista: boolean,
  primeiroImovel: boolean,
  jaRecebeuBeneficio: boolean,
  dependentes = 0,
): number {
  if (!cotista || !primeiroImovel || jaRecebeuBeneficio) return 0;
  if (faixa.numero >= 3) return 0;

  // Portaria MCID nº 333/2026 — curva contínua F1→F2
  // F1 (renda ≤ 3.200): de 1,0 (renda→0) até 0,618 (renda=3.200) → R$55.000 → R$33.990
  // F2 (3.200–5.000):   de 0,618 até 0,018 (renda=5.000)          → R$33.990 → R$990
  const F1_TETO = 3200;
  const F2_TETO = 5000;
  let fator: number;
  if (faixa.numero === 1) {
    fator = 1.0 - (rendaBruta / F1_TETO) * 0.382;
  } else {
    fator = 0.618 - ((rendaBruta - F1_TETO) / (F2_TETO - F1_TETO)) * 0.600;
  }

  const numDep = Math.max(0, dependentes);
  if (numDep > 0) fator = fator * (1 + Math.min(0.10, numDep * 0.03));
  fator = Math.max(0.05, Math.min(1, fator));

  const subCalc = faixa.subsidioMax * fator;
  // Limite real: subsídio não pode superar o valor financiável (LTV × preço).
  // Não usar % arbitrário do valor do imóvel — isso quebrava a monotonia:
  // imóveis baratos (renda baixa) recebiam teto menor e, paradoxalmente, subsídio
  // menor do que imóveis mais caros (renda maior).
  return Math.round(Math.min(subCalc, valorImovel * faixa.ltvMax));
}

// ─── Capacidade de financiamento com seguros ─────────────────────────────────
// CORRIGIDO: Iteração convergente para encontrar cap onde:
//   parcelaPrice(cap, taxa, prazo) + seguros(cap)/prazo ≤ pmMax
function capacidadeComSeguros(
  rendaBruta: number,
  taxaAnual: number,
  prazoMeses: number,
  comprometimentoMax = 0.30,
  idade = 35,
): number {
  const pmMax = rendaBruta * comprometimentoMax;
  const i = taxaAnual / 100 / 12;

  // NOTA: calcularSeguros() retorna um prêmio MENSAL (MIP+DFI+txAdm sobre o saldo
  // devedor atual) — não um total a diluir pelo prazo. Por isso soma-se direto à parcela.
  if (i === 0) {
    let cap = pmMax * prazoMeses;
    for (let iter = 0; iter < 6; iter++) {
      const seg = calcularSeguros(cap, idade);
      cap = (pmMax - seg.total) * prazoMeses;
      cap = Math.max(0, cap);
    }
    return cap;
  }

  const fator = (1 - Math.pow(1 + i, -prazoMeses)) / i;

  // Método de Newton: buscar cap tal que parcelaPrice(cap) + seguros(cap) = pmMax
  let cap = pmMax * fator; // chute inicial (sem seguros)
  for (let iter = 0; iter < 10; iter++) {
    const seg = calcularSeguros(cap, idade);
    const parcela = parcelaPrice(cap, taxaAnual, prazoMeses);
    const erro = parcela + seg.total - pmMax;

    if (Math.abs(erro) < 0.01) break; // Convergiu (erro < 1 centavo)

    // Derivada total: d(parcela)/d(cap) = 1/fator ; d(seguros)/d(cap) ≈ mipCoeff + dfiCoeff
    const mipCoeff = getMIPCoeff(idade);
    const derivada = 1 / fator + mipCoeff + 0.000093;

    cap = cap - erro / derivada;
    cap = Math.max(0, cap);
  }

  return cap;
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

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface ResultadoSimulacao {
  isMCMV: boolean;
  isSFI: boolean;
  modalidade: 'MCMV' | 'SBPE' | 'SFI';
  faixa: FaixaMCMV | null;
  /** Faixa determinada apenas pela renda (independente do imóvel) — usada para mensagens explicativas */
  faixaRenda: FaixaMCMV | null;
  valorImovel: number;
  valorFinanciado: number;
  entrada: number;
  fgts: number;
  fgtsUsado: number;
  subsidioEstimado: number;
  prazoMeses: number;
  taxaAnual: number;
  // Price
  parcelaPrimeiro: number;
  parcelaUltimo: number;
  totalPagoPrice: number;
  // SAC
  parcelaSACPrimeiro: number;
  parcelaSACUltimo: number;
  totalPagoSAC: number;
  // Seguros
  seguros: ReturnType<typeof calcularSeguros>;
  comprometimento: number;
  naPlanta: boolean;
  prazoObraMeses: number;
  obraAlerta?: string;
  // Saúde
  saudeLabel: 'ótimo' | 'bom' | 'atenção' | 'risco';
  ltvUsado: number;
  ltvMax: number;
  alertas: string[];
  // BLOQUEIO: Simulação é inviável (não mostre como "aprovada")
  bloqueado: boolean;
  motivoBloqueio?: string;
}

export interface InputSimulacao {
  rendaBruta: number;
  fgts: number;
  entrada: number;
  valorImovel: number;
  prazoAnos: number;
  naPlanta: boolean;
  prazoObraAnos: number;
  idadeProponente?: number;
  cotista?: boolean;
  primeiroImovel?: boolean;
  jaRecebeuBeneficio?: boolean;
  temImovelMunicipio?: boolean;
  dependentes?: number;
  tipoImovel?: 'residencial' | 'comercial'; // 'residencial' padrão
}

// ─── Simular (valor do imóvel informado) ──────────────────────────────────────
export function simular(input: InputSimulacao): ResultadoSimulacao {
  const {
    rendaBruta, fgts, entrada, valorImovel, prazoAnos, naPlanta, prazoObraAnos,
    idadeProponente = 35,
    cotista = true, primeiroImovel = true,
    jaRecebeuBeneficio = false, temImovelMunicipio = false,
    dependentes = 0,
    tipoImovel = 'residencial',
  } = input;

  // VALIDAÇÃO: Imóvel comercial NÃO pode usar benefícios residenciais
  const isComercial = tipoImovel === 'comercial';

  const prazoMaxPorIdade = Math.max(60, Math.floor((80.5 - idadeProponente) * 12));
  const prazoMeses       = Math.min(prazoAnos * 12, Math.min(prazoMaxPorIdade, PRAZO_MAX_MESES));
  const prazoObraMeses   = prazoObraAnos * 12;

  // Faixa baseada apenas na renda (menor faixa onde renda ≤ rendaMax)
  const faixaRenda   = detectarFaixaMCMV(rendaBruta);
  // VALIDAÇÃO: Comercial NÃO é elegível ao MCMV (programa habitacional)
  const mcmvElegivel = !isComercial && faixaRenda !== null && !temImovelMunicipio && !jaRecebeuBeneficio;

  // CORREÇÃO: Faixa é SEMPRE determinada pela renda, NUNCA pelo imóvel.
  // Se o imóvel ultrapassar o teto da faixa, a simulação é BLOQUEADA (não reclassificada).
  // A pessoa recebe a orientação: "Este imóvel está fora do teto MCMV da sua faixa. Use SBPE ou aumente entrada."
  let faixa: FaixaMCMV | null = mcmvElegivel ? faixaRenda : null; // ← só existe se elegível (residencial, sem restrições)
  let imvelAcimaTetoComSubsidio = false;

  if (mcmvElegivel && valorImovel > faixa!.teto) {
    // Verificar se subsídio "bridga" a diferença
    const subsidioEstimado = calcSubsidioEstimado(faixa!, rendaBruta, valorImovel, cotista, primeiroImovel, jaRecebeuBeneficio, dependentes);
    if (subsidioEstimado > 0 && valorImovel - subsidioEstimado <= faixa!.teto) {
      // Subsídio salva → faixa fica como está (F2, por exemplo)
      imvelAcimaTetoComSubsidio = true;
    } else {
      // Imóvel não cabe mesmo com subsídio → será tratado como SBPE
      faixa = null;
    }
  }
  const isMCMV = faixa !== null;

  // VALIDAÇÃO: Comercial NÃO pode usar FGTS (programa para habitação)
  const fgtsElegivel   = !isComercial && cotista && primeiroImovel && !temImovelMunicipio;
  const fgtsUsado      = fgtsElegivel ? fgts : 0;

  const subsidioEstimado = isMCMV && faixa
    ? calcSubsidioEstimado(faixa, rendaBruta, valorImovel, cotista, primeiroImovel, jaRecebeuBeneficio, dependentes)
    : 0;

  const isSFI      = !isMCMV && valorImovel > TETO_SFH;
  const modalidade: 'MCMV' | 'SBPE' | 'SFI' = isMCMV ? 'MCMV' : isSFI ? 'SFI' : 'SBPE';
  // F2: escala deslizante por renda (5,00%–6,50% cotista | 5,50%–7,00% sem FGTS)
  // F3/F4: taxa flat 8,16%/10,50% — sem distinção cotista
  const taxaAnual  = isMCMV
    ? taxaEfetivaMCMV(faixa!, rendaBruta, fgtsElegivel)
    : isSFI ? TAXA_SFI_ANUAL : TAXA_SBPE_ANUAL;

  const entradaTotal    = entrada + fgtsUsado + subsidioEstimado;
  const valorFinanciado = Math.max(0, valorImovel - entradaTotal);

  const seguros = calcularSeguros(valorFinanciado, idadeProponente);

  // Price
  const pmt1 = parcelaPrice(valorFinanciado, taxaAnual, prazoMeses);
  const pmtU = parcelaPrice(valorFinanciado * 0.05, taxaAnual, 1);
  const totalPrice = totalPagoPrice(valorFinanciado, taxaAnual, prazoMeses);

  // SAC
  const sac1 = parcelaSAC1(valorFinanciado, taxaAnual, prazoMeses);
  const sacU = parcelaSACUltima(valorFinanciado, taxaAnual, prazoMeses);
  const totalSAC = totalPagoSAC(valorFinanciado, taxaAnual, prazoMeses);

  const comprometimento = ((pmt1 + seguros.total) / rendaBruta) * 100;

  // LTV
  const ltvMax = isMCMV ? (faixa?.ltvMax ?? 0.80) : LTV_SBPE_PRICE;
  const ltvUsado = valorImovel > 0 ? valorFinanciado / valorImovel : 0;

  // Saúde
  const saudeLabel: ResultadoSimulacao['saudeLabel'] =
    comprometimento <= 20 ? 'ótimo' :
    comprometimento <= 25 ? 'bom' :
    comprometimento <= 30 ? 'atenção' : 'risco';

  // Alertas e Bloqueios
  const alertas: string[] = [];
  let bloqueado = false;
  let motivoBloqueio: string | undefined;

  // ALERTA PRINCIPAL: Imóvel comercial
  if (isComercial) {
    alertas.push('⚠️ Imóvel COMERCIAL: Benefícios MCMV, FGTS e subsídio habitacional NÃO se aplicam. Apenas SFI (Sistema de Financiamento Imobiliário) é disponível.');
  }

  // BLOQUEIO 1: Comprometimento > 30%
  if (comprometimento > 30) {
    bloqueado = true;
    motivoBloqueio = `Comprometimento de ${comprometimento.toFixed(1)}% ultrapassa o limite de 30% — banco reprova créditos acima disso.`;
    alertas.push('Comprometimento acima de 30% — simulação BLOQUEADA.');
  }

  // BLOQUEIO 2: LTV acima do limite
  if (ltvUsado > ltvMax + 0.01) {
    bloqueado = true;
    motivoBloqueio = `LTV de ${(ltvUsado * 100).toFixed(0)}% ultrapassa o limite de ${(ltvMax * 100).toFixed(0)}% — entrada insuficiente.`;
    alertas.push(`LTV ultrapassa limite — simulação BLOQUEADA.`);
  }

  // ALERTA (não bloqueia): FGTS inelegível
  if (!fgtsElegivel && fgts > 0 && !isComercial) {
    alertas.push('FGTS não pode ser usado: verifique se é cotista há 3+ anos e se é o primeiro imóvel.');
  }

  // ALERTA (não bloqueia): Subsídio estimado
  if (subsidioEstimado > 0) {
    alertas.push(`Subsídio estimado de ${formatBRL(subsidioEstimado)} incluso. Valor exato confirmado na Caixa Econômica Federal.`);
  }

  let obraAlerta: string | undefined;
  if (naPlanta) {
    if (isMCMV) {
      const coefMedio   = 0.655;
      const encObraMedia = Math.round(pmt1 * coefMedio + seguros.total);
      obraAlerta = `Durante a obra (~${prazoObraMeses} meses), você paga juros evolutivos ao banco (MCMV). Parcela média estimada: ${formatBRL(encObraMedia)}/mês.`;
    } else {
      const inccMensal   = 0.006;
      const saldoConstr  = valorImovel * 0.20;
      const parcelaBase  = Math.round(saldoConstr / prazoObraMeses);
      const parcelaINCC  = Math.round(parcelaBase * (1 + inccMensal * prazoObraMeses / 2));
      obraAlerta = `No SBPE, o financiamento é assinado na entrega das chaves. Durante a obra (~${prazoObraMeses} meses) você paga parcelas à construtora corrigidas pelo INCC. Estimativa: ${formatBRL(parcelaINCC)}/mês.`;
    }
  }

  return {
    isMCMV, isSFI, modalidade, faixa, faixaRenda,
    valorImovel, valorFinanciado,
    entrada: entradaTotal, fgts, fgtsUsado, subsidioEstimado,
    prazoMeses, taxaAnual,
    parcelaPrimeiro: Math.round(pmt1 + seguros.total),
    parcelaUltimo:   Math.round(pmtU + seguros.total),
    totalPagoPrice:  Math.round(totalPrice + seguros.total * prazoMeses),
    parcelaSACPrimeiro: Math.round(sac1 + seguros.total),
    parcelaSACUltimo:   Math.round(sacU + calcularSeguros(valorFinanciado / prazoMeses, idadeProponente).total),
    totalPagoSAC:       Math.round(totalSAC + seguros.total * prazoMeses),
    seguros, comprometimento,
    naPlanta, prazoObraMeses, obraAlerta,
    saudeLabel, ltvUsado, ltvMax, alertas,
    bloqueado, motivoBloqueio,
  };
}

// ─── Descobrir: renda → perfil de compra ──────────────────────────────────────
export interface ResultadoDescobrir {
  rendaBruta: number;
  fgts: number;
  entrada: number;
  faixa: FaixaMCMV | null;
  subsidioEstimado: number;
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
  sfi: {
    // Sistema de Financiamento Imobiliário — imóveis acima do teto SFH (R$ 2,25M)
    // SBPE opera dentro do SFH (até R$ 2,25M); SFI é o sistema paralelo sem limite de valor
    valorMaxImovel: number;
    valorFinanciado: number;
    parcela: number;
    comprometimento: number;
    taxa: number;
  };
  prazoMaxMeses: number;
  oruloMinPrice: number;
  oruloMaxPrice: number;
}

export function descobrir(
  rendaBruta: number,
  fgts: number,
  entrada: number,
  prazoAnos = 35,
  idadeProponente = 35,
  cotista = true,
  primeiroImovel = true,
  jaRecebeuBeneficio = false,
  dependentes = 0,
  temImovelMunicipio = false,
): ResultadoDescobrir {
  const prazoMaxPorIdade = Math.max(60, Math.floor((80.5 - idadeProponente) * 12));
  const prazoMeses = Math.min(prazoAnos * 12, Math.min(prazoMaxPorIdade, PRAZO_MAX_MESES));
  const fgtsElegivel = cotista && primeiroImovel && !temImovelMunicipio;
  const fgtsUsado = fgtsElegivel ? fgts : 0;
  const entradaTotal = entrada + fgtsUsado;

  const faixa   = detectarFaixaMCMV(rendaBruta);
  const elegivel = faixa !== null && !jaRecebeuBeneficio && !temImovelMunicipio;

  // F2: escala deslizante | F3/F4: flat — ambos via taxaEfetivaMCMV()
  const taxaMCMV = faixa
    ? taxaEfetivaMCMV(faixa, rendaBruta, fgtsElegivel)
    : TAXA_MCMV_ANUAL;
  const tetoMCMV = faixa?.teto   ?? 275000;

  const capacMCMV     = elegivel ? capacidadeComSeguros(rendaBruta, taxaMCMV, prazoMeses, 0.30, idadeProponente) : 0;
  const imovelMaxMCMVRaw = elegivel ? Math.min(capacMCMV + entradaTotal, tetoMCMV) : 0;

  // Subsídio estimado (para descoberta usa o teto da faixa como proxy)
  const subsidioEstimado = elegivel && faixa && cotista && primeiroImovel && !jaRecebeuBeneficio
    ? calcSubsidioEstimado(faixa, rendaBruta, imovelMaxMCMVRaw, cotista, primeiroImovel, jaRecebeuBeneficio, dependentes)
    : 0;

  const imovelMaxMCMV  = elegivel ? Math.min(imovelMaxMCMVRaw + subsidioEstimado, tetoMCMV) : 0;
  const financiadoMCMV = elegivel ? Math.max(0, imovelMaxMCMV - entradaTotal - subsidioEstimado) : 0;
  const parcelaMCMV    = parcelaPrice(financiadoMCMV, taxaMCMV, prazoMeses);
  const segurosMCMV    = calcularSeguros(financiadoMCMV, idadeProponente);
  const comprMCMV      = financiadoMCMV > 0 ? ((parcelaMCMV + segurosMCMV.total) / rendaBruta) * 100 : 0;

  const capacSBPE     = capacidadeComSeguros(rendaBruta, TAXA_SBPE_ANUAL, prazoMeses, 0.30, idadeProponente);
  const imovelMaxSBPE = Math.min(capacSBPE + entradaTotal, TETO_SFH);
  const financiadoSBPE = Math.max(0, imovelMaxSBPE - entradaTotal);
  const parcelaSBPE    = parcelaPrice(financiadoSBPE, TAXA_SBPE_ANUAL, prazoMeses);
  const segurosSBPE    = calcularSeguros(financiadoSBPE, idadeProponente);
  const comprSBPE      = ((parcelaSBPE + segurosSBPE.total) / rendaBruta) * 100;

  // ── SFI (Sistema de Financiamento Imobiliário) ───────────────────────────
  // Opera em paralelo ao SFH/SBPE para imóveis acima de R$2,25M (teto SFH)
  // Sem uso de FGTS, sem limite de valor, taxa livre (~12,5% a.a.)
  const capacSFI      = capacidadeComSeguros(rendaBruta, TAXA_SFI_ANUAL, prazoMeses, 0.30, idadeProponente);
  const imovelMaxSFI  = capacSFI + entradaTotal; // sem teto
  const financiadoSFI = Math.max(0, imovelMaxSFI - entradaTotal);
  const parcelaSFI    = parcelaPrice(financiadoSFI, TAXA_SFI_ANUAL, prazoMeses);
  const segurosSFI    = calcularSeguros(financiadoSFI, idadeProponente);
  const comprSFI      = ((parcelaSFI + segurosSFI.total) / rendaBruta) * 100;

  const elegMCMV = elegivel && imovelMaxMCMV >= 80000;

  // Para a busca de imóveis (Orulo), o teto de pesquisa usa capacidade de RENDA,
  // não o total inflado por FGTS muito alto. Isso evita mostrar imóveis de R$2,25M
  // para quem ganha R$5k mas tem FGTS grande (e não é elegível ao MCMV).
  // "imovelMaxSBPE" pode ser TETO_SFH quando entradaTotal >= ~R$2M — irrealista p/ busca.
  const sbpeSearchBase = Math.min(
    imovelMaxSBPE,
    capacSBPE / LTV_SBPE_SAC + entradaTotal,  // max pelo LTV (80% SAC) + caixa disponível
  );

  const oruloMax = elegMCMV
    ? Math.round(Math.min(tetoMCMV, imovelMaxMCMV * 1.05))
    : Math.round(sbpeSearchBase * 1.08);
  const oruloMin = elegMCMV
    ? Math.round(imovelMaxMCMV * 0.50)
    : Math.round(sbpeSearchBase * 0.70);

  return {
    rendaBruta, fgts: fgtsUsado,
    entrada: entradaTotal,
    faixa, subsidioEstimado,
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
    sfi: {
      valorMaxImovel:  Math.round(imovelMaxSFI),
      valorFinanciado: Math.round(financiadoSFI),
      parcela:         Math.round(parcelaSFI + segurosSFI.total),
      comprometimento: comprSFI,
      taxa:            TAXA_SFI_ANUAL,
    },
    prazoMaxMeses: prazoMeses,
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
