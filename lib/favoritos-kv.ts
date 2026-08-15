/**
 * lib/favoritos-kv.ts
 * Espelho no servidor dos favoritos (lib/favoritos.ts, que continua sendo a
 * fonte imediata no navegador via localStorage — favoritar continua não
 * exigindo login). Guardado por "dono": "e:{email}" quando logada (aparece
 * em qualquer aparelho), ou "v:{fc_vid}" quando anônima (só naquele
 * aparelho, até ela logar — ver kvReivindicarFavoritos).
 */

const MAX_FAVORITOS = 100;

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
  return `favoritos:${owner}`;
}

export async function kvSalvarFavoritos(owner: string, ids: string[]): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  try {
    await kv.set(chave(owner), ids.slice(0, MAX_FAVORITOS));
  } catch (e) {
    console.error('[favoritos-kv] salvar', e);
  }
}

export async function kvGetFavoritos(owner: string): Promise<string[]> {
  const kv = await getKv();
  if (!kv) return [];
  try {
    return ((await kv.get(chave(owner))) as string[]) ?? [];
  } catch {
    return [];
  }
}

/** Migra favoritos marcados antes do login naquele aparelho pra dentro da conta — chamado uma vez, no momento em que o código é confirmado. */
export async function kvReivindicarFavoritos(visitorId: string | undefined, email: string): Promise<void> {
  if (!visitorId) return;
  const kv = await getKv();
  if (!kv) return;
  try {
    const doAparelho = await kvGetFavoritos(`v:${visitorId}`);
    if (doAparelho.length === 0) return;
    const daConta = await kvGetFavoritos(`e:${email}`);
    const mesclado = Array.from(new Set([...doAparelho, ...daConta])).slice(0, MAX_FAVORITOS);
    await kvSalvarFavoritos(`e:${email}`, mesclado);
    await kv.del(chave(`v:${visitorId}`));
  } catch (e) {
    console.error('[favoritos-kv] reivindicar', e);
  }
}
