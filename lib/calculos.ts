// "mmm/aaaa" do mês atual — usado nos textos que mostram a data de referência
// das taxas (SBPE, TR) pra pessoa que visita o site. Antes cada tela tinha
// esse mês escrito à mão (ex.: "jul/2026"), e cada uma ficava desatualizada
// no seu próprio ritmo — ninguém lembrava de editar todas juntas.
const MESES_PT_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export function mesAnoAtual(): string {
  const agora = new Date();
  return `${MESES_PT_ABREV[agora.getMonth()]}/${agora.getFullYear()}`;
}

// ─── Faixas MCMV (referência São Paulo — Portaria MCID nº 333/2026) ──────────
// Fonte: TABELA DE FINANCIAMENTO 2026 da Caixa (abr/2026, Price, 35 anos, proponente
// de 25 anos — conferida linha a linha em 2026-09). Taxas NOMINAIS a.a.
// F1: até R$ 3.200 | F2: R$ 3.200 – R$ 5.000 | F3: até R$ 9.600 | F4: até R$ 13.000
// taxaMin/taxaMax = extremos da faixa (com/sem "redutor" de cotista FGTS); a taxa
// exata por renda vem de taxaEfetivaMCMV() (degraus da tabela, não interpolação).
// ltvMax F2 = 80%: a Caixa trava o financiamento em R$ 220.000 (80% × R$ 275.000).
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
    // Faixa 1 — subsídio até R$ 55.000 · nominal 4,25–5,25% (4,75/5,00/5,25 sem redutor)
    numero: 1, rendaMax: 3200,
    taxaRef: 4.75, taxaMin: 4.25, taxaMax: 5.25,
    teto: 275000, ltvMax: 0.95, ltvSAC: 0.95, subsidioMax: 55000,
    label: 'Faixa 1',
  },
  {
    // Faixa 2 — subsídio decrescente até renda R$ 4.000 · nominal 5,00–7,00%
    // (5,50 → 6,00 → 7,00 sem redutor, em degraus por renda)
    numero: 2, rendaMax: 5000,
    taxaRef: 7.00, taxaMin: 5.00, taxaMax: 7.00,
    teto: 275000, ltvMax: 0.80, ltvSAC: 0.80, subsidioMax: 55000,
    label: 'Faixa 2',
  },
  {
    // Faixa 3 — sem subsídio · nominal 7,66% cotista | 8,16% sem redutor · financia até R$ 320.000 (80% × 400 mil)
    numero: 3, rendaMax: 9600,
    taxaRef: 8.16, taxaMin: 7.66, taxaMax: 8.16,
    teto: 400000, ltvMax: 0.80, ltvSAC: 0.80, subsidioMax: 0,
    label: 'Faixa 3',
  },
  {
    // Faixa 4 — sem subsídio · nominal 10,00% (efetiva 10,47%) sem distinção cotista
    numero: 4, rendaMax: 13000,
    taxaRef: 10.00, taxaMin: 10.00, taxaMax: 10.00,
    teto: 600000, ltvMax: 0.80, ltvSAC: 0.80, subsidioMax: 0,
    label: 'Faixa 4',
  },
];

// ─── Constantes gerais ────────────────────────────────────────────────────────
// SBPE Caixa (tabela abr/2026): taxa NOMINAL 10,92% a.a. = EFETIVA 11,49% a.a. + TR.
// O cálculo de parcela usa a nominal (÷12). Antes o site usava 11,19 (efetiva de
// "correntista") como se fosse nominal, e 30% da renda — a Caixa usa 25% no SBPE.
export const TAXA_SBPE_ANUAL     = 10.92;
export const TAXA_SBPE_EFETIVA   = 11.49;
export const COMPROMETIMENTO_SBPE = 0.25;  // Caixa SBPE: 1ª parcela = 25% da renda (MCMV: 30%)
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
// Os bancos divulgam a taxa EFETIVA a.a. (ex.: Caixa 11,49%); a parcela é calculada
// com a NOMINAL ÷ 12 (Caixa: nominal 10,92% = efetiva 11,49%, tabela abr/2026).
export function taxaNominalDeEfetiva(efetivaAnualPct: number): number {
  return 12 * (Math.pow(1 + efetivaAnualPct / 100, 1 / 12) - 1) * 100;
}
export const LTV_SBPE_PRICE   = 0.70;
export const LTV_SBPE_SAC     = 0.80;
export const PRAZO_MAX_MESES  = 420;

// Prazo máximo permitido: o menor entre o prazo escolhido, o limite por idade
// (regra da Caixa: quitação até 80 anos e 6 meses) e o teto geral do sistema.
// Fonte única usada por descobrir(), simular() e pelo simulador na planta —
// antes cada um tinha sua própria cópia desta conta (auditoria 2026-09).
export function prazoMaximoMeses(prazoAnosDesejado: number, idadeProponente: number): number {
  const prazoMaxPorIdade = Math.max(60, Math.floor((80.5 - idadeProponente) * 12));
  return Math.min(prazoAnosDesejado * 12, prazoMaxPorIdade, PRAZO_MAX_MESES);
}
export const TR_MENSAL        = 0.17;

// Legado
export const TETO_MCMV     = 350000;
export const TAXA_MCMV_ANUAL = 7.91; // fallback F3 médio cotista/sem-FGTS (7,66+8,16)/2

// ─── TR histórica — últimos 36 meses (Out/2023 → Set/2026) ───────────────────
// Fonte: Banco Central do Brasil — Série 226 | Atualizado: Set/2026
// Valor de cada mês = entrada diária publicada no 1º dia útil do mês (não a
// entrada especial "1º ao último dia do mesmo mês" que a série também traz —
// ver scripts/update-tr.js para o motivo dessa escolha).
export const TR_HISTORICO_36M: { label: string; tr: number }[] = [
  { label: 'Out/23', tr: 0.1056 },
  { label: 'Nov/23', tr: 0.0775 },
  { label: 'Dez/23', tr: 0.0690 },
  { label: 'Jan/24', tr: 0.0875 },
  { label: 'Fev/24', tr: 0.0079 },
  { label: 'Mar/24', tr: 0.0331 },
  { label: 'Abr/24', tr: 0.1023 },
  { label: 'Mai/24', tr: 0.0870 },
  { label: 'Jun/24', tr: 0.0365 },
  { label: 'Jul/24', tr: 0.0739 },
  { label: 'Ago/24', tr: 0.0707 },
  { label: 'Set/24', tr: 0.0675 },
  { label: 'Out/24', tr: 0.0977 },
  { label: 'Nov/24', tr: 0.0649 },
  { label: 'Dez/24', tr: 0.0822 },
  { label: 'Jan/25', tr: 0.1690 },
  { label: 'Fev/25', tr: 0.1324 },
  { label: 'Mar/25', tr: 0.1092 },
  { label: 'Abr/25', tr: 0.1689 },
  { label: 'Mai/25', tr: 0.1712 },
  { label: 'Jun/25', tr: 0.1699 },
  { label: 'Jul/25', tr: 0.1758 },
  { label: 'Ago/25', tr: 0.1722 },
  { label: 'Set/25', tr: 0.1742 },
  { label: 'Out/25', tr: 0.1758 },
  { label: 'Nov/25', tr: 0.1634 },
  { label: 'Dez/25', tr: 0.1742 },
  { label: 'Jan/26', tr: 0.1718 },
  { label: 'Fev/26', tr: 0.1207 },
  { label: 'Mar/26', tr: 0.1735 },
  { label: 'Abr/26', tr: 0.1679 },
  { label: 'Mai/26', tr: 0.1687 },
  { label: 'Jun/26', tr: 0.1709 },
  { label: 'Jul/26', tr: 0.1729 },
  { label: 'Ago/26', tr: 0.1693 },
  { label: 'Set/26', tr: 0.1690 }
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

  // Se o prazo escolhido é menor que a janela de 36 meses, o financiamento já
  // está quitado antes do fim da série histórica. Sem essa checagem, `amort`
  // (constante) continuaria sendo somado à parcela mesmo com saldo zerado,
  // criando uma parcela fantasma nos meses após a quitação.
  for (let i = 0; i < TR_HISTORICO_36M.length; i++) {
    const { label, tr } = TR_HISTORICO_36M[i];
    const quitado = i >= prazoMeses;

    // ── COM TR ────────────────────────────────────────────────────────────────
    const saldoInicial   = saldoComTR;
    const correcaoTR     = quitado ? 0 : saldoComTR * (tr / 100);
    const saldoCorrigido = quitado ? 0 : saldoComTR + correcaoTR;
    const jurosComTR     = quitado ? 0 : saldoCorrigido * taxaMensal;
    const parcelaComTR   = quitado ? 0 : amort + jurosComTR;
    saldoComTR = quitado ? 0 : Math.max(0, saldoCorrigido - amort);

    // ── SEM TR (hipotético) ───────────────────────────────────────────────────
    const jurosSemTR   = quitado ? 0 : saldoSemTR * taxaMensal;
    const parcelaSemTR = quitado ? 0 : amort + jurosSemTR;
    saldoSemTR = quitado ? 0 : Math.max(0, saldoSemTR - amort);

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

// ─── Taxa MCMV por renda (degraus da tabela da Caixa, abr/2026) ──────────────
// Nominal a.a. SEM redutor:  F1: 4,75 (≤2.160) · 5,00 (≤2.850) · 5,25 (≤3.200)
//                            F2: 5,50 (≤3.500) · 6,00 (≤4.000) · 7,00 (≤5.000)
//                            F3: 8,16 · F4: 10,00
// COM redutor (cotista FGTS): −0,50 p.p. nas Faixas 1, 2 e 3; Faixa 4 não tem redutor.
export function taxaEfetivaMCMV(
  faixa: FaixaMCMV,
  rendaBruta: number,
  cotista: boolean,
): number {
  let semRedutor: number;
  if (faixa.numero === 1) {
    semRedutor = rendaBruta <= 2160 ? 4.75 : rendaBruta <= 2850 ? 5.00 : 5.25;
  } else if (faixa.numero === 2) {
    semRedutor = rendaBruta <= 3500 ? 5.50 : rendaBruta <= 4000 ? 6.00 : 7.00;
  } else if (faixa.numero === 3) {
    semRedutor = 8.16;
  } else {
    return 10.00; // F4: sem redutor
  }
  return Math.round((cotista ? semRedutor - 0.50 : semRedutor) * 1000) / 1000;
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

// ─── Subsídio estimado — coluna "Subsídio com/sem dependente" da tabela Caixa ─
// Âncoras [renda, subsídio COM dependente]; entre âncoras, interpolação linear.
// Até R$ 1.900 = teto de R$ 55.000; acima de R$ 4.000 = não contempla.
// SEM dependente = 30% do valor (R$ 16.500 de R$ 55.000, R$ 1.803 de R$ 6.011...) e só
// vai até renda R$ 3.200 (a partir de R$ 3.300 a tabela diz "NÃO CONTEMPLA").
// Não depende de cotista FGTS: a tabela não liga o subsídio ao redutor de taxa.
const SUBSIDIO_COM_DEPENDENTE: [number, number][] = [
  [1900, 55000], [2000, 50777], [2100, 44812], [2160.01, 41729], [2200, 39562],
  [2300, 34440], [2400, 29735], [2500, 25438], [2600, 21538], [2700, 18026],
  [2800, 14893], [2850.01, 13589], [2900, 12242], [3000, 9818], [3100, 7744],
  [3200, 6011], [3200.01, 6072], [3300, 4659], [3400, 3571], [3500, 2799],
  [3500.01, 2858], [3600, 2384], [3700, 2214], [3800, 2192], [3900, 2171], [4000, 2149],
];
const SUBSIDIO_RENDA_MAX_SEM_DEPENDENTE = 3200.01;

export function calcSubsidioEstimado(
  faixa: FaixaMCMV,
  rendaBruta: number,
  valorImovel: number,
  _cotista: boolean, // mantido na assinatura; a tabela não liga subsídio a cotista
  primeiroImovel: boolean,
  jaRecebeuBeneficio: boolean,
  dependentes = 0,
): number {
  if (!primeiroImovel || jaRecebeuBeneficio) return 0;
  if (faixa.numero >= 3) return 0;

  const pts = SUBSIDIO_COM_DEPENDENTE;
  let comDep: number;
  if (rendaBruta <= pts[0][0]) comDep = faixa.subsidioMax;
  else if (rendaBruta > pts[pts.length - 1][0]) comDep = 0;
  else {
    comDep = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [r0, v0] = pts[i], [r1, v1] = pts[i + 1];
      if (rendaBruta >= r0 && rendaBruta <= r1) {
        comDep = r1 === r0 ? v1 : v0 + (v1 - v0) * ((rendaBruta - r0) / (r1 - r0));
        break;
      }
    }
  }

  let subCalc: number;
  if (dependentes > 0) subCalc = comDep;
  else subCalc = rendaBruta <= SUBSIDIO_RENDA_MAX_SEM_DEPENDENTE ? comDep * 0.30 : 0;

  // Limite real: subsídio não pode superar o valor financiável (LTV × preço).
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

// ─── Classificação de saúde financeira pelo comprometimento de renda ─────────
// Fonte única usada por simular() E pelo simulador geral (app/simulador/page.tsx)
// — antes cada um tinha sua própria cópia desta mesma conta, com risco de as
// duas divergirem se alguém editasse só uma (auditoria 2026-09). Espera
// receber o comprometimento JÁ arredondado a 1 casa decimal (mesma casa que a
// tela mostra), pra decisão e exibição nunca contradizerem uma à outra.
export function classificarSaudeFinanceira(comprometimentoArredondado: number): ResultadoSimulacao['saudeLabel'] {
  return comprometimentoArredondado <= 20 ? 'ótimo' :
    comprometimentoArredondado <= 25 ? 'bom' :
    comprometimentoArredondado <= 30 ? 'atenção' : 'risco';
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

  const prazoMeses       = prazoMaximoMeses(prazoAnos, idadeProponente);
  const prazoObraMeses   = prazoObraAnos * 12;

  // Faixa baseada apenas na renda (menor faixa onde renda ≤ rendaMax)
  const faixaRenda   = detectarFaixaMCMV(rendaBruta);
  // VALIDAÇÃO: Comercial NÃO é elegível ao MCMV (programa habitacional)
  const mcmvElegivel = !isComercial && faixaRenda !== null && !temImovelMunicipio && !jaRecebeuBeneficio;

  // CORREÇÃO: Faixa é SEMPRE determinada pela renda, NUNCA pelo imóvel.
  // Se o imóvel ultrapassar o teto da faixa, a simulação é BLOQUEADA (não reclassificada).
  // A pessoa recebe a orientação: "Este imóvel está fora do teto MCMV da sua faixa. Use SBPE ou aumente entrada."
  let faixa: FaixaMCMV | null = mcmvElegivel ? faixaRenda : null; // ← só existe se elegível (residencial, sem restrições)

  // O teto da faixa é limite do VALOR DO IMÓVEL — subsídio não estende esse teto.
  // (Antes "o subsídio cobre a diferença" aceitava F1 com imóvel de R$300 mil como
  // MCMV mas rejeitava F2 com R$290 mil — inconsistente e sem base na regra da
  // Caixa; apontado por auditoria externa em 2026-09.) Acima do teto → SBPE.
  if (mcmvElegivel && valorImovel > faixa!.teto) {
    faixa = null;
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

  // Arredondado a 1 casa decimal ANTES de classificar/bloquear — é exatamente
  // a casa decimal que a interface mostra (.toFixed(1)). Sem isso, um valor
  // interno tipo 30,006% classifica "risco" e a tela mostra "30,0%" ao mesmo
  // tempo, como se a mesma pessoa estivesse dentro e fora do limite (auditoria 2026-09).
  const comprometimento = Math.round((((pmt1 + seguros.total) / rendaBruta) * 100) * 10) / 10;

  // LTV
  const ltvMax = isMCMV ? (faixa?.ltvMax ?? 0.80) : LTV_SBPE_PRICE;
  const ltvUsado = valorImovel > 0 ? valorFinanciado / valorImovel : 0;

  // Saúde
  const saudeLabel = classificarSaudeFinanceira(comprometimento);

  // Alertas e Bloqueios
  const alertas: string[] = [];
  let bloqueado = false;
  let motivoBloqueio: string | undefined;

  // ALERTA PRINCIPAL: Imóvel comercial
  if (isComercial) {
    alertas.push('⚠️ Imóvel COMERCIAL: Benefícios MCMV, FGTS e subsídio habitacional NÃO se aplicam. Apenas SFI (Sistema de Financiamento Imobiliário) é disponível.');
  }

  // BLOQUEIO 1: Comprometimento > 30%
  // Bloqueio duro em 30% (máximo aceito por qualquer banco). O SBPE da Caixa é mais
  // restrito (25% — tabela abr/2026), mas outros bancos aceitam até 30%: entre 25% e
  // 30% só alertamos, sem bloquear, pra não travar quem financia fora da Caixa.
  if (comprometimento > 30) {
    bloqueado = true;
    motivoBloqueio = `Comprometimento de ${comprometimento.toFixed(1)}% ultrapassa o limite de 30% — banco reprova créditos acima disso.`;
    alertas.push('Comprometimento acima de 30% — simulação BLOQUEADA.');
  } else if (!isMCMV && !isSFI && comprometimento > COMPROMETIMENTO_SBPE * 100) {
    alertas.push(`Comprometimento de ${comprometimento.toFixed(1)}%: a Caixa limita a 1ª parcela do SBPE a 25% da renda; outros bancos aceitam até 30% — confirme com o banco escolhido.`);
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
  tipoImovel: 'residencial' | 'comercial' = 'residencial',
): ResultadoDescobrir {
  // VALIDAÇÃO: Comercial não é elegível a MCMV/FGTS (benefícios exclusivos de habitação)
  const isComercial = tipoImovel === 'comercial';

  const prazoMeses = prazoMaximoMeses(prazoAnos, idadeProponente);
  const fgtsElegivel = !isComercial && cotista && primeiroImovel && !temImovelMunicipio;
  const fgtsUsado = fgtsElegivel ? fgts : 0;
  const entradaTotal = entrada + fgtsUsado;

  const faixa   = isComercial ? null : detectarFaixaMCMV(rendaBruta);
  const elegivel = faixa !== null && !jaRecebeuBeneficio && !temImovelMunicipio;

  // F2: escala deslizante | F3/F4: flat — ambos via taxaEfetivaMCMV()
  const taxaMCMV = faixa
    ? taxaEfetivaMCMV(faixa, rendaBruta, fgtsElegivel)
    : TAXA_MCMV_ANUAL;
  const tetoMCMV = faixa?.teto   ?? 275000;

  // Financiamento vem só da capacidade de renda (30% de comprometimento) —
  // igual a qualquer simulador de banco real (validado contra o simulador
  // oficial da Caixa, auditoria 2026-09: o financiamento não muda nem um
  // centavo se a pessoa informa entrada de R$0 ou de R$500 mil; entrada e
  // FGTS só se SOMAM ao financiamento pra formar o poder de compra total,
  // nunca o reduzem). A checagem de "essa entrada é suficiente pra esse
  // preço" é responsabilidade exclusiva de simular() (ficha do imóvel),
  // quando já existe um preço real pra avaliar — nunca desta função, que
  // não conhece nenhum imóvel específico ainda.
  // A Caixa também trava o financiamento em LTV × teto da faixa (tabela abr/2026:
  // F2 para em R$ 220.000, F3 em R$ 320.000) — a partir dessa renda a parcela
  // deixa de crescer e o que passa disso só se resolve com entrada.
  const capacMCMVRenda = elegivel ? capacidadeComSeguros(rendaBruta, taxaMCMV, prazoMeses, 0.30, idadeProponente) : 0;
  const capacMCMV     = elegivel && faixa ? Math.min(capacMCMVRenda, faixa.ltvMax * tetoMCMV) : 0;
  const imovelMaxMCMVRaw = elegivel ? Math.min(capacMCMV + entradaTotal, tetoMCMV) : 0;

  // Subsídio estimado (para descoberta usa o teto da faixa como proxy)
  const subsidioEstimado = elegivel && faixa && primeiroImovel && !jaRecebeuBeneficio
    ? calcSubsidioEstimado(faixa, rendaBruta, imovelMaxMCMVRaw, cotista, primeiroImovel, jaRecebeuBeneficio, dependentes)
    : 0;

  // Poder de compra = financiamento + entrada + subsídio, MAS o imóvel em si não
  // pode passar do teto da faixa (é limite de valor do imóvel, o subsídio não o
  // estende). Uma versão anterior somava o subsídio por cima do teto (F1 com
  // R$100 mil de entrada dava R$308.990 contra teto de R$275 mil — auditoria
  // externa 2026-09). Quando o teto corta, o financiamento exibido encolhe junto,
  // pra composição fechar: financiamento + entrada + subsídio = valor máximo.
  const imovelMaxMCMV  = elegivel ? Math.min(imovelMaxMCMVRaw + subsidioEstimado, tetoMCMV) : 0;
  const financiadoMCMV = elegivel ? Math.max(0, imovelMaxMCMV - entradaTotal - subsidioEstimado) : 0;
  const parcelaMCMV    = parcelaPrice(financiadoMCMV, taxaMCMV, prazoMeses);
  const segurosMCMV    = calcularSeguros(financiadoMCMV, idadeProponente);
  // Arredondado a 1 casa decimal — mesma casa que a tela mostra, para nunca
  // classificar "risco" num número que a interface exibe como exatamente 30,0%.
  const comprMCMV      = financiadoMCMV > 0 ? Math.round((((parcelaMCMV + segurosMCMV.total) / rendaBruta) * 100) * 10) / 10 : 0;

  // SBPE Caixa: 1ª parcela = 25% da renda (tabela abr/2026) — MCMV é que usa 30%.
  const capacSBPE     = capacidadeComSeguros(rendaBruta, TAXA_SBPE_ANUAL, prazoMeses, COMPROMETIMENTO_SBPE, idadeProponente);
  const imovelMaxSBPE = Math.min(capacSBPE + entradaTotal, TETO_SFH);
  const financiadoSBPE = Math.max(0, imovelMaxSBPE - entradaTotal);
  const parcelaSBPE    = parcelaPrice(financiadoSBPE, TAXA_SBPE_ANUAL, prazoMeses);
  const segurosSBPE    = calcularSeguros(financiadoSBPE, idadeProponente);
  const comprSBPE      = Math.round((((parcelaSBPE + segurosSBPE.total) / rendaBruta) * 100) * 10) / 10;

  // ── SFI (Sistema de Financiamento Imobiliário) ───────────────────────────
  // Opera em paralelo ao SFH/SBPE para imóveis acima de R$2,25M (teto SFH)
  // Sem uso de FGTS, sem limite de valor, taxa livre (~12,5% a.a.)
  const capacSFI      = capacidadeComSeguros(rendaBruta, TAXA_SFI_ANUAL, prazoMeses, 0.30, idadeProponente);
  const imovelMaxSFI  = capacSFI + entradaTotal; // sem teto
  const financiadoSFI = Math.max(0, imovelMaxSFI - entradaTotal);
  const parcelaSFI    = parcelaPrice(financiadoSFI, TAXA_SFI_ANUAL, prazoMeses);
  const segurosSFI    = calcularSeguros(financiadoSFI, idadeProponente);
  const comprSFI      = Math.round((((parcelaSFI + segurosSFI.total) / rendaBruta) * 100) * 10) / 10;

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

/**
 * Linha de preço padrão dos cards de imóvel em todo o site — sempre com a
 * metragem da planta junto do preço ("Planta de 45m² a 78m², A partir de
 * R$ 450.000"), não só o preço sozinho. Sem área conhecida, cai pro preço
 * sozinho (ou "Consulte o preço" se nem isso tiver).
 */
export function formatPlantaPreco(
  areaMin: number | null | undefined,
  areaMax: number | null | undefined,
  minPrice: number | null | undefined,
): string {
  // A Orulo usa valores como 0.1/1.05 como sentinela de "sem tabela
  // publicada ainda" (Breve Lançamento) — truthy, mas não é preço real.
  // Sem esse limiar, esses casos mostravam "A partir de R$ 1".
  const precoTxt = minPrice && minPrice >= 100 ? `A partir de ${formatBRL(minPrice)}` : 'Consulte o preço';
  if (!areaMin) return precoTxt;
  const areaTxt = areaMax && areaMax !== areaMin
    ? `Planta de ${areaMin}m² a ${areaMax}m²`
    : `Planta de ${areaMin}m²`;
  return `${areaTxt}, ${precoTxt}`;
}

export function parseBRL(str: string): number {
  return Number(str.replace(/\D/g, ''));
}
