// Sanity check das regras críticas de lib/calculos.ts — sem framework de testes.
// Roda com: npm run verify
import { simular, descobrir, detectarFaixaMCMV, classificarSaudeFinanceira } from '../lib/calculos';

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

// 4. Capacidade SBPE respeita 30% mesmo com seguros (entrada alta o bastante
//    pra não esbarrar no teto de LTV — ver testes 7/8 abaixo pra esse caso)
const r4 = descobrir(50000, 0, 700000, 35, 35, true, true, false);
check('SBPE renda R$50k → comprometimento ≤ 30,1%', r4.sbpe.comprometimento <= 30.1);
check('SBPE renda R$50k → parcela entre R$14.500 e R$15.100', r4.sbpe.parcela >= 14500 && r4.sbpe.parcela <= 15100);

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

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail > 0 ? 1 : 0);
