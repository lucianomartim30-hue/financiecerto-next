/**
 * Logos oficiais baixadas manualmente dos sites das construtoras — a Orulo
 * não fornece `developer.logo`/`developer.image` pra nenhuma construtora do
 * catálogo (confirmado em 2026-09-10, até pra Cury), então esse campo nunca
 * vem preenchido pela API. Arquivos em public/logos/, servidos como /logos/*.
 *
 * Chave = slug da construtora (ver construtoraToSlug em construtora-nomes.ts).
 */
export const LOGOS_MANUAIS: Record<string, string> = {
  'cury':               '/logos/cury.png',
  'dialogo':            '/logos/dialogo.svg',
  'vivaz':              '/logos/vivaz.svg',
  'plano-plano':        '/logos/plano-plano.svg',
  'metrocasa':          '/logos/metrocasa.svg',
  'tiberio':            '/logos/tiberio.svg',
  'econ-construtora':   '/logos/econ.webp',
  'benx-bueno-netto':   '/logos/benx.svg',
  'vitacon':            '/logos/vitacon.svg',
  'mrv':                '/logos/mrv.svg',
  'trisul':             '/logos/trisul.svg',
  'living':             '/logos/living.svg',
  'mitre-realty':       '/logos/mitre-realty.svg',
  'eztec':              '/logos/eztec.svg',
  'vibra':              '/logos/vibra.svg',

  // Posições 16-35
  'mbigucci':                            '/logos/mbigucci.png',
  'cyrela':                              '/logos/cyrela.svg',
  'exto':                                '/logos/exto.png',
  'conx':                                '/logos/conx.svg',
  'you-inc':                             '/logos/you-inc.png',
  'cyrela-goldsztein':                   '/logos/cyrela.svg', // marca regional da Cyrela (Porto Alegre), sem site próprio
  'one':                                 '/logos/one.webp',
  'canopus':                             '/logos/canopus.svg',
  'cyrela-rjz':                          '/logos/cyrela.svg', // marca regional da Cyrela (Rio de Janeiro), sem site próprio
  'mundo-apto':                          '/logos/mundo-apto.svg',
  'plaenge':                             '/logos/plaenge.svg',
  'vitaurbana':                          '/logos/vitaurbana.png',
  'emccamp':                             '/logos/emccamp.svg',
  'mpd':                                 '/logos/mpd.png',
  'tegra':                               '/logos/tegra.svg',
  'fibra-experts':                       '/logos/fibra-experts.svg',
  'skr':                                 '/logos/skr.webp',
  'terrasse':                            '/logos/terrasse.png',
  'gamaro':                              '/logos/gamaro.png',
  'helbor':                              '/logos/helbor.svg',

  // Posições 36-46 (CB11 Fundo é uma SPE sem site/marca própria — sem logo)
  'carvalho-hosken':                     '/logos/carvalho-hosken.png',
  'dubai':                               '/logos/dubai.png',
  'planik':                              '/logos/planik.svg',
  'setin':                               '/logos/setin.svg',
  'abiatar-construtora-e-incorporadora': '/logos/abiatar-construtora-e-incorporadora.svg',
  'graal':                               '/logos/graal.svg',
  'paes-gregori':                        '/logos/paes-gregori.webp',
  'aam':                                 '/logos/aam.png',
  'longitude-incorporadora':             '/logos/longitude-incorporadora.svg',
  'maskan':                              '/logos/maskan.svg',

  // Posições 47-56 (CB11 Fundo e Opportunity ficaram sem logo — sem site
  // próprio confiável / risco de confundir com empresa homônima)
  'gt-building':      '/logos/gt-building.png',
  'hype':             '/logos/hype.svg',
  'idea-zarvos':      '/logos/idea-zarvos.svg',
  'lindenberg':       '/logos/lindenberg.svg',
  'rfm-incorporadora':'/logos/rfm-incorporadora.svg',
  'sdi':              '/logos/sdi.svg',
  'tarjab':           '/logos/tarjab.png',
  'think':            '/logos/think.png',
  // 'vinx' sem logo confiável — o site só tem assets de campanha sazonal
  // (ex.: uma versão verde-Spotify de "parceria musical"), nunca a marca fixa.

  // Posições 57-66
  'yuny':                                 '/logos/yuny.png',
  'agv-selent-construtora-e-incorporadora': '/logos/agv-selent-construtora-e-incorporadora.png',
  'alfa-realty':                          '/logos/alfa-realty.png',
  'mf7':                                  '/logos/mf7.png',
  'paulo-mauro':                          '/logos/paulo-mauro.png',
  'pratica-construtora':                  '/logos/pratica-construtora.svg',
  'riva':                                 '/logos/riva.png',
  'archtech':                             '/logos/archtech.png',
  'fratta-construtora-e-incorporadora':   '/logos/fratta-construtora-e-incorporadora.webp',
  'gafisa':                               '/logos/gafisa.svg',

  // Posições 67-76 (MC Construtora e Integra Urbano ficaram sem logo —
  // risco de mistura com empresa homônima / não achei a logo real do site)
  'ideale':               '/logos/ideale.svg',
  'livus-inc':            '/logos/livus-inc.svg',
  'zuckhan':              '/logos/zuckhan.png',
  'magik-jc':             '/logos/magik-jc.svg',
  'piemonte':             '/logos/piemonte.png',
  'tecnisa':              '/logos/tecnisa.png',
  'vanguard':             '/logos/vanguard.svg',
  'xavier-engenharia':    '/logos/xavier-engenharia.png',

  // Posições 77-85 (Calper, Pride[achada depois] e FG Empreendimentos:
  // FG sem logo confiável — só imagens grandes de banner encontradas)
  'absoluta-construtora-e-incorporadora': '/logos/absoluta-construtora-e-incorporadora.webp',
  'blue':                                 '/logos/blue.png',
  'c-seger-construtora-e-incorporadora':  '/logos/c-seger-construtora-e-incorporadora.png',
  'cna-construtora':                      '/logos/cna-construtora.webp',
  'constrac':                             '/logos/constrac.svg',
  'engelux':                              '/logos/engelux.svg',
  'namour-incorporacao-e-construcao':     '/logos/namour-incorporacao-e-construcao.svg',
  'pride':                                '/logos/pride.png',

  // Posições 87-100 (Verticall, VIEWCO, ABC Empreendimentos, AW Realty,
  // Habitram, HM Engenharia e M.Santos ficaram sem logo confiável)
  'wds-construtora':                 '/logos/wds-construtora.svg',
  'brix':                             '/logos/brix.webp',
  'coral-engenharia':                 '/logos/coral-engenharia.png',
  'hsantos-empreendimentos':          '/logos/hsantos-empreendimentos.png',
  'lotisa-empreendimentos':           '/logos/lotisa-empreendimentos.png',
  'mac':                              '/logos/mac.svg',
  'marques':                          '/logos/marques.svg',
};
