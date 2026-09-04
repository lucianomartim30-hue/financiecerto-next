// FAQ do simulador principal — fonte única, usada pelo Schema (layout.tsx,
// server) e pelo bloco visível (page.tsx, client). Os dois precisam mostrar
// exatamente o mesmo texto — Schema nunca pode declarar pergunta que a página
// não responde de verdade. Mesmo padrão de app/simulador/na-planta/faq-data.ts.
export const FAQ_SIMULADOR = [
  {
    name: 'Como funciona o simulador Minha Casa Minha Vida?',
    answer: 'Você informa renda familiar, idade do proponente mais velho, FGTS disponível e valor de entrada. Com isso, o simulador identifica automaticamente se você se enquadra em alguma faixa do Minha Casa Minha Vida ou se o seu perfil é SBPE ou SFI, e mostra taxa, parcela estimada e poder de compra.',
  },
  {
    name: 'Quais informações são usadas na simulação?',
    answer: 'Renda bruta familiar, idade do proponente mais velho (que define o prazo máximo), saldo de FGTS disponível e valor de entrada — os mesmos critérios que bancos e a Caixa Econômica Federal usam para avaliar um financiamento real.',
  },
  {
    name: 'É possível usar FGTS na simulação?',
    answer: 'Sim. O FGTS informado entra como parte da entrada, reduzindo o valor a financiar e, dependendo do seu perfil, a parcela — a elegibilidade de uso do FGTS segue as regras vigentes da Caixa Econômica Federal.',
  },
  {
    name: 'O simulador também compara MCMV, SBPE e SFI?',
    answer: 'Sim. O resultado mostra qual modalidade — Minha Casa Minha Vida, SBPE ou SFI — se aplica ao seu perfil e, quando mais de uma é possível, compara as condições entre elas.',
  },
  {
    name: 'A simulação representa aprovação de crédito?',
    answer: 'Não. É uma estimativa educativa baseada nas regras e taxas vigentes — a aprovação de um financiamento depende sempre de análise de crédito feita pelo banco ou pela Caixa Econômica Federal.',
  },
];
