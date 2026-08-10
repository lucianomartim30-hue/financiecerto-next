// lib/gtag.ts — utilitário de eventos GA4
// Measurement ID: G-5FCF1KE9XP

export const GA_ID = 'G-5FCF1KE9XP';

type GtagEvent = {
  action: string;
  category?: string;
  label?: string;
  value?: number;
  [key: string]: unknown;
};

export function gtagEvent({ action, category, label, value, ...rest }: GtagEvent) {
  if (typeof window === 'undefined') return;
  if (typeof (window as unknown as Record<string,unknown>).gtag !== 'function') return;
  const gtag = (window as unknown as Record<string, (...args: unknown[]) => void>).gtag;
  gtag('event', action, {
    event_category: category,
    event_label:    label,
    value,
    ...rest,
  });
}

// ── Eventos padronizados ────────────────────────────────────────────────────

/**
 * Clique em "Falar com consultor" pelo WhatsApp — mede INTENÇÃO, dispara sempre
 * no clique. Não é o mesmo que um lead confirmado: o usuário pode clicar e não
 * enviar a mensagem, ou o registro no backend pode falhar. Para o lead
 * confirmado, ver `trackLeadCriado` — só dispara depois que /api/leads responde
 * com sucesso, evitando inflar "leads" no Analytics com simples cliques.
 */
export function trackWhatsappClick(params?: {
  imovelId?: string; imovel?: string; bairro?: string; status?: string;
  posicao?: 'topo' | 'sidebar' | 'outras'; pagina?: string;
}) {
  gtagEvent({
    action:   'whatsapp_click',
    category: 'engagement',
    label:    params?.imovel ?? 'corretor',
    imovelId: params?.imovelId,
    imovel:   params?.imovel,
    bairro:   params?.bairro,
    status:   params?.status,
    posicao:  params?.posicao,
    pagina:   params?.pagina,
  });
}

/**
 * Lead efetivamente criado no backend (POST /api/leads respondeu com sucesso).
 * Só dispara depois da confirmação — é o evento de conversão real para o GA4,
 * distinto do clique (`trackWhatsappClick`), que só mede intenção.
 */
export function trackLeadCriado(params?: { imovelId?: string; imovel?: string; origem?: string }) {
  gtagEvent({
    action:   'lead_created',
    category: 'engagement',
    label:    params?.imovel ?? 'corretor',
    imovelId: params?.imovelId,
    imovel:   params?.imovel,
    origem:   params?.origem,
  });
}

/** Simulação de perfil concluída */
export function trackSimulacao(params?: { modalidade?: string; faixa?: string }) {
  gtagEvent({
    action:    'simulation_complete',
    category:  'simulador',
    label:     params?.modalidade ?? 'MCMV',
    modalidade: params?.modalidade,
    faixa:     params?.faixa,
  });
}

/**
 * Início de uma simulação — usuário entrou no wizard com intenção de simular
 * (não apenas visualizou a página). Sem este evento não dá pra medir abandono
 * do funil (só a conclusão era medida antes).
 */
export function trackSimulacaoInicio(params?: { origem?: string; naPlanta?: boolean }) {
  gtagEvent({
    action:   'simulation_start',
    category: 'simulador',
    label:    params?.origem ?? 'direto',
    origem:   params?.origem,
    naPlanta: params?.naPlanta,
  });
}

/** Favoritar/desfavoritar um imóvel */
export function trackFavoritar(params?: { imovel?: string; favoritado?: boolean }) {
  gtagEvent({
    action:     'favorite_property',
    category:   'engagement',
    label:      params?.imovel,
    imovel:     params?.imovel,
    favoritado: params?.favoritado,
  });
}

/** Formulário de contato enviado */
export function trackContato(assunto?: string) {
  gtagEvent({
    action:   'contact',
    category: 'formulario',
    label:    assunto ?? 'contato',
  });
}

/** Visualização de empreendimento */
export function trackImovelView(params?: { imovel?: string; bairro?: string; preco?: number }) {
  gtagEvent({
    action:   'view_item',
    category: 'imoveis',
    label:    params?.imovel,
    value:    params?.preco,
    bairro:   params?.bairro,
  });
}

/** Clique em buscar empreendimentos */
export function trackBuscaEmpreendimentos(params?: { quartos?: number; bairro?: string }) {
  gtagEvent({
    action:   'search',
    category: 'empreendimentos',
    label:    params?.bairro,
    quartos:  params?.quartos,
  });
}

/** Usuário abriu o chat do João */
export function trackChatOpen(params?: { page?: string }) {
  gtagEvent({
    action:   'chat_open',
    category: 'joao',
    label:    params?.page,
  });
}

/** Usuário enviou uma mensagem para o João */
export function trackChatMessage(params?: { page?: string; mensagem?: string }) {
  gtagEvent({
    action:   'chat_message',
    category: 'joao',
    label:    params?.page,
    mensagem: params?.mensagem?.slice(0, 100),
  });
}

/** Artigo lido */
export function trackArtigoLido(params?: { slug?: string; titulo?: string; tempoLeitura?: number }) {
  gtagEvent({
    action:   'article_read',
    category: 'aprenda',
    label:    params?.slug,
    titulo:   params?.titulo,
    tempoLeitura: params?.tempoLeitura,
  });
}

/** Busca de empreendimentos concluída */
export function trackBusca(params?: { termo?: string; resultados?: number; filtros?: string }) {
  gtagEvent({
    action:   'search_complete',
    category: 'imoveis',
    label:    params?.termo,
    resultados: params?.resultados,
    filtros:  params?.filtros,
  });
}

/** Engajamento na home */
export function trackHomeEngagement(params?: { elemento?: string }) {
  gtagEvent({
    action:   'home_engagement',
    category: 'homepage',
    label:    params?.elemento,
  });
}

/** Página de conteúdo visualizada */
export function trackPaginaConteudo(params?: { pagina?: string; tipo?: string }) {
  gtagEvent({
    action:   'page_view_content',
    category: 'conteudo',
    label:    params?.pagina,
    tipo:     params?.tipo,
  });
}

/** Clique em link de navegação (header/footer) */
export function trackNavClick(params?: { destino?: string; texto?: string; origem?: 'header' | 'footer' }) {
  gtagEvent({
    action:   'nav_click',
    category: params?.origem ?? 'navegacao',
    label:    params?.texto ?? params?.destino,
    destino:  params?.destino,
  });
}

/** Clique em CTA (ex.: botão de simulador dentro de artigo) */
export function trackCtaClick(params?: { origem?: string; destino?: string; texto?: string }) {
  gtagEvent({
    action:   'cta_click',
    category: params?.origem ?? 'cta',
    label:    params?.texto ?? params?.destino,
    destino:  params?.destino,
  });
}
