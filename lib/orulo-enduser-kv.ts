/**
 * lib/orulo-enduser-kv.ts
 * Guarda a credencial de autorização "oruloEndUserAuth" — o token que a
 * Órulo emite quando VOCÊ (corretor) autoriza o FinancieCerto a agir em seu
 * nome (fluxo OAuth Authorization Code, ver /api/orulo/oauth/start e
 * /api/orulo/oauth/callback). É diferente do token de app (client_credentials)
 * usado no resto do site: só esse token de usuário final desbloqueia o texto
 * completo de campanhas/promoções (campo `opportunity` com descrição, em vez
 * de só true/false).
 *
 * Importante — regra da própria Órulo: dados retornados exclusivamente por
 * esse token (texto de campanha, contato comercial, comissão, arquivos) têm
 * que ser consultados em tempo real e NUNCA guardados em banco. Por isso só
 * o TOKEN fica salvo aqui — o conteúdo da campanha em si nunca é persistido
 * (ver a busca ao vivo em app/api/orulo/[id]/route.ts).
 *
 * A Órulo não documenta refresh_token pra esse fluxo — quando o token expira,
 * a única saída é repetir a autorização (ver isTokenProvavelmenteValido).
 */

export interface OruloEndUserToken {
  accessToken: string;
  obtidoEm: string; // ISO
}

const KV_KEY = 'orulo:enduser_token';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getKv(): Promise<any | null> {
  const hasConfig = !!(process.env.KV_REST_API_URL || process.env.KV_URL);
  if (!hasConfig) return null;
  try {
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch {
    return null;
  }
}

export async function kvGetOruloEndUserToken(): Promise<OruloEndUserToken | null> {
  const kv = await getKv();
  if (!kv) return null;
  try {
    return ((await kv.get(KV_KEY)) as OruloEndUserToken) ?? null;
  } catch {
    return null;
  }
}

export async function kvSalvarOruloEndUserToken(accessToken: string): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  const token: OruloEndUserToken = { accessToken, obtidoEm: new Date().toISOString() };
  await kv.set(KV_KEY, token);
}

export async function kvRemoverOruloEndUserToken(): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  await kv.del(KV_KEY);
}
