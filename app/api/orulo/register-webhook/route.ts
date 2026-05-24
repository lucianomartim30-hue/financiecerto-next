/**
 * GET /api/orulo/register-webhook?secret=xxx
 *
 * Testa a conectividade com a API Orulo e retorna as instruções
 * para cadastrar o webhook manualmente no painel Orulo.
 *
 * A Orulo não expõe endpoint público de auto-registro de webhooks via API.
 * O cadastro deve ser feito no painel de parceiros da Orulo.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SITE_BASE } from '@/lib/orulo-api';

const WEBHOOK_PATH = '/api/orulo/webhook';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const providedSecret   = searchParams.get('secret') ?? '';

  const syncSecret = process.env.ORULO_SYNC_SECRET ?? '';
  if (syncSecret && providedSecret !== syncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const webhookUrl = `${SITE_BASE}${WEBHOOK_PATH}`;

  return NextResponse.json({
    status: 'manual_required',
    webhook_url: webhookUrl,
    instructions: [
      '1. Acesse o painel de parceiros da Orulo (orulo.com.br)',
      '2. Vá em Configurações → Integrações → Webhooks',
      '3. Adicione a URL abaixo como endpoint de notificação',
      '4. Selecione os eventos: building_active, building_removed, distribution_added, distribution_excluded',
      `5. URL do webhook: ${webhookUrl}`,
    ],
    note: 'O endpoint já está ativo e pronto para receber eventos. Apenas o cadastro no painel Orulo é necessário.',
    alternative: 'Enquanto o webhook não estiver cadastrado, o cron job diário (04:00 UTC) mantém o catálogo atualizado automaticamente.',
  });
}
