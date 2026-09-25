/**
 * Envia os leads do site pro HubSpot (CRM gratuito) — um NEGÓCIO por clique no
 * WhatsApp ou por formulário, e um CONTATO quando a pessoa deixou nome/telefone.
 *
 * Só roda com HUBSPOT_ACCESS_TOKEN configurado (chave de um "app privado" do
 * HubSpot, com permissão de escrita em contatos e negócios); sem ela, não faz
 * nada — o lead continua gravado no KV e visível em /admin/leads como antes.
 * Nunca lança erro pra fora: falha do HubSpot não pode afetar quem clicou.
 *
 * Um clique no WhatsApp NÃO traz nome nem telefone (a pessoa sai do site): vira
 * um negócio sem contato, com o "ref" do clique no nome — o mesmo código vai na
 * mensagem pré-escrita do WhatsApp, então quando a conversa chega dá pra achar o
 * negócio certo pelo ref e associar o contato.
 *
 * O valor do imóvel vai na descrição, não no campo "Valor" do negócio: a conta
 * HubSpot está em USD e o campo mostraria dólar.
 */

import type { Lead } from './leads-kv';

const API = 'https://api.hubapi.com';
const SITE = 'https://www.financiecerto.com.br';
// Padrões de uma conta HubSpot nova (funil "Sales Pipeline", 1ª etapa). Dá pra
// trocar por variável de ambiente se o funil for renomeado/recriado.
const PIPELINE = process.env.HUBSPOT_PIPELINE_ID || 'default';
const ETAPA_INICIAL = process.env.HUBSPOT_STAGE_ID || 'appointmentscheduled';
// Tipo de associação padrão do HubSpot: negócio → contato.
const ASSOC_NEGOCIO_CONTATO = 3;

class ErroHubSpot extends Error {}

async function hs<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const texto = await res.text();
  if (!res.ok) throw new ErroHubSpot(`${res.status} ${path}: ${texto.slice(0, 300)}`);
  return (texto ? JSON.parse(texto) : {}) as T;
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

async function contatoParaHubSpot(contato: NonNullable<Lead['contato']>): Promise<string | undefined> {
  const propriedades: Record<string, string> = {
    firstname: contato.nome,
    phone: `+55${contato.whatsapp}`,
    lifecyclestage: 'lead',
  };
  if (contato.email) {
    // Mesmo e-mail em outro lead atualiza o mesmo contato em vez de duplicar.
    const r = await hs<{ results: { id: string }[] }>('/crm/v3/objects/contacts/batch/upsert', {
      inputs: [{ idProperty: 'email', id: contato.email.toLowerCase(), properties: propriedades }],
    });
    return r.results?.[0]?.id;
  }
  try {
    const r = await hs<{ id: string }>('/crm/v3/objects/contacts', { properties: propriedades });
    return r.id;
  } catch (e) {
    // 409 = já existe contato com esses dados; o HubSpot informa o id existente.
    const existente = e instanceof Error ? /Existing ID:\s*(\d+)/.exec(e.message)?.[1] : undefined;
    if (existente) return existente;
    throw e;
  }
}

function descricaoDoLead(lead: Lead): string {
  const linhas: string[] = [];
  const urlImovel = lead.imovelId && lead.imovelId !== 'simulacao-na-planta' ? `${SITE}/imoveis/${lead.imovelId}` : '';
  linhas.push(lead.contato ? 'Origem: formulário do site' : 'Origem: clique no botão de WhatsApp do site');
  linhas.push(`Imóvel: ${lead.imovelName}`);
  if (urlImovel) linhas.push(`Link do imóvel: ${urlImovel}`);
  const local = [lead.bairro, lead.cidade].filter(Boolean).join(' · ');
  if (local) linhas.push(`Local: ${local}`);
  if (lead.preco && lead.preco >= 100) linhas.push(`Preço (a partir de): ${brl(lead.preco)}`);
  if (lead.ref) linhas.push(`Ref. da mensagem de WhatsApp: ${lead.ref}`);

  const s = lead.simulacao;
  if (s) {
    linhas.push('', 'Simulação feita antes do clique:');
    linhas.push(`- Modalidade: ${s.modalidade}${s.faixa ? ` (${s.faixa})` : ''}`);
    if (s.renda) linhas.push(`- Renda informada: ${brl(s.renda)}`);
    if (s.parcela) linhas.push(`- Parcela estimada: ${brl(s.parcela)}`);
    if (s.comprometimento != null) linhas.push(`- Comprometimento da renda: ${s.comprometimento}%`);
  }
  const c = lead.cenarioProposta;
  if (c) {
    linhas.push('', 'Cenário de pagamento montado (imóvel na planta):');
    linhas.push(`- Valor do imóvel: ${brl(c.valorImovel)}`);
    if (c.ato) linhas.push(`- Ato: ${brl(c.ato)}`);
    if (c.sinais) linhas.push(`- Sinais: ${brl(c.sinais)}`);
    if (c.mensais) linhas.push(`- Mensais durante a obra (total): ${brl(c.mensais)}`);
    if (c.anuais) linhas.push(`- Reforços anuais (total): ${brl(c.anuais)}`);
    if (c.chaves) linhas.push(`- Parcela nas chaves: ${brl(c.chaves)}`);
    if (c.fgts) linhas.push(`- FGTS: ${brl(c.fgts)}`);
    if (c.necessidadeFinanciamento != null) linhas.push(`- Necessidade de financiamento: ${brl(c.necessidadeFinanciamento)}`);
  }
  const a = lead.atribuicao;
  if (a) {
    linhas.push('', 'De onde veio:');
    linhas.push(`- Origem: ${a.first_source}${a.first_medium ? ` / ${a.first_medium}` : ''}`);
    if (a.utm_campaign) linhas.push(`- Campanha: ${a.utm_campaign}`);
    if (a.first_landing_page) linhas.push(`- Primeira página: ${a.first_landing_page}`);
  }
  if (lead.favoritosCount) linhas.push('', `Imóveis favoritados: ${lead.favoritosCount}`);
  linhas.push('', `Registro completo: ${SITE}/admin/leads`);
  return linhas.join('\n');
}

export async function enviarLeadParaHubSpot(lead: Lead): Promise<void> {
  if (!process.env.HUBSPOT_ACCESS_TOKEN) return;
  try {
    const contatoId = lead.contato ? await contatoParaHubSpot(lead.contato) : undefined;

    const nome = lead.contato
      ? `Interesse · ${lead.imovelName} · ${lead.contato.nome}`
      : `WhatsApp · ${lead.imovelName}${lead.ref ? ` · ref ${lead.ref}` : ''}`;

    await hs('/crm/v3/objects/deals', {
      properties: {
        dealname: nome.slice(0, 250),
        pipeline: PIPELINE,
        dealstage: ETAPA_INICIAL,
        description: descricaoDoLead(lead),
      },
      ...(contatoId
        ? { associations: [{ to: { id: contatoId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: ASSOC_NEGOCIO_CONTATO }] }] }
        : {}),
    });
  } catch (e) {
    console.error('[hubspot] falha ao enviar lead', e instanceof Error ? e.message : e);
  }
}
