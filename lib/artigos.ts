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
  relacionados: string[];    // slugs de artigos relacionados
}

// ─────────────────────────────────────────────────────────────────────────────
// ARTIGOS
// ─────────────────────────────────────────────────────────────────────────────
export const ARTIGOS: Artigo[] = [
  {
    slug: 'juros-evolucao-obra',
    keyword: 'juros de evolução de obra',
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
          { tipo: 'p', texto: 'Quando você compra um imóvel **na planta** financiado pela Caixa (o chamado **Crédito Associativo**), o contrato é assinado **antes da obra terminar**. A Caixa não entrega todo o dinheiro de uma vez para a construtora — ela libera o valor aos poucos, conforme a obra avança.' },
          { tipo: 'p', texto: 'Durante esse período de construção, você paga ao banco apenas os **juros sobre o que já foi liberado**. É como se você estivesse pegando o empréstimo aos poucos e pagando juros só sobre a parte já usada. Essas cobranças mensais são os **juros de evolução de obra** (ou "juros de obra"), e aparecem no seu extrato como **Prestação 0**.' },
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
          { tipo: 'p', texto: 'Quando a obra termina e sai o **habite-se**, o financiamento entra na fase definitiva. A Prestação 0 acaba e começam as **prestações reais** (1, 2, 3...). A partir daí você passa a **abater a dívida de verdade** — mas a parcela dá um salto, porque agora inclui a amortização do valor total financiado.' },
          { tipo: 'destaque', texto: 'Prepare-se para o salto: no exemplo real, a parcela durante a obra estava em ~R$ 657/mês e, após as chaves, foi para cerca de **R$ 1.966/mês**. Esse é o momento mais importante de planejar com antecedência.' },
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
        resposta: 'Durante todo o período de construção — normalmente até a entrega das chaves (habite-se). Pode levar de 1 a 3 anos, dependendo do empreendimento e do estágio em que você assinou o contrato.' },
      { pergunta: 'A parcela vai aumentar quando eu pegar as chaves?',
        resposta: 'Sim, geralmente dá um salto. Durante a obra você paga só juros + seguros; após as chaves a parcela passa a incluir também a amortização (o abatimento da dívida), o que aumenta bastante o valor mensal.' },
      { pergunta: 'Como a Caixa calcula o juros mensal?',
        resposta: 'Ela transforma a taxa anual em mensal dividindo por 12 (não usa juros compostos) e multiplica pelo valor já liberado. Exemplo: 7,66% ao ano ÷ 12 = 0,6383% ao mês; sobre um saldo liberado de R$ 60.000, o juros do mês fica em torno de R$ 383.' },
    ],
    fatosChaveParaJoao: [
      'Juros de evolução de obra = juros pagos ao banco durante a construção, sobre o valor JÁ liberado à construtora (aparece como "Prestação 0"). NÃO abatem a dívida.',
      'A Caixa calcula a taxa mensal como taxa anual ÷ 12 (não juros compostos). Ex: 7,66% ÷ 12 = 0,6383%/mês.',
      'Parcela durante a obra = Juros (saldo liberado × taxa mensal) + Amortização (TR do mês, variável) + Seguros (MIP+DFI, ~R$ 51) + Taxa adm (~R$ 25).',
      'A parcela CRESCE mês a mês porque a Caixa libera mais verba conforme a obra avança, aumentando o saldo sobre o qual incide o juros.',
      'Exemplo real (MCMV F3, R$ 267.000 a 7,66%): parcela foi de ~R$ 303 (jan, obra ~0%) a ~R$ 657 (jun, obra 7,8%). Teto do juros na obra ≈ R$ 1.704/mês.',
      'Após as chaves (habite-se), começam as prestações reais com amortização — a parcela dá um salto (no exemplo, de ~R$ 657 para ~R$ 1.966/mês).',
      'A linha "Amortização" durante a obra é a TR do mês (correção monetária) — varia todo mês, não reduz a dívida.',
    ],
    ctaSimulador: { texto: 'Simular meu imóvel na planta', href: '/simulador/na-planta' },
    relacionados: ['mcmv-sbpe-sfi-qual-modalidade-escolher'],
  },
  {
    slug: 'mcmv-sbpe-sfi-qual-modalidade-escolher',
    keyword: 'MCMV, SBPE ou SFI qual escolher',
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
    relacionados: ['juros-evolucao-obra', 'sac-ou-price-qual-sistema-amortizacao-escolher'],
  },
  {
    slug: 'sac-ou-price-qual-sistema-amortizacao-escolher',
    keyword: 'SAC ou Price qual escolher',
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
      {
        titulo: 'Qual o sistema padrão no MCMV e no SBPE',
        blocos: [
          { tipo: 'p', texto: 'O MCMV usa SAC como padrão na grande maioria dos contratos — é o sistema que a Caixa Econômica Federal aplica automaticamente no crédito associativo. Já no SBPE, os dois sistemas estão disponíveis e a escolha é do comprador no momento da contratação.' },
        ],
      },
    ],
    faq: [
      { pergunta: 'Posso trocar de SAC para Price depois de assinar o contrato?',
        resposta: 'Normalmente não — o sistema de amortização é definido no contrato e não pode ser alterado depois sem renegociação com o banco (portabilidade ou novo contrato), o que tem custos e nem sempre é aceito.' },
      { pergunta: 'O MCMV permite escolher Price?',
        resposta: 'A grande maioria dos contratos MCMV usa SAC por padrão, definido pela Caixa Econômica Federal. Quem quer Price geralmente precisa contratar pelo SBPE.' },
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
      'MCMV usa SAC por padrão (definido pela Caixa). SBPE permite escolher entre os dois.',
      'No SBPE, o sistema de amortização afeta o LTV máximo: até 80% do imóvel com SAC, até 70% com Price (Price exige entrada maior).',
      'Não é possível trocar de sistema depois de assinado sem renegociar o contrato.',
    ],
    ctaSimulador: { texto: 'Simular Price x SAC', href: '/simulador' },
    relacionados: ['mcmv-sbpe-sfi-qual-modalidade-escolher'],
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

/** Texto plano (sem markup) dos fatos-chave — injetado no contexto do João. */
export function fatosArtigoParaContexto(slug: string): string | null {
  const artigo = getArtigo(slug);
  if (!artigo) return null;
  return [
    `O usuário está lendo o artigo "${artigo.titulo}" (sobre: ${artigo.keyword}).`,
    'Fatos-chave deste artigo (use para responder dúvidas dele):',
    ...artigo.fatosChaveParaJoao.map(f => `- ${f}`),
  ].join('\n');
}
