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
    relacionados: [],
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
