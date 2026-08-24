// FAQ do simulador na planta — fonte única, usada pelo Schema (layout.tsx,
// server) e pelo bloco visível (page.tsx, client). Os dois precisam mostrar
// exatamente o mesmo texto — Schema nunca pode declarar pergunta que a página
// não responde de verdade.
export const FAQ_NA_PLANTA = [
  {
    name: 'Como funciona a simulação de um imóvel na planta?',
    answer: 'A simulação reproduz o cronograma real de pagamento: o valor pago à construtora na assinatura (ato), as parcelas mensais durante a obra, reforços anuais opcionais e o saldo pago na entrega das chaves — além dos juros evolutivos cobrados pelo banco em paralelo, no caso do crédito associativo MCMV.',
  },
  {
    name: 'Como calcular a entrada de um imóvel na planta?',
    answer: 'A entrada é a soma dos recursos que você usa antes do financiamento assumir o restante: FGTS, subsídio (quando há) e os valores pagos à construtora (ato, sinais, mensais, anuais). O simulador calcula automaticamente a entrada mínima estimada pelo seu perfil e ajuda a distribuir esse valor entre as etapas.',
  },
  {
    name: 'Como calcular as parcelas durante a obra?',
    answer: 'Durante a obra existem dois fluxos separados: as parcelas mensais pagas diretamente à construtora (definidas em contrato) e, no MCMV com crédito associativo, os juros evolutivos pagos ao banco sobre o valor já liberado para a obra — que começam baixos e crescem até a entrega. O simulador mostra os dois lado a lado.',
  },
  {
    name: 'Qual a diferença entre financiar um imóvel pronto e um na planta?',
    answer: 'No imóvel pronto o financiamento é liberado de uma vez e a parcela já nasce no valor final. Na planta, o crédito associativo do MCMV libera o dinheiro aos poucos conforme a obra avança, e por isso existem os juros evolutivos além das parcelas à construtora — o artigo sobre crédito associativo detalha essa diferença.',
  },
  {
    name: 'Consigo saber se tenho perfil para comprar um imóvel na planta?',
    answer: 'Sim — é exatamente o que este simulador calcula: a partir da sua renda e do valor do imóvel, ele identifica automaticamente se você se enquadra no MCMV ou no SBPE, estima a capacidade de financiamento do seu perfil e mostra se os recursos informados cobrem a entrada necessária.',
  },
];
