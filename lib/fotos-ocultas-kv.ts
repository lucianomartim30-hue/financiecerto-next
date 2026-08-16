/**
 * lib/fotos-ocultas-kv.ts
 * Curadoria manual de fotos por empreendimento — a Orulo às vezes mistura
 * material de marketing pra corretor/imobiliária ("VENDEU LEVOU", "COMISSÃO
 * 4%") no mesmo álbum de fotos público do empreendimento. Não dá pra
 * detectar isso automaticamente (nem type/description da API nem a
 * proporção da imagem distinguem com segurança um banner de uma foto real
 * — ver app/api/orulo/[id]/route.ts), então o corretor marca manualmente
 * quais fotos esconder em /admin/fotos.
 */

const KV_KEY = 'fotos-ocultas:map'; // { [buildingId]: string[] de ids de foto }

// Casos já confirmados manualmente (banners de marketing pra corretor
// misturados no álbum público) — aplicados sempre, mesmo antes de qualquer
// curadoria feita em /admin/fotos. Novos casos continuam sendo resolvidos
// pelo painel; isso aqui é só pra não depender de alguém logar pra corrigir
// um caso já identificado e confirmado.
const SEED: Record<string, string[]> = {
  '72556': ['2555893', '2498756', '2555894'], // Line Praça da Árvore — "VENDEU LEVOU"/"COMISSÃO"/"FEIRÃO CAIXA"
};

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

async function getMapa(): Promise<Record<string, string[]>> {
  const kv = await getKv();
  if (!kv) return {};
  try {
    const raw = await kv.get(KV_KEY);
    return (raw as Record<string, string[]>) ?? {};
  } catch {
    return {};
  }
}

export async function kvGetFotosOcultas(buildingId: string): Promise<Set<string>> {
  const mapa = await getMapa();
  return new Set([...(SEED[buildingId] ?? []), ...(mapa[buildingId] ?? [])]);
}

export async function kvGetTodasFotosOcultas(): Promise<Record<string, string[]>> {
  return getMapa();
}

export async function kvOcultarFoto(buildingId: string, photoId: string): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  try {
    const mapa = await getMapa();
    const atual = new Set(mapa[buildingId] ?? []);
    atual.add(photoId);
    mapa[buildingId] = [...atual];
    await kv.set(KV_KEY, mapa);
  } catch (e) {
    console.error('[fotos-ocultas-kv] ocultar', e);
  }
}

export async function kvReexibirFoto(buildingId: string, photoId: string): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  try {
    const mapa = await getMapa();
    const atual = new Set(mapa[buildingId] ?? []);
    atual.delete(photoId);
    if (atual.size === 0) delete mapa[buildingId];
    else mapa[buildingId] = [...atual];
    await kv.set(KV_KEY, mapa);
  } catch (e) {
    console.error('[fotos-ocultas-kv] reexibir', e);
  }
}
