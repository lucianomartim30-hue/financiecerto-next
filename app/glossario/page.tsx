'use client';

import { useState, useMemo } from 'react';

interface Term {
  term: string;
  category: string;
  short: string;
  full: string;
}

const CATEGORIES = [
  { key: 'todos', label: 'Todos' },
  { key: 'modalidades', label: 'Modalidades' },
  { key: 'indices', label: 'Índices e Taxas' },
  { key: 'amortizacao', label: 'Amortização' },
  { key: 'seguros', label: 'Seguros e Custos' },
  { key: 'documentos', label: 'Documentos e Registros' },
  { key: 'fgts', label: 'FGTS' },
  { key: 'planta', label: 'Imóvel na Planta' },
];

const TERMS: Term[] = [
  /* ── Modalidades ──────────────────────────────────────────────── */
  {
    term: 'MCMV',
    category: 'modalidades',
    short: 'Minha Casa, Minha Vida — programa federal de habitação popular.',
    full: 'Programa habitacional do governo federal que oferece subsídios, taxas reduzidas e condições especiais para famílias de baixa e média renda adquirirem imóvel próprio. Dividido em faixas por renda familiar bruta: Faixa 1 (até R$ 3.200), Faixa 2 (até R$ 5.000), Faixa 3 (até R$ 9.600) e Faixa 4 (até R$ 13.000). O financiamento é feito pela Caixa Econômica Federal e banco parceiros, com prazo de até 35 anos.',
  },
  {
    term: 'SBPE',
    category: 'modalidades',
    short: 'Sistema Brasileiro de Poupança e Empréstimo — financia imóveis pelo saldo da poupança.',
    full: 'Modalidade de crédito imobiliário que usa recursos captados pela caderneta de poupança. É a linha mais comum para imóveis de médio e alto padrão (acima dos tetos do MCMV). As taxas variam entre bancos (geralmente 10–12% a.a. + TR), sem subsídio governamental. Aceita FGTS para amortização.',
  },
  {
    term: 'SFH',
    category: 'modalidades',
    short: 'Sistema Financeiro de Habitação — imóveis até R$ 2,25 milhões.',
    full: 'Enquadramento legal para financiamentos habitacionais com imóveis de até R$ 2,25 milhões (valor de avaliação) — teto atualizado em outubro/2025. Permite uso do FGTS, limita a taxa nominal a 12% a.a. e exige que o imóvel seja residencial. É o enquadramento padrão do MCMV e de parte do SBPE. A Caixa Econômica Federal financia até 80% do valor do imóvel dentro do SFH.',
  },
  {
    term: 'SFI',
    category: 'modalidades',
    short: 'Sistema de Financiamento Imobiliário — sem teto de valor, taxas livres.',
    full: 'Usado para imóveis acima de R$ 2,25 milhões ou operações com taxas acima de 12% a.a. Não permite uso do FGTS. Inclui instrumentos como CRI (Certificado de Recebíveis Imobiliários). Oferece mais flexibilidade para o credor definir condições contratuais — taxas de mercado, sem vinculação ao SBPE.',
  },
  {
    term: 'Crédito Associativo',
    category: 'modalidades',
    short: 'Financiamento direto com a construtora via Caixa Econômica Federal — indicado para imóvel na planta.',
    full: 'Modalidade em que a Caixa Econômica Federal (ou banco parceiro) contrata o financiamento do comprador ainda na fase de construção. O banco libera recursos diretamente para a construtora conforme o avanço da obra. O comprador paga juros sobre o saldo contratado durante a obra (fase de evolução) e, após o habite-se, inicia as parcelas definitivas de amortização. É a forma mais comum de compra na planta via MCMV.',
  },

  /* ── Índices e Taxas ──────────────────────────────────────────── */
  {
    term: 'TR',
    category: 'indices',
    short: 'Taxa Referencial — indexador do saldo devedor nos financiamentos da Caixa Econômica Federal.',
    full: 'A TR (Taxa Referencial) é calculada mensalmente pelo Banco Central a partir da TBF (Taxa Básica Financeira) e aplicada como correção monetária sobre o saldo devedor dos contratos SFH — tanto MCMV quanto SBPE. Atenção: a TR ficou zerada por cerca de 10 anos (2012–2022) devido ao ciclo de juros baixos, o que levou muita gente a acreditar que ela "não existe mais". Isso está errado. Com a alta da Selic, a TR voltou a ser positiva em agosto de 2022 e permanece assim. Em maio de 2026, a TR mensal é de aproximadamente 0,1679%, o que equivale a cerca de 2,06% ao ano. Ao longo de 35 anos, essa correção acumula e pode elevar o saldo devedor significativamente se não for considerada nas simulações.',
  },
  {
    term: 'INCC',
    category: 'indices',
    short: 'Índice Nacional de Custo da Construção — corrige parcelas durante a obra.',
    full: 'Índice calculado pela FGV que mede a variação do custo de construção civil no Brasil. As parcelas pagas durante a obra (antes do habite-se) são corrigidas mensalmente pelo INCC, o que pode elevar o saldo devedor se a inflação da construção for alta. Após a entrega das chaves, a correção passa a ser pela TR (nos contratos SFH) ou pelo IPCA (em contratos alternativos).',
  },
  {
    term: 'CET',
    category: 'indices',
    short: 'Custo Efetivo Total — taxa que inclui juros, seguros e tarifas.',
    full: 'O CET expressa o custo real anual do crédito imobiliário, incorporando não apenas a taxa de juros nominal mas também seguros obrigatórios (MIP e DFI), tarifa de avaliação do imóvel, TAC e demais encargos. É o número correto para comparar propostas de diferentes bancos. Por lei, os bancos são obrigados a informar o CET antes da assinatura do contrato.',
  },
  {
    term: 'LTV',
    category: 'indices',
    short: 'Loan-to-Value — percentual do valor do imóvel que pode ser financiado.',
    full: 'Razão entre o valor financiado e o valor de avaliação do imóvel. Por exemplo, um imóvel de R$ 300.000 com financiamento de R$ 240.000 tem LTV de 80%. Cada banco tem limites de LTV por modalidade: MCMV Faixa 1–3 pode chegar a 90%, SBPE geralmente permite até 80%. Quanto menor o LTV, menor o risco para o banco — o que pode resultar em taxas melhores.',
  },
  {
    term: 'Taxa Nominal vs. Efetiva',
    category: 'indices',
    short: 'Taxa nominal é a contratada; efetiva inclui a capitalização e encargos.',
    full: 'A taxa nominal é a informada no contrato (ex: 10,5% a.a.). A taxa efetiva considera o efeito de capitalização composta e é sempre maior. Nos financiamentos imobiliários, as parcelas são calculadas com base na taxa mensal equivalente (taxa_anual/12 em Price, ou taxa simples em SAC), mas o saldo devedor ainda sofre correção pela TR. Sempre compare propostas pela taxa efetiva ou pelo CET.',
  },

  /* ── Amortização ──────────────────────────────────────────────── */
  {
    term: 'SAC',
    category: 'amortizacao',
    short: 'Sistema de Amortização Constante — parcelas decrescentes, mais barato no total.',
    full: 'No SAC, o valor amortizado (abatido do saldo devedor) é constante a cada mês. Como os juros incidem sobre um saldo que cai, a parcela total diminui ao longo do tempo. A primeira parcela é mais alta, mas o total pago ao banco é menor comparado ao Price. É o sistema padrão dos financiamentos MCMV e indicado para quem pode pagar mais no início.',
  },
  {
    term: 'Price (Tabela Price)',
    category: 'amortizacao',
    short: 'Parcelas fixas — mais acessível no início, mais caro no total.',
    full: 'No sistema Price (também chamado Tabela Price ou Sistema Francês), as parcelas são iguais ao longo do contrato. No início, a maior parte da parcela são juros; com o tempo, a proporção de amortização aumenta. Por pagar juros sobre um saldo que demora mais a cair, o custo total é maior que no SAC. É preferido por quem precisa de parcela previsível e menor no início.',
  },
  {
    term: 'Amortização',
    category: 'amortizacao',
    short: 'Parcela que efetivamente reduz o saldo devedor (≠ juros).',
    full: 'A parcela mensal do financiamento é composta de duas partes: juros (calculados sobre o saldo devedor restante) e amortização (valor que de fato abate a dívida). Nos primeiros meses, os juros dominam a parcela. Entender essa composição ajuda a decidir entre usar FGTS para amortizar prazo ou reduzir parcelas — em geral, amortizar o saldo (reduzindo prazo) economiza mais.',
  },
  {
    term: 'Saldo Devedor',
    category: 'amortizacao',
    short: 'Valor total ainda devido ao banco, corrigido por TR + juros.',
    full: 'É o montante que você ainda deve ao banco após descontar todas as amortizações pagas até aquele momento. O saldo devedor é corrigido mensalmente pela TR (nos contratos SFH), o que significa que mesmo pagando em dia, ele pode crescer se a TR for elevada. Simular a evolução do saldo devedor ao longo do prazo é essencial para entender o real custo do financiamento.',
  },

  /* ── Seguros e Custos ─────────────────────────────────────────── */
  {
    term: 'MIP',
    category: 'seguros',
    short: 'Seguro de Morte e Invalidez Permanente — obrigatório no financiamento.',
    full: 'Seguro obrigatório contratado junto ao financiamento. Em caso de morte ou invalidez permanente do mutuário, o MIP quita o saldo devedor remanescente, protegendo a família. O prêmio mensal varia conforme a idade do comprador (quanto mais velho, maior o seguro) e o saldo devedor. É calculado sobre o saldo devedor e reduz ao longo do contrato.',
  },
  {
    term: 'DFI',
    category: 'seguros',
    short: 'Seguro de Danos Físicos ao Imóvel — protege o bem dado em garantia.',
    full: 'Seguro obrigatório que cobre danos físicos estruturais ao imóvel (incêndio, inundação, desabamento). É contratado junto ao banco financiador e protege tanto o comprador quanto o banco (que tem o imóvel como garantia via alienação fiduciária). O prêmio é geralmente fixo e calculado sobre o valor de avaliação do imóvel.',
  },
  {
    term: 'ITBI',
    category: 'seguros',
    short: 'Imposto de Transmissão de Bens Imóveis — cobrado na compra do imóvel.',
    full: 'Imposto municipal cobrado na transferência de propriedade do imóvel. A alíquota varia por município, geralmente entre 2% e 3% do valor venal ou de transação (o que for maior). Em compras com financiamento, o ITBI incide apenas sobre o valor não financiado (valor de entrada) em alguns municípios, mas a regra varia. O pagamento do ITBI é requisito para registrar a escritura em cartório.',
  },
  {
    term: 'TAC',
    category: 'seguros',
    short: 'Taxa de Abertura de Crédito — tarifa cobrada pela análise do financiamento.',
    full: 'Tarifa cobrada pelo banco para cobrir os custos administrativos de análise e liberação do crédito imobiliário. Pode ser paga à vista ou incorporada ao financiamento. Alguns bancos isentam a TAC como estratégia comercial. Faz parte do CET e deve ser considerada na comparação entre propostas.',
  },
  {
    term: 'Registro de Imóvel',
    category: 'seguros',
    short: 'Custo cartorial para transferir a propriedade para o seu nome.',
    full: 'Após a assinatura do contrato de financiamento (escritura pública ou instrumento particular com força de escritura), o comprador deve registrar o imóvel no Cartório de Registro de Imóveis (CRI). O custo varia por estado (em SP, aproximadamente 1% do valor do imóvel). Somente após o registro o comprador é legalmente considerado o proprietário.',
  },

  /* ── Documentos e Registros ───────────────────────────────────── */
  {
    term: 'Habite-se',
    category: 'documentos',
    short: 'Certidão da prefeitura que autoriza o uso do imóvel construído.',
    full: 'Documento expedido pela prefeitura municipal após vistoria que atesta que a construção foi concluída de acordo com o projeto aprovado e está em condições de ser habitada. Sem o habite-se, o imóvel não pode ser registrado nem financiado. É o marco que encerra a fase de obra no crédito associativo e inicia as parcelas definitivas de amortização.',
  },
  {
    term: 'RI (Cartório de Registro de Imóveis)',
    category: 'documentos',
    short: 'Cartório responsável pela matrícula e histórico do imóvel.',
    full: 'O Registro de Imóveis é o cartório que mantém a matrícula de cada imóvel — documento que reúne todo o histórico de proprietários, ônus, penhoras, hipotecas e alienações. Antes de comprar, é essencial solicitar a certidão de matrícula atualizada (últimas 24 horas) para verificar a titularidade e a existência de gravames. É no RI que a alienação fiduciária (garantia do banco) é registrada.',
  },
  {
    term: 'RI de Incorporação',
    category: 'documentos',
    short: 'Registro que legaliza o empreendimento antes da venda das unidades.',
    full: 'Antes de vender qualquer unidade na planta, a construtora/incorporadora deve registrar a incorporação no Cartório de Registro de Imóveis. Esse registro inclui: memorial descritivo, planta aprovada, fração ideal do terreno por unidade e quadro de áreas. Comprar de uma incorporação com RI garante que o empreendimento está legalmente constituído e que as unidades podem ser individualizadas futuramente.',
  },
  {
    term: 'SICAQ',
    category: 'documentos',
    short: 'Sistema de Informações do Crédito Associativo — cadastro da Caixa Econômica Federal.',
    full: 'Sistema da Caixa Econômica Federal que centraliza as informações do contrato de crédito associativo: cronograma de obra, repasses, vistorias e situação financeira do comprador. O acompanhamento via SICAQ permite verificar se os repasses à construtora estão dentro do cronograma e se há inconsistências que possam travar o financiamento.',
  },
  {
    term: 'Alienação Fiduciária',
    category: 'documentos',
    short: 'Garantia do banco: o imóvel fica no nome do banco até a quitação.',
    full: 'Modalidade de garantia usada nos financiamentos imobiliários modernos. O comprador usa o imóvel mas a propriedade formal fica com o banco (credor fiduciário) até a quitação total da dívida. Em caso de inadimplência, o banco pode executar a garantia de forma extrajudicial (sem precisar ir à Justiça), o que torna o processo mais rápido. Após a quitação, o banco emite o termo de quitação e o comprador registra a plena propriedade no RI.',
  },

  /* ── FGTS ─────────────────────────────────────────────────────── */
  {
    term: 'FGTS',
    category: 'fgts',
    short: 'Fundo de Garantia do Tempo de Serviço — pode ser usado como entrada ou amortização.',
    full: 'Fundo constituído por depósitos mensais do empregador (8% do salário bruto). O saldo pode ser usado na compra de imóvel residencial (SFH) para: (1) composição da entrada, (2) amortização do saldo devedor, ou (3) pagamento de até 80% das prestações mensais por até 12 meses seguidos. Regras: imóvel dentro do SFH (até R$ 2,25 milhões — teto atualizado em out/2025), comprador sem outro imóvel financiado no SFH, mínimo 3 anos de vínculo empregatício com FGTS.',
  },
  {
    term: 'FGTS Futuro',
    category: 'fgts',
    short: 'Modalidade que antecipa depósitos futuros de FGTS para reduzir a parcela.',
    full: 'Lançado em 2023, o FGTS Futuro permite que o mutuário use os depósitos mensais futuros de FGTS (ainda não existentes) para complementar a renda e aumentar a capacidade de financiamento. Os depósitos futuros são dados em garantia ao banco, que os utiliza para abater a parcela mensal. É especialmente vantajoso para trabalhadores CLT com renda mais baixa que se enquadram no MCMV Faixa 1 e 2.',
  },
  {
    term: 'Subsídio MCMV',
    category: 'fgts',
    short: 'Desconto no preço do imóvel pago pelo governo — não é devolvido.',
    full: 'O subsídio é um benefício não reembolsável concedido pelo governo federal aos compradores do MCMV. Funciona como um desconto no valor do imóvel: o comprador financia apenas o restante. O valor máximo varia por faixa de renda, município e valor do imóvel. Na Faixa 1, o subsídio pode chegar a R$ 55.000; na Faixa 2, até R$ 29.000. O subsídio é concedido uma única vez por família.',
  },

  /* ── Imóvel na Planta ─────────────────────────────────────────── */
  {
    term: 'Evolução de Obra',
    category: 'planta',
    short: 'Juros pagos durante a construção — incidem sobre o saldo liberado.',
    full: 'Durante a fase de construção, a Caixa Econômica Federal libera o financiamento parceladamente para a construtora conforme o andamento da obra (medições periódicas). O comprador paga mensalmente apenas os juros sobre o saldo já liberado — não há amortização nessa fase. Esse valor cresce à medida que mais recursos são repassados. Após o habite-se, o comprador passa a pagar a parcela completa (amortização + juros) sobre o saldo total contratado.',
  },
  {
    term: 'SIOPI',
    category: 'planta',
    short: 'Curva padrão de avanço físico de obras residenciais usada pela Caixa Econômica Federal.',
    full: 'O SIOPI (Sistema de Orçamento e Planejamento de Obras da CEF) define a curva típica de evolução física de empreendimentos habitacionais. A CEF usa essa curva para calcular o ritmo de liberação de recursos ao longo da obra. A curva é "S-shaped": começo e fim mais lentos, aceleração no meio. Em simulações, permite estimar os juros de evolução mensais antes mesmo do início da obra.',
  },
  {
    term: 'Cronograma Físico-Financeiro',
    category: 'planta',
    short: 'Documento que detalha o avanço da obra e os repasses financeiros.',
    full: 'Documento obrigatório do crédito associativo que discrimina, mês a mês, o percentual de obra previsto e o valor de repasse correspondente. A Caixa Econômica Federal realiza vistorias periódicas para validar se o avanço físico real coincide com o previsto. Atrasos na obra podem travar repasses, e o comprador deve acompanhar isso via SICAQ.',
  },
  {
    term: 'Interveniente Quitante',
    category: 'planta',
    short: 'Banco que paga a dívida do comprador com a construtora para assumir o financiamento.',
    full: 'Quando o comprador comprou diretamente da construtora (sem crédito associativo) e depois quer financiar pelo banco, o banco atua como interveniente quitante: paga o saldo devido à construtora e assume a posição de credor. Permite regularizar contratos de gaveta ou financiamentos próprios da incorporadora.',
  },
  {
    term: 'Distrato',
    category: 'planta',
    short: 'Cancelamento do contrato de compra na planta — regras pela Lei 13.786/2018.',
    full: 'O distrato é o cancelamento do contrato de compra de imóvel na planta. A Lei do Distrato (13.786/2018) regulamenta o processo: se o comprador desistir, a incorporadora pode reter entre 25% e 50% dos valores pagos (dependendo do regime patrimonial do empreendimento) e devolver o restante em até 180 dias após o distrato. Se a construtora atrasar a entrega, o comprador pode pedir o distrato e receber de volta tudo que pagou com correção.',
  },
];

export default function GlossarioPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('todos');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return TERMS.filter((t) => {
      const matchCat = category === 'todos' || t.category === category;
      const matchSearch =
        !q ||
        t.term.toLowerCase().includes(q) ||
        t.short.toLowerCase().includes(q) ||
        t.full.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, category]);

  // Group alphabetically
  const grouped = useMemo(() => {
    const map: Record<string, Term[]> = {};
    filtered.forEach((t) => {
      const letter = t.term[0].toUpperCase();
      if (!map[letter]) map[letter] = [];
      map[letter].push(t);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const catColors: Record<string, string> = {
    modalidades: '#2563eb',
    indices: '#7c3aed',
    amortizacao: '#059669',
    seguros: '#d97706',
    documentos: '#dc2626',
    fgts: '#0891b2',
    planta: '#ea580c',
  };

  const catLabels: Record<string, string> = {
    modalidades: 'Modalidades',
    indices: 'Índices e Taxas',
    amortizacao: 'Amortização',
    seguros: 'Seguros e Custos',
    documentos: 'Documentos',
    fgts: 'FGTS',
    planta: 'Planta',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #1e3a5f 50%, #0f172a 100%)',
        padding: '80px 24px 64px',
        textAlign: 'center',
      }}>
        <div className="container" style={{ maxWidth: '680px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(99,102,241,.2)',
            border: '1px solid rgba(99,102,241,.4)',
            borderRadius: '99px', padding: '5px 14px',
            marginBottom: '24px',
          }}>
            <span style={{ fontSize: '14px' }}>🔤</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#a5b4fc', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Glossário
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: '800', color: '#fff', lineHeight: 1.2, marginBottom: '16px' }}>
            Termos do{' '}
            <span style={{ background: 'linear-gradient(135deg, #818cf8, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Financiamento Imobiliário
            </span>
          </h1>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,.65)', lineHeight: 1.7, marginBottom: '36px' }}>
            {TERMS.length} termos explicados de forma clara e objetiva — do MCMV ao ITBI, de SAC a SIOPI.
          </p>

          {/* Search */}
          <div style={{ position: 'relative', maxWidth: '480px', margin: '0 auto' }}>
            <span style={{
              position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
              fontSize: '16px', pointerEvents: 'none',
            }}>🔍</span>
            <input
              type="text"
              placeholder="Buscar termo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px 14px 46px',
                border: '1.5px solid rgba(255,255,255,.15)',
                borderRadius: '12px',
                background: 'rgba(255,255,255,.1)',
                color: '#fff',
                fontSize: '15px',
                outline: 'none',
                backdropFilter: 'blur(8px)',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </section>

      {/* ── Category Filter ─────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        <div className="container" style={{ display: 'flex', gap: '4px', padding: '12px 24px', minWidth: 'max-content' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              style={{
                padding: '7px 16px',
                borderRadius: '99px',
                border: category === cat.key ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                background: category === cat.key ? 'var(--primary-light)' : 'transparent',
                color: category === cat.key ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: '13px',
                fontWeight: category === cat.key ? '700' : '500',
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="container" style={{ maxWidth: '800px', padding: '48px 24px' }}>

        {/* Results count */}
        <p style={{ fontSize: '13px', color: 'var(--text-faint)', marginBottom: '32px' }}>
          {filtered.length === TERMS.length
            ? `${TERMS.length} termos no total`
            : `${filtered.length} ${filtered.length === 1 ? 'termo encontrado' : 'termos encontrados'}`}
        </p>

        {grouped.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '64px 24px',
            background: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
              Nenhum termo encontrado
            </p>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Tente buscar com outras palavras ou mude a categoria.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {grouped.map(([letter, terms]) => (
              <div key={letter}>
                {/* Letter divider */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px',
                }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: '800', fontSize: '16px', flexShrink: 0,
                  }}>
                    {letter}
                  </div>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                </div>

                {/* Terms */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {terms.map((t) => {
                    const isOpen = expanded === t.term;
                    const color = catColors[t.category] || 'var(--primary)';
                    return (
                      <div
                        key={t.term}
                        style={{
                          background: 'var(--bg-card)',
                          border: `1px solid ${isOpen ? color + '40' : 'var(--border)'}`,
                          borderRadius: '14px',
                          overflow: 'hidden',
                          transition: 'border-color 0.2s, box-shadow 0.2s',
                          boxShadow: isOpen ? `0 4px 20px ${color}15` : 'none',
                        }}
                      >
                        {/* Term header */}
                        <button
                          onClick={() => setExpanded(isOpen ? null : t.term)}
                          style={{
                            width: '100%', textAlign: 'left',
                            padding: '16px 20px',
                            background: 'none', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'flex-start', gap: '14px',
                          }}
                        >
                          {/* Category dot */}
                          <div style={{
                            width: '10px', height: '10px',
                            borderRadius: '50%',
                            background: color,
                            flexShrink: 0,
                            marginTop: '5px',
                          }} />

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                              <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)' }}>
                                {t.term}
                              </span>
                              <span style={{
                                fontSize: '11px', fontWeight: '600',
                                color: color,
                                background: color + '15',
                                padding: '2px 8px',
                                borderRadius: '99px',
                              }}>
                                {catLabels[t.category]}
                              </span>
                            </div>
                            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                              {t.short}
                            </p>
                          </div>

                          {/* Chevron */}
                          <span style={{
                            fontSize: '18px', color: 'var(--text-faint)', flexShrink: 0,
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                            transition: 'transform 0.2s',
                            marginTop: '2px',
                          }}>
                            ⌄
                          </span>
                        </button>

                        {/* Expanded content */}
                        {isOpen && (
                          <div style={{
                            padding: '0 20px 20px 44px',
                            borderTop: `1px solid ${color}20`,
                          }}>
                            <p style={{
                              fontSize: '14px', color: 'var(--text)', lineHeight: '1.75',
                              margin: '16px 0 0',
                            }}>
                              {t.full}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── CTA ─────────────────────────────────────────────────── */}
        <div style={{
          marginTop: '64px',
          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
          borderRadius: '20px',
          padding: '40px 36px',
          textAlign: 'center',
          color: '#fff',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>🧮</div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '10px' }}>
            Agora que você sabe o que significa...
          </h2>
          <p style={{ fontSize: '15px', opacity: 0.85, lineHeight: 1.6, marginBottom: '24px', maxWidth: '440px', margin: '0 auto 24px' }}>
            Coloque o conhecimento em prática. Simule seu financiamento e descubra qual modalidade é a certa para você.
          </p>
          <a
            href="/simulador"
            style={{
              display: 'inline-block',
              background: '#fff',
              color: 'var(--primary)',
              fontWeight: '700',
              fontSize: '14px',
              padding: '12px 28px',
              borderRadius: '10px',
              textDecoration: 'none',
              transition: 'opacity 0.15s',
            }}
          >
            Descobrir meu perfil →
          </a>
        </div>
      </div>
    </div>
  );
}
