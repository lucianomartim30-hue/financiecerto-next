// Sanity check das regras críticas de lib/calculos.ts — sem framework de testes.
// Roda com: npm run verify
import { simular, descobrir, detectarFaixaMCMV } from '../lib/calculos';

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

// 4. Capacidade SBPE respeita 30% mesmo com seguros
const r4 = descobrir(50000, 0, 0, 35, 35, true, true, false);
check('SBPE renda R$50k → comprometimento ≤ 30,1%', r4.sbpe.comprometimento <= 30.1);
check('SBPE renda R$50k → parcela entre R$14.500 e R$15.100', r4.sbpe.parcela >= 14500 && r4.sbpe.parcela <= 15100);

// 5. SFI só acima do teto SFH
const r5a = simular({ rendaBruta: 30000, fgts: 0, entrada: 100000, valorImovel: 1500000, prazoAnos: 35, naPlanta: false, prazoObraAnos: 3, idadeProponente: 35 });
check('Imóvel R$1,5M (< teto SFH) → NÃO é SFI', r5a.isSFI === false);
const r5b = simular({ rendaBruta: 50000, fgts: 0, entrada: 500000, valorImovel: 3000000, prazoAnos: 35, naPlanta: false, prazoObraAnos: 3, idadeProponente: 35 });
check('Imóvel R$3M (> teto SFH) → é SFI', r5b.isSFI === true);

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail > 0 ? 1 : 0);
