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

// 7. descobrir() respeita o LTV da faixa MCMV, não só a capacidade de renda
//    (auditoria 2026-09 — antes o "poder de compra" ignorava a entrada mínima
//    e prometia valores que simular() recusava por LTV insuficiente)
const r7 = descobrir(6000, 0, 0, 35, 35, true, true, false); // Faixa 3, R$0 de entrada
check('MCMV Faixa 3, entrada R$0 → limitadoPorEntrada = true', r7.mcmv.limitadoPorEntrada === true);
check('MCMV Faixa 3, entrada R$0 → poder de compra ~R$0 (não financia nada sem entrada)', r7.mcmv.valorFinanciado === 0 && r7.mcmv.valorMaxImovel === 0);

// 8. Com entrada suficiente (20% da Faixa 3), deixa de ser limitado pela entrada
const entradaFaixa3 = r7.mcmv.entradaIdealParaValorMax;
const r8 = descobrir(6000, 0, entradaFaixa3, 35, 35, true, true, false);
check('MCMV Faixa 3, entrada ideal → limitadoPorEntrada = false', r8.mcmv.limitadoPorEntrada === false);
check('MCMV Faixa 3, entrada ideal → poder de compra bem maior que com entrada R$0', r8.mcmv.valorMaxImovel > r7.mcmv.valorMaxImovel);

// 9. O que simular() bloqueia por LTV, descobrir() já não deveria mais oferecer
//    como "poder de compra" limpo — os dois têm que concordar.
const r9sim = simular({
  rendaBruta: 6000, fgts: 0, entrada: 0, valorImovel: r7.mcmv.valorMaxImovel || 252000,
  prazoAnos: 35, naPlanta: false, prazoObraAnos: 3, idadeProponente: 35,
});
check('Ficha do imóvel: mesmo cenário (renda 6k, Faixa 3, entrada R$0) continua bloqueando por LTV', r9sim.bloqueado === true);

// 10. Comprometimento exibido (1 casa decimal) nunca contradiz a classificação —
//     a causa raiz do "30,0% = RISCO" relatado na auditoria.
for (const renda of [4000, 6000, 8000, 9500]) {
  const r = simular({ rendaBruta: renda, fgts: 0, entrada: 0, valorImovel: 400000, prazoAnos: 35, naPlanta: false, prazoObraAnos: 3, idadeProponente: 35 });
  const consistente = classificarSaudeFinanceira(r.comprometimento) === r.saudeLabel;
  check(`Renda R$${renda}: rótulo de saúde bate com o comprometimento exibido (${r.comprometimento.toFixed(1)}% → ${r.saudeLabel})`, consistente);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail > 0 ? 1 : 0);
