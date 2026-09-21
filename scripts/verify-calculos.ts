// Sanity check das regras críticas de lib/calculos.ts — sem framework de testes.
// Roda com: npm run verify
import { simular, descobrir, detectarFaixaMCMV, classificarSaudeFinanceira, calcSubsidioEstimado, taxaEfetivaMCMV, rendaNecessariaPelaPrestacao, FAIXAS_MCMV } from '../lib/calculos';

let pass = 0, fail = 0;
function check(desc: string, cond: boolean) {
  if (cond) { console.log('✅', desc); pass++; }
  else { console.log('❌', desc); fail++; }
}

// 1. Faixa não muda por imóvel caro — deve bloquear/virar SBPE, nunca reclassificar para faixa maior
const r1 = simular({
  rendaBruta: 2800, fgts: 0, entrada: 0, valorImovel: 350000,
  prazoAnos: 35, naPlanta: false, prazoObraAnos: 3,
  idadeProponente: 35, cotista: true, primeiroImovel: true, jaRecebeuBeneficio: false,
});
check('Renda R$2.800 + imóvel R$350k → NÃO reclassifica para Faixa 3', !r1.isMCMV || r1.faixa?.numero === 1);
check('Renda R$2.800 + imóvel R$350k → resultado bloqueado (comprometimento/LTV insustentável)', r1.bloqueado === true);

// 2. Comercial não usa benefícios residenciais
const r2 = simular({
  rendaBruta: 5000, fgts: 10000, entrada: 0, valorImovel: 400000,
  prazoAnos: 35, naPlanta: false, prazoObraAnos: 3,
  idadeProponente: 35, cotista: true, primeiroImovel: true, jaRecebeuBeneficio: false,
  tipoImovel: 'comercial',
});
check('Comercial → isMCMV = false', r2.isMCMV === false);
check('Comercial → fgtsUsado = 0', r2.fgtsUsado === 0);
check('Comercial → subsidioEstimado = 0', r2.subsidioEstimado === 0);
check('Comercial → alerta explicando a restrição', r2.alertas.some(a => a.toUpperCase().includes('COMERCIAL')));

// 3. Residencial continua funcionando normalmente
const r3 = simular({
  rendaBruta: 5000, fgts: 10000, entrada: 0, valorImovel: 250000,
  prazoAnos: 35, naPlanta: false, prazoObraAnos: 3,
  idadeProponente: 35, cotista: true, primeiroImovel: true, jaRecebeuBeneficio: false,
  tipoImovel: 'residencial',
});
check('Residencial → isMCMV = true (imóvel dentro do teto)', r3.isMCMV === true);
check('Residencial → fgtsUsado > 0', r3.fgtsUsado > 0);

// 4. Capacidade SBPE respeita 25% da renda (Caixa, tabela abr/2026) mesmo com seguros (entrada alta o bastante
//    pra não esbarrar no teto de LTV — ver testes 7/8 abaixo pra esse caso)
const r4 = descobrir(50000, 0, 700000, 35, 35, true, true, false);
check('SBPE renda R$50k → comprometimento ≤ 25,1% (Caixa usa 25% no SBPE)', r4.sbpe.comprometimento <= 25.1);
check('SBPE renda R$50k → parcela entre R$12.100 e R$12.600 (25% da renda)', r4.sbpe.parcela >= 12100 && r4.sbpe.parcela <= 12600);

// 5. SFI só acima do teto SFH
const r5a = simular({ rendaBruta: 30000, fgts: 0, entrada: 100000, valorImovel: 1500000, prazoAnos: 35, naPlanta: false, prazoObraAnos: 3, idadeProponente: 35 });
check('Imóvel R$1,5M (< teto SFH) → NÃO é SFI', r5a.isSFI === false);
const r5b = simular({ rendaBruta: 50000, fgts: 0, entrada: 500000, valorImovel: 3000000, prazoAnos: 35, naPlanta: false, prazoObraAnos: 3, idadeProponente: 35 });
check('Imóvel R$3M (> teto SFH) → é SFI', r5b.isSFI === true);

// 6. descobrir() também respeita tipoImovel comercial (usado no card/página do imóvel)
const r6 = descobrir(4000, 10000, 0, 35, 35, true, true, false, 0, false, 'comercial');
check('descobrir() comercial → faixa MCMV = null', r6.faixa === null);
check('descobrir() comercial → MCMV não elegível', r6.mcmv.elegivel === false);
check('descobrir() comercial → FGTS não usado', r6.fgts === 0);
const r6b = descobrir(4000, 10000, 0, 35, 35, true, true, false, 0, false, 'residencial');
check('descobrir() residencial → FGTS usado normalmente', r6b.fgts === 10000);

// 7. Financiamento vem só da capacidade de renda — igual ao simulador oficial
//    da Caixa (validado ao vivo, auditoria 2026-09: financiamento pela renda
//    não muda nem com entrada R$0 nem com entrada de centenas de milhares).
//    Reverte a regra de "LTV trava o poder de compra" de 12/09 (240db8d),
//    que o próprio dono do site não pediu e não é como a Caixa opera.
const r7 = descobrir(6000, 0, 0, 35, 35, true, true, false); // Faixa 3, R$0 de entrada
check('MCMV Faixa 3, entrada R$0 → financiamento vem da renda, não é zerado', r7.mcmv.valorFinanciado > 0);

// 8. Aumentar a entrada nunca muda o financiamento (só soma ao poder de
//    compra total) — é exatamente o que a calculadora da Caixa faz: testei
//    o mesmo imóvel (R$744.000) com e sem informar o preço e o financiamento
//    saiu idêntico (R$383.646,67) nos dois casos.
const r8 = descobrir(6000, 0, 100000, 35, 35, true, true, false);
check('MCMV Faixa 3, entrada R$100k → financiamento IDÊNTICO ao de entrada R$0', r8.mcmv.valorFinanciado === r7.mcmv.valorFinanciado);
check('MCMV Faixa 3, entrada R$100k → poder de compra total aumenta exatamente pela entrada', r8.mcmv.valorMaxImovel === r7.mcmv.valorMaxImovel + 100000);

// 9. Mesmo com o financiamento agora "livre" de LTV em descobrir(), a ficha
//    de um imóvel específico (simular()) continua checando LTV de verdade —
//    essa é a única camada onde a entrada real é confrontada com um preço
//    real, exatamente como a Caixa faz na "Simulação Completa".
const r9sim = simular({
  rendaBruta: 6000, fgts: 0, entrada: 0, valorImovel: r7.mcmv.valorMaxImovel,
  prazoAnos: 35, naPlanta: false, prazoObraAnos: 3, idadeProponente: 35,
});
check('Ficha do imóvel: preço = financiamento pela renda, mas entrada R$0 → bloqueia por LTV (correto, é a checagem que deve existir)', r9sim.bloqueado === true);

// 10. Comprometimento exibido (1 casa decimal) nunca contradiz a classificação —
//     a causa raiz do "30,0% = RISCO" relatado na auditoria.
for (const renda of [4000, 6000, 8000, 9500]) {
  const r = simular({ rendaBruta: renda, fgts: 0, entrada: 0, valorImovel: 400000, prazoAnos: 35, naPlanta: false, prazoObraAnos: 3, idadeProponente: 35 });
  const consistente = classificarSaudeFinanceira(r.comprometimento) === r.saudeLabel;
  check(`Renda R$${renda}: rótulo de saúde bate com o comprometimento exibido (${r.comprometimento.toFixed(1)}% → ${r.saudeLabel})`, consistente);
}

// 11. simular() (ficha de um imóvel específico) é quem decide se uma compra
//     real cabe — reproduz os 3 casos de uma auditoria externa (2026-09) que
//     motivaram a criação da regra de LTV em descobrir() no dia 12/09
//     (commit 240db8d). Essa regra foi revertida a pedido do dono do site:
//     ele nunca pediu que a ENTRADA reduzisse o financiamento calculado pela
//     RENDA — confirmado ao vivo no simulador oficial da Caixa (financiamento
//     idêntico com entrada R$0 ou R$500 mil; a Caixa só informa "falta R$X",
//     nunca bloqueia nem reduz o financiamento). A checagem real de "essa
//     entrada é suficiente pra esse preço" continua existindo — só que
//     exclusivamente aqui, em simular(), nunca em descobrir().
const s1 = simular({ rendaBruta: 4000, fgts: 20000, entrada: 20000, valorImovel: 301682, prazoAnos: 35, naPlanta: false, prazoObraAnos: 0, idadeProponente: 35 }); // Max Villa Lobos
check('Max Villa Lobos: ficha bloqueia por LTV (entrada insuficiente pra esse preço)', s1.bloqueado === true);

const s2 = simular({ rendaBruta: 15000, fgts: 0, entrada: 200000, valorImovel: 744000, prazoAnos: 35, naPlanta: false, prazoObraAnos: 0, idadeProponente: 35 }); // Invite Klabin
check('Invite Klabin: ficha bloqueia por LTV (entrada insuficiente pra esse preço)', s2.bloqueado === true);

const s3 = simular({ rendaBruta: 15000, fgts: 0, entrada: 200000, valorImovel: 539500, prazoAnos: 35, naPlanta: false, prazoObraAnos: 0, idadeProponente: 35 }); // Dueto Morumbi
check('Dueto Morumbi: ficha aprova (entrada suficiente pra esse preço)', s3.bloqueado === false);

// 12. O "poder de compra" (descobrir()) pode legitimamente APROVAR um preço
//     que a ficha de um imóvel real (simular()) reprova pro mesmo perfil —
//     isso não é bug, é o desenho de duas etapas que o dono do site descreveu
//     (a descoberta de perfil não conhece nenhum imóvel específico ainda; só
//     quando existe um preço real é que a entrada é confrontada com o LTV).
//     A mesma calculadora "Pela renda" da Caixa funciona assim: nunca conhece
//     a entrada real do usuário, só estima. Documentado aqui pra não ser
//     "corrigido" de novo como se fosse uma divergência indevida.
const perfilRenda6k = descobrir(6000, 0, 0, 35, 35, true, true, false); // Faixa 3, entrada R$0
const simPeloTetoRenda = simular({ rendaBruta: 6000, fgts: 0, entrada: 0, valorImovel: perfilRenda6k.mcmv.valorMaxImovel, prazoAnos: 35, naPlanta: false, prazoObraAnos: 0, idadeProponente: 35 });
check(
  'Descobrir() aprova um teto pela renda que a ficha de um imóvel real naquele preço reprova (com entrada R$0) — esperado, não é bug',
  perfilRenda6k.mcmv.valorFinanciado > 0 && simPeloTetoRenda.bloqueado === true,
);

// 13. O teto da faixa é limite de VALOR DO IMÓVEL — poder de compra nunca o ultrapassa,
//     nem somando entrada + subsídio (auditoria externa 2026-09: F1 renda 3.200 com
//     R$100 mil de entrada dava R$308.990 contra teto de R$275 mil), e a composição
//     financiamento + entrada + subsídio tem que fechar com o valor máximo.
{
  let acimaDoTeto = 0, composicaoQuebrada = 0, combinacoes = 0;
  for (const renda of [1200, 1621, 2500, 3200, 3201, 4000, 5000, 5001, 7000, 9600, 9601, 12000, 13000]) {
    for (const entrada of [0, 20000, 60000, 100000, 200000]) {
      const r = descobrir(renda, 0, entrada, 35, 35, true, true, false);
      if (!r.faixa || !r.mcmv.elegivel) continue;
      combinacoes++;
      if (r.mcmv.valorMaxImovel > r.faixa.teto) acimaDoTeto++;
      const soma = r.mcmv.valorFinanciado + r.entrada + r.subsidioEstimado;
      // só confere a composição quando a entrada sozinha não estoura o teto
      if (r.entrada + r.subsidioEstimado <= r.mcmv.valorMaxImovel && Math.abs(soma - r.mcmv.valorMaxImovel) > 2) composicaoQuebrada++;
    }
  }
  check(`descobrir(): poder de compra MCMV nunca passa do teto da faixa (${combinacoes} combinações renda × entrada)`, acimaDoTeto === 0);
  check('descobrir(): financiamento + entrada + subsídio = valor máximo do imóvel (composição fecha)', composicaoQuebrada === 0);
}

// 14. Na ficha, imóvel acima do teto da faixa NÃO vira MCMV por causa do subsídio — F1 e F2 se
//     comportam igual (antes F1 aceitava R$300 mil como MCMV e F2 rejeitava R$290 mil).
{
  const f1 = simular({ rendaBruta: 3200, fgts: 0, entrada: 100000, valorImovel: 300000, prazoAnos: 35, naPlanta: false, prazoObraAnos: 0, idadeProponente: 35 });
  check('Faixa 1 + imóvel R$300 mil (acima do teto R$275 mil) → não é MCMV', f1.isMCMV === false);
  const f2 = simular({ rendaBruta: 5000, fgts: 0, entrada: 100000, valorImovel: 290000, prazoAnos: 35, naPlanta: false, prazoObraAnos: 0, idadeProponente: 35 });
  check('Faixa 2 + imóvel R$290 mil (acima do teto R$275 mil) → não é MCMV', f2.isMCMV === false);
  const f1ok = simular({ rendaBruta: 3200, fgts: 0, entrada: 100000, valorImovel: 275000, prazoAnos: 35, naPlanta: false, prazoObraAnos: 0, idadeProponente: 35 });
  check('Faixa 1 + imóvel exatamente no teto (R$275 mil) → continua MCMV', f1ok.isMCMV === true);
}

// 15. REGRESSÃO CONTRA A TABELA DE FINANCIAMENTO 2026 DA CAIXA (abr/2026 — Price, 35 anos,
//     proponente de 25 anos), transcrita linha a linha do PDF em 2026-09. Colunas:
//     [renda, taxa nominal SEM redutor, financiamento SEM redutor, taxa COM redutor, financiamento COM redutor]
//     F4: a coluna "sem redutor" da Caixa tem uma quebra estranha acima de R$11.800 (400.000 →
//     308.620 → 332.155) — nessas linhas só a coluna "com redutor" (F4 não tem redutor) é usada.
const TABELA_CAIXA: [number, number, number, number, number][] = [
  [1700, 4.75, 98674.91, 4.25, 105229.95], [1900, 4.75, 110745.99, 4.25, 118102.91], [2000, 4.75, 116781.53, 4.25, 124539.39],
  [2100, 4.75, 122817.07, 4.25, 130975.87], [2160.01, 5.00, 122748.26, 4.50, 130761.49], [2500, 5.00, 142423.15, 4.50, 151720.80],
  [2800, 5.00, 159970.87, 4.50, 170414.07], [2850.01, 5.25, 153225.01, 4.75, 163054.53], [3000, 5.25, 161731.98, 4.75, 172107.22],
  [3200, 5.25, 173075.36, 4.75, 184178.28], [3200.01, 5.50, 167909.60, 5.00, 178493.47], [3500, 5.50, 184416.83, 5.00, 196041.19],
  [3500.01, 6.00, 173840.05, 5.50, 184417.36], [4000, 6.00, 199773.59, 5.50, 211928.86], [4000.01, 7.00, 178573.87, 6.50, 188693.72],
  [4500, 7.00, 201755.35, 6.50, 213188.88], [4600, 7.00, 206391.74, 6.50, 218088.01], [4700, 7.00, 211028.13, 6.50, 220000],
  [4863, 7.00, 220000, 6.50, 220000], [5000, 7.00, 220000, 6.50, 220000],
  [5000.01, 8.16, 198620.26, 7.66, 208984.89], [5500, 8.16, 219165.06, 7.66, 230601.79], [6000, 8.16, 239709.86, 7.66, 252218.69],
  [6500, 8.16, 260254.66, 7.66, 273835.59], [7000, 8.16, 280799.46, 7.66, 295452.49], [7500, 8.16, 301344.26, 7.66, 317069.39],
  [7600, 8.16, 305453.22, 7.66, 320000], [8000, 8.16, 320000, 7.66, 320000], [9000, 8.16, 320000, 7.66, 320000], [9600, 8.16, 320000, 7.66, 320000],
  [9600.01, 10.00, 324875.05, 10.00, 324875.40], [10000, 10.00, 338701.97, 10.00, 338701.98], [11000, 10.00, 373269.27, 10.00, 373269.28],
  [12000, 10.00, 400000, 10.00, 407836.58], [13000, 10.00, 442403.88, 10.00, 442403.88],
];
{
  let maxDif = 0, pior = '', taxasErradas = 0;
  for (const [renda, tSem, fSem, tCom, fCom] of TABELA_CAIXA) {
    const faixa = detectarFaixaMCMV(renda)!;
    const f4 = faixa.numero === 4;
    for (const [cotista, tab, fin] of [[false, tSem, fSem], [true, tCom, fCom]] as [boolean, number, number][]) {
      if (f4 && !cotista && renda >= 11800) continue;
      if (Math.abs(taxaEfetivaMCMV(faixa, renda, cotista) - tab) > 0.001) taxasErradas++;
      const d = descobrir(renda, 0, 0, 35, 25, cotista, true, false, 1);
      const dif = Math.abs(d.mcmv.valorFinanciado / fin - 1) * 100;
      if (dif > maxDif) { maxDif = dif; pior = `renda ${renda} ${cotista ? 'com' : 'sem'} redutor: nosso ${d.mcmv.valorFinanciado} × Caixa ${fin}`; }
    }
  }
  check('Tabela Caixa: taxa nominal MCMV por renda (F1–F4, com e sem redutor) bate em TODAS as linhas', taxasErradas === 0);
  check(`Tabela Caixa: financiamento MCMV dentro de ±3% em todas as linhas (pior ${maxDif.toFixed(1)}% — ${pior})`, maxDif <= 3);
}

// SBPE/HMP/R2V da tabela: taxa nominal 10,92% e 1ª parcela = 25% da renda
{
  let maxDif = 0;
  for (const [renda, fin] of [[13000.01, 332155.55], [14000, 358305.35], [15000, 384455.15], [16000, 410604.95], [17000, 436755.08], [20000, 515204.66], [23000, 593654.24]] as [number, number][]) {
    const d = descobrir(renda, 0, 0, 35, 25, true, true, false);
    maxDif = Math.max(maxDif, Math.abs(d.sbpe.valorFinanciado / fin - 1) * 100);
  }
  check(`Tabela Caixa: financiamento SBPE dentro de ±4% (pior ${maxDif.toFixed(1)}%) — antes o site dava ~20% a mais (11,19% a 30% da renda)`, maxDif <= 4);
  // teste real no simulador oficial da Caixa feito pelo dono do site em 2026-09: renda R$15.000, idade 30 → R$383.646,67
  const d15 = descobrir(15000, 0, 0, 35, 30, true, true, false);
  check(`Renda R$15.000 idade 30 → SBPE perto do simulador oficial da Caixa (R$383.647), nosso ${d15.sbpe.valorFinanciado}`, Math.abs(d15.sbpe.valorFinanciado / 383646.67 - 1) <= 0.04);
}

// Subsídio da tabela (COM dependente / SEM dependente) — exato nas linhas com valor
{
  const f1 = FAIXAS_MCMV[0], f2 = FAIXAS_MCMV[1];
  const sub = (f: typeof f1, renda: number, dep: number) => calcSubsidioEstimado(f, renda, 275000, true, true, false, dep);
  const casos: [typeof f1, number, number, number][] = [
    [f1, 1200, 1, 55000], [f1, 1700, 1, 55000], [f1, 1900, 1, 55000], [f1, 2000, 1, 50777], [f1, 2100, 1, 44812],
    [f1, 2500, 1, 25438], [f1, 3000, 1, 9818], [f1, 3200, 1, 6011],
    [f1, 1700, 0, 16500], [f1, 2000, 0, 15233], [f1, 3200, 0, 1803],
    [f2, 3300, 1, 4659], [f2, 3500, 1, 2799], [f2, 3800, 1, 2192], [f2, 4000, 1, 2149],
    [f2, 3300, 0, 0], [f2, 4100, 1, 0], [f2, 5000, 1, 0],
  ];
  let erros = 0;
  for (const [f, renda, dep, esperado] of casos) if (Math.abs(sub(f, renda, dep) - esperado) > 1) erros++;
  check('Tabela Caixa: subsídio COM/SEM dependente bate nas linhas (R$55.000 até renda R$1.900; some acima de R$4.000)', erros === 0);
  check('Subsídio não depende de ser cotista do FGTS (a tabela não liga um ao outro)', calcSubsidioEstimado(f1, 2000, 275000, false, true, false, 1) === 50777);
}

// 16. Calculadora rápida da CAIXA (simuladorhabitacao.caixa.gov.br, testada ao vivo em 2026-09, nascimento
//     15/03/1996 → 30 anos): usa taxa "sem redutor" (= coluna "sem redutor" da tabela) e Price, e nunca bloqueia —
//     só informa a entrada mínima (preço − financiamento).
{
  // Renda R$6.000 (Faixa 3, 8,16% nominal / 8,47% efetiva) → Caixa financia R$239.942,26
  const d6 = descobrir(6000, 0, 0, 35, 30, false, true, false);
  check(`Caixa rápida: renda R$6.000 sem redutor → financiamento perto de R$239.942 (nosso ${d6.mcmv.valorFinanciado})`, Math.abs(d6.mcmv.valorFinanciado / 239942.26 - 1) <= 0.01);
  check('Caixa rápida: renda R$6.000 → taxa nominal 8,16% (efetiva 8,47%)', d6.mcmv.taxa === 8.16);
  // Prestação R$3.000 ⇒ renda R$10.000 (Faixa 4, 10,00% nominal / 10,47% efetiva) → financia R$339.057,95
  const d10 = descobrir(10000, 0, 0, 35, 30, false, true, false);
  check(`Caixa rápida: renda R$10.000 (Faixa 4) → financiamento perto de R$339.058 (nosso ${d10.mcmv.valorFinanciado})`, Math.abs(d10.mcmv.valorFinanciado / 339057.95 - 1) <= 0.01);
  check('Caixa rápida: Faixa 4 → taxa nominal 10,00%', d10.mcmv.taxa === 10);
  // "cotista" só melhora a taxa (padrão conservador do site agora é NÃO cotista)
  const d6c = descobrir(6000, 0, 0, 35, 30, true, true, false);
  check('Cotista FGTS (7,66%) financia mais que o padrão sem redutor (8,16%)', d6c.mcmv.valorFinanciado > d6.mcmv.valorFinanciado);
}

// 17. Modo "pela prestação" da Caixa (testado ao vivo, 2026-09): prestação R$3.000 → renda estimada R$10.000 (30%).
//     Acima do teto de renda do MCMV (R$13.000) vale o SBPE da Caixa, com 1ª parcela de 25% da renda.
check('Pela prestação: R$3.000 → renda R$10.000 (igual à Caixa)', rendaNecessariaPelaPrestacao(3000) === 10000);
check('Pela prestação: R$1.500 → renda R$5.000', rendaNecessariaPelaPrestacao(1500) === 5000);
check('Pela prestação: R$3.900 → renda R$13.000 (limite do MCMV)', rendaNecessariaPelaPrestacao(3900) === 13000);
check('Pela prestação: R$4.000 → SBPE a 25% da renda = R$16.000', rendaNecessariaPelaPrestacao(4000) === 16000);
check('Pela prestação: valor inválido → 0', rendaNecessariaPelaPrestacao(0) === 0 && rendaNecessariaPelaPrestacao(-5) === 0);
{
  // A renda derivada, passada pelo motor, reproduz a prestação pedida (ida e volta)
  for (const p of [1200, 2000, 3000, 3800]) {
    const d = descobrir(rendaNecessariaPelaPrestacao(p), 0, 0, 35, 30, false, true, false);
    check(`Pela prestação R$${p}: a parcela do perfil volta perto do pedido (${d.mcmv.parcela})`, Math.abs(d.mcmv.parcela / p - 1) <= 0.02);
  }
  const d4 = descobrir(rendaNecessariaPelaPrestacao(4000), 0, 0, 35, 30, false, true, false);
  check(`Pela prestação R$4.000 (SBPE): parcela do perfil volta perto de R$4.000 (${d4.sbpe.parcela})`, Math.abs(d4.sbpe.parcela / 4000 - 1) <= 0.02);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail > 0 ? 1 : 0);
