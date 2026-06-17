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
        resposta: 'Desde cerca de 30 dias após a assinatura do contrato de financiamento (que ocorre antes do início da obra) até a entrega das chaves (habite-se). O prazo total de obra varia de 1 a 3 anos, dependendo do empreendimento.' },
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
    relacionados: ['mcmv-sbpe-sfi-qual-modalidade-escolher', 'credito-associativo-como-funciona-comprar-na-planta'],
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
    titulo: 'Crédito Associativo: Como Funciona Financiar um Imóvel na Planta',
    tituloSEO: 'Crédito Associativo: Como Funciona Financiar na Planta (2026)',
    metaDescription:
      'Entenda o crédito associativo do início ao fim: como a Caixa libera o financiamento durante a obra, o fluxo de pagamento à construtora e o que muda no habite-se.',
    resumo:
      'Comprar na planta pelo MCMV ou SBPE quase sempre passa pelo crédito associativo — o modelo em que o contrato de financiamento é assinado antes do início da obra, e a primeira fatura de juros chega cerca de 30 dias depois. Aqui você vê o fluxo completo, do contrato com a construtora à entrega das chaves, e entende quem recebe o quê em cada etapa.',
    publicado: '2026-06-17',
    atualizado: '2026-06-17',
    leituraMin: 8,
    secoes: [
      {
        titulo: 'O que é o crédito associativo',
        blocos: [
          { tipo: 'p', texto: 'É o modelo de financiamento em que o contrato com o banco é assinado **antes do início da obra** — não durante, nem só na entrega das chaves. É o formato padrão do MCMV para imóveis na planta, mas também existe no SBPE.' },
          { tipo: 'p', texto: 'A diferença para um financiamento de imóvel pronto: o banco não entrega o dinheiro de uma vez na assinatura. Ele libera o valor para a construtora **conforme a obra avança**, com base em medições periódicas. Cerca de 30 dias após a assinatura, já chega a primeira fatura: o comprador paga só os juros sobre o que já foi liberado até aquele mês (os juros de evolução de obra) — não a parcela completa, que só começa no habite-se.' },
        ],
      },
      {
        titulo: 'O fluxo completo: da assinatura ao habite-se',
        blocos: [
          { tipo: 'lista', itens: [
            '**1. Contrato de Compra e Venda:** assinado entre comprador e construtora, define imóvel, valor e condições de pagamento.',
            '**2. SICAQ (análise de crédito):** a construtora envia os dados do comprador à Caixa, que analisa e aprova a capacidade de financiamento — antes mesmo da obra avançar.',
            '**3. Contrato de Financiamento:** assinado entre comprador e Caixa. A partir daqui, o financiamento está formalizado.',
            '**4. Obra em andamento:** a Caixa libera recursos à construtora por medição de avanço físico. Cerca de 30 dias após a assinatura do contrato de financiamento, chega a primeira fatura de juros de evolução, e o comprador continua pagando mensalmente sobre o saldo já liberado.',
            '**5. Habite-se:** a prefeitura atesta que a construção terminou. O financiamento sai do regime de evolução e entra no regime normal — parcelas completas, com amortização.',
          ] },
          { tipo: 'destaque', texto: 'O acompanhamento de todo esse processo — medições, repasses, situação do comprador — fica registrado no SICAQ, sistema interno da Caixa. Construtoras costumam informar o andamento, mas vale acompanhar.' },
        ],
      },
      {
        titulo: 'Quem recebe o quê: construtora x banco',
        blocos: [
          { tipo: 'p', texto: 'Durante a obra, o comprador paga em duas frentes diferentes, que não devem ser confundidas:' },
          { tipo: 'tabela',
            cabecalho: ['Pagamento', 'Para quem', 'Quando'],
            linhas: [
              ['Ato (5% a 10%)', 'Construtora', 'Na assinatura do contrato'],
              ['Mensais', 'Construtora', 'Todo mês, durante a obra'],
              ['Sinais / reforços', 'Construtora', 'Datas específicas (ex.: a cada 6 meses)'],
              ['Anuais', 'Construtora', 'Parcelas anuais, geralmente mais altas'],
              ['Juros de evolução de obra', 'Caixa Econômica Federal', 'Todo mês, sobre o saldo já liberado'],
              ['Chaves', 'Construtora', 'Na entrega do imóvel'],
            ],
          },
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
        resposta: 'É mais comum no MCMV, mas o SBPE também opera com crédito associativo para imóvel na planta — o fluxo é parecido, mudando taxa e regras de FGTS.' },
      { pergunta: 'Por que pago juros à Caixa antes mesmo de ter o imóvel pronto?',
        resposta: 'Porque o banco já desembolsou parte do valor financiado para a construtora, conforme a obra avança. Esses juros remuneram o banco pelo capital já liberado, antes de você começar a pagar o financiamento completo.' },
      { pergunta: 'O que acontece se a obra atrasar?',
        resposta: 'A liberação de recursos pela Caixa segue o avanço real medido — se a obra atrasa, os repasses também atrasam. Se o atraso for grande, o comprador tem direito a pedir o distrato com devolução integral corrigida (Lei 13.786/2018).' },
      { pergunta: 'Posso desistir depois de assinar o contrato?',
        resposta: 'Sim, mas a incorporadora pode reter entre 25% e 50% dos valores pagos, conforme a Lei do Distrato, devolvendo o restante em até 180 dias.' },
      { pergunta: 'Quando começo a pagar a parcela completa, com amortização?',
        resposta: 'Só depois do habite-se, quando a obra é formalmente concluída e o financiamento sai do regime de evolução para o regime normal de amortização.' },
    ],
    fatosChaveParaJoao: [
      'Crédito associativo = contrato de financiamento assinado ANTES do início da obra (padrão MCMV, também existe no SBPE). Cerca de 30 dias após a assinatura, chega a primeira fatura de juros de evolução. Banco libera recursos à construtora por medição de avanço, não de uma vez.',
      'Fluxo: 1) Contrato com construtora → 2) SICAQ (análise de crédito) → 3) Contrato de financiamento com a Caixa → 4) Obra com juros de evolução → 5) Habite-se → financiamento normal com amortização.',
      'Durante a obra, dois fluxos de pagamento distintos: à CONSTRUTORA (ato, mensais, reforços, anuais, chaves) e ao BANCO (juros de evolução de obra, sobre saldo já liberado).',
      'Cronograma físico-financeiro = documento que define avanço de obra x repasse mês a mês. Atraso na obra trava o repasse da Caixa.',
      'Lei do Distrato (13.786/2018): se o comprador desistir, incorporadora retém 25-50% do pago, devolve o resto em até 180 dias. Se for a construtora que atrasar a entrega, o comprador pode pedir distrato com devolução integral corrigida.',
      'Ver também: artigo "Juros de Evolução de Obra" para o cálculo detalhado mês a mês da parcela durante a construção.',
    ],
    ctaSimulador: { texto: 'Simular meu imóvel na planta', href: '/simulador/na-planta' },
    relacionados: ['juros-evolucao-obra', 'mcmv-sbpe-sfi-qual-modalidade-escolher'],
  },
  {
    slug: 'custos-comprar-imovel-financiado-itbi-cartorio-taxas',
    keyword: 'custos para comprar imóvel financiado',
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
        ],
      },
      {
        titulo: 'Análise de crédito: imóvel pronto x na planta',
        blocos: [
          { tipo: 'p', texto: 'No MCMV com crédito associativo (compra na planta), a análise de crédito é feita antes mesmo da assinatura do contrato com a construtora, via SICAQ — você já sabe se está aprovado antes de se comprometer. Veja o [fluxo completo do crédito associativo](/aprenda/credito-associativo-como-funciona-comprar-na-planta).' },
          { tipo: 'p', texto: 'Em um imóvel **pronto** (lançamento já entregue ou imóvel usado/revenda), a análise ocorre quando você apresenta a proposta ao banco — geralmente depois de já ter negociado o preço com o vendedor. É preciso ter os documentos em ordem (renda comprovada, certidões negativas, CPF sem restrição) antes de assinar qualquer proposta de compra, para não correr o risco de o crédito ser reprovado depois de já ter pago sinal.' },
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
    titulo: 'Documentos para Financiar Imóvel: CLT, Autônomo e MEI',
    tituloSEO: 'Documentos para Financiar Imóvel: CLT, Autônomo e MEI (2026)',
    metaDescription:
      'Checklist completo de documentos para financiar imóvel pela Caixa: pessoais, de renda (CLT, autônomo, MEI) e do imóvel. Inclui como compor renda com outra pessoa.',
    resumo:
      'Antes de assinar qualquer proposta de compra, vale separar a documentação — é o que evita perder tempo (e às vezes o sinal pago) com uma análise de crédito reprovada. Aqui está o checklist completo por tipo de renda: CLT, autônomo e MEI.',
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
        resposta: 'Idealmente, antes de assinar qualquer proposta ou pagar sinal — especialmente em imóvel pronto, onde a análise de crédito só ocorre depois que o preço já foi negociado com o vendedor.' },
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
