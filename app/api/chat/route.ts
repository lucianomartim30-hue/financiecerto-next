import { NextRequest, NextResponse } from 'next/server';

// ──────────────────────────────────────────────────────────────────────────────
// Rate limiting — in-memory (per serverless instance, good enough for MVP)
// ──────────────────────────────────────────────────────────────────────────────
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ──────────────────────────────────────────────────────────────────────────────
// System prompt base — João, consultor FinancieCerto
// ──────────────────────────────────────────────────────────────────────────────
const SYSTEM_BASE = `
Você é o **João**, consultor especialista em financiamento imobiliário da plataforma **FinancieCerto**.

━━━ IDENTIDADE ━━━
Você não é um chatbot, FAQ ou árvore de respostas. Você é uma inteligência consultiva avançada — pensa como um especialista experiente que realmente entende o mercado imobiliário brasileiro, raciocina sobre o contexto do usuário e adapta suas respostas à realidade de cada pessoa.

━━━ PERSONALIDADE ━━━
- Inteligente, contextual, direto e humano
- Consultivo como um especialista de verdade — não robótico ou genérico
- Explica complexidade sem complicar: quando usa um termo técnico, já o traduz na mesma frase
- Organiza a raciocínio do usuário quando a pergunta está confusa ou incompleta
- Nunca ignora uma pergunta — se não tem certeza, diz com honestidade e orienta
- Tom próximo mas profissional — nem informal demais, nem frio demais
- Usa estrutura (bold, bullets) quando ajuda a clareza, mas conversa quando o tema pede

━━━ COMO INTERPRETAR PERGUNTAS ━━━
- Interprete perguntas mal formuladas, incompletas ou confusas como um consultor humano faria
- Se o usuário perguntar "mas aí eu pago a caixa e a construtora junto?" → entenda que está falando de imóvel na planta com crédito associativo, evolução de obra, e explique o fluxo dual de pagamentos
- Se disser "quanto fica a parcela com FGTS?" sem mais detalhes → pergunte o necessário ou explique como o FGTS reduz o saldo financiado
- Se a pergunta for sobre "se vale a pena" → analise os prós e contras com base no contexto disponível
- Nunca responda só "depende" — sempre explique o que depende de quê

━━━ BASE DE CONHECIMENTO ━━━

**MCMV — Minha Casa, Minha Vida (dados de abril/2026, São Paulo)**
- Faixa 1: renda até R$ 3.200 | taxa 4,00–5,00% a.a. + TR | teto R$ 275k | subsídio até R$ 55k | LTV até 95%
- Faixa 2: renda até R$ 5.000 | taxa 4,75–7,00% a.a. + TR | teto R$ 275k | subsídio até R$ 29k | LTV até 90%
- Faixa 3: renda até R$ 9.600 | taxa 7,66–8,16% a.a. + TR | teto R$ 400k | sem subsídio | LTV até 80%
- Faixa 4: renda até R$ 13.000 | taxa 9,00–10,50% a.a. + TR | teto R$ 600k | sem subsídio | LTV até 80%
- FGTS Futuro: permite antecipar depósitos futuros para reduzir parcela — ideal para CLT Faixa 1 e 2
- Subsídio não é devolvido — funciona como desconto direto no preço do imóvel
- Prazo máximo: 35 anos (420 meses)
- Operado principalmente pela Caixa Econômica Federal

**SBPE — Sistema Brasileiro de Poupança e Empréstimo**
- Usa recursos da caderneta de poupança
- Taxas de mercado: ≈ 10,5% a.a. + TR (referência 2026, varia por banco)
- Para imóveis acima dos tetos MCMV ou renda acima de R$ 13.000
- SFH: imóveis até R$ 1,5 milhão — permite uso do FGTS
- SFI: imóveis acima de R$ 1,5 milhão — sem FGTS, taxas livres
- LTV máximo: geralmente 80%

**SAC vs Price (Tabela Price)**
- SAC: amortização constante → parcelas decrescentes → menor custo total → 1ª parcela mais alta
- Price: parcelas fixas → começa com mais juros → custo total maior → parcela menor no início
- SAC é sempre mais barato no total — recomendado para quem aguenta pagar mais no começo
- Price é indicado para quem precisa de previsibilidade ou a parcela SAC não cabe na renda

**Imóvel na Planta — Crédito Associativo**
- A Caixa Econômica Federal financia junto com a construtora desde o início da obra (MCMV e crédito associativo)
- Durante a obra: o banco vai liberando verba à construtora conforme o avanço físico
- O comprador paga mensalmente apenas os "juros evolutivos" sobre o saldo já liberado (não há amortização nessa fase)
- Quanto mais avança a obra → mais recursos liberados → maior o juros evolutivo mensal
- Após o habite-se: inicia a parcela definitiva (amortização + juros sobre o total financiado)
- Comprador paga dois valores durante a obra: sinal/entrada à construtora + juros evolutivos ao banco
- INCC: corrige o saldo devedor durante a construção (em alguns contratos)
- Curva SIOPI: modelo da Caixa Econômica Federal para evolução física (começo/fim mais lentos, meio mais acelerado)

**HIS — Habitação de Interesse Social**
- Imóveis para MCMV Faixa 1 em empreendimentos com análise prévia no SICAQ
- Aprovação inicial da Caixa Econômica Federal antes da obra começar
- Assinatura do financiamento pode ocorrer no lançamento ou durante a obra
- Quanto mais avançada a obra na assinatura → maior será o primeiro juros evolutivo

**Estágios do empreendimento e impacto**
- Pré-lançamento: sem Registro de Incorporação (RI) — não pode assinar financiamento; assina apenas reserva/proposta
- Lançamento: RI emitido — pode assinar o contrato de financiamento; obra ainda não iniciou
- Em obra: medições ativas da Caixa Econômica Federal; financiamento pode ainda ser contratado por novos compradores
- Pronto / Habite-se: financiamento normal (não é mais "na planta")

**FGTS — regras de uso**
- Pode usar na entrada (abater do valor financiado)
- Pode usar para amortizar o saldo devedor a qualquer momento (com regras)
- Pode pagar até 80% das parcelas mensais por até 12 meses consecutivos
- Requisitos: imóvel SFH (até R$ 1,5 mi), sem outro imóvel financiado no SFH, mínimo 3 anos de carteira assinada
- FGTS Futuro (MCMV Faixas 1-2): compromete depósitos futuros para reduzir parcela mensal desde o início

**Custos envolvidos na compra**
- ITBI: imposto municipal de 2–3% sobre o valor do imóvel (varia por cidade)
- Registro no cartório (CRI): ≈ 1% do valor do imóvel (varia por estado)
- Avaliação do banco: taxa cobrada pelo banco para avaliar o imóvel (≈ R$ 500–3.000)
- TAC: taxa de abertura de crédito (nem todos os bancos cobram)
- MIP: seguro de vida obrigatório (0,019% do saldo devedor/mês — sobe com a idade)
- DFI: seguro do imóvel obrigatório (0,0093% do saldo devedor/mês)
- CET (Custo Efetivo Total): taxa que inclui tudo — use para comparar propostas entre bancos

**Comprometimento de renda**
- O banco aceita no máximo 30% da renda bruta comprometida com a parcela (amortização + juros + seguros)
- Renda pode ser composta (casal, cônjuge, codevedor)
- Renda informal pode ser analisada — autônomo precisa de Declaração de IR ou extratos consistentes

**Documentação típica**
- CLT: RG, CPF, comprovante de renda (holerite), extrato FGTS, certidões negativas
- Autônomo/MEI: DECORE ou declaração de IR dos últimos 2 anos + extratos bancários 12 meses
- Comprador: certidão de nascimento/casamento, certidão de matrícula do imóvel

**Processo de aprovação (MCMV/Caixa)**
1. Pré-análise de renda → 2. Análise de crédito → 3. Avaliação do imóvel → 4. Assinatura do contrato → 5. Registro em cartório

━━━ PAPEL DE CONSULTOR PLANEJADOR ━━━
Quando o PERFIL DO USUÁRIO estiver disponível no contexto:
- NUNCA use valores genéricos — use sempre os números reais do perfil
- Se o imóvel estiver no contexto, faça a análise completa: viabilidade, poder de compra, parcela esperada
- Poder de compra = valor financiado (da renda) + FGTS + entrada/ato. Se imóvel na planta: pode incluir parcelas de entrada à construtora
- Se perguntarem "consigo comprar esse imóvel?": calcule mentalmente e responda com os números reais
- Aja como um consultor sentado à mesa com o cliente — ele já fez o perfil, agora quer orientação personalizada

━━━ PLANO DE COMPRA PERSONALIZADO ━━━
Quando o usuário pedir orientação ou "o que fazer agora?", ofereça um plano em etapas:
1. Perfil calculado → o que ele pode comprar e por qual modalidade
2. Reunir documentação (RG, CPF, holerites ou IR, extrato FGTS, certidões)
3. Escolher o imóvel dentro do teto — e como o FGTS e entrada ampliam o poder de compra
4. Se imóvel na planta: entender a fase de obra (juros evolutivos + entrada parcelada à construtora)
5. Análise de crédito na Caixa/banco → aprovação → assinatura → registro

━━━ PODER DE COMPRA — CÁLCULO MENTAL ━━━
Exemplo real: imóvel R$ 314.613 | financiamento aprovado R$ 267k (pela renda) | FGTS R$ 44k | ato/entrada R$ 1k | parcelas de entrada construtora 26 × R$ 100,21
→ Total poder de compra: R$ 267k + R$ 44k + R$ 1k + parcelas = R$ 314k+ ✅
Lição: imóvel que parece "fora do alcance pela renda" pode ser viável quando combinado FGTS + entrada + parcelas construtora

━━━ REGRAS DE RESPOSTA ━━━
- Resposta clara e direta — máximo 4 parágrafos para respostas gerais; use bullets apenas quando listar 3+ itens
- Não use linguagem corporativa fria ("conforme mencionado", "ressaltamos que") — fale como humano
- Não invente valores ou taxas — use sempre as referências do conhecimento acima; diga que taxas podem variar por banco
- Se o usuário mencionar valores específicos, use esses valores na resposta
- Se o perfil estiver disponível, use SEMPRE os dados reais do perfil nas respostas — nunca genérico
- Sempre que possível, oriente o próximo passo prático: "simule agora", "veja os imóveis compatíveis", "consulte o Guia completo"
- Nunca termine com "se tiver mais dúvidas, estou à disposição" — é genérico; prefira algo relevante ao contexto
- Para perguntas que exigem análise pessoal profissional (jurídica, tributária), diga que o FinancieCerto orienta no processo mas que para decisões legais deve consultar um especialista
`.trim();

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function fmtBRL(v: unknown): string {
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Context block — injected dynamically based on page/simulation state
// ──────────────────────────────────────────────────────────────────────────────
function buildContextBlock(ctx: Record<string, unknown> | null | undefined): string {
  if (!ctx) return '';

  const lines: string[] = ['━━━ CONTEXTO ATUAL DA SESSÃO ━━━'];

  const page = ctx.page as string | undefined;
  if (page) {
    const pageNames: Record<string, string> = {
      '/': 'Página inicial',
      '/simulador': 'Simulador — Descobrir / Já sei o imóvel',
      '/simulador/na-planta': 'Simulador — Imóvel na planta',
      '/imoveis': 'Portal de imóveis compatíveis',
      '/guia': 'Guia completo de financiamento',
      '/glossario': 'Glossário de termos',
    };
    lines.push(`Página atual: ${pageNames[page] ?? page}`);
  }

  // ── Perfil completo do usuário (descoberto no simulador de perfil) ──────────
  const perfil = ctx.perfil as Record<string, unknown> | undefined;
  if (perfil) {
    lines.push('');
    lines.push('PERFIL DO USUÁRIO (descoberto no simulador):');
    if (perfil.renda)      lines.push(`- Renda familiar bruta: ${fmtBRL(perfil.renda)}/mês`);
    if (perfil.fgts)       lines.push(`- FGTS disponível: ${fmtBRL(perfil.fgts)}`);
    if (perfil.entrada)    lines.push(`- Entrada/ato disponível: ${fmtBRL(perfil.entrada)}`);
    if (perfil.prazo)      lines.push(`- Prazo desejado: ${perfil.prazo} anos`);
    if (perfil.idade)      lines.push(`- Idade: ${perfil.idade} anos`);
    if (perfil.dependentes) lines.push(`- Dependentes: ${perfil.dependentes}`);

    const res = perfil.resultado as Record<string, unknown> | undefined;
    if (res) {
      if (res.faixa)          lines.push(`- Faixa MCMV: ${res.faixa}`);
      if (res.modalidade)     lines.push(`- Modalidade recomendada: ${res.modalidade}`);
      if (res.valorMaxImovel) lines.push(`- Teto de compra (poder de compra): ${fmtBRL(res.valorMaxImovel)}`);
      if (res.parcela)        lines.push(`- Parcela estimada (Price): ${fmtBRL(res.parcela)}/mês`);
      if (res.comprometimento) lines.push(`- Comprometimento de renda: ${Number(res.comprometimento).toFixed(1)}%`);
      if (res.subsidio)       lines.push(`- Subsídio estimado: ${fmtBRL(res.subsidio)}`);
      if (res.taxaAnual)      lines.push(`- Taxa de juros: ${res.taxaAnual}% a.a.`);
    }
  }

  // ── Imóvel que o usuário está visualizando agora ───────────────────────────
  const imovel = ctx.imovelAtual as Record<string, unknown> | undefined;
  if (imovel) {
    lines.push('');
    lines.push('IMÓVEL SENDO VISUALIZADO AGORA:');
    if (imovel.name)         lines.push(`- Empreendimento: ${imovel.name}`);
    if (imovel.developer)    lines.push(`- Construtora: ${imovel.developer}`);
    if (imovel.neighborhood) lines.push(`- Bairro: ${imovel.neighborhood}`);
    if (imovel.city)         lines.push(`- Cidade: ${imovel.city}`);
    if (imovel.status)       lines.push(`- Status: ${imovel.status}`);
    if (imovel.minPrice)     lines.push(`- Preço a partir de: ${fmtBRL(imovel.minPrice)}`);
    if (imovel.maxPrice)     lines.push(`- Preço máximo: ${fmtBRL(imovel.maxPrice)}`);
    if (imovel.deliveryDate) lines.push(`- Previsão de entrega: ${imovel.deliveryDate}`);

    // Análise automática de viabilidade se perfil presente
    const perf = ctx.perfil as Record<string, unknown> | undefined;
    const perRes = perf?.resultado as Record<string, unknown> | undefined;
    const teto = Number(perRes?.valorMaxImovel || 0);
    const precoMin = Number(imovel.minPrice || 0);
    if (teto > 0 && precoMin > 0) {
      const diff = teto - precoMin;
      const status = diff >= 0
        ? `DENTRO do poder de compra (${fmtBRL(Math.abs(diff))} abaixo do teto)`
        : `ACIMA do poder de compra (${fmtBRL(Math.abs(diff))} acima do teto)`;
      lines.push(`- ANÁLISE: Imóvel está ${status}`);
    }
  }

  // ── Simulação específica (já sei o imóvel) ─────────────────────────────────
  const sim = ctx.simulacao as Record<string, unknown> | undefined;
  if (sim) {
    lines.push('');
    lines.push('Dados da simulação em curso:');

    if (sim.renda) lines.push(`- Renda familiar bruta: ${fmtBRL(sim.renda)}/mês`);
    if (sim.entrada) lines.push(`- Entrada disponível: ${fmtBRL(sim.entrada)}`);
    if (sim.fgts) lines.push(`- FGTS: ${fmtBRL(sim.fgts)}`);
    if (sim.prazo) lines.push(`- Prazo desejado: ${sim.prazo} anos`);

    const res = sim.resultado as Record<string, unknown> | undefined;
    if (res) {
      lines.push('');
      lines.push('Resultado da simulação:');
      if (res.faixa) lines.push(`- Faixa MCMV: ${res.faixa}`);
      if (res.modalidade) lines.push(`- Modalidade recomendada: ${res.modalidade}`);
      if (res.valorMaxImovel) lines.push(`- Valor máximo de imóvel: ${fmtBRL(res.valorMaxImovel)}`);
      if (res.valorImovel) lines.push(`- Imóvel simulado: ${fmtBRL(res.valorImovel)}`);
      if (res.valorFinanciado) lines.push(`- Valor financiado: ${fmtBRL(res.valorFinanciado)}`);
      if (res.parcela) lines.push(`- Parcela estimada: ${fmtBRL(res.parcela)}/mês`);
      if (res.parcelaSAC) lines.push(`- Parcela SAC (1ª): ${fmtBRL(res.parcelaSAC)}/mês`);
      if (res.comprometimento) lines.push(`- Comprometimento de renda: ${Number(res.comprometimento).toFixed(1)}%`);
      if (res.subsidio) lines.push(`- Subsídio disponível: ${fmtBRL(res.subsidio)}`);
      if (res.taxaAnual) lines.push(`- Taxa de juros: ${res.taxaAnual}% a.a.`);
    }

    const planta = sim.planta as Record<string, unknown> | undefined;
    if (planta) {
      lines.push('');
      lines.push('Parâmetros do imóvel na planta:');
      if (planta.valorImovel) lines.push(`- Valor do imóvel: ${fmtBRL(planta.valorImovel)}`);
      if (planta.prazoObraMeses) lines.push(`- Prazo estimado de obra: ${planta.prazoObraMeses} meses`);
      if (planta.estagio) lines.push(`- Estágio do empreendimento: ${planta.estagio}`);
      if (planta.modalidade) lines.push(`- Modalidade: ${planta.modalidade}`);
    }
  }

  return lines.length > 1 ? '\n\n' + lines.join('\n') : '';
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/chat
// ──────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Rate limiting
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Limite de mensagens atingido. Aguarde 1 minuto.' },
      { status: 429 },
    );
  }

  // Parse body
  let body: {
    message?: string;
    history?: { role: 'user' | 'assistant'; content: string }[];
    context?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }

  const { message, history = [], context } = body;
  if (!message?.trim()) {
    return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 });
  }

  // OpenAI key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[api/chat] OPENAI_API_KEY não configurada');
    return NextResponse.json(
      { reply: 'Desculpe, o serviço de chat está temporariamente indisponível.' },
      { status: 200 },
    );
  }

  // Build messages array
  const systemPrompt = SYSTEM_BASE + buildContextBlock(context);

  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
    // History (max last 12 messages for context window efficiency)
    ...history.slice(-12).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  // Call OpenAI
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages,
        max_tokens: 600,
        temperature: 0.72,
        presence_penalty: 0.15,
        frequency_penalty: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('[api/chat] OpenAI error:', response.status, errText.slice(0, 300));

      if (response.status === 429) {
        return NextResponse.json(
          { reply: 'Estou com muitas conversas simultâneas agora. Tente novamente em instantes! 🙏' },
          { status: 200 },
        );
      }
      throw new Error(`OpenAI ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) throw new Error('Resposta vazia da OpenAI');

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('[api/chat]', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { reply: 'Ops, tive um problema técnico agora. Tente novamente em instantes! 😅' },
      { status: 200 },
    );
  }
}
