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

/** Clique em "Falar com consultor/corretor" — evento de lead (conversão) */
export function trackLead(params?: { imovel?: string; bairro?: string }) {
  gtagEvent({
    action:   'generate_lead',
    category: 'engagement',
    label:    params?.imovel ?? 'corretor',
    imovel:   params?.imovel,
    bairro:   params?.bairro,
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
