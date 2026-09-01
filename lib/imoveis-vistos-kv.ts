/**
 * lib/imoveis-vistos-kv.ts
 * Histórico de imóveis vistos, ligado à conta (mesmo padrão de
 * favoritos-kv.ts e simulacoes-kv.ts) — diferente do rastreio anônimo
 * (lib/rastreio-kv.ts, que expira em 60 dias e serve o admin), este é
 * permanente e por "dono": "e:{email}" quando logada (funciona em qualquer
 * aparelho), ou "v:{fc_vid}" quando anônima (só naquele aparelho, até ela
 * logar — ver kvReivindicarImoveisVistos).
 */

const MAX_VISTOS = 30;

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

function chave(owner: string): string {
  return `imoveis-vistos:${owner}`;
}

export async function kvRegistrarImovelVisto(owner: string, imovelId: string): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  try {
    const atuais = ((await kv.get(chave(owner))) as string[]) ?? [];
    const novos = [imovelId, ...atuais.filter(id => id !== imovelId)].slice(0, MAX_VISTOS);
    await kv.set(chave(owner), novos);
  } catch (e) {
    console.error('[imoveis-vistos-kv] registrar', e);
  }
}

export async function kvGetImoveisVistos(owner: string): Promise<string[]> {
  const kv = await getKv();
  if (!kv) return [];
  try {
    return ((await kv.get(chave(owner))) as string[]) ?? [];
  } catch {
    return [];
  }
}

/** Migra o histórico daquele aparelho pra dentro da conta — chamado uma vez, no momento em que o código é confirmado. */
export async function kvReivindicarImoveisVistos(visitorId: string | undefined, email: string): Promise<void> {
  if (!visitorId) return;
  const kv = await getKv();
  if (!kv) return;
  try {
    const doAparelho = await kvGetImoveisVistos(`v:${visitorId}`);
    if (doAparelho.length === 0) return;
    const daConta = await kvGetImoveisVistos(`e:${email}`);
    const mesclado = Array.from(new Set([...doAparelho, ...daConta])).slice(0, MAX_VISTOS);
    await kv.set(chave(`e:${email}`), mesclado);
    await kv.del(chave(`v:${visitorId}`));
  } catch (e) {
    console.error('[imoveis-vistos-kv] reivindicar', e);
  }
}
