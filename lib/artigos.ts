// ─────────────────────────────────────────────────────────────────────────────
// lib/artigos.ts — FONTE ÚNICA dos artigos do hub /aprenda
//
// Cada artigo aqui vira automaticamente:
//   1. uma página em /aprenda/[slug]  (SEO: título, descrição, schema próprios)
//   2. uma entrada no sitemap.xml      (Google descobre)
//   3. conhecimento do João            (os "fatosChaveParaJoao" entram no chat
//                                        quando o usuário está lendo o artigo)
//
// Ou seja: adicionar um artigo = site + Google + João, tudo sincronizado.
// Os NÚMEROS devem bater com lib/calculos.ts (mesma fonte do simulador).
// ─────────────────────────────────────────────────────────────────────────────

export type BlocoArtigo =
  | { tipo: 'p'; texto: string }
  | { tipo: 'lista'; itens: string[] }
  | { tipo: 'destaque'; texto: string }
  | { tipo: 'tabela'; cabecalho: string[]; linhas: string[][] };

export interface SecaoArtigo {
  titulo: string;
  blocos: BlocoArtigo[];
}

export interface FAQItem {
  pergunta: string;
  resposta: string;
}

export interface Artigo {
  slug: string;
  keyword: string;            // palavra-chave principal (a busca alvo)
  /** Frases curtas que, se aparecerem numa pergunta ao João em QUALQUER página
   * (não só na página deste artigo), indicam que esse conteúdo é relevante —
   * usado por app/api/chat/route.ts pra decidir qual artigo injetar no contexto,
   * sem precisar mandar todos os artigos em toda requisição. Ver detectarArtigosRelevantes(). */
  triggers?: string[];
  titulo: string;            // H1 visível
  tituloSEO: string;         // <title> da aba/Google
  metaDescription: string;
  resumo: string;            // parágrafo de abertura (lead)
  publicado: string;         // ISO 8601
  atualizado: string;        // ISO 8601
  leituraMin: number;        // tempo estimado de leitura
  secoes: SecaoArtigo[];
  faq: FAQItem[];
  fatosChaveParaJoao: string[];           // injetados no contexto do João
  ctaSimulador: { texto: string; href: string };
  /** Sobrescreve o título/texto de apoio do 1º bloco de CTA (default: "Quer ver os
   * seus números?" / "Simule com a sua renda..." — só faz sentido pra artigos sobre
   * financiamento). Usar em artigos onde o CTA principal não é simular. */
  ctaSimuladorTitulo?: string;
  ctaSimuladorContexto?: string;
  /** Esconde o 1º bloco de CTA inteiro (título+contexto+botão) — usar quando o
   * artigo é puramente educacional, sem ação de conversão específica a oferecer. */
  ctaSimuladorOculto?: boolean;
  /** Esconde o botão secundário "Ver imóveis em SP" do 1º bloco de CTA — usar quando
   * o artigo não trata de compra/financiamento direto de imóvel do catálogo. */
  ctaSemBotaoImoveis?: boolean;
  /** Esconde o bloco final "Pronto pra ver os imóveis?" inteiro — mesmo motivo acima;
   * evita associar automaticamente o catálogo geral a um assunto que não é sobre isso. */
  ctaFinalImoveisOculto?: boolean;
  relacionados: string[];    // slugs de artigos relacionados
}

// ─────────────────────────────────────────────────────────────────────────────
// ARTIGOS
// ─────────────────────────────────────────────────────────────────────────────
export const ARTIGOS: Artigo[] = [
  {
    slug: 'juros-evolucao-obra',
    keyword: 'juros de evolução de obra',
    triggers: ['juros de evolução de obra', 'juros evolutivos', 'quanto pago durante a obra', 'prestação 0'],
    titulo: 'Juros de Evolução de Obra: o que é e quanto você paga durante a obra',
    tituloSEO: 'Juros de Evolução de Obra: Quanto Você Paga Durante a Obra (MCMV 2026)',
    metaDescription:
      'Entenda os juros de evolução de obra no financiamento MCMV: o que são, como a Caixa calcula a parcela durante a obra e um exemplo real mês a mês. Simule o seu na planta.',
    resumo:
      'Quem financia um imóvel na planta pela Caixa já sabe, desde a assinatura do contrato, que vai pagar uma parcela mensal durante a obra — os juros de evolução de obra. Aqui você entende exatamente como a Caixa calcula esse valor, por que ele cresce mês a mês, e vê um exemplo real do início ao fim da obra.',
    publicado: '2026-06-13',
    atualizado: '2026-06-13',
    leituraMin: 7,
    secoes: [
      {
        titulo: 'O que são os juros de evolução de obra',
        blocos: [
          { tipo: 'p', texto: 'Quando você compra um imóvel **na planta** financiado pela Caixa (o chamado **Crédito Associativo**), o contrato de financiamento é assinado **antes do início da obra** — não durante, nem depois. A partir da assinatura, a Caixa não entrega todo o dinheiro de uma vez para a construtora: ela libera o valor aos poucos, conforme a obra avança.' },
          { tipo: 'p', texto: 'Por isso, cerca de **30 dias depois de assinar o contrato**, já chega a primeira fatura: os **juros de evolução de obra**. Você paga ao banco apenas os juros sobre o que já foi liberado até aquele mês — é como pegar o empréstimo aos poucos e pagar juros só sobre a parte já usada. Essas cobranças mensais aparecem no seu extrato como **Prestação 0**.' },
          { tipo: 'destaque', texto: 'Ponto-chave: durante a obra você **ainda não está pagando a dívida** — só os juros do que já foi liberado. A amortização (o abatimento da dívida) só começa depois das chaves.' },
        ],
      },
      {
        titulo: 'Como a Caixa calcula a parcela durante a obra',
        blocos: [
          { tipo: 'p', texto: 'A parcela mensal durante a obra é a soma de **4 partes**:' },
          { tipo: 'lista', itens: [
            '**Juros evolutivos** — calculados sobre o valor já liberado à construtora. É a parte que mais cresce.',
            '**Amortização (TR)** — a correção monetária do mês. Não abate a dívida; apenas neutraliza a TR sobre o saldo.',
            '**Seguros (MIP + DFI)** — seguro de vida + seguro do imóvel. Valor praticamente fixo.',
            '**Taxa de administração** — cobrada pela Caixa (em torno de R$ 25/mês).',
          ] },
          { tipo: 'p', texto: 'O cálculo dos juros é direto: a Caixa transforma a taxa anual em mensal **dividindo por 12** (não usa juros compostos). Por exemplo, uma taxa de 7,66% ao ano vira **0,6383% ao mês** (7,66 ÷ 12). Depois multiplica essa taxa pelo valor já liberado.' },
          { tipo: 'destaque', texto: 'Fórmula simples: **Juros do mês = valor já liberado × (taxa anual ÷ 12)**. Some os seguros e a taxa de administração e você tem a parcela.' },
        ],
      },
      {
        titulo: 'Exemplo real, mês a mês',
        blocos: [
          { tipo: 'p', texto: 'Veja um caso real de um financiamento MCMV Faixa 3 (R$ 267.000 financiados, taxa 7,66% ao ano). Repare como a parcela sobe conforme a obra avança:' },
          { tipo: 'tabela',
            cabecalho: ['Mês', 'Juros', 'Parcela total', 'Obra'],
            linhas: [
              ['Jan/2026', 'R$ 190', 'R$ 303,54', '~0%'],
              ['Fev/2026', 'R$ 381', 'R$ 559,10', '1,85%'],
              ['Mar/2026', 'R$ 407', 'R$ 558,88', '2,72%'],
              ['Abr/2026', 'R$ 417', 'R$ 606,01', '3,20%'],
              ['Mai/2026', 'R$ 431', 'R$ 620,25', '4,64%'],
              ['Jun/2026', 'R$ 470', 'R$ 656,77', '7,80%'],
            ],
          },
          { tipo: 'p', texto: 'Janeiro foi quase metade de fevereiro porque o dinheiro foi liberado no meio do mês — então só houve juros sobre meio período. A partir daí, cada nova liberação da Caixa à construtora aumenta o saldo e, com ele, os juros.' },
        ],
      },
      {
        titulo: 'Por que a parcela cresce todo mês',
        blocos: [
          { tipo: 'p', texto: 'Porque os juros incidem sobre o **valor já liberado**, e esse valor sobe conforme a obra avança. Quando a obra está no início, a Caixa liberou pouco — então o juros é baixo. Conforme a construção progride, mais verba é liberada, o saldo aumenta e o juros acompanha.' },
          { tipo: 'p', texto: 'No fim da obra, quando praticamente todo o financiamento já foi liberado, o juros chega perto do seu teto. No exemplo acima (R$ 267.000 a 7,66%), o juros máximo durante a obra fica em torno de **R$ 1.704/mês** (267.000 × 0,6383%).' },
        ],
      },
      {
        titulo: 'E a TR? (a parte que varia)',
        blocos: [
          { tipo: 'p', texto: 'A linha de **Amortização** durante a obra é, na prática, a **TR (Taxa Referencial)** do mês — uma correção que o Banco Central publica mensalmente e que **muda todo mês**. Em alguns meses ela é quase zero; em outros passa de R$ 100. É a única parte da parcela que não dá para prever com exatidão, justamente porque depende da TR vigente.' },
        ],
      },
      {
        titulo: 'O que muda quando você recebe as chaves',
        blocos: [
          { tipo: 'p', texto: 'Quando a obra termina e sai o **habite-se**, a Prestação 0 (juros de evolução) **termina completamente**. Em seguida, começa algo diferente: a **parcela real do financiamento** (1, 2, 3...), calculada sobre o valor total financiado, com amortização + juros + seguros. Não é a mesma cobrança crescendo — são duas coisas distintas, uma depois da outra.' },
          { tipo: 'destaque', texto: 'No exemplo real, a Prestação 0 estava em ~R$ 657/mês no fim da obra. A parcela real do financiamento, que começa em seguida, foi para cerca de **R$ 1.966/mês**. São duas cobranças diferentes — vale planejar com antecedência para essa nova parcela, bem maior que a Prestação 0.' },
        ],
      },
      {
        titulo: 'Como saber exatamente quanto você vai pagar',
        blocos: [
          { tipo: 'p', texto: 'Cada contrato tem taxa, prazo e cronograma próprios. A melhor forma de ver os seus números — quanto paga durante a obra e quanto será a parcela depois das chaves — é simular com os seus dados reais. Leva menos de 2 minutos e é gratuito.' },
        ],
      },
    ],
    faq: [
      { pergunta: 'Os juros de evolução de obra abatem minha dívida?',
        resposta: 'Não. Durante a obra você paga apenas os juros sobre o valor já liberado à construtora. A dívida só começa a ser abatida (amortizada) depois que você recebe as chaves e começam as prestações reais.' },
      { pergunta: 'Por que minha parcela aumenta todo mês durante a obra?',
        resposta: 'Porque os juros incidem sobre o valor já liberado pela Caixa, e esse valor cresce conforme a obra avança. Mais obra concluída significa mais verba liberada à construtora, mais saldo e, portanto, mais juros.' },
      { pergunta: 'Por quanto tempo pago os juros de obra?',
        resposta: 'Desde cerca de 30 dias após a assinatura do contrato de financiamento (que ocorre antes do início da obra) até a entrega das chaves (habite-se). O prazo total de obra varia de 1 a 3 anos, dependendo do empreendimento.' },
      { pergunta: 'A parcela vai aumentar quando eu pegar as chaves?',
        resposta: 'Não é a mesma parcela aumentando — são duas cobranças diferentes. Os juros de evolução de obra (Prestação 0) terminam completamente na entrega das chaves. Em seguida, começa a parcela real do financiamento, calculada sobre o valor total financiado (amortização + juros + seguros) — geralmente bem mais alta que a Prestação 0 que você pagava durante a obra.' },
      { pergunta: 'Como a Caixa calcula o juros mensal?',
        resposta: 'Ela transforma a taxa anual em mensal dividindo por 12 (não usa juros compostos) e multiplica pelo valor já liberado. Exemplo: 7,66% ao ano ÷ 12 = 0,6383% ao mês; sobre um saldo liberado de R$ 60.000, o juros do mês fica em torno de R$ 383.' },
    ],
    fatosChaveParaJoao: [
      'Juros de evolução de obra = juros pagos ao banco durante a construção, sobre o valor JÁ liberado à construtora (aparece como "Prestação 0"). NÃO abatem a dívida.',
      'A Caixa calcula a taxa mensal como taxa anual ÷ 12 (não juros compostos). Ex: 7,66% ÷ 12 = 0,6383%/mês.',
      'Parcela durante a obra = Juros (saldo liberado × taxa mensal) + Amortização (TR do mês, variável) + Seguros (MIP+DFI, ~R$ 51) + Taxa adm (~R$ 25).',
      'A parcela CRESCE mês a mês porque a Caixa libera mais verba conforme a obra avança, aumentando o saldo sobre o qual incide o juros.',
      'Exemplo real (MCMV F3, R$ 267.000 a 7,66%): parcela foi de ~R$ 303 (jan, obra ~0%) a ~R$ 657 (jun, obra 7,8%). Teto do juros na obra ≈ R$ 1.704/mês.',
      'Após as chaves (habite-se), a Prestação 0 (juros de evolução) TERMINA completamente. Em seu lugar começa uma cobrança diferente: a parcela real do financiamento, com amortização (no exemplo, Prestação 0 de ~R$657 termina, parcela real de ~R$1.966/mês começa). NÃO é a mesma parcela aumentando — são duas coisas distintas.',
      'A linha "Amortização" durante a obra é a TR do mês (correção monetária) — varia todo mês, não reduz a dívida.',
    ],
    ctaSimulador: { texto: 'Simular meu imóvel na planta', href: '/simulador/na-planta' },
    relacionados: ['mcmv-sbpe-sfi-qual-modalidade-escolher', 'credito-associativo-como-funciona-comprar-na-planta'],
  },
  {
    slug: 'mcmv-sbpe-sfi-qual-modalidade-escolher',
    keyword: 'MCMV, SBPE ou SFI qual escolher',
    triggers: ['mcmv sbpe sfi', 'mcmv ou sbpe', 'diferença entre mcmv e sbpe', 'qual modalidade de financiamento', 'qual financiamento escolher'],
    titulo: 'MCMV, SBPE ou SFI: Qual Modalidade de Financiamento Escolher',
    tituloSEO: 'MCMV, SBPE ou SFI: Qual Financiamento Imobiliário Escolher (2026)',
    metaDescription:
      'Compare MCMV, SBPE e SFI: faixas de renda, taxas reais, tetos de imóvel e subsídio. Descubra em qual modalidade sua renda se encaixa e simule sua parcela.',
    resumo:
      'Antes de procurar imóvel, vale saber em qual modalidade de financiamento você se encaixa — isso muda a taxa de juros, o subsídio (quando existe) e até o valor máximo de imóvel que você pode financiar. Aqui você compara MCMV, SBPE e SFI lado a lado, com taxas e tetos reais de 2026.',
    publicado: '2026-06-17',
    atualizado: '2026-06-17',
    leituraMin: 9,
    secoes: [
      {
        titulo: 'As 3 modalidades em resumo',
        blocos: [
          { tipo: 'p', texto: 'No Brasil, todo financiamento habitacional cai em uma de três modalidades — e a divisão entre elas é definida principalmente pela **sua renda familiar bruta** e pelo **valor do imóvel**:' },
          { tipo: 'tabela',
            cabecalho: ['Modalidade', 'Quem usa', 'Taxa (a.a. + TR)', 'Teto do imóvel', 'FGTS'],
            linhas: [
              ['MCMV', 'Renda até R$ 13.000', '4,00% a 10,50%', 'R$ 275 mil a R$ 600 mil (por faixa)', 'Sim'],
              ['SBPE (SFH)', 'Qualquer renda, imóvel até R$ 2,25 mi', '11,19% a 11,97%', 'R$ 2,25 milhões', 'Sim'],
              ['SFI', 'Imóvel acima de R$ 2,25 mi', '~12,5% (taxa de mercado)', 'Sem teto', 'Não'],
            ],
          },
          { tipo: 'destaque', texto: 'Regra prática: se sua renda é até R$ 13.000/mês E o imóvel está dentro do teto da sua faixa, o MCMV quase sempre é mais vantajoso — taxas menores e, nas Faixas 1 e 2, subsídio. Acima disso, ou para imóvel mais caro que o teto MCMV, a opção é SBPE; e só acima de R$ 2,25 milhões entra o SFI.' },
        ],
      },
      {
        titulo: 'MCMV: faixas, taxas e subsídio por renda',
        blocos: [
          { tipo: 'p', texto: 'O Minha Casa Minha Vida divide os participantes em 4 faixas, conforme a Portaria MCID nº 333/2026. Quanto menor a renda, menor a taxa — e só as duas primeiras faixas têm subsídio:' },
          { tipo: 'tabela',
            cabecalho: ['Faixa', 'Renda mensal', 'Taxa (a.a.)', 'Teto do imóvel', 'Subsídio máx.'],
            linhas: [
              ['Faixa 1', 'até R$ 3.200', '4,00% a 5,00%', 'R$ 275.000', 'R$ 55.000'],
              ['Faixa 2', 'R$ 3.200 a R$ 5.000', '5,00% a 7,00%', 'R$ 275.000', 'R$ 55.000 (decrescente)'],
              ['Faixa 3', 'R$ 5.000 a R$ 9.600', '7,66% a 8,16%', 'R$ 400.000', 'Não tem'],
              ['Faixa 4', 'R$ 9.600 a R$ 13.000', '10,50% (fixa)', 'R$ 600.000', 'Não tem'],
            ],
          },
          { tipo: 'p', texto: 'Na Faixa 2, a taxa é uma **escala deslizante**: quem ganha R$ 3.200 paga próximo de 5,00% a.a.; quem ganha R$ 5.000 paga próximo de 7,00% a.a. — o valor exato varia ponto a ponto dentro da faixa. Nas Faixas 3 e 4, ser cotista do FGTS (ter pelo menos 3 anos de contribuição) garante a taxa mais baixa do intervalo; sem isso, paga-se a taxa mais alta.' },
          { tipo: 'destaque', texto: 'O subsídio é decrescente: quanto menor a renda, maior o desconto no preço do imóvel. Ele nunca é devolvido — é abatido direto do valor financiado. A partir da Faixa 3, não há mais subsídio, só taxa reduzida em relação ao SBPE.' },
        ],
      },
      {
        titulo: 'SBPE: a porta para quem não se qualifica no MCMV',
        blocos: [
          { tipo: 'p', texto: 'O SBPE (Sistema Brasileiro de Poupança e Empréstimo) usa recursos da caderneta de poupança e opera dentro do **SFH** (Sistema Financeiro da Habitação) para imóveis residenciais de até R$ 2,25 milhões. É a linha padrão de mercado, sem subsídio do governo, mas com regras menos restritivas: qualquer renda pode contratar, e qualquer banco pode oferecer.' },
          { tipo: 'tabela',
            cabecalho: ['Banco', 'Taxa (a.a. + TR)', 'Observação'],
            linhas: [
              ['Caixa Econômica Federal', '11,19%', 'Correntista com relacionamento'],
              ['Banco Inter', '11,49%', 'Digital, sem tarifa de adm.'],
              ['Bradesco', '11,69%', '—'],
              ['Santander', '11,74%', '—'],
              ['Itaú', '11,89%', '—'],
              ['Banco do Brasil', '11,97%', 'Correntista BB'],
            ],
          },
          { tipo: 'p', texto: 'O FGTS pode ser usado no SBPE da mesma forma que no MCMV: como parte da entrada ou para amortizar o saldo devedor — desde que o imóvel esteja dentro do teto do SFH e o comprador atenda às regras gerais do fundo (3 anos de contribuição, não ter outro imóvel financiado pelo SFH).' },
          { tipo: 'destaque', texto: 'Quem ganha pouco acima do teto do MCMV (ex.: R$ 13.500/mês) não cai automaticamente em taxas piores — o SBPE da Caixa, a partir de 11,19% a.a., é a opção, e o LTV pode chegar a 80% (SAC) ou 70% (Price).' },
        ],
      },
      {
        titulo: 'SFI: financiamento de alto padrão, sem teto',
        blocos: [
          { tipo: 'p', texto: 'Para imóveis acima de R$ 2,25 milhões — o teto do SFH —, a operação passa para o SFI (Sistema de Financiamento Imobiliário). A Caixa reativou essa linha para pessoa física em 2026, usando recursos do SBPE, com taxa de mercado em torno de 12,5% a.a. + TR.' },
          { tipo: 'lista', itens: [
            '**Sem teto de valor** — financia imóveis de qualquer preço acima de R$ 2,25 milhões.',
            '**Sem uso de FGTS** — o fundo só pode ser usado dentro do SFH.',
            '**Taxa de mercado** — mais alta que o SBPE, mas sem o limite legal de 12% a.a. que o SFH impõe.',
            '**Não é exclusividade da Caixa** — outros bancos também operam SFI para alto padrão.',
          ] },
        ],
      },
      {
        titulo: 'Como saber qual modalidade é a sua',
        blocos: [
          { tipo: 'p', texto: 'Cruze sua renda familiar bruta com o valor do imóvel que você quer comprar:' },
          { tipo: 'lista', itens: [
            'Renda até R$ 13.000 **e** imóvel dentro do teto da faixa correspondente → **MCMV** (melhor taxa, possível subsídio).',
            'Renda até R$ 13.000, mas imóvel **acima** do teto MCMV da sua faixa → **SBPE**, mesmo com renda baixa.',
            'Renda acima de R$ 13.000, imóvel até R$ 2,25 milhões → **SBPE**.',
            'Imóvel acima de R$ 2,25 milhões, qualquer renda → **SFI** (FGTS não entra).',
          ] },
          { tipo: 'destaque', texto: 'Exemplo: renda de R$ 4.500/mês comprando um imóvel de R$ 320.000. A renda está na Faixa 2 do MCMV, mas o imóvel passa do teto de R$ 275.000 da faixa — esse comprador precisa simular pelo SBPE, não pelo MCMV, mesmo com renda baixa.' },
        ],
      },
    ],
    faq: [
      { pergunta: 'Quem se qualifica para o MCMV pode escolher o SBPE mesmo assim?',
        resposta: 'Sim, é uma opção válida — por exemplo, para comprar um imóvel acima do teto da sua faixa MCMV, ou se preferir um banco específico. Mas normalmente o MCMV tem taxa menor e, nas Faixas 1 e 2, subsídio — então vale comparar as duas simulações antes de decidir.' },
      { pergunta: 'Quem ganha mais de R$ 13.000 pode usar o MCMV?',
        resposta: 'Não. R$ 13.000 é o teto da Faixa 4, a última do programa. Renda acima disso vai direto para o SBPE (até R$ 2,25 milhões) ou SFI (acima desse valor).' },
      { pergunta: 'O FGTS funciona em todas as modalidades?',
        resposta: 'Funciona no MCMV e no SBPE (dentro do SFH, até R$ 2,25 milhões). No SFI, não é permitido usar FGTS.' },
      { pergunta: 'Qual a diferença prática entre SFH e SFI?',
        resposta: 'O SFH é o sistema legal que cobre o MCMV e o SBPE para imóveis até R$ 2,25 milhões, com regras protegidas (uso de FGTS, taxa limitada a 12% a.a.). O SFI é o sistema paralelo para imóveis mais caros ou taxas mais altas, com regras de mercado livre.' },
      { pergunta: 'Posso comprar um imóvel de R$ 2,5 milhões usando FGTS?',
        resposta: 'Não. Imóveis acima de R$ 2,25 milhões (teto do SFH) entram automaticamente no SFI, que não permite uso de FGTS sob nenhuma hipótese.' },
    ],
    fatosChaveParaJoao: [
      'As 3 modalidades de financiamento: MCMV (renda até R$13.000, taxa 4-10,5%), SBPE/SFH (qualquer renda, imóvel até R$2,25M, taxa ~11,19-11,97%), SFI (imóvel acima de R$2,25M, taxa livre ~12,5%, sem FGTS).',
      'MCMV tem 4 faixas por renda: F1 até R$3.200 (4-5%, teto R$275k, subsídio até R$55k), F2 R$3.200-5.000 (5-7% escala deslizante, teto R$275k, subsídio decrescente), F3 R$5.000-9.600 (7,66-8,16%, teto R$400k, sem subsídio), F4 R$9.600-13.000 (10,5% fixo, teto R$600k, sem subsídio).',
      'A faixa MCMV é definida pela RENDA, mas o financiamento só vale se o IMÓVEL também estiver dentro do teto daquela faixa — senão precisa simular SBPE mesmo com renda baixa.',
      'SBPE permite qualquer renda, qualquer banco; taxa Caixa correntista 11,19% a.a.+TR é a mais competitiva do mercado em 2026. Permite FGTS dentro do teto SFH (R$2,25M).',
      'SFI é para imóveis acima de R$2,25M (teto SFH); não usa FGTS; taxa de mercado (~12,5% a.a.); sem teto de valor.',
      'Regra rápida pro João: cruzar renda do usuário com valor do imóvel desejado decide a modalidade — não basta olhar só a renda.',
    ],
    ctaSimulador: { texto: 'Descobrir minha modalidade', href: '/simulador' },
    relacionados: ['juros-evolucao-obra', 'sac-ou-price-qual-sistema-amortizacao-escolher', 'his-hmp-o-que-sao-quem-pode-comprar', 'imoveis-nr-nao-residencial-o-que-e-quem-pode-comprar'],
  },
  {
    slug: 'sac-ou-price-qual-sistema-amortizacao-escolher',
    keyword: 'SAC ou Price qual escolher',
    triggers: ['sac ou price', 'sistema de amortização', 'diferença entre sac e price'],
    titulo: 'SAC ou Price: Qual Sistema de Amortização Escolher',
    tituloSEO: 'SAC ou Price: Qual Sistema de Amortização Escolher (2026)',
    metaDescription:
      'Compare SAC e Price com exemplo real: primeira parcela, última parcela e total pago em 30 anos. Entenda qual sistema sai mais barato e quando o outro vale mais.',
    resumo:
      'Na hora de assinar o financiamento, o banco pergunta: SAC ou Price? A escolha muda o valor da primeira parcela, como ela evolui ao longo dos anos e quanto você paga de juros no total. Aqui você vê a conta real, lado a lado, com os mesmos R$ 230.000 financiados nos dois sistemas.',
    publicado: '2026-06-17',
    atualizado: '2026-06-17',
    leituraMin: 7,
    secoes: [
      {
        titulo: 'Como funciona cada sistema',
        blocos: [
          { tipo: 'p', texto: 'Os dois sistemas amortizam (abatem) a mesma dívida, mas distribuem o pagamento de forma diferente:' },
          { tipo: 'lista', itens: [
            '**SAC (Sistema de Amortização Constante):** a parte que abate a dívida é sempre o mesmo valor todo mês. Como o saldo devedor cai mais rápido, os juros (calculados sobre o saldo) diminuem mês a mês — e a parcela total também diminui.',
            '**Price (Tabela Price):** a parcela total é fixa do primeiro ao último mês. No início, quase tudo é juros e pouco é amortização; com o tempo, essa proporção se inverte. Por isso o saldo cai mais devagar e o custo total é maior.',
          ] },
          { tipo: 'destaque', texto: 'É o mesmo princípio de qualquer empréstimo: quem abate a dívida mais rápido (SAC) paga menos juros no total, porque os juros incidem sobre um saldo que cai mais rápido.' },
        ],
      },
      {
        titulo: 'Exemplo real, lado a lado',
        blocos: [
          { tipo: 'p', texto: 'Financiamento de R$ 230.000 (MCMV Faixa 3, 7,66% a.a. + TR, 30 anos = 360 meses), sem considerar seguros nem TR:' },
          { tipo: 'tabela',
            cabecalho: ['', 'SAC', 'Price'],
            linhas: [
              ['1ª parcela', 'R$ 2.107', 'R$ 1.633 (fixa)'],
              ['Última parcela', 'R$ 643', 'R$ 1.633 (fixa)'],
              ['Total pago em 30 anos', 'R$ 495.004', 'R$ 588.048'],
            ],
          },
          { tipo: 'destaque', texto: 'Nesse exemplo, o SAC custa R$ 93.044 menos ao longo do contrato — mas exige uma parcela inicial 29% mais alta que o Price (R$ 2.107 contra R$ 1.633).' },
        ],
      },
      {
        titulo: 'Por que o SAC sai mais barato no total',
        blocos: [
          { tipo: 'p', texto: 'No SAC, a amortização mensal é fixa: R$ 230.000 ÷ 360 meses ≈ R$ 639/mês de abatimento, sempre. Os juros incidem sobre o saldo restante, que cai nesse ritmo constante — então o total de juros pagos ao longo do contrato é menor.' },
          { tipo: 'p', texto: 'No Price, a parcela é fixa, então o banco recalcula a amortização todo mês para manter esse valor constante. Isso significa que, no começo, quase nada é amortizado — o saldo devedor demora mais para cair, e os juros incidem por mais tempo sobre um valor mais alto.' },
        ],
      },
      {
        titulo: 'Quando o Price pode valer a pena',
        blocos: [
          { tipo: 'p', texto: 'Apesar do custo total maior, o Price tem dois cenários onde faz sentido:' },
          { tipo: 'lista', itens: [
            '**Orçamento apertado no início:** se a parcela inicial do SAC pesa demais no seu limite de comprometimento de renda (30%), o Price reduz esse valor — ao custo de pagar mais juros depois.',
            '**LTV menor no SBPE:** no SBPE, o Price permite financiar até 70% do imóvel, contra até 80% no SAC. Ou seja, escolher SAC no SBPE pode exigir uma entrada menor para o mesmo imóvel.',
          ] },
          { tipo: 'destaque', texto: 'Na prática, quem pode pagar a parcela inicial mais alta do SAC quase sempre sai ganhando — menos juros totais e dívida menor desde o primeiro mês. O Price entra como alternativa quando a parcela inicial do SAC não cabe no orçamento.' },
        ],
      },
    ],
    faq: [
      { pergunta: 'Posso trocar de SAC para Price depois de assinar o contrato?',
        resposta: 'Normalmente não — o sistema de amortização é definido no contrato e não pode ser alterado depois sem renegociação com o banco (portabilidade ou novo contrato), o que tem custos e nem sempre é aceito.' },
      { pergunta: 'Por que a parcela do SAC começa mais alta que a do Price?',
        resposta: 'Porque no SAC a amortização é fixa desde o primeiro mês, somada aos juros sobre o saldo total. No Price, o banco distribui o pagamento para manter a parcela igual do início ao fim, então a primeira parcela é mais baixa.' },
      { pergunta: 'O Price é sempre mais caro no total?',
        resposta: 'Sim, para o mesmo valor, taxa e prazo, o Price sempre resulta em mais juros pagos no total — é uma consequência matemática de o saldo devedor cair mais lentamente.' },
      { pergunta: 'Qual sistema é melhor para quem tem orçamento apertado no início?',
        resposta: 'O Price, porque a parcela é fixa e mais baixa no começo comparada à primeira parcela do SAC. O custo é pagar mais juros ao longo do contrato.' },
    ],
    fatosChaveParaJoao: [
      'SAC = amortização constante todo mês; parcela total DECRESCE com o tempo (juros incidem sobre saldo que cai). Price = parcela FIXA do início ao fim; amortização cresce, juros diminuem dentro da parcela.',
      'Para o mesmo valor/taxa/prazo, SAC sempre custa menos no total (menos juros pagos) — mas a 1ª parcela do SAC é mais alta que a parcela fixa do Price.',
      'Exemplo real (R$230.000, 7,66% a.a., 360 meses): SAC 1ª parcela R$2.107, última R$643, total R$495.004. Price parcela fixa R$1.633, total R$588.048. Diferença: R$93.044 a mais no Price.',
      'No SBPE, o sistema de amortização afeta o LTV máximo: até 80% do imóvel com SAC, até 70% com Price (Price exige entrada maior).',
      'Não é possível trocar de sistema depois de assinado sem renegociar o contrato.',
    ],
    ctaSimulador: { texto: 'Simular Price x SAC', href: '/simulador' },
    relacionados: ['mcmv-sbpe-sfi-qual-modalidade-escolher'],
  },
  {
    slug: 'credito-associativo-como-funciona-comprar-na-planta',
    keyword: 'crédito associativo como funciona',
    triggers: ['crédito associativo', 'como funciona financiar na planta', 'financiar imóvel na planta mcmv'],
    titulo: 'Crédito Associativo: Como Funciona Financiar um Imóvel na Planta',
    tituloSEO: 'Crédito Associativo: Como Funciona Financiar na Planta (2026)',
    metaDescription:
      'Entenda o crédito associativo do início ao fim: como a Caixa libera o financiamento durante a obra, o fluxo de pagamento à construtora e o que muda no habite-se.',
    resumo:
      'No MCMV, comprar na planta quase sempre passa pelo crédito associativo: o contrato de financiamento é assinado antes do início da obra, e a primeira fatura de juros chega cerca de 30 dias depois. Já no financiamento tradicional (SBPE), o caminho é diferente — o contrato com o banco só é assinado depois da entrega das chaves. Aqui você vê os dois fluxos completos e entende quem recebe o quê em cada etapa.',
    publicado: '2026-06-17',
    atualizado: '2026-06-17',
    leituraMin: 8,
    secoes: [
      {
        titulo: 'O que é o crédito associativo',
        blocos: [
          { tipo: 'p', texto: 'É o modelo de financiamento usado pelo MCMV para imóveis na planta, em que o contrato com a Caixa é assinado **antes do início da obra** — não durante, nem só na entrega das chaves.' },
          { tipo: 'p', texto: 'A diferença para um financiamento de imóvel pronto: o banco não entrega o dinheiro de uma vez na assinatura. Ele libera o valor para a construtora **conforme a obra avança**, com base em medições periódicas. Cerca de 30 dias após a assinatura, já chega a primeira fatura: o comprador paga só os juros sobre o que já foi liberado até aquele mês (os juros de evolução de obra) — não a parcela completa, que só começa no habite-se.' },
        ],
      },
      {
        titulo: 'E se eu financiar pelo SBPE (banco tradicional) em vez do crédito associativo?',
        blocos: [
          { tipo: 'p', texto: 'O caminho é diferente. No financiamento tradicional (SBPE) para imóvel na planta, **o contrato de financiamento só é assinado depois da entrega das chaves** — não antes do início da obra como no crédito associativo MCMV.' },
          { tipo: 'lista', itens: [
            'Durante a obra, o comprador paga **só à construtora** (ato, mensais, sinais/reforços, anuais) — não há juros de evolução pagos a um banco nesse período.',
            'O comprador tem liberdade para escolher **qualquer banco** de sua preferência — não precisa ser o banco indicado pela construtora.',
            'A análise de crédito com o banco escolhido deve ser feita **antes do fim da obra**, para que o comprador já esteja aprovado e pronto para assinar o financiamento assim que as chaves forem entregues.',
          ] },
          { tipo: 'destaque', texto: 'Resumindo a diferença: no crédito associativo (MCMV), você assina com o banco antes da obra e paga juros de evolução nesse meio tempo. No SBPE, você só assina com o banco depois das chaves — mas a análise de crédito precisa estar pronta antes disso, durante a obra.' },
        ],
      },
      {
        titulo: 'O fluxo completo: da assinatura ao habite-se',
        blocos: [
          { tipo: 'lista', itens: [
            '**1. SICAQ (análise de crédito):** a construtora envia os dados do comprador à Caixa, que analisa e aprova a capacidade de financiamento — antes de qualquer contrato ser assinado ou sinal cobrado.',
            '**2. Contrato de Compra e Venda:** só depois do crédito aprovado, assinado entre comprador e construtora, definindo imóvel, valor e condições de pagamento (é nesse momento que o Ato/sinal é pago).',
            '**3. Contrato de Financiamento:** assinado entre comprador e Caixa. A partir daqui, o financiamento está formalizado.',
            '**4. Obra em andamento:** a Caixa libera recursos à construtora por medição de avanço físico. Cerca de 30 dias após a assinatura do contrato de financiamento, chega a primeira fatura de juros de evolução, e o comprador continua pagando mensalmente sobre o saldo já liberado.',
            '**5. Habite-se:** a prefeitura atesta que a construção terminou. O financiamento sai do regime de evolução e entra no regime normal — parcelas completas, com amortização.',
          ] },
          { tipo: 'destaque', texto: 'O acompanhamento de todo esse processo — medições, repasses, situação do comprador — fica registrado no SICAQ, sistema interno da Caixa. Construtoras costumam informar o andamento, mas vale acompanhar.' },
          { tipo: 'p', texto: 'A análise do SICAQ continua válida para a Caixa entre a aprovação e a assinatura do contrato de financiamento. Mas se a Caixa demorar mais de 2 meses para chamar o comprador para essa assinatura, pode ser que peça algum documento ou comprovante de renda atualizado antes de seguir.' },
        ],
      },
      {
        titulo: 'Quem recebe o quê: construtora x banco',
        blocos: [
          { tipo: 'p', texto: 'No crédito associativo (MCMV), durante a obra o comprador paga em duas frentes diferentes, que não devem ser confundidas:' },
          { tipo: 'tabela',
            cabecalho: ['Pagamento', 'Para quem', 'Quando'],
            linhas: [
              ['Ato (5% a 10%)', 'Construtora', 'Na assinatura do contrato'],
              ['Mensais', 'Construtora', 'Todo mês, durante a obra'],
              ['Sinais / reforços', 'Construtora', 'Geralmente concentrados nos primeiros 3 meses'],
              ['Anuais', 'Construtora', 'Parcelas anuais, geralmente mais altas'],
              ['Juros de evolução de obra', 'Caixa Econômica Federal', 'Todo mês, sobre o saldo já liberado'],
              ['Chaves', 'Construtora', 'Na entrega do imóvel'],
            ],
          },
          { tipo: 'p', texto: 'Esse cronograma de entrada (ato, mensais, sinais/reforços, anuais) não é uma regra rígida — é uma sugestão da construtora. O cliente pode negociar um fluxo diferente, de acordo com seu perfil financeiro e fluxo de caixa.' },
          { tipo: 'p', texto: 'O saldo que falta na entrega das chaves — descontado tudo que já foi pago à construtora — é o valor que entra no financiamento bancário definitivo, no prazo escolhido pelo comprador.' },
        ],
      },
      {
        titulo: 'O que pode atrasar ou travar o processo',
        blocos: [
          { tipo: 'p', texto: 'O **cronograma físico-financeiro** detalha, mês a mês, o avanço de obra previsto e o repasse correspondente. Se a obra atrasa em relação a esse cronograma, a Caixa pode segurar a liberação até a medição confirmar o avanço — o que não significa que o comprador pare de pagar, mas pode gerar atrito com a construtora.' },
          { tipo: 'p', texto: 'Se o comprador quiser desistir depois de assinado, entra a **Lei do Distrato** (13.786/2018): a incorporadora pode reter entre 25% e 50% dos valores pagos, dependendo do regime do empreendimento, e devolve o restante em até 180 dias. Já se for a construtora que atrasar a entrega, o comprador pode pedir o distrato e reaver tudo que pagou, com correção.' },
        ],
      },
    ],
    faq: [
      { pergunta: 'O crédito associativo é só para MCMV?',
        resposta: 'É o modelo padrão do MCMV. No financiamento tradicional (SBPE), o caminho para imóvel na planta é diferente: o comprador paga só a construtora durante a obra, escolhe livremente o banco, e o contrato de financiamento só é assinado depois da entrega das chaves.' },
      { pergunta: 'Por que pago juros à Caixa antes mesmo de ter o imóvel pronto?',
        resposta: 'Porque o banco já desembolsou parte do valor financiado para a construtora, conforme a obra avança. Esses juros remuneram o banco pelo capital já liberado, antes de você começar a pagar o financiamento completo.' },
      { pergunta: 'O que acontece se a obra atrasar?',
        resposta: 'A liberação de recursos pela Caixa segue o avanço real medido — se a obra atrasa, os repasses também atrasam. Se o atraso for grande, o comprador tem direito a pedir o distrato com devolução integral corrigida (Lei 13.786/2018).' },
      { pergunta: 'Posso desistir depois de assinar o contrato?',
        resposta: 'Sim, mas a incorporadora pode reter entre 25% e 50% dos valores pagos, conforme a Lei do Distrato, devolvendo o restante em até 180 dias.' },
      { pergunta: 'Quando começo a pagar a parcela completa, com amortização?',
        resposta: 'Só depois do habite-se, quando a obra é formalmente concluída e o financiamento sai do regime de evolução para o regime normal de amortização.' },
      { pergunta: 'A análise do SICAQ vence depois de algum tempo?',
        resposta: 'A análise continua válida para a Caixa entre a aprovação e a assinatura do contrato de financiamento. Mas se a Caixa demorar mais de 2 meses para chamar o comprador para essa assinatura, pode ser que peça algum documento ou comprovante de renda atualizado.' },
      { pergunta: 'Comprando na planta pelo SBPE, quando assino o financiamento?',
        resposta: 'Só depois da entrega das chaves. Durante a obra você paga apenas à construtora; a análise de crédito com o banco escolhido deve ser feita antes do fim da obra, para que você já esteja aprovado e pronto para assinar quando as chaves chegarem.' },
    ],
    fatosChaveParaJoao: [
      'Crédito associativo = contrato de financiamento assinado ANTES do início da obra. É o modelo padrão do MCMV. Cerca de 30 dias após a assinatura, chega a primeira fatura de juros de evolução. Banco libera recursos à construtora por medição de avanço, não de uma vez.',
      'SBPE (financiamento tradicional) na planta é DIFERENTE do crédito associativo: o contrato com o banco só é assinado DEPOIS da entrega das chaves. Durante a obra, o comprador paga só a construtora (sem juros de evolução a banco), escolhe livremente qualquer banco, e deve concluir a análise de crédito antes do fim da obra para estar pronto pra assinar na entrega.',
      'Fluxo: 1) SICAQ (análise de crédito, ANTES de qualquer contrato/sinal) → 2) Contrato de Compra e Venda com a construtora (Ato/sinal pago aqui) → 3) Contrato de financiamento com a Caixa → 4) Obra com juros de evolução → 5) Habite-se → financiamento normal com amortização. Análise de crédito SEMPRE antes do sinal — pedir sinal antes da análise é sinal de golpe.',
      'Durante a obra, dois fluxos de pagamento distintos: à CONSTRUTORA (ato, mensais, reforços, anuais, chaves) e ao BANCO (juros de evolução de obra, sobre saldo já liberado).',
      'Cronograma físico-financeiro = documento que define avanço de obra x repasse mês a mês. Atraso na obra trava o repasse da Caixa.',
      'Lei do Distrato (13.786/2018): se o comprador desistir, incorporadora retém 25-50% do pago, devolve o resto em até 180 dias. Se for a construtora que atrasar a entrega, o comprador pode pedir distrato com devolução integral corrigida.',
      'Análise do SICAQ continua válida entre aprovação e assinatura do contrato de financiamento. Se a Caixa demorar mais de 2 meses para chamar o comprador para essa assinatura, PODE ser que peça documentos/comprovantes de renda atualizados (não é regra certa, é possibilidade).',
      'Ver também: artigo "Juros de Evolução de Obra" para o cálculo detalhado mês a mês da parcela durante a construção.',
    ],
    ctaSimulador: { texto: 'Simular meu imóvel na planta', href: '/simulador/na-planta' },
    relacionados: ['juros-evolucao-obra', 'mcmv-sbpe-sfi-qual-modalidade-escolher'],
  },
  {
    slug: 'custos-comprar-imovel-financiado-itbi-cartorio-taxas',
    keyword: 'custos para comprar imóvel financiado',
    triggers: ['itbi', 'custos para comprar imóvel', 'quanto custa o cartório', 'taxas de financiamento imobiliário'],
    titulo: 'Quanto Custa Comprar um Imóvel Financiado: ITBI, Cartório e Taxas',
    tituloSEO: 'Quanto Custa Comprar Imóvel Financiado: ITBI e Cartório (2026)',
    metaDescription:
      'Veja quanto custa comprar um imóvel financiado além do preço: ITBI (com isenções no SFH e MCMV), registro, despachante. Exemplo real calculado, passo a passo.',
    resumo:
      'Comprar um imóvel financiado não custa só o valor da entrada — tem também ITBI, registro em cartório e outras taxas que entram na conta antes de você receber as chaves. Aqui você vê quanto cada uma pesa, com um exemplo real calculado, e uma isenção de ITBI que pouca gente usa: financiar pelo SFH reduz bastante esse imposto.',
    publicado: '2026-06-17',
    atualizado: '2026-06-17',
    leituraMin: 8,
    secoes: [
      {
        titulo: 'Quanto realmente custa, além do preço do imóvel',
        blocos: [
          { tipo: 'p', texto: 'Reserve entre **2% e 5% do valor do imóvel** para custos de aquisição, fora a entrada e o financiamento em si:' },
          { tipo: 'tabela',
            cabecalho: ['Custo', 'Quem cobra', 'Valor típico'],
            linhas: [
              ['ITBI', 'Prefeitura', '3% em São Paulo (com isenções — veja abaixo)'],
              ['Registro de Imóveis', 'Cartório de Registro', '0,5% a 1% do valor do imóvel'],
              ['Escritura pública', 'Cartório de Notas', 'Só se NÃO financiado (veja abaixo)'],
              ['Despachante / correspondente', 'Profissional terceirizado', 'R$ 1.000 a R$ 3.000 (opcional)'],
            ],
          },
        ],
      },
      {
        titulo: 'ITBI: a isenção que pouca gente usa',
        blocos: [
          { tipo: 'p', texto: 'Em São Paulo capital, o ITBI é 3% sobre o maior valor entre o preço da transação e o valor venal de referência da prefeitura. Mas existem duas isenções importantes:' },
          { tipo: 'lista', itens: [
            '**Financiamento pelo SFH:** a parte financiada do imóvel, até R$ 636.612,50, é isenta de ITBI. O imposto incide só sobre a entrada paga com recursos próprios (e sobre o que exceder esse teto, se houver).',
            '**MCMV / primeiro imóvel:** isenção total de ITBI para compras dentro do limite definido pela prefeitura — R$ 245.527,77 a partir de 01/01/2026.',
          ] },
          { tipo: 'p', texto: 'Exemplo: imóvel de R$ 300.000 financiado pelo SBPE (dentro do SFH), com entrada de R$ 60.000 e R$ 240.000 financiados.' },
          { tipo: 'tabela',
            cabecalho: ['', 'Sem a isenção SFH', 'Com a isenção SFH'],
            linhas: [
              ['Base do ITBI', 'R$ 300.000 (valor total)', 'R$ 60.000 (só a entrada)'],
              ['ITBI a pagar (3%)', 'R$ 9.000', 'R$ 1.800'],
            ],
          },
          { tipo: 'destaque', texto: 'Nesse exemplo, a isenção do SFH economiza R$ 7.200 de ITBI. Como a parte financiada (R$ 240.000) fica abaixo do teto de R$ 636.612,50, ela não entra na base de cálculo do imposto — só a entrada paga do próprio bolso é taxada.' },
        ],
      },
      {
        titulo: 'Registro de imóveis e escritura',
        blocos: [
          { tipo: 'p', texto: 'O **Registro de Imóveis** é obrigatório em qualquer compra — é o que de fato transfere a propriedade para o seu nome. Os emolumentos seguem tabela do estado, normalmente entre 0,5% e 1% do valor do imóvel.' },
          { tipo: 'p', texto: 'Já a **escritura pública** (Cartório de Notas) só é necessária quando a compra é **à vista**. Em compras financiadas, o próprio contrato de financiamento — com a alienação fiduciária do banco — já tem força de escritura pública. Ou seja: quem financia, normalmente, não paga separadamente pela escritura.' },
          { tipo: 'destaque', texto: 'Algumas construtoras isentam o comprador de ITBI e/ou registro como promoção de vendas em determinados empreendimentos — é mais comum em lançamentos na planta. Vale sempre perguntar à construtora onde você vai comprar se essa condição está disponível.' },
        ],
      },
      {
        titulo: 'Análise de crédito: imóvel pronto x na planta',
        blocos: [
          { tipo: 'p', texto: 'No MCMV com crédito associativo (compra na planta), a análise de crédito é feita antes mesmo da assinatura do contrato com a construtora, via SICAQ — você já sabe se está aprovado antes de se comprometer. Veja o [fluxo completo do crédito associativo](/aprenda/credito-associativo-como-funciona-comprar-na-planta).' },
          { tipo: 'p', texto: 'Em um imóvel **pronto** (lançamento já entregue ou imóvel usado/revenda), a análise ocorre depois que você já negociou o preço com o vendedor — mas, numa venda séria, sempre **antes** da assinatura do contrato e do pagamento do sinal. Quem pede sinal antes de fazer a análise de crédito está fora do processo normal — é sinal de alerta. Ter os documentos em ordem (renda comprovada, certidões negativas, CPF sem restrição) acelera essa análise e evita atrasos.' },
        ],
      },
      {
        titulo: 'Exemplo completo: quanto separar para fechar negócio',
        blocos: [
          { tipo: 'p', texto: 'Retomando o exemplo do imóvel de R$ 300.000 (SBPE, entrada R$ 60.000):' },
          { tipo: 'tabela',
            cabecalho: ['Item', 'Valor'],
            linhas: [
              ['Entrada', 'R$ 60.000'],
              ['ITBI (com isenção SFH)', 'R$ 1.800'],
              ['Registro de imóveis (~0,8%)', 'R$ 2.400'],
              ['Despachante (estimado)', 'R$ 2.000'],
              ['Total a separar, fora a entrada', 'R$ 6.200 (≈ 2,1% do imóvel)'],
            ],
          },
        ],
      },
    ],
    faq: [
      { pergunta: 'O ITBI é sempre 3% em São Paulo?',
        resposta: 'A alíquota é 3%, mas a base de cálculo pode ser reduzida por isenções: no financiamento SFH, a parte financiada até R$ 636.612,50 não entra na conta; no MCMV/primeiro imóvel, há isenção total até R$ 245.527,77 (valor de 2026).' },
      { pergunta: 'Preciso pagar escritura se o imóvel for financiado?',
        resposta: 'Geralmente não. O próprio contrato de financiamento com alienação fiduciária tem força de escritura pública. A escritura no Cartório de Notas só é necessária em compras à vista.' },
      { pergunta: 'Quando a análise de crédito é feita no MCMV comparado ao imóvel pronto?',
        resposta: 'No MCMV com crédito associativo, a análise (via SICAQ) é feita antes da assinatura, ainda na planta. Em imóvel pronto, a análise ocorre quando a proposta é levada ao banco, já com o preço negociado.' },
      { pergunta: 'Quanto custa o despachante ou correspondente bancário?',
        resposta: 'Entre R$ 1.000 e R$ 3.000, dependendo da região e da complexidade do processo. É um serviço opcional — você pode levar a documentação diretamente ao banco.' },
      { pergunta: 'Posso financiar o ITBI e o registro junto com o imóvel?',
        resposta: 'Não. Esses custos são pagos à parte, geralmente antes ou no fechamento da compra — não entram no valor financiado pelo banco.' },
    ],
    fatosChaveParaJoao: [
      'Custos de aquisição além do imóvel: ITBI (3% em SP, com isenções), Registro de Imóveis (0,5-1%), Escritura (só se à vista), despachante (R$1.000-3.000 opcional). Total típico: 2-5% do valor do imóvel.',
      'ISENÇÃO IMPORTANTE: no financiamento SFH, a parte financiada até R$636.612,50 é isenta de ITBI — o imposto incide só sobre a entrada paga em dinheiro.',
      'ISENÇÃO MCMV: compra de primeiro imóvel dentro do limite de R$245.527,77 (2026) é isenta de ITBI integralmente.',
      'Exemplo: imóvel R$300k, entrada R$60k, financiado R$240k (SFH) → ITBI incide só sobre os R$60k de entrada = R$1.800 (em vez de R$9.000 sem a isenção).',
      'Quem financia normalmente NÃO paga escritura separada — o contrato com alienação fiduciária já tem força de escritura pública.',
      'Análise de crédito: no MCMV/planta é via SICAQ, antes da assinatura. Em imóvel pronto/revenda, é quando a proposta chega ao banco, já com preço negociado.',
    ],
    ctaSimulador: { texto: 'Simular meu financiamento', href: '/simulador' },
    relacionados: ['credito-associativo-como-funciona-comprar-na-planta', 'mcmv-sbpe-sfi-qual-modalidade-escolher'],
  },
  {
    slug: 'documentos-financiar-imovel-clt-autonomo-mei',
    keyword: 'documentos para financiar imóvel',
    triggers: ['documentos para financiar', 'documentação clt', 'documentação autônomo', 'documentação mei financiamento'],
    titulo: 'Documentos para Financiar Imóvel: CLT, Autônomo e MEI',
    tituloSEO: 'Documentos para Financiar Imóvel: CLT, Autônomo e MEI (2026)',
    metaDescription:
      'Checklist completo de documentos para financiar imóvel pela Caixa: pessoais, de renda (CLT, autônomo, MEI) e do imóvel. Inclui como compor renda com outra pessoa.',
    resumo:
      'A análise de crédito acontece antes da assinatura do contrato e do pagamento do sinal — por isso, separar a documentação com antecedência evita atrasos e reprovações nessa etapa. Aqui está o checklist completo por tipo de renda: CLT, autônomo e MEI.',
    publicado: '2026-06-17',
    atualizado: '2026-06-17',
    leituraMin: 7,
    secoes: [
      {
        titulo: 'Documentos pessoais — exigidos de todo mundo',
        blocos: [
          { tipo: 'lista', itens: [
            'RG e CPF (ou CNH)',
            'Comprovante de estado civil — certidão de nascimento (solteiro) ou casamento',
            'Comprovante de endereço atualizado (geralmente até 90 dias)',
          ] },
        ],
      },
      {
        titulo: 'CLT: documentos de renda',
        blocos: [
          { tipo: 'lista', itens: [
            'Holerites (contracheques) dos últimos 6 meses',
            'Declaração de Imposto de Renda do último exercício + recibo de entrega',
            'Extrato do FGTS, se for usar como entrada ou amortização',
          ] },
          { tipo: 'p', texto: 'É a documentação mais simples de reunir, porque o vínculo formal já comprova a renda de forma direta — o banco confirma o vínculo e o valor pelos próprios holerites.' },
        ],
      },
      {
        titulo: 'Autônomo e MEI: documentos de renda',
        blocos: [
          { tipo: 'p', texto: 'Sem holerite, a comprovação é feita por um conjunto de documentos que, juntos, demonstram a movimentação financeira real:' },
          { tipo: 'lista', itens: [
            '**Autônomo (pessoa física):** extrato bancário dos últimos 6 meses, Declaração de IR do último exercício + recibo, e Decore (Declaração Comprobatória de Percepção de Rendimentos) assinada por contador.',
            '**MEI:** CNPJ ativo há pelo menos 2 anos, Declaração Anual do MEI (DASN-SIMEI), extrato bancário PJ dos últimos 6 meses, e Declaração de IR pessoa física do último exercício + recibo.',
          ] },
          { tipo: 'destaque', texto: 'Não existe um percentual fixo e oficial de quanto da renda informada o banco aceita para autônomo/MEI — cada instituição analisa a média da movimentação nos extratos e declarações apresentados. Por isso, manter extratos organizados e sem inconsistências pesa mais do que qualquer "regra geral" que você ouvir por aí.' },
        ],
      },
      {
        titulo: 'Composição de renda: incluir outra pessoa no financiamento',
        blocos: [
          { tipo: 'p', texto: 'É possível somar a renda de até outras pessoas (cônjuge, parente ou até amigo) para aumentar a capacidade de financiamento — desde que nenhuma delas tenha restrição de crédito (CPF negativado) e que a soma das rendas não ultrapasse o limite definido pela instituição para esse tipo de composição.' },
        ],
      },
      {
        titulo: 'Documentos do imóvel (compra de imóvel pronto ou revenda)',
        blocos: [
          { tipo: 'lista', itens: [
            'Matrícula atualizada do imóvel (emitida há poucos dias, para confirmar titularidade e checar se há ônus/penhoras)',
            'IPTU do imóvel',
            'Cópia do compromisso de compra e venda (se já houver)',
          ] },
          { tipo: 'p', texto: 'Esses documentos não se aplicam a imóvel na planta (ainda não tem matrícula individualizada) — nesse caso, a documentação relevante é a da incorporação, fornecida pela própria construtora.' },
        ],
      },
    ],
    faq: [
      { pergunta: 'Quanto tempo antes da compra devo separar os documentos?',
        resposta: 'Antes de apresentar a proposta ao banco ou à construtora — a análise de crédito acontece depois que o preço já foi negociado, mas sempre antes da assinatura do contrato e do pagamento do sinal. Ter os documentos prontos evita atrasos nessa etapa.' },
      { pergunta: 'O MEI precisa ter quanto tempo de CNPJ aberto para financiar?',
        resposta: 'Geralmente é exigido CNPJ ativo há pelo menos 2 anos, com Declaração Anual do MEI (DASN-SIMEI) regularizada.' },
      { pergunta: 'Posso somar minha renda com a de outra pessoa que não é meu cônjuge?',
        resposta: 'Sim, é possível compor renda com parentes ou até terceiros, desde que nenhum tenha restrição de crédito e a soma respeite o limite da instituição financeira para esse tipo de composição.' },
      { pergunta: 'Existe um percentual fixo de renda que o banco aceita para autônomo?',
        resposta: 'Não há um percentual oficial único — cada banco analisa a consistência dos extratos bancários e declarações apresentadas. O que pesa mais é ter documentação organizada e sem inconsistências nos últimos meses.' },
      { pergunta: 'Preciso de Decore se for MEI?',
        resposta: 'A Decore é mais associada ao autônomo pessoa física. Para o MEI, o conjunto padrão é CNPJ ativo, DASN-SIMEI, extrato bancário PJ e declaração de IR pessoa física — mas pode variar conforme o banco.' },
    ],
    fatosChaveParaJoao: [
      'Documentos pessoais (todos): RG/CPF ou CNH, comprovante de estado civil, comprovante de endereço (até 90 dias).',
      'CLT: holerites últimos 6 meses + Declaração de IR + recibo + extrato FGTS (se for usar).',
      'Autônomo PF: extrato bancário 6 meses + Declaração de IR + recibo + Decore assinada por contador.',
      'MEI: CNPJ ativo há 2+ anos + DASN-SIMEI + extrato bancário PJ 6 meses + Declaração de IR PF + recibo.',
      'NÃO existe percentual oficial fixo de renda aceita para autônomo/MEI — cada banco avalia a consistência dos extratos/declarações apresentados.',
      'Composição de renda: pode somar renda de outra pessoa (parente ou não), desde que sem restrição de crédito e dentro do limite da instituição.',
      'Documentos do imóvel (só pronto/revenda): matrícula atualizada, IPTU, compromisso de compra e venda. Na planta, não há matrícula individualizada — vale a documentação da incorporação.',
    ],
    ctaSimulador: { texto: 'Simular meu financiamento', href: '/simulador' },
    relacionados: ['custos-comprar-imovel-financiado-itbi-cartorio-taxas', 'mcmv-sbpe-sfi-qual-modalidade-escolher'],
  },
  {
    slug: 'como-usar-fgts-no-financiamento',
    keyword: 'como usar FGTS no financiamento',
    triggers: ['usar o fgts', 'fgts no financiamento', 'fgts futuro'],
    titulo: 'Como Usar o FGTS no Financiamento Imobiliário',
    tituloSEO: 'Como Usar o FGTS no Financiamento Imobiliário (2026)',
    metaDescription:
      'Entenda as regras para usar o FGTS no financiamento: carências, teto de R$ 2,25 milhões, as 3 formas de uso e um exemplo real de quanto você economiza.',
    resumo:
      'O FGTS pode reduzir bastante o custo do seu financiamento — mas tem regras de carência que costumam confundir: uma coisa é o tempo de contribuição, outra é o intervalo entre usos. Aqui você entende as regras de 2026 e vê quanto o FGTS economiza num exemplo real.',
    publicado: '2026-06-17',
    atualizado: '2026-06-17',
    leituraMin: 7,
    secoes: [
      {
        titulo: 'As 3 formas de usar o FGTS',
        blocos: [
          { tipo: 'lista', itens: [
            '**Entrada:** soma ao valor que você já tem, reduzindo o quanto precisa financiar.',
            '**Amortização do saldo devedor:** abate parte da dívida durante o contrato, reduzindo prazo ou parcela.',
            '**Pagamento de até 80% das prestações:** por até 12 meses seguidos, em casos específicos.',
          ] },
        ],
      },
      {
        titulo: 'As regras de carência (a parte que confunde)',
        blocos: [
          { tipo: 'p', texto: 'Existem **duas carências diferentes**, e é comum confundir uma com a outra:' },
          { tipo: 'tabela',
            cabecalho: ['Carência', 'Prazo', 'Para quê'],
            linhas: [
              ['Tempo de contribuição', '3 anos (não precisa ser contínuo)', 'Elegibilidade básica para usar o FGTS'],
              ['Entre compras de imóvel', '3 anos desde o registro do contrato anterior', 'Usar o FGTS para uma NOVA aquisição'],
              ['Entre amortizações', '2 anos entre cada uso', 'Abater saldo devedor de financiamento já em andamento'],
            ],
          },
          { tipo: 'destaque', texto: 'Ou seja: ter 3 anos de contribuição te torna elegível, mas se você já usou o FGTS para comprar um imóvel, precisa esperar 3 anos desde o registro daquele contrato para usar de novo numa compra nova — e 2 anos entre amortizações no mesmo financiamento.' },
        ],
      },
      {
        titulo: 'Quem pode usar e em qual imóvel',
        blocos: [
          { tipo: 'lista', itens: [
            'Imóvel residencial, para moradia do próprio titular.',
            'Imóvel dentro do teto do SFH — R$ 2,25 milhões em 2026.',
            'Comprador não pode ter outro financiamento ativo dentro do SFH.',
            'O imóvel deve estar no município onde o comprador trabalha, reside há pelo menos 1 ano, ou onde é a sede da empresa empregadora.',
          ] },
        ],
      },
      {
        titulo: 'Quanto o FGTS economiza: exemplo real',
        blocos: [
          { tipo: 'p', texto: 'Imóvel de R$ 250.000 (MCMV Faixa 3, 7,66% a.a., SAC, 30 anos), com entrada própria de R$ 12.500 (5%):' },
          { tipo: 'tabela',
            cabecalho: ['', 'Sem FGTS', 'Com FGTS de R$ 40.000 na entrada'],
            linhas: [
              ['Valor financiado', 'R$ 237.500', 'R$ 197.500'],
              ['1ª parcela (SAC)', 'R$ 2.176', 'R$ 1.809'],
              ['Total pago em 30 anos', 'R$ 511.146', 'R$ 425.058'],
            ],
          },
          { tipo: 'destaque', texto: 'Usar R$ 40.000 de FGTS na entrada economiza R$ 86.088 ao longo do contrato — bem mais que os R$ 40.000 aplicados, porque reduz o saldo sobre o qual incidem os juros do início ao fim do financiamento.' },
        ],
      },
      {
        titulo: 'FGTS reduz a taxa de juros?',
        blocos: [
          { tipo: 'p', texto: 'No MCMV, ser cotista do FGTS (3+ anos de contribuição) geralmente garante a taxa mais baixa da faixa — nas Faixas 3 e 4, por exemplo, a diferença entre cotista e não-cotista costuma ser de 0,5 ponto percentual. Mas o impacto maior do FGTS não é na taxa: é em **reduzir o valor financiado**, que é o que realmente diminui os juros pagos no total, como no exemplo acima.' },
        ],
      },
    ],
    faq: [
      { pergunta: 'Posso usar o FGTS todo ano para amortizar o financiamento?',
        resposta: 'Não. Entre cada uso para amortização do mesmo financiamento, é preciso respeitar um intervalo mínimo de 2 anos.' },
      { pergunta: 'Tenho 3 anos de contribuição — já posso usar o FGTS para comprar outro imóvel?',
        resposta: 'Os 3 anos de contribuição são a elegibilidade básica. Mas se você já usou o FGTS para comprar um imóvel antes, precisa esperar 3 anos desde o registro daquele contrato para usar de novo numa nova aquisição.' },
      { pergunta: 'Posso usar o FGTS para comprar um imóvel de R$ 3 milhões?',
        resposta: 'Não. O teto de avaliação do imóvel para uso do FGTS é R$ 2,25 milhões em 2026 — acima disso, o imóvel está no SFI, que não permite FGTS.' },
      { pergunta: 'O FGTS reduz minha taxa de juros?',
        resposta: 'No MCMV, ser cotista do FGTS costuma garantir a taxa mais baixa da faixa (até 0,5 ponto percentual menor nas Faixas 3 e 4). Mas o maior benefício é usar o FGTS para reduzir o valor financiado — isso economiza mais no total do que a diferença de taxa.' },
      { pergunta: 'Posso usar o FGTS para pagar parte das parcelas, sem amortizar?',
        resposta: 'Sim, é uma das 3 formas de uso: pagar até 80% das prestações mensais, por até 12 meses consecutivos, em situações específicas previstas pelas regras do fundo.' },
    ],
    fatosChaveParaJoao: [
      'Duas carências DIFERENTES (não confundir): 3 anos de contribuição = elegibilidade básica. 3 anos desde o registro do contrato anterior = intervalo para usar FGTS em NOVA compra. 2 anos = intervalo entre amortizações no MESMO financiamento.',
      '3 formas de uso do FGTS: (1) entrada, (2) amortização do saldo devedor, (3) pagamento de até 80% das prestações por até 12 meses seguidos.',
      'Teto do imóvel para uso do FGTS: R$ 2,25 milhões em 2026 (mesmo teto do SFH). Acima disso, SFI, sem FGTS.',
      'Requisitos: imóvel residencial para moradia própria, sem outro financiamento ativo no SFH, imóvel no município de trabalho/residência (1+ ano)/sede da empregadora.',
      'Exemplo real: imóvel R$250k, SAC 30 anos, 7,66% a.a. — usar R$40k de FGTS na entrada reduz financiado de R$237.500 para R$197.500, economizando R$86.088 no total pago (não só os R$40k aplicados).',
      'FGTS cotista pode reduzir taxa no MCMV (até 0,5pp nas Faixas 3/4), mas o maior ganho é reduzir o saldo financiado, não a taxa em si.',
    ],
    ctaSimulador: { texto: 'Simular com FGTS', href: '/simulador' },
    relacionados: ['mcmv-sbpe-sfi-qual-modalidade-escolher', 'sac-ou-price-qual-sistema-amortizacao-escolher'],
  },
  {
    slug: 'his-hmp-o-que-sao-quem-pode-comprar',
    keyword: 'HIS e HMP o que são',
    triggers: ['o que é his', 'o que é hmp', 'his hmp'],
    titulo: 'HIS e HMP: O Que São, Quem Pode Comprar e Regras de Revenda e Aluguel',
    tituloSEO: 'HIS e HMP: Quem Pode Comprar e Regras de Revenda/Aluguel (2026)',
    metaDescription:
      'Entenda HIS 1, HIS 2 e HMP: faixas de renda, valores máximos em São Paulo, quem pode comprar, e as regras de revenda e aluguel — incluindo a proibição de locação por temporada.',
    resumo:
      'HIS e HMP são categorias de habitação popular que aparecem direto no nome de muitos lançamentos em São Paulo — mas poucos compradores sabem exatamente o que muda entre elas, quem pode comprar, e o que acontece se quiser vender ou alugar depois. Aqui você vê as faixas de renda, os valores atualizados de 2026 e as regras reais de revenda e locação.',
    publicado: '2026-08-02',
    atualizado: '2026-08-02',
    leituraMin: 8,
    secoes: [
      {
        titulo: 'HIS e MCMV não são a mesma coisa — entenda com um exemplo simples',
        blocos: [
          { tipo: 'p', texto: 'Muita gente confunde HIS/HMP com o MCMV, porque eles quase sempre aparecem juntos. Mas são **duas coisas diferentes, de dois governos diferentes** — e entender isso evita confusão na hora de comprar.' },
          { tipo: 'p', texto: 'Pense assim: imagine uma loja de roupas. O **MCMV é a forma de pagamento** — tipo um cartão de crédito especial que o Governo Federal oferece, com juros menores (ou até desconto) dependendo de quanto você ganha. Já **HIS e HMP são uma etiqueta que a Prefeitura de São Paulo cola em certos apartamentos**, dizendo: "este aqui só pode custar até tal preço, e só pode ser vendido para quem ganha até tal valor por mês".' },
          { tipo: 'p', texto: 'Ou seja: você pode pagar um apartamento com a etiqueta HIS usando o cartão especial do MCMV — e é isso que acontece na maioria das vezes. Mas a etiqueta (HIS/HMP, da Prefeitura) e a forma de pagamento (MCMV, do Governo Federal) são regras de **órgãos diferentes**, com regras próprias — inclusive sobre quando você pode vender ou alugar depois, como você vai ver mais abaixo.' },
          { tipo: 'destaque', texto: 'Resumindo bem simples:<br/>• MCMV → COMO você paga (o financiamento, o banco, a taxa de juros)<br/>• HIS / HMP → O QUE você está comprando (a etiqueta de preço e de público daquele apartamento específico, definida pela Prefeitura)' },
          { tipo: 'p', texto: '**HIS (Habitação de Interesse Social)** e **HMP (Habitação de Mercado Popular)** são essas "etiquetas" — categorias de empreendimento definidas pela Prefeitura de São Paulo, criadas para garantir moradia com preço controlado para famílias de baixa e média renda.' },
          { tipo: 'p', texto: 'Esses empreendimentos costumam ser construídos dentro das **ZEIS (Zonas Especiais de Interesse Social)** — áreas do território que o Plano Diretor de São Paulo separou de propósito para viabilizar a construção de HIS e HMP, dando incentivos à construtora (pode construir mais alto, precisa de menos vagas de garagem) em troca de vender com preço controlado.' },
        ],
      },
      {
        titulo: 'HIS 1, HIS 2 e HMP: faixas e valores (2026)',
        blocos: [
          { tipo: 'p', texto: 'Os valores em vigor são do **Decreto nº 64.895, de 5 de janeiro de 2026** (publicado no Diário Oficial do Município em 06/01/2026), que definiu a renda familiar máxima e o valor de venda máximo por categoria:' },
          { tipo: 'tabela',
            cabecalho: ['Categoria', 'Renda familiar máx.', 'Renda per capita máx.', 'Valor máx. de venda'],
            linhas: [
              ['HIS 1', 'R$ 4.863,00', 'R$ 810,50', 'R$ 276.102,20'],
              ['HIS 2', 'R$ 9.726,00', 'R$ 1.621,00', 'R$ 383.636,74'],
              ['HMP', 'R$ 16.210,00', 'R$ 2.431,50', 'R$ 537.672,71'],
            ],
          },
          { tipo: 'p', texto: 'Esses valores em reais equivalem, aproximadamente, a 3, 6 e 10 salários mínimos de 2026 — por isso o mercado costuma descrever as faixas dessa forma no dia a dia, mas o enquadramento oficial usa os valores exatos em reais acima (ou a renda per capita, o que for mais favorável à família).' },
          { tipo: 'p', texto: 'Na prática, HIS 1 costuma corresponder à Faixa 1 do MCMV, HIS 2 à Faixa 2, e HMP funciona como uma ponte entre a habitação social e o mercado convencional — muitas vezes financiada pela Faixa 3 do MCMV ou pelo SBPE, dependendo da renda exata do comprador.' },
        ],
      },
      {
        titulo: 'Quem pode comprar',
        blocos: [
          { tipo: 'lista', itens: [
            'Renda familiar dentro da faixa da categoria (comprovada na análise de crédito)',
            'Não possuir outro imóvel residencial (regra geral de programas de habitação social)',
            'Passar pela análise de crédito do agente financeiro, como em qualquer financiamento',
            'Em alguns empreendimentos com cotas ou seleção da Prefeitura/CDHU, pode haver exigência de vínculo com a região (morar ou trabalhar nas proximidades)',
          ] },
          { tipo: 'p', texto: 'O critério central não é simplesmente "ter renda baixa" — é **necessidade de moradia**. Por isso a análise cruza renda, ausência de outro imóvel e, em processos de seleção pública, critérios adicionais de vulnerabilidade.' },
        ],
      },
      {
        titulo: 'ZEIS, sorteio e CDHU: como o acesso é organizado',
        blocos: [
          { tipo: 'p', texto: 'Vale separar dois processos que às vezes se confundem:' },
          { tipo: 'lista', itens: [
            '**ZEIS** é só o zoneamento — a área onde a lei permite/incentiva construir HIS e HMP. Comprar um imóvel HIS de uma construtora privada, num lançamento normal, não passa por sorteio nenhum.',
            '**CDHU (Companhia de Desenvolvimento Habitacional e Urbano)** é o programa do Governo do Estado de SP que constrói e distribui moradias próprias por **seleção com pontuação** (sorteio é usado só para desempate). Critérios comuns: crianças de até 7 anos incompletos (3 pontos), casal jovem entre 18-35 anos (1 ponto), já recebe auxílio-moradia da CDHU (1 ponto), mora ou trabalha a até 1,5 km do empreendimento (1 ponto). Famílias com renda até 5 salários mínimos podem ter juro zero no financiamento pela CDHU.',
          ] },
          { tipo: 'destaque', texto: 'Ou seja: se você está comprando de uma construtora num lançamento HIS/HMP à venda no mercado, o processo é o mesmo de qualquer compra (proposta, análise de crédito, contrato). O sorteio/seleção por pontuação é específico dos programas públicos diretos (CDHU), não do mercado privado.' },
        ],
      },
      {
        titulo: 'Posso vender ou alugar depois de comprar?',
        blocos: [
          { tipo: 'p', texto: 'Essa é a parte que mais gera dúvida — e onde HIS/HMP têm uma regra própria, mais restritiva que o MCMV em geral:' },
          { tipo: 'lista', itens: [
            '**Prazo de destinação social:** por **10 anos** a partir da primeira comercialização ou da emissão do Habite-se, a unidade deve continuar destinada ao público HIS/HMP.',
            '**Revenda dentro desse prazo:** é possível, mas o comprador seguinte também precisa comprovar renda compatível com a categoria (HIS 1, HIS 2 ou HMP) — não é uma venda livre no mercado como um imóvel comum.',
            '**Aluguel por temporada (Airbnb):** **proibição expressa**. Unidades HIS e HMP não podem ser usadas para locação de curta duração enquanto durar a destinação social.',
          ] },
          { tipo: 'p', texto: 'Isso é mais restritivo que a regra geral do MCMV por faixa: no MCMV "comum" (fora de HIS/HMP), a Faixa 1 não pode vender nem alugar antes de quitar o financiamento ou completar carência de 5 a 10 anos (varia por contrato); já as Faixas 2 e 3 podem vender a qualquer momento, quitando ou transferindo o financiamento. Em HIS/HMP, a restrição de 10 anos e a exigência de renda compatível no comprador seguinte valem **além** dessas regras do financiamento.' },
          { tipo: 'destaque', texto: 'Descumprir essas regras (alugar por temporada, vender para alguém fora da faixa de renda) pode ser tratado como quebra contratual — com risco de ação judicial e devolução de eventual subsídio. As regras exatas variam por contrato e por qual agente financeiro está envolvido: **sempre confirme no seu contrato de compra e venda e com o banco antes de vender ou alugar.**' },
        ],
      },
      {
        titulo: 'Investidor pode comprar HIS ou HMP?',
        blocos: [
          { tipo: 'p', texto: 'Comprar não é proibido para quem também investe — mas o produto **não foi desenhado para isso**. O critério de elegibilidade é necessidade de moradia, a revenda exige comprovação de renda do próximo comprador, e a locação por temporada é proibida. Ou seja: não dá para tratar um HIS/HMP como imóvel de renda via Airbnb.' },
          { tipo: 'p', texto: 'Quem busca especificamente um imóvel para alugar por temporada tem uma categoria construída exatamente para isso: as **unidades NR (não residencial)**. Veja o [artigo completo sobre imóveis NR](/aprenda/imoveis-nr-nao-residencial-o-que-e-quem-pode-comprar) para entender a diferença.' },
        ],
      },
    ],
    faq: [
      { pergunta: 'Qual a diferença entre HIS 1 e HIS 2?',
        resposta: 'HIS 1 é para famílias com renda familiar até R$ 4.863,00 (imóvel até R$ 276.102,20, Decreto 64.895/2026). HIS 2 é para renda até R$ 9.726,00 (imóvel até R$ 383.636,74). Em salários mínimos, isso equivale a aproximadamente 3 e 6 salários. HIS 1 costuma corresponder à Faixa 1 do MCMV, e HIS 2 à Faixa 2.' },
      { pergunta: 'HMP é a mesma coisa que MCMV Faixa 3?',
        resposta: 'Não são a mesma classificação — HMP é uma categoria de preço/público definida pela Prefeitura de São Paulo (renda familiar até R$ 16.210,00, imóvel até R$ 537.672,71, Decreto 64.895/2026), enquanto a Faixa 3 do MCMV é uma faixa de financiamento federal. Na prática, costumam se sobrepor, mas o enquadramento é feito separadamente.' },
      { pergunta: 'Posso alugar um imóvel HIS ou HMP por temporada (Airbnb)?',
        resposta: 'Não. Há proibição expressa de locação de curta temporada em unidades HIS e HMP enquanto durar o prazo de destinação social (10 anos a partir da primeira venda ou do Habite-se).' },
      { pergunta: 'Quanto tempo preciso esperar antes de vender um imóvel HIS?',
        resposta: 'A unidade precisa permanecer destinada ao público HIS/HMP por 10 anos a partir da primeira comercialização ou do Habite-se. É possível revender dentro desse prazo, mas o próximo comprador também precisa se enquadrar na faixa de renda da categoria.' },
      { pergunta: 'CDHU e HIS são a mesma coisa?',
        resposta: 'Não. HIS é a categoria/classificação do imóvel (renda, preço-teto). CDHU é a companhia do Governo do Estado de SP que constrói e distribui moradias próprias por seleção com pontuação (sorteio só para desempate) — um dos caminhos possíveis para acessar um imóvel HIS, mas não o único: construtoras privadas também vendem HIS em lançamentos normais.' },
      { pergunta: 'Investidor pode comprar imóvel HIS ou HMP?',
        resposta: 'Não é proibido comprar, mas o produto não foi feito para investimento: a revenda exige comprovar renda compatível no próximo comprador, e a locação por temporada (Airbnb) é proibida. Quem quer um imóvel para alugar por temporada deve procurar unidades NR, feitas para esse fim.' },
    ],
    fatosChaveParaJoao: [
      'HIS (Habitação de Interesse Social) e HMP (Habitação de Mercado Popular) são classificações urbanísticas da Prefeitura de SP (preço-teto + renda-alvo), DIFERENTES do MCMV (que é o programa federal de financiamento). Um imóvel pode ser HIS E financiado pelo MCMV ao mesmo tempo — são camadas diferentes.',
      'Valores exatos (Decreto 64.895, de 05/01/2026, em vigor desde a publicação): HIS 1 = renda familiar até R$4.863,00 (per capita R$810,50), imóvel até R$276.102,20. HIS 2 = renda até R$9.726,00 (per capita R$1.621,00), imóvel até R$383.636,74. HMP = renda até R$16.210,00 (per capita R$2.431,50), imóvel até R$537.672,71. Equivalem a ~3, 6 e 10 salários mínimos — útil para explicar rápido, mas o enquadramento oficial usa os valores em reais.',
      'HIS/HMP são construídos em ZEIS (Zonas Especiais de Interesse Social) — zoneamento do Plano Diretor que dá incentivo urbanístico em troca do preço controlado.',
      'CDHU é o programa ESTADUAL de seleção com pontuação (sorteio só desempate) para moradia própria — diferente de comprar HIS de uma construtora privada num lançamento normal (processo comum, sem sorteio).',
      'REGRA CRÍTICA: por 10 anos a partir da 1ª venda ou do Habite-se, a unidade HIS/HMP deve continuar destinada ao público da categoria. Revenda exige comprovação de renda do próximo comprador. Locação por temporada (Airbnb) é EXPRESSAMENTE PROIBIDA nesse período.',
      'Isso é MAIS restritivo que a regra geral do MCMV por faixa (Faixa 1 sem vender/alugar até quitar/5-10 anos; Faixas 2/3 podem vender a qualquer momento) — em HIS/HMP a restrição de 10 anos e a exigência de renda do comprador seguinte valem ALÉM das regras do financiamento em si.',
      'Sempre recomendar ao usuário: confirmar as regras exatas no contrato de compra e venda e com o agente financeiro antes de vender ou alugar — variam por contrato/programa.',
      'Investidor não é proibido de comprar, mas HIS/HMP não serve para renda via Airbnb (proibido). Quem quer isso deve olhar unidades NR — ver artigo relacionado.',
    ],
    ctaSimulador: { texto: 'Descobrir minha faixa MCMV', href: '/simulador' },
    relacionados: ['mcmv-sbpe-sfi-qual-modalidade-escolher', 'imoveis-nr-nao-residencial-o-que-e-quem-pode-comprar'],
  },
  {
    slug: 'imoveis-nr-nao-residencial-o-que-e-quem-pode-comprar',
    keyword: 'imóvel NR o que é',
    triggers: ['imóvel nr', 'o que é não residencial', 'sala comercial financiar'],
    titulo: 'Imóveis NR (Não Residencial): O Que São e Quem Pode Comprar',
    tituloSEO: 'Imóveis NR (Não Residencial): O Que São e Como Funcionam (2026)',
    metaDescription:
      'Entenda o que é uma unidade NR (não residencial): a diferença para um apartamento comum, como é financiada (SFI) e por que é a categoria certa para quem quer alugar por temporada/Airbnb.',
    resumo:
      'Você já deve ter visto "unidade NR" no card de algum lançamento e ficado na dúvida do que significa. NR quer dizer não residencial — uma categoria de unidade dentro do próprio empreendimento, com regras de uso, financiamento e locação bem diferentes de um apartamento comum. Aqui você entende o que é, quem compra e por que é a categoria usada para investir em locação por temporada.',
    publicado: '2026-08-02',
    atualizado: '2026-08-02',
    leituraMin: 7,
    secoes: [
      {
        titulo: 'O que é uma unidade NR',
        blocos: [
          { tipo: 'p', texto: '**NR significa "não residencial"** — é uma unidade dentro de um empreendimento (às vezes o prédio inteiro, às vezes só algumas unidades misturadas com apartamentos comuns) destinada a uso comercial, de serviços ou hospedagem, e não para moradia fixa no sentido tradicional.' },
          { tipo: 'p', texto: 'É comum em empreendimentos do tipo **studio compacto**, voltados para localização estratégica (perto de polos empresariais, aeroportos, regiões turísticas), com metragens reduzidas e serviços agregados (lavanderia, limpeza, recepção) — pensados para estadias mais curtas do que uma moradia comum.' },
        ],
      },
      {
        titulo: 'NR x apartamento residencial: a diferença que importa',
        blocos: [
          { tipo: 'p', texto: 'A diferença prática mais importante está no **tipo de contrato de locação permitido**:' },
          { tipo: 'tabela',
            cabecalho: ['', 'Apartamento residencial', 'Unidade NR'],
            linhas: [
              ['Locação mínima', 'Normalmente 30 meses (locação residencial)', 'Sem mínimo — locação de curta duração (diária/semanal)'],
              ['Uso típico', 'Moradia fixa', 'Hospedagem, temporada, escritório/serviço'],
              ['Financiamento MCMV/SBPE', 'Sim', 'Não'],
              ['Uso de FGTS', 'Sim (dentro das regras)', 'Não'],
            ],
          },
          { tipo: 'destaque', texto: 'É essa liberdade de contrato curto que torna a unidade NR compatível com plataformas como Airbnb e Booking — um apartamento residencial comum, dentro das normas de locação tradicional, não tem essa flexibilidade de prazo.' },
        ],
      },
      {
        titulo: 'Como se financia um imóvel NR',
        blocos: [
          { tipo: 'p', texto: 'Por não ser residencial, a unidade NR **não se encaixa no MCMV nem no SBPE**, e não permite uso de FGTS. O caminho de financiamento é o **SFI (Sistema de Financiamento Imobiliário)** — o mesmo usado para imóveis de alto padrão acima do teto do SFH:' },
          { tipo: 'lista', itens: [
            '**Taxa de mercado**, geralmente mais alta que SBPE (na faixa de 12,5% a.a. + TR)',
            '**Entrada mais alta** — normalmente acima de 30% do valor do imóvel',
            '**Sem uso de FGTS** em nenhuma hipótese',
            '**Sem teto de valor** — mas também sem subsídio ou condição facilitada',
          ] },
        ],
      },
      {
        titulo: 'Quem pode comprar',
        blocos: [
          { tipo: 'p', texto: 'Não há uma restrição formal de perfil — pessoa física ou jurídica pode comprar. Na prática, o público típico é o **investidor** que busca renda de aluguel por temporada, não quem procura moradia própria fixa. A entrada mais alta e a ausência de subsídio tornam a unidade NR pouco atrativa para quem busca só onde morar com o menor investimento inicial possível.' },
        ],
      },
      {
        titulo: 'NR e Airbnb: o contraste com HIS/HMP',
        blocos: [
          { tipo: 'p', texto: 'Vale um contraste direto: unidades **HIS e HMP proíbem expressamente** a locação por temporada durante o prazo de destinação social (veja o [artigo sobre HIS e HMP](/aprenda/his-hmp-o-que-sao-quem-pode-comprar)). Já a unidade **NR é desenhada exatamente para esse uso** — é a categoria correta para quem quer investir com foco em locação de curta duração.' },
        ],
      },
      {
        titulo: 'Vale a pena comprar um NR para investir?',
        blocos: [
          { tipo: 'p', texto: 'Depende de contas que vão além do preço do imóvel: taxa de ocupação esperada na região, valor médio da diária, taxa de condomínio (que pode ser mais alta em prédios com muita rotatividade), e a regulamentação local de locação por temporada — algumas cidades e condomínios têm restrições próprias, além das regras do próprio imóvel.' },
          { tipo: 'destaque', texto: 'Como o financiamento é via SFI (taxa de mercado, sem subsídio, entrada alta), o retorno do investimento depende quase inteiramente da rentabilidade do aluguel — vale simular o financiamento e comparar com uma estimativa realista de ocupação e diária antes de decidir.' },
        ],
      },
    ],
    faq: [
      { pergunta: 'Imóvel NR pode ser usado para morar?',
        resposta: 'Fisicamente sim, mas não é o uso previsto pela categoria — o proprietário pode ocupar, mas não terá as mesmas condições de financiamento (MCMV/SBPE) nem as proteções de locação residencial tradicional.' },
      { pergunta: 'Dá para usar FGTS para comprar um imóvel NR?',
        resposta: 'Não, em nenhuma hipótese. Por não ser residencial, a unidade NR só se financia via SFI, que não permite uso de FGTS.' },
      { pergunta: 'Preciso de uma entrada maior para financiar um NR?',
        resposta: 'Sim, normalmente acima de 30% do valor do imóvel, contra os 10-20% comuns em MCMV/SBPE — o SFI opera com regras de mercado livre, sem os limites protegidos do SFH.' },
      { pergunta: 'Qual a taxa de financiamento de um imóvel NR?',
        resposta: 'Por ser via SFI, a taxa é de mercado — geralmente em torno de 12,5% ao ano + TR em 2026, mais alta que o SBPE (11,19% a 11,97%) e bem acima do MCMV.' },
      { pergunta: 'Uma unidade NR pode virar residencial depois?',
        resposta: 'Não é uma simples troca de categoria — depende de aprovação/regularização junto à prefeitura e ao condomínio, e normalmente não é um processo simples nem garantido. Antes de comprar pensando nisso, vale confirmar a viabilidade com um profissional especializado.' },
    ],
    fatosChaveParaJoao: [
      'NR = unidade Não Residencial dentro de um empreendimento — uso comercial/serviços/hospedagem, não moradia fixa tradicional.',
      'Diferença-chave: apartamento residencial exige contrato de locação mínimo (normalmente 30 meses); unidade NR permite locação de curta duração (diária/semanal) — por isso é compatível com Airbnb/Booking.',
      'Financiamento de NR: só via SFI (não entra em MCMV nem SBPE). Taxa de mercado (~12,5% a.a.+TR em 2026), entrada normalmente acima de 30%, SEM uso de FGTS em nenhuma hipótese.',
      'Contraste importante para o usuário: HIS/HMP PROÍBEM locação por temporada; NR é FEITO para esse uso. Se o usuário quer investir em Airbnb, a resposta é NR, não HIS/HMP nem MCMV residencial comum.',
      'Perfil típico do comprador de NR: investidor buscando renda de aluguel por temporada, não morador buscando moradia própria com condição facilitada (não há subsídio nem taxa reduzida).',
      'Retorno do investimento em NR depende de ocupação/diária da região — recomendar sempre simular o financiamento e cruzar com estimativa realista de rentabilidade de locação antes de decidir.',
    ],
    ctaSimulador: { texto: 'Simular financiamento SFI', href: '/simulador' },
    relacionados: ['his-hmp-o-que-sao-quem-pode-comprar', 'mcmv-sbpe-sfi-qual-modalidade-escolher'],
  },
  {
    slug: 'brasileiro-no-exterior-financiar-imovel',
    keyword: 'financiar imóvel no Brasil morando no exterior',
    triggers: ['brasileiro no exterior', 'brasileiro morando fora', 'morando nos eua financiar imóvel', 'morando no exterior comprar imóvel', 'renda no exterior financiamento'],
    titulo: 'Brasileiro no Exterior Pode Financiar Imóvel no Brasil? Guia Completo',
    tituloSEO: 'Financiar Imóvel no Brasil Morando no Exterior: Guia 2026',
    metaDescription:
      'Brasileiro morando fora pode financiar imóvel no Brasil? Entenda CPF, comprovação de renda, uso do FGTS, procuração e como enviar dinheiro do exterior.',
    resumo:
      'Morar fora do Brasil não impede você de financiar um imóvel aqui — mas muda alguns detalhes práticos: como comprovar renda, se dá para usar o FGTS, e se é preciso vir ao Brasil para assinar o contrato. Este guia reúne o que muda para quem mora fora e quer financiar um imóvel no Brasil.',
    publicado: '2026-08-02',
    atualizado: '2026-08-02',
    leituraMin: 7,
    secoes: [
      {
        titulo: 'Sim, dá para financiar morando fora — com algumas condições',
        blocos: [
          { tipo: 'p', texto: 'Brasileiro que mora no exterior consegue financiar imóvel no Brasil normalmente, contanto que tenha **CPF regular**, consiga **comprovar renda** (do Brasil ou do país onde mora) e resolva a questão da **assinatura do contrato** — presencial ou por procuração.' },
          { tipo: 'lista', itens: [
            'CPF ativo e regular na Receita Federal',
            'Comprovação de renda — do Brasil (DIRPF) ou do exterior, dependendo do banco',
            'Conta bancária no Brasil (ou um procurador que tenha)',
            'Definição de como o contrato será assinado — presencial ou procuração pública',
          ] },
          { tipo: 'destaque', texto: 'O maior filtro na prática não é "morar fora" em si — é conseguir comprovar renda no formato que o banco escolhido pede, e resolver a assinatura do contrato sem precisar viajar.' },
        ],
      },
      {
        titulo: 'CPF: o documento que não pode faltar',
        blocos: [
          { tipo: 'p', texto: 'Sem CPF regular, nenhum banco no Brasil processa financiamento. Se você já tinha CPF antes de se mudar, geralmente ele continua válido — só vale confirmar que não está suspenso ou pendente de regularização na Receita Federal antes de iniciar o processo.' },
          { tipo: 'p', texto: 'Quem nunca teve CPF, ou precisa regularizar, pode resolver isso pelo **consulado brasileiro** no país onde mora, sem precisar viajar ao Brasil.' },
        ],
      },
      {
        titulo: 'Como comprovar renda estrangeira',
        blocos: [
          { tipo: 'p', texto: 'Aqui está a maior diferença entre as instituições:' },
          { tipo: 'tabela', cabecalho: ['Instituição', 'Como comprova renda', 'Observação'], linhas: [
            ['Caixa Econômica Federal', 'Declaração de Imposto de Renda (DIRPF) do último ano', 'Mais rígida — pode exigir renda declarada no Brasil'],
            ['Bancos privados', 'Varia por banco — alguns aceitam renda estrangeira com tradução juramentada', 'Consulte caso a caso antes de escolher'],
            ['Fintechs / SCDs (Sociedades de Crédito Direto)', 'Documentos de renda do país onde mora, com tradução juramentada', 'Processo mais digital e flexível, mas taxa costuma ser mais alta'],
          ] },
          { tipo: 'destaque', texto: 'Se sua renda é só do exterior (sem DIRPF brasileira robusta), fintechs tendem a ser o caminho mais viável — mas vale comparar taxa e CET (Custo Efetivo Total) antes de fechar.' },
        ],
      },
      {
        titulo: 'FGTS: dá para usar morando fora?',
        blocos: [
          { tipo: 'p', texto: 'Se você tem saldo de FGTS de um período em que trabalhou registrado no Brasil, esse saldo continua seu e pode ser usado normalmente na compra — mesmo morando fora hoje — desde que cumpra as regras padrão de uso: ser cotista há pelo menos 3 anos, ser o primeiro imóvel residencial no município onde mora/trabalha, entre outras.' },
          { tipo: 'destaque', texto: 'O que muda é a elegibilidade a subsídio do MCMV: isso depende de renda dentro da faixa do programa, normalmente comprovada com padrão brasileiro — morar fora não impede usar o FGTS, mas pode dificultar entrar na faixa que dá direito a subsídio.' },
        ],
      },
      {
        titulo: 'Assinatura do contrato: precisa vir ao Brasil?',
        blocos: [
          { tipo: 'p', texto: 'Bancos tradicionais, de forma geral, **não aceitam assinatura totalmente remota** para contrato de financiamento imobiliário. As duas saídas mais comuns são vir ao Brasil para assinar pessoalmente, ou outorgar **procuração pública** (feita em cartório ou no consulado brasileiro) para alguém assinar em seu nome.' },
          { tipo: 'p', texto: 'Antes de escolher o banco, confirme diretamente com ele se aceitam procuração e quais os requisitos exatos — isso varia e pode ser o fator decisivo entre uma instituição e outra.' },
        ],
      },
      {
        titulo: 'Enviando dinheiro do exterior para a entrada',
        blocos: [
          { tipo: 'p', texto: 'Se a entrada ou parte dos recursos vier do exterior, o valor passa por câmbio (com IOF sobre a remessa) até chegar em conta no Brasil. Guarde a documentação da remessa — comprovante de origem dos recursos é algo que o banco pode pedir durante a análise.' },
        ],
      },
    ],
    faq: [
      { pergunta: 'Preciso estar fisicamente no Brasil para financiar um imóvel morando fora?',
        resposta: 'Não necessariamente. Bancos tradicionais costumam exigir assinatura presencial ou procuração pública — muitos casos se resolvem sem viajar, mas confirme o processo com o banco escolhido antes de fechar negócio.' },
      { pergunta: 'Posso usar meu FGTS morando fora do Brasil?',
        resposta: 'Sim, se o saldo veio de período trabalhado com carteira assinada no Brasil e você cumpre as regras padrão de uso (3 anos de cotista, primeiro imóvel no município, etc). O que pode ficar mais difícil é comprovar renda dentro da faixa que dá direito a subsídio do MCMV.' },
      { pergunta: 'Fintech financia mais fácil que banco tradicional para quem mora fora?',
        resposta: 'Costuma aceitar renda estrangeira com mais flexibilidade (tradução juramentada em vez de DIRPF), mas geralmente com taxa mais alta que a Caixa ou bancos com relacionamento. Vale comparar o CET, não só a taxa nominal.' },
      { pergunta: 'Pago imposto sobre o dinheiro que mando do exterior para comprar o imóvel?',
        resposta: 'A remessa em si passa por câmbio com IOF. Guarde a documentação de origem dos recursos — isso não é opcional se o banco pedir comprovação durante a análise do financiamento.' },
      { pergunta: 'Meu CPF está irregular, o que fazer morando fora?',
        resposta: 'Dá para regularizar pelo consulado brasileiro no país onde você mora, sem precisar viajar ao Brasil — é o primeiro passo antes de iniciar qualquer processo de financiamento.' },
    ],
    fatosChaveParaJoao: [
      'Brasileiro morando fora PODE financiar imóvel no Brasil, precisando de CPF regular, comprovação de renda (DIRPF na Caixa; fintechs aceitam renda estrangeira com tradução juramentada) e resolver a assinatura — presencial ou procuração pública.',
      'FGTS de período trabalhado no Brasil continua utilizável mesmo morando fora, desde que cumpridas as regras padrão (3 anos de cotista, primeiro imóvel no município). O que pode ficar mais difícil é comprovar renda dentro da faixa que dá direito a subsídio MCMV.',
      'Caixa é mais rígida (exige DIRPF do último ano); fintechs/SCDs são mais flexíveis com renda estrangeira mas costumam ter taxa mais alta — comparar CET, não só taxa nominal.',
      'Bancos tradicionais normalmente não aceitam assinatura 100% remota — procuração pública (cartório ou consulado) resolve a maioria dos casos, mas confirmar sempre com o banco escolhido antes.',
      'Dinheiro enviado do exterior para comprar imóvel passa por câmbio (IOF) e deve ter origem comprovável — guardar documentação da remessa.',
    ],
    ctaSimulador: { texto: 'Simular meu financiamento', href: '/simulador' },
    relacionados: ['estrangeiro-comprar-imovel-brasil-golden-visa', 'mcmv-sbpe-sfi-qual-modalidade-escolher'],
  },
  {
    slug: 'estrangeiro-comprar-imovel-brasil-golden-visa',
    keyword: 'estrangeiro comprar imóvel no Brasil',
    triggers: ['estrangeiro comprar imóvel', 'golden visa', 'visto de investidor imobiliário', 'estrangeiro financiar imóvel no brasil'],
    titulo: 'Estrangeiro Pode Comprar Imóvel no Brasil? CPF, Financiamento e Golden Visa',
    tituloSEO: 'Estrangeiro Comprar Imóvel no Brasil: Guia Completo 2026 (Golden Visa)',
    metaDescription:
      'Estrangeiro pode comprar imóvel urbano no Brasil sem restrição de nacionalidade. Entenda CPF, financiamento, impostos e o Visto de Investidor Imobiliário (Golden Visa) a partir de R$1 milhão.',
    resumo:
      'Não existe proibição para estrangeiro comprar imóvel urbano no Brasil — mas o caminho até a compra (e até o financiamento) tem etapas próprias, diferentes das de quem já mora e tem renda formal no país. Este guia reúne CPF, formas de pagamento, o Visto de Investidor Imobiliário (Golden Visa) e os impostos que incidem sobre quem não é residente.',
    publicado: '2026-08-02',
    atualizado: '2026-08-02',
    leituraMin: 8,
    secoes: [
      {
        titulo: 'Sim, estrangeiro pode comprar imóvel urbano no Brasil',
        blocos: [
          { tipo: 'p', texto: 'Não há restrição de nacionalidade para comprar **imóvel urbano** no Brasil — vale para turista, residente ou quem nunca pisou no país. A situação muda para **imóvel rural**, que tem regras próprias de limite e autorização (Lei 5.709/1971) — fora do escopo deste guia, focado em imóveis urbanos residenciais e comerciais.' },
          { tipo: 'destaque', texto: 'O que de fato varia por perfil não é "poder comprar" — é como pagar: à vista, financiado, e se há (ou não) direito a residência associado ao investimento.' },
        ],
      },
      {
        titulo: 'CPF: o primeiro passo, mesmo sem morar no Brasil',
        blocos: [
          { tipo: 'p', texto: 'Sem CPF, nenhum banco ou cartório processa a compra. O documento pode ser obtido pelo **consulado brasileiro** no país de origem, apresentando passaporte válido — não é necessário viajar ao Brasil para tirar o CPF.' },
        ],
      },
      {
        titulo: 'Como pagar: à vista, financiamento ou construtora',
        blocos: [
          { tipo: 'p', texto: 'A compra **à vista** é o caminho mais simples e o mais comum entre estrangeiros — evita as exigências extras de financiamento bancário.' },
          { tipo: 'p', texto: 'Para **financiamento bancário** (SFH/SBPE ou SFI), instituições costumam exigir **CRNM (Carteira de Registro Nacional Migratório) ou visto permanente**, além de entrada mais alta — normalmente entre 20% e 50% do valor do imóvel, dependendo do banco e do perfil.' },
          { tipo: 'lista', itens: [
            'Caixa Econômica Federal: mais restritiva para estrangeiro em crédito convencional',
            'Bancos privados e fintechs: costumam aceitar renda comprovada no país de origem, com tradução juramentada',
            'Financiamento direto com a construtora: alternativa comum quando o banco tradicional não atende o perfil',
          ] },
          { tipo: 'destaque', texto: 'MCMV e uso de FGTS não se aplicam a estrangeiro sem residência/contribuição formal no Brasil — na prática, o caminho de financiamento bancário passa por SBPE (até R$2,25M) ou SFI (acima disso), sempre com taxa de mercado, sem subsídio.' },
        ],
      },
      {
        titulo: 'Golden Visa: residência no Brasil por investir em imóvel',
        blocos: [
          { tipo: 'p', texto: 'O **Visto de Investidor Imobiliário** (conhecido como Golden Visa brasileiro) dá autorização de residência a quem investe em imóvel urbano acima de um valor mínimo. É regulamentado pela **Resolução Normativa CNIg nº 36/2018**, alterada pela **RN nº 46/2022**.' },
          { tipo: 'tabela', cabecalho: ['Região do imóvel', 'Valor mínimo do investimento'], linhas: [
            ['Sul, Sudeste e Centro-Oeste', 'R$ 1.000.000'],
            ['Norte e Nordeste', 'a partir de R$ 700.000 (redução de até 30%)'],
          ] },
          { tipo: 'lista', itens: [
            'Pode somar mais de um imóvel para atingir o valor mínimo',
            'A parte do valor acima do mínimo exigido pode ser financiada',
            'Autorização de residência inicial: 4 anos',
            'Permanência mínima exigida: 14 dias (corridos ou não) a cada 2 anos, contados do registro na Polícia Federal',
            'Após os 4 anos, pode solicitar residência por prazo indeterminado, mantendo o imóvel e cumprindo a permanência mínima',
          ] },
          { tipo: 'destaque', texto: 'Regras de prazo e permanência de visto podem ser atualizadas — antes de decidir com base nisso, confirme a versão vigente com um advogado de imigração. Os valores mínimos de investimento são o dado mais estável e confirmado desta seção.' },
        ],
      },
      {
        titulo: 'Impostos que incidem sobre quem não é residente',
        blocos: [
          { tipo: 'p', texto: 'ITBI e IPTU incidem da mesma forma que para qualquer comprador — não há taxa diferenciada por nacionalidade na compra em si.' },
          { tipo: 'p', texto: 'Já sobre **aluguel recebido por não residente**, a alíquota de Imposto de Renda é **15%**, retida na fonte — ou **25%** se o beneficiário mora em país considerado paraíso fiscal pela legislação brasileira. Não há faixa de isenção, diferente da tabela progressiva de quem mora no Brasil. O recolhimento é feito por um procurador no Brasil, via DARF específico.' },
        ],
      },
    ],
    faq: [
      { pergunta: 'Estrangeiro sem visto pode comprar imóvel no Brasil?',
        resposta: 'Sim, para compra à vista de imóvel urbano não há exigência de visto — só CPF. Visto ou CRNM passa a ser relevante se quiser financiamento bancário tradicional.' },
      { pergunta: 'Estrangeiro pode usar o MCMV?',
        resposta: 'Na prática não — o programa é voltado a quem tem renda formal comprovável dentro do padrão brasileiro e reside no país. O caminho de financiamento para estrangeiro costuma ser SBPE ou SFI, sem subsídio.' },
      { pergunta: 'O Golden Visa brasileiro dá cidadania?',
        resposta: 'Não diretamente — dá autorização de residência (inicialmente 4 anos, depois por prazo indeterminado). Cidadania por naturalização segue processo e prazos próprios, separados do visto de investidor.' },
      { pergunta: 'Preciso de advogado para comprar imóvel sendo estrangeiro?',
        resposta: 'Não é obrigatório para uma compra simples à vista, mas é altamente recomendado para financiamento, Golden Visa ou qualquer dúvida sobre documentação — evita erros que custam caro para corrigir depois.' },
      { pergunta: 'Quanto de imposto pago se alugar o imóvel morando fora do Brasil?',
        resposta: '15% de Imposto de Renda retido na fonte sobre o valor líquido do aluguel, sem faixa de isenção — ou 25% se você mora em país considerado paraíso fiscal pela legislação brasileira.' },
    ],
    fatosChaveParaJoao: [
      'Estrangeiro pode comprar imóvel urbano no Brasil sem restrição de nacionalidade (rural tem regras à parte, Lei 5.709/1971, fora do escopo do site).',
      'CPF é obrigatório e pode ser obtido remotamente via consulado brasileiro, sem precisar viajar ao Brasil.',
      'Financiamento bancário tradicional geralmente exige CRNM ou visto permanente; entrada de 20% a 50%; Caixa mais restritiva, fintechs mais flexíveis com renda estrangeira.',
      'MCMV e FGTS não estão disponíveis para estrangeiro sem residência/contribuição formal no Brasil — o caminho de financiamento é SBPE (até R$2,25M) ou SFI (acima), sempre taxa de mercado sem subsídio.',
      'Golden Visa / Visto de Investidor Imobiliário (RN 36/2018, alterada pela RN 46/2022): imóvel urbano ≥R$1.000.000 (Sul/Sudeste/Centro-Oeste) ou ≥R$700.000 (Norte/Nordeste) dá residência de 4 anos, permanência mínima de 14 dias a cada 2 anos, convertível em residência por prazo indeterminado. Recomendar confirmação com advogado de imigração para prazos vigentes.',
      'IR sobre aluguel recebido por não residente: 15% retido na fonte (25% se residente em paraíso fiscal), sem faixa de isenção — diferente da tabela progressiva de residentes no Brasil.',
    ],
    ctaSimulador: { texto: 'Simular financiamento', href: '/simulador' },
    relacionados: ['brasileiro-no-exterior-financiar-imovel', 'mcmv-sbpe-sfi-qual-modalidade-escolher'],
  },
  {
    slug: 'scp-sociedade-conta-participacao-imobiliaria',
    keyword: 'SCP imobiliária',
    triggers: ['scp', 'sociedade em conta de participação', 'sócio ostensivo', 'sócio participante', 'imóvel por scp', 'investir por scp', 'esse empreendimento usa scp'],
    titulo: 'Sociedade em Conta de Participação (SCP) no mercado imobiliário',
    tituloSEO: 'SCP no Mercado Imobiliário: Como Funciona, Vantagens e Riscos',
    metaDescription:
      'SCP imobiliária explicada: o que é, sócio ostensivo e participante, diferença para comprar na planta, vantagens reais e riscos — com base no Código Civil e na CVM.',
    resumo:
      'Encontrou uma oportunidade estruturada como Sociedade em Conta de Participação (SCP) num empreendimento imobiliário e não tem certeza do que estaria contratando? Este guia explica o que é uma SCP, quem responde por quê, quando ela se aproxima — e quando se distancia — de comprar um imóvel, e os riscos que valem análise antes de decidir. Sem julgar SCP como boa ou ruim: o objetivo é você entender exatamente o que está diante de você.',
    publicado: '2026-08-24',
    atualizado: '2026-08-24',
    leituraMin: 12,
    secoes: [
      {
        titulo: 'O que é uma Sociedade em Conta de Participação?',
        blocos: [
          { tipo: 'p', texto: 'A Sociedade em Conta de Participação (SCP) é um tipo societário previsto nos **artigos 991 a 996 do Código Civil** (Lei 10.406/2002). Diferente de uma empresa comum, ela **não tem personalidade jurídica própria** — mesmo que o contrato seja registrado em cartório, isso não transforma a SCP numa "empresa" que existe perante todo mundo.' },
          { tipo: 'destaque', texto: '**Art. 991 do Código Civil:** "a atividade constitutiva do objeto social é exercida unicamente pelo sócio ostensivo, em seu nome individual e sob sua própria e exclusiva responsabilidade, participando os demais dos resultados correspondentes."' },
          { tipo: 'p', texto: 'Na prática, isso significa que a SCP existe como um **acordo entre sócios** para dividir os resultados de um negócio — não como uma pessoa jurídica visível ao mercado. Sua constituição não exige formalidade alguma (art. 992) e pode até ser provada por qualquer meio de direito, embora, na prática, contratos bem estruturados sejam sempre a base de operações sérias.' },
        ],
      },
      {
        titulo: 'Quem são o sócio ostensivo e o sócio participante?',
        blocos: [
          { tipo: 'lista', itens: [
            '**Sócio ostensivo** — quem efetivamente conduz o negócio, contrata em seu próprio nome e responde perante fornecedores, bancos, órgãos públicos e qualquer terceiro. No mercado imobiliário, costuma ser a incorporadora ou uma empresa do grupo dela.',
            '**Sócio participante** — quem entra com capital e tem direito de participar dos resultados combinados em contrato, mas **não aparece perante terceiros**. A relação dele é só com o sócio ostensivo, nos termos do que foi contratado.',
          ] },
          { tipo: 'p', texto: 'Essa divisão de papéis é o núcleo do instituto: o contrato social produz efeito **somente entre os sócios** (art. 993). Se você é sócio participante, você não tem uma relação jurídica direta com o empreendimento, com o terreno ou com quem compra as unidades — sua relação é com o sócio ostensivo, dentro do que o contrato prevê.' },
        ],
      },
      {
        titulo: 'Como uma SCP pode aparecer no mercado imobiliário?',
        blocos: [
          { tipo: 'p', texto: 'É comum incorporadoras usarem uma SCP para reunir capital de investidores numa fase anterior à comercialização convencional do empreendimento — por exemplo, para viabilizar a compra do terreno ou o início da obra antes do lançamento aberto ao público em geral. O sócio ostensivo (a incorporadora) segue conduzindo tudo; os sócios participantes entram com recursos e recebem participação nos resultados combinados.' },
          { tipo: 'p', texto: 'Existe uma diferença relevante entre uma SCP legítima — lastreada em terreno real, incorporadora com histórico verificável e contrato claro — e o que o próprio mercado chama de **"SCP financeira disfarçada"**: uma estrutura que usa o formato jurídico da SCP só para captar dinheiro do público prometendo retorno fixo, sem lastro real verificável. A seção sobre a CVM, mais abaixo, explica quando esse segundo caso pode configurar uma irregularidade.' },
        ],
      },
      {
        titulo: 'Participar de uma SCP significa comprar um apartamento?',
        blocos: [
          { tipo: 'destaque', texto: '**Não, não automaticamente.** Participar de uma SCP não é, por si só, o mesmo que ser proprietário de um imóvel — essa é a regra fundamental para entender qualquer oferta desse tipo.' },
          { tipo: 'p', texto: 'Como você viu acima, quem exerce a atividade e responde perante terceiros é o sócio ostensivo (art. 991). O sócio participante tem um **direito contratual de participação nos resultados** — que pode ser em dinheiro, numa fração de valor do empreendimento, ou, em alguns modelos, na promessa de receber uma unidade específica. Mas isso **depende inteiramente do que o contrato daquela operação estabelece**, não é uma consequência automática de "estar numa SCP".' },
          { tipo: 'p', texto: 'Se uma oferta específica prevê que o investidor vai receber uma unidade no futuro, esse direito nasce da estrutura contratual daquela operação em particular — normalmente combinada com outros instrumentos, como uma promessa de compra e venda ou a incorporação formal do empreendimento — e não da SCP como instituto genérico. Antes de assumir que "SCP = vou virar dono do apartamento", leia o contrato e confirme exatamente o que ele garante.' },
        ],
      },
      {
        titulo: 'SCP × compra tradicional × imóvel na planta',
        blocos: [
          { tipo: 'tabela',
            cabecalho: ['', 'Compra tradicional', 'Imóvel na planta (incorporação)', 'SCP — sócio participante'],
            linhas: [
              ['O que você tem', 'Propriedade registrada em matrícula', 'Direito à unidade via contrato de incorporação (Lei 4.591/1964)', 'Participação contratual nos resultados — não necessariamente uma unidade específica'],
              ['Existe personalidade jurídica na estrutura?', 'Não se aplica', 'Não se aplica', 'Não — sociedade não personificada (art. 993 do CC)'],
              ['Quem responde perante terceiros', 'Você mesmo, como proprietário', 'A incorporadora', 'Só o sócio ostensivo (art. 991 do CC)'],
              ['Sua relação de direito é com...', 'O imóvel diretamente', 'A incorporadora, via contrato de incorporação', 'O sócio ostensivo, nos limites do contrato social'],
            ],
          },
          { tipo: 'p', texto: 'Você pode inclusive encontrar uma operação que combina SCP **e** incorporação (ex.: a SCP financia a fase inicial, e depois o empreendimento segue para incorporação formal com matrícula própria) — por isso é importante ler o contrato específico em vez de presumir qual estrutura se aplica ao seu caso.' },
        ],
      },
      {
        titulo: 'Quais podem ser as vantagens para o investidor?',
        blocos: [
          { tipo: 'p', texto: 'Existem razões legítimas para um investidor se interessar por uma operação estruturada dessa forma — mas toda vantagem aqui é **potencial**, nunca garantida, e depende do contrato específico:' },
          { tipo: 'lista', itens: [
            '**Acesso a uma fase anterior do projeto** — antes da comercialização aberta ao público.',
            '**Condições econômicas de entrada diferentes** das praticadas depois do lançamento formal.',
            '**Participação nos resultados econômicos** do empreendimento, conforme definido em contrato.',
            '**Exposição à valorização do projeto** ao longo do tempo, também sujeita ao que o contrato prevê.',
          ] },
          { tipo: 'destaque', texto: 'Nenhuma dessas vantagens é automática. Não é correto afirmar, de forma genérica, que "SCP é mais barata", "SCP sempre valoriza", "SCP garante apartamento", "SCP garante lucro", "SCP é investimento seguro" ou "SCP é melhor do que comprar na planta" — tudo depende da operação concreta.' },
        ],
      },
      {
        titulo: 'Quais são os principais riscos?',
        blocos: [
          { tipo: 'lista', itens: [
            '**Risco do empreendimento** — atraso, inviabilidade técnica ou financeira, distrato.',
            '**Risco do sócio ostensivo** — é ele quem responde perante terceiros; se ele quebrar, a sociedade se dissolve e o saldo do participante vira **crédito quirografário** (art. 994, §2º), ou seja, sem preferência de pagamento diante de outros credores.',
            '**Risco contratual** — seus direitos são só os que o contrato prevê, nada além disso.',
            '**Liquidez baixa** — o capital costuma ficar comprometido por todo o ciclo do empreendimento, sem saída fácil antes do previsto.',
            '**Dificuldade de saída antecipada** — o Código Civil já trata a entrada de novo sócio como algo que depende do consentimento dos demais (art. 995), o que dá uma boa ideia de como transferências de posição também costumam depender de anuência contratual.',
            '**Ausência de garantia de valorização** — como qualquer investimento vinculado a um empreendimento real.',
            '**Ausência automática de propriedade imobiliária** — reforço direto do que a seção anterior já explicou.',
            '**Risco regulatório** — se a oferta foi feita ao público prometendo retorno, sem o devido registro, ver seção sobre a CVM abaixo.',
            '**Tributação** — a SCP tem CNPJ e apuração próprios; entenda como isso se reflete pra você antes de assinar.',
            '**Necessidade de análise jurídica e contábil específica** — cada operação de SCP é diferente da outra.',
          ] },
        ],
      },
      {
        titulo: 'Quando uma oferta de SCP pode envolver regras da CVM?',
        blocos: [
          { tipo: 'p', texto: 'SCP ser uma estrutura jurídica legítima **não significa** que toda oferta de participação possa ser livremente comercializada ao público como investimento. A **Lei 6.385/1976**, no art. 2º, inciso IX, classifica como valor mobiliário "quaisquer outros títulos ou **contratos de investimento coletivo**, que gerem direito de participação, de parceria ou de remuneração [...] cujos rendimentos advêm do esforço do empreendedor ou de terceiros" — quando ofertados publicamente.' },
          { tipo: 'destaque', texto: 'Em termos simples: se alguém oferece publicamente uma participação em SCP prometendo retorno financeiro que depende do esforço da incorporadora (o sócio ostensivo), isso pode se enquadrar como oferta pública de valor mobiliário — sujeita ao regime da **Resolução CVM nº 160/2022** (que unificou e substituiu as antigas regras de ofertas públicas), exigindo registro prévio ou enquadramento numa hipótese de dispensa.' },
          { tipo: 'p', texto: 'A própria CVM já alertou publicamente sobre ofertas de investimento em empreendimentos imobiliários via SCP ou frações ideais, divulgadas por TV, rádio, jornal ou corretores, sem o devido registro. Isso não quer dizer que toda SCP imobiliária seja irregular — quer dizer que **a forma como a oferta é divulgada e comercializada** é o que determina se ela precisa de registro na CVM, não o instituto da SCP isoladamente.' },
          { tipo: 'p', texto: 'Se você recebeu uma proposta de SCP com promessa de retorno, divulgada de forma ampla ao público, vale perguntar diretamente à incorporadora se a oferta está registrada na CVM ou enquadrada numa dispensa — e, na dúvida, buscar orientação jurídica antes de assinar qualquer coisa.' },
        ],
      },
      {
        titulo: 'O que analisar antes de entrar em uma SCP imobiliária?',
        blocos: [
          { tipo: 'p', texto: 'Checklist educacional — nem todo item se aplica a toda operação, mas vale confirmar o que for pertinente antes de decidir:' },
          { tipo: 'lista', itens: [
            'Quem é o sócio ostensivo e qual o histórico dele no mercado.',
            'Qual é exatamente o objeto da SCP.',
            'Qual empreendimento está envolvido — e se ele existe de fato (terreno, licenças).',
            'Qual é o destino real dos recursos captados.',
            'Como funciona a participação nos resultados — percentual, prazo, condições.',
            'Qual é o prazo previsto da operação.',
            'Quais são as regras de saída antecipada, se existirem.',
            'Quais são os riscos específicos dessa operação (não só os genéricos deste artigo).',
            'Quais garantias existem — e quais **não** existem.',
            'Se há documentação verificável do empreendimento.',
            'Qual a situação da incorporação formal, quando aplicável ao caso.',
            'Quais são as responsabilidades de cada parte, por escrito.',
            'Como funciona a tributação dessa operação específica para você.',
            'Se você já buscou análise jurídica e contábil profissional antes de assinar.',
          ] },
        ],
      },
      {
        titulo: 'Fontes oficiais e aviso importante',
        blocos: [
          { tipo: 'lista', itens: [
            'Código Civil — Lei 10.406/2002, arts. 991 a 996 (definição de SCP, sócio ostensivo/participante, patrimônio especial, efeitos da falência).',
            'Lei 6.385/1976, art. 2º, inciso IX (definição de contrato de investimento coletivo como valor mobiliário).',
            'Resolução CVM nº 160/2022 (regime atual de ofertas públicas de valores mobiliários no Brasil).',
            'Instrução Normativa RFB nº 1.470/2014 (obrigatoriedade de CNPJ da SCP e responsabilidade tributária do sócio ostensivo).',
            'Comunicado da CVM sobre ofertas irregulares de investimento em empreendimentos imobiliários (gov.br/cvm).',
          ] },
          { tipo: 'destaque', texto: 'Este conteúdo tem **caráter educacional** e não substitui análise jurídica e contábil individualizada da operação específica que você está avaliando. O FinancieCerto não presta parecer jurídico nem recomenda ou desaconselha operações de SCP — recomendamos consultar um advogado e um contador antes de qualquer decisão.' },
        ],
      },
    ],
    faq: [
      { pergunta: 'Participar de uma SCP é o mesmo que comprar um imóvel na planta?',
        resposta: 'Não. Na compra na planta você tem um contrato de incorporação com direito a uma unidade específica. Numa SCP, o sócio participante tem um direito contratual de participação nos resultados, que só vira uma unidade específica se o contrato daquela operação prever exatamente isso.' },
      { pergunta: 'Quem responde se o empreendimento não sair do papel?',
        resposta: 'Perante terceiros (fornecedores, bancos, órgãos públicos), quem responde é o sócio ostensivo — o participante não aparece nessa relação. Entre os sócios, as consequências dependem do que o contrato social prevê.' },
      { pergunta: 'Dá para sair de uma SCP antes do fim do empreendimento?',
        resposta: 'Depende do contrato. O Código Civil já trata a entrada de novo sócio como algo que exige consentimento dos demais (art. 995), o que costuma refletir baixa liquidez também para quem quer sair antes do previsto — confirme as regras de saída antes de entrar.' },
      { pergunta: 'Toda oferta de SCP precisa de registro na CVM?',
        resposta: 'Não toda — mas quando a oferta é feita publicamente prometendo remuneração a partir do esforço do sócio ostensivo, ela pode se enquadrar como contrato de investimento coletivo (Lei 6.385/1976) e precisar de registro conforme a Resolução CVM nº 160/2022, salvo hipótese de dispensa.' },
      { pergunta: 'Como funciona o imposto de uma SCP?',
        resposta: 'A SCP precisa de CNPJ próprio desde a Instrução Normativa RFB nº 1.470/2014. O sócio ostensivo é responsável por apurar e recolher o IRPJ e a CSLL da SCP, seguindo as regras aplicáveis a pessoas jurídicas em geral.' },
      { pergunta: 'O FinancieCerto recomenda ou participa de operações de SCP?',
        resposta: 'Não. Este conteúdo é educacional — explica como o instituto funciona a partir de fontes oficiais. Não avaliamos, recomendamos nem desaconselhamos operações específicas: isso exige análise jurídica e contábil individual da operação que você está avaliando.' },
    ],
    fatosChaveParaJoao: [
      'SCP (Sociedade em Conta de Participação, Código Civil arts. 991-996) não tem personalidade jurídica própria — só o sócio ostensivo responde perante terceiros; o sócio participante só tem relação contratual com o ostensivo.',
      'Participar de uma SCP NÃO é automaticamente ser proprietário de um imóvel — o direito do participante é contratual (participação nos resultados); só vira direito a uma unidade se o contrato específico da operação previr isso.',
      'Falência do sócio ostensivo dissolve a SCP; o saldo do sócio participante vira crédito quirografário (art. 994, §2º do CC), sem preferência de pagamento.',
      'SCP precisa de CNPJ próprio desde a IN RFB 1.470/2014; o sócio ostensivo apura e recolhe o IRPJ/CSLL.',
      'Oferta pública de participação em SCP prometendo remuneração pode se enquadrar como contrato de investimento coletivo (Lei 6.385/1976, art. 2º, IX) e exigir registro na CVM conforme a Resolução CVM 160/2022.',
      'Nunca afirmar que SCP é garantidamente mais barata, sempre valoriza, garante apartamento, garante lucro, é sem risco ou é melhor que comprar na planta — tudo depende do contrato específico da operação.',
      'FinancieCerto não presta parecer jurídico sobre SCP — conteúdo é educacional; sempre recomendar análise jurídica/contábil individual antes de decidir.',
    ],
    // Página puramente educacional — sem CTA de "fale com um consultor sobre SCP"
    // (o site não sabe quais empreendimentos usam SCP; essa informação é apurada
    // manualmente junto à construtora, não vem do catálogo) nem associação
    // automática com o catálogo geral de imóveis.
    ctaSimulador: { texto: '', href: '/contato' },
    ctaSimuladorOculto: true,
    ctaSemBotaoImoveis: true,
    ctaFinalImoveisOculto: true,
    relacionados: ['credito-associativo-como-funciona-comprar-na-planta', 'mcmv-sbpe-sfi-qual-modalidade-escolher'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
export function getArtigo(slug: string): Artigo | undefined {
  return ARTIGOS.find(a => a.slug === slug);
}

export function getArtigos(): Artigo[] {
  return [...ARTIGOS].sort((a, b) => (a.atualizado < b.atualizado ? 1 : -1));
}

/**
 * Texto plano (sem markup) dos fatos-chave — injetado no contexto do João.
 * `modo: 'lendo'` (padrão) — o usuário está na própria página do artigo.
 * `modo: 'relacionado'` — a pergunta bateu com um trigger deste artigo em
 * OUTRA página (ver detectarArtigosRelevantes) — o usuário não está lendo o
 * artigo, então a frase de abertura não pode afirmar que ele está.
 */
export function fatosArtigoParaContexto(slug: string, modo: 'lendo' | 'relacionado' = 'lendo'): string | null {
  const artigo = getArtigo(slug);
  if (!artigo) return null;
  const abertura = modo === 'lendo'
    ? `O usuário está lendo o artigo "${artigo.titulo}" (sobre: ${artigo.keyword}).`
    : `A pergunta do usuário parece relacionada ao conteúdo do artigo "${artigo.titulo}" (/aprenda/${artigo.slug}), sobre: ${artigo.keyword}. Ele NÃO está necessariamente lendo essa página agora.`;
  return [
    abertura,
    'Fatos-chave deste conteúdo (use para responder; se fizer sentido, sugira o artigo completo):',
    ...artigo.fatosChaveParaJoao.map(f => `- ${f}`),
  ].join('\n');
}

// Normaliza pra comparação: minúsculo, sem acento.
function normalizarTexto(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Palavras de conexão que não carregam significado pra efeito de match —
// sem isso, "MCMV, SBPE e SFI" não batia com o trigger "mcmv sbpe sfi" (o "e"
// no meio quebrava o match por substring contígua), nem "estrangeiro PODE
// comprar imóvel" batia com "estrangeiro comprar imóvel".
const STOPWORDS = new Set([
  'de','da','do','das','dos','e','o','a','os','as','um','uma','uns','umas',
  'no','na','nos','nas','que','pra','para','por','pelo','pela','com','sem',
  'pode','posso','podem','é','ser','sobre','ou','se','no','em','ao','aos',
]);

function palavrasSignificativas(frase: string): string[] {
  return normalizarTexto(frase)
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 1 && !STOPWORDS.has(w));
}

/**
 * Detecta, por palavra-chave (determinístico — sem chamada extra de IA, sem
 * custo/latência adicional), quais artigos de /aprenda são relevantes pra uma
 * mensagem do usuário, mesmo fora da página do artigo — ex.: pergunta "o que é
 * SCP?" feita na home. Usado por app/api/chat/route.ts pra injetar só o
 * conteúdo relevante no contexto do João, em vez de mandar os 12 artigos em
 * toda requisição.
 *
 * Um trigger bate quando TODAS as suas palavras significativas aparecem na
 * mensagem (em qualquer ordem, com qualquer coisa entre elas) — não exige
 * substring contígua, pra tolerar "MCMV, SBPE e SFI" batendo com o trigger
 * "mcmv sbpe sfi", por exemplo.
 *
 * `excluirSlug` evita reinjetar um artigo já coberto pelo contexto de página
 * (ver buildContextBlock em route.ts). Limitado a 2 matches pra não inflar o prompt.
 */
export function detectarArtigosRelevantes(mensagem: string, excluirSlug?: string): string[] {
  const msgPalavras = new Set(normalizarTexto(mensagem).split(/[^a-z0-9]+/).filter(Boolean));
  const encontrados: string[] = [];
  for (const artigo of ARTIGOS) {
    if (artigo.slug === excluirSlug) continue;
    const bate = (artigo.triggers ?? []).some(t => {
      const palavras = palavrasSignificativas(t);
      return palavras.length > 0 && palavras.every(p => msgPalavras.has(p));
    });
    if (bate) encontrados.push(artigo.slug);
    if (encontrados.length >= 2) break;
  }
  return encontrados;
}
