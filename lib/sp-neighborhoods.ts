/**
 * Tabela estática de coordenadas (centróides) de bairros e municípios da Grande São Paulo.
 * Usada como fallback para imóveis sem lat/lng na API Orulo.
 *
 * Chaves: lowercase SEM acentos (normalize NFD + remove diacríticos + trim).
 */

const COORDS: Record<string, { lat: number; lng: number }> = {
  // ── Centro / Centro Expandido ──────────────────────────────────────────────
  'centro':                      { lat: -23.5489, lng: -46.6388 },
  'republica':                   { lat: -23.5431, lng: -46.6364 },
  'bela vista':                  { lat: -23.5590, lng: -46.6434 },
  'liberdade':                   { lat: -23.5597, lng: -46.6338 },
  'cambuci':                     { lat: -23.5660, lng: -46.6290 },
  'consolacao':                  { lat: -23.5534, lng: -46.6609 },
  'santa cecilia':               { lat: -23.5408, lng: -46.6497 },
  'higienopolis':                { lat: -23.5429, lng: -46.6583 },
  'bom retiro':                  { lat: -23.5301, lng: -46.6403 },
  'cerqueira cesar':             { lat: -23.5636, lng: -46.6617 },
  'luz':                         { lat: -23.5340, lng: -46.6370 },
  'pari':                        { lat: -23.5300, lng: -46.6230 },
  'barra funda':                 { lat: -23.5280, lng: -46.6590 },
  'aclimacao':                   { lat: -23.5697, lng: -46.6282 },
  'paraiso':                     { lat: -23.5810, lng: -46.6430 },
  'limao':                       { lat: -23.5012, lng: -46.6516 },
  'sumare':                      { lat: -23.5430, lng: -46.6680 },
  'carandiru':                   { lat: -23.5110, lng: -46.6250 },

  // ── Zona Oeste ────────────────────────────────────────────────────────────
  'pinheiros':                   { lat: -23.5636, lng: -46.6900 },
  'vila madalena':               { lat: -23.5540, lng: -46.6900 },
  'alto de pinheiros':           { lat: -23.5490, lng: -46.7230 },
  'perdizes':                    { lat: -23.5336, lng: -46.6715 },
  'pacaembu':                    { lat: -23.5460, lng: -46.6710 },
  'pompeia':                     { lat: -23.5419, lng: -46.7056 },
  'lapa':                        { lat: -23.5306, lng: -46.7088 },
  'agua branca':                 { lat: -23.5259, lng: -46.6895 },
  'vila leopoldina':             { lat: -23.5226, lng: -46.7361 },
  'butanta':                     { lat: -23.5585, lng: -46.7282 },
  'vila romana':                 { lat: -23.5400, lng: -46.6990 },
  'raposo tavares':              { lat: -23.6000, lng: -46.7960 },
  'jardim bonfiglioli':          { lat: -23.5700, lng: -46.7480 },
  'vila sao francisco':          { lat: -23.5860, lng: -46.7430 },
  'vila sonia':                  { lat: -23.5790, lng: -46.7370 },

  // ── Zona Sul ──────────────────────────────────────────────────────────────
  'moema':                       { lat: -23.6020, lng: -46.6660 },
  'itaim bibi':                  { lat: -23.5845, lng: -46.6780 },
  'brooklin':                    { lat: -23.6220, lng: -46.6950 },
  'campo belo':                  { lat: -23.6185, lng: -46.6571 },
  'vila mariana':                { lat: -23.5929, lng: -46.6330 },
  'chacara klabin':              { lat: -23.5950, lng: -46.6330 },
  'saude':                       { lat: -23.6150, lng: -46.6303 },
  'jabaquara':                   { lat: -23.6499, lng: -46.6440 },
  'ipiranga':                    { lat: -23.5897, lng: -46.6026 },
  'sacoma':                      { lat: -23.6020, lng: -46.5970 },
  'planalto paulista':           { lat: -23.6200, lng: -46.6425 },
  'mirandopolis':                { lat: -23.6150, lng: -46.6371 },
  'santo amaro':                 { lat: -23.6548, lng: -46.6979 },
  'campo grande':                { lat: -23.6563, lng: -46.7157 },
  'morumbi':                     { lat: -23.6147, lng: -46.7183 },
  'vila andrade':                { lat: -23.6340, lng: -46.7410 },
  'interlagos':                  { lat: -23.6960, lng: -46.6955 },
  'socorro':                     { lat: -23.6570, lng: -46.7050 },
  'granja julieta':              { lat: -23.6160, lng: -46.7040 },
  'real parque':                 { lat: -23.6200, lng: -46.7200 },
  'panamby':                     { lat: -23.6190, lng: -46.7150 },
  'vila nova conceicao':         { lat: -23.5920, lng: -46.6660 },
  'vila olimpia':                { lat: -23.5960, lng: -46.6820 },
  'vila clementino':             { lat: -23.5940, lng: -46.6450 },
  'jardim ana rosa':             { lat: -23.5920, lng: -46.6400 },
  'campo limpo':                 { lat: -23.6410, lng: -46.7530 },
  'capao redondo':               { lat: -23.6720, lng: -46.7570 },
  'jardim sao luiz':             { lat: -23.6830, lng: -46.7260 },
  'cidade ademar':               { lat: -23.6660, lng: -46.6620 },
  'pedreira':                    { lat: -23.7180, lng: -46.6410 },
  'guarapiranga':                { lat: -23.6790, lng: -46.7300 },

  // ── Jardins (alias comuns) ─────────────────────────────────────────────────
  'jardins':                     { lat: -23.5690, lng: -46.6580 },
  'jardim paulista':             { lat: -23.5690, lng: -46.6580 },
  'jardim paulistano':           { lat: -23.5660, lng: -46.6800 },
  'jardim europa':               { lat: -23.5770, lng: -46.6720 },
  'jardim america':              { lat: -23.5680, lng: -46.6650 },
  'jardim botanico':             { lat: -23.5810, lng: -46.6680 },

  // ── Zona Norte ────────────────────────────────────────────────────────────
  'santana':                     { lat: -23.5027, lng: -46.6266 },
  'casa verde':                  { lat: -23.5038, lng: -46.6698 },
  'mandaqui':                    { lat: -23.4893, lng: -46.6268 },
  'tucuruvi':                    { lat: -23.4726, lng: -46.6046 },
  'jacana':                      { lat: -23.4670, lng: -46.5726 },
  'tremembe':                    { lat: -23.4527, lng: -46.6327 },
  'pirituba':                    { lat: -23.4880, lng: -46.7360 },
  'freguesia do o':              { lat: -23.5000, lng: -46.6860 },
  'vila guilherme':              { lat: -23.4940, lng: -46.5980 },
  'cantareira':                  { lat: -23.4380, lng: -46.5740 },

  // ── Zona Leste ────────────────────────────────────────────────────────────
  'tatuape':                     { lat: -23.5399, lng: -46.5750 },
  'penha':                       { lat: -23.5247, lng: -46.5468 },
  'belem':                       { lat: -23.5361, lng: -46.5957 },
  'bras':                        { lat: -23.5477, lng: -46.6130 },
  'mooca':                       { lat: -23.5551, lng: -46.6017 },
  'agua rasa':                   { lat: -23.5587, lng: -46.5918 },
  'vila matilde':                { lat: -23.5390, lng: -46.5340 },
  'vila formosa':                { lat: -23.5540, lng: -46.5380 },
  'aricanduva':                  { lat: -23.5497, lng: -46.5252 },
  'analia franco':               { lat: -23.5461, lng: -46.5551 },
  'vila prudente':               { lat: -23.5819, lng: -46.5782 },
  'sapopemba':                   { lat: -23.5990, lng: -46.5386 },
  'vila esperanca':              { lat: -23.5510, lng: -46.5190 },
  'sao miguel paulista':         { lat: -23.5039, lng: -46.4454 },
  'itaim paulista':              { lat: -23.5000, lng: -46.4380 },
  'ponte rasa':                  { lat: -23.5190, lng: -46.5240 },
  'engenheiro goulart':          { lat: -23.4970, lng: -46.5040 },
  'ermelino matarazzo':          { lat: -23.5000, lng: -46.4750 },
  'jose bonifacio':              { lat: -23.5400, lng: -46.4610 },
  'parque do carmo':             { lat: -23.5750, lng: -46.4580 },
  'parque das nacoes':           { lat: -23.4920, lng: -46.5120 },
  'parque imperial':             { lat: -23.6970, lng: -46.6970 },

  // ── Grande SP ─────────────────────────────────────────────────────────────
  'alphaville':                  { lat: -23.4971, lng: -46.8488 },
  'barueri':                     { lat: -23.5056, lng: -46.8761 },
  'osasco':                      { lat: -23.5328, lng: -46.7918 },
  'guarulhos':                   { lat: -23.4543, lng: -46.5332 },
  'sao caetano do sul':          { lat: -23.6215, lng: -46.5516 },
  'santo andre':                 { lat: -23.6639, lng: -46.5375 },
  'sao bernardo do campo':       { lat: -23.6944, lng: -46.5654 },
  'diadema':                     { lat: -23.6862, lng: -46.6214 },
  'maua':                        { lat: -23.6677, lng: -46.4611 },
  'carapicuiba':                 { lat: -23.5202, lng: -46.8364 },
  'cotia':                       { lat: -23.6035, lng: -46.9220 },
  'embu das artes':              { lat: -23.6490, lng: -46.8510 },
  'granja viana':                { lat: -23.5956, lng: -46.7859 },
  'taboao da serra':             { lat: -23.6100, lng: -46.7820 },
  'itaquaquecetuba':             { lat: -23.4870, lng: -46.3479 },
  'mogi das cruzes':             { lat: -23.5228, lng: -46.1879 },
  'suzano':                      { lat: -23.5433, lng: -46.3115 },
  'ferraz de vasconcelos':       { lat: -23.5408, lng: -46.3681 },
  'pooa':                        { lat: -23.5336, lng: -46.3491 },
  'ribeirao pires':              { lat: -23.7108, lng: -46.4134 },
  'rio grande da serra':         { lat: -23.7440, lng: -46.3983 },
  'jandira':                     { lat: -23.5274, lng: -46.9021 },
  'itapevi':                     { lat: -23.5493, lng: -47.0635 },
  'vargem grande paulista':      { lat: -23.6030, lng: -47.0290 },
  'santana de parnaiba':         { lat: -23.4441, lng: -46.9177 },

  // ── Alias / cidade fallback ────────────────────────────────────────────────
  'sao paulo':                   { lat: -23.5489, lng: -46.6388 },
};

function normalizeKey(s: string): string {
  if (!s) return '';
  // Substituição direta de caracteres acentuados → ASCII
  // (mais confiável do que regex Unicode em diferentes ambientes)
  return s.toLowerCase()
    .replace(/[áàãâä]/g, 'a')
    .replace(/[éèêë]/g,  'e')
    .replace(/[íìîï]/g,  'i')
    .replace(/[óòõôö]/g, 'o')
    .replace(/[úùûü]/g,  'u')
    .replace(/[ç]/g,     'c')
    .replace(/[ñ]/g,     'n')
    .trim();
}

/** Distância em km entre dois pontos geográficos (fórmula Haversine). */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dL = (lat2 - lat1) * Math.PI / 180;
  const dG = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dL / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dG / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Retorna as coordenadas de centróide para um bairro/município.
 * Tenta o bairro primeiro, depois a cidade como fallback.
 */
export function lookupSPCoords(
  neighborhood: string,
  city: string,
): { lat: number; lng: number } | null {
  const n = normalizeKey(neighborhood);
  if (n && COORDS[n]) return COORDS[n];
  const c = normalizeKey(city);
  if (c && COORDS[c]) return COORDS[c];
  // Fallback final: centróide de São Paulo para garantir que todo imóvel apareça no mapa
  return COORDS['sao paulo'];
}
