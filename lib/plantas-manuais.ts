/**
 * lib/plantas-manuais.ts
 * Curadoria manual de plantas baixas por empreendimento — a Orulo às vezes
 * não tem a planta cadastrada pro imóvel (comum em altíssimo padrão, onde a
 * incorporadora só libera sob consulta), mesmo quando o corretor tem a
 * imagem em mãos. Sem isso, o botão "Ver planta" simplesmente não aparece
 * (ver app/imoveis/[id]/ImovelDetailClient.tsx, SecaoTipologias).
 *
 * Imagem física fica em public/plantas-manuais/ — sem custo de storage
 * externo, funciona bem pro volume baixo esperado (casos pontuais, não o
 * catálogo inteiro).
 */

export interface PlantaManual {
  url: string;
  name: string;
  // Restringe a quais tipologias essa planta se aplica (ver "Preenche o botão
  // Ver planta..." em app/api/orulo/[id]/route.ts) — sem isso, um
  // empreendimento com tipologias bem diferentes (ex: studio vs 2 dorms)
  // preenchia TODAS com a mesma planta, mostrando a planta errada pra quem
  // via a tipologia menor (bug real, achado 2026-09-01 no W Stay Perdizes).
  // Omitido = aplica a qualquer tipologia sem blueprint (comportamento
  // antigo, mantido pro caso de um empreendimento com uma tipologia só).
  areaMin?: number;
  areaMax?: number;
}

interface ConfigPlantas {
  itens: PlantaManual[];
  // Nomes (ou trecho do nome, sem diferenciar maiúsculas) de plantas vindas
  // da Orulo pra EXCLUIR da seção "Plantas disponíveis" — usado quando uma
  // delas não corresponde a nenhuma unidade com preço vigente (ex: planta do
  // andar de lazer, que não é planta de unidade nenhuma) ou representa uma
  // unidade cujo preço sincronizado já não bate com a condição atual.
  // Plantas da Orulo que não estiverem nessa lista continuam aparecendo
  // normalmente — não é um "substituir tudo" (bug corrigido 2026-09-02:
  // isso tinha derrubado também a planta do studio de 23m², que continua com
  // preço vigente).
  excluirBlueprintsOrulo?: string[];
}

// Chave = id do imóvel na Orulo.
const PLANTAS_MANUAIS: Record<string, ConfigPlantas> = {
  '2109': { // Beyond Jardins — planta enviada pelo corretor 2026-08-18
    itens: [
      { url: '/plantas-manuais/2109-tipo-4-suites.jpg', name: 'Planta — Tipo 4 suítes' },
    ],
  },
  '81515': { // W Stay Perdizes — plantas das unidades com preço SCP atualizado (book da WDS, 2026-09)
    itens: [
      { url: '/plantas-manuais/81515-23m2-studio.png', name: 'Planta Studio — 23 a 27m²', areaMin: 20, areaMax: 30 },
      { url: '/plantas-manuais/81515-46m2-1dorm-sala-tv.png', name: 'Planta — Apto 43 a 46m² (1 dorm + sala de TV)', areaMin: 40, areaMax: 50 },
      { url: '/plantas-manuais/81515-46m2-2dorms.png', name: 'Planta — Apto 43 a 46m² (2 dorms)', areaMin: 40, areaMax: 50 },
    ],
    // A de lazer não é planta de unidade; a "PLANTA STUDIO" da Orulo vira
    // duplicata agora que temos a versão do book (mesmo estilo das outras).
    excluirBlueprintsOrulo: ['PLANTA LAZER', 'PLANTA STUDIO'],
  },
};

export function getPlantasManuais(imovelId: string): PlantaManual[] {
  return PLANTAS_MANUAIS[imovelId]?.itens ?? [];
}

export function getExcluirBlueprintsOrulo(imovelId: string): string[] {
  return PLANTAS_MANUAIS[imovelId]?.excluirBlueprintsOrulo ?? [];
}
