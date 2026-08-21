/**
 * lib/localizacao.ts
 * Dados e utilitários de busca por localização (cidade/bairro/rua) — fonte
 * única compartilhada entre /imoveis (portal geral) e /imoveis/minha-casa-minha-vida
 * (MCMV), pra garantir que as duas páginas usem exatamente o mesmo buscador
 * e nunca fiquem divergentes.
 */

// ─── Lista estática de bairros da cidade de São Paulo (capital) — usada para
// completar o autocomplete mesmo em bairros sem imóveis no catálogo ainda.
// IMPORTANTE: só bairros reais da capital entram aqui. Nomes de outras cidades
// (Grande SP, Campinas, litoral de SC, Curitiba, RS, RJ...) NÃO podem estar
// nesta lista — antes ficavam todos juntos numa lista só, o que fazia um bairro
// "Centro" buscado em São Paulo poder resolver para o Centro de outra cidade
// (ex: Porto Alegre) só porque os nomes coincidiam. Ver CIDADES_BUSCA abaixo
// para a lista de cidades — a busca agora sempre escolhe cidade primeiro.
export const SP_BAIRROS: string[] = [
  // Centro / Centro Expandido
  'Bela Vista','Bom Retiro','Brás','Cambuci','Consolação','Higienópolis',
  'Liberdade','República','Santa Cecília','Sé','Luz','Pari','Barra Funda',
  'Aclimação','Paraíso','Sumaré','Cerqueira César','Carandiru','Limão',
  // Zona Oeste
  'Pinheiros','Vila Madalena','Alto de Pinheiros','Perdizes','Pacaembú',
  'Pompeia','Lapa','Água Branca','Vila Leopoldina','Butantã','Vila Romana',
  'Raposo Tavares','Jardim Bonfiglioli','Vila São Francisco','Vila Sônia',
  'Jaguaré','Jardim Boa Vista','Perus','Real Parque',
  // Zona Sul
  'Moema','Itaim Bibi','Brooklin','Campo Belo','Vila Mariana','Chácara Klabin',
  'Saúde','Jabaquara','Ipiranga','Sacomã','Planalto Paulista','Mirandópolis',
  'Santo Amaro','Campo Grande','Morumbi','Vila Andrade','Interlagos','Socorro',
  'Granja Julieta','Vila Nova Conceição','Vila Olímpia','Vila Clementino',
  'Jardim Ana Rosa','Campo Limpo','Capão Redondo','Jardim São Luís',
  'Cidade Ademar','Pedreira','Guarapiranga','Americanópolis','Água Funda',
  'Jardim das Imbuias','Cidade Dutra','Grajaú','Parque do Carmo',
  // Jardins
  'Jardins','Jardim Paulista','Jardim Paulistano','Jardim Europa',
  'Jardim América','Jardim Botânico',
  // Zona Norte
  'Santana','Casa Verde','Mandaqui','Tucuruvi','Jaçanã','Tremembé',
  'Pirituba','Freguesia do Ó','Vila Guilherme','Cantareira','Brasilândia',
  'Lajeado','Horto Florestal','Cangaíba','Vila Medeiros','Vila Mazzei',
  'Jaçanã','Parque Edu Chaves','Imirim','Lauzane Paulista',
  // Zona Leste
  'Tatuapé','Penha','Belém','Mooca','Água Rasa','Vila Matilde',
  'Vila Formosa','Aricanduva','Anália Franco','Vila Prudente','Sapopemba',
  'São Miguel Paulista','Itaim Paulista','Ponte Rasa','Engenheiro Goulart',
  'Ermelino Matarazzo','José Bonifácio','Parque do Carmo','Penha de França',
  'Vila Carrão','Vila Constância','Artur Alvim','Cidade Patriarca',
  'Guaianases','Itaquera','José Bonifácio','Parque São Lucas',
  'São Mateus','Vila Jacuí','Iguatemi','Jardim Anália Franco',
];

// ─── Cidades onde o portal atua — alimenta o seletor de cidade da busca.
// Lista simples (sem agrupar por estado/região): a pessoa escolhe a cidade
// primeiro; só depois os bairros daquela cidade (com imóveis) aparecem —
// evita a ambiguidade de bairros com o mesmo nome em cidades diferentes
// (ex: "Centro" existe em várias). São Paulo fica sempre em primeiro por ser
// o mercado principal; o resto em ordem alfabética.
// UF e coordenadas aproximadas (centro da cidade) — alimenta a sigla exibida
// no seletor e o flyTo do mapa quando a pessoa escolhe uma cidade (sem isso,
// o mapa ficava parado no centro de São Paulo e os pins da cidade escolhida
// ficavam fora da área visível).
export const CIDADE_INFO: Record<string, { uf: string; lat: number; lng: number }> = {
  'São Paulo':                { uf: 'SP', lat: -23.5505, lng: -46.6333 },
  'Americana':                { uf: 'SP', lat: -22.7375, lng: -47.3308 },
  'Balneário Camboriú':       { uf: 'SC', lat: -26.9906, lng: -48.6349 },
  'Barueri':                  { uf: 'SP', lat: -23.5106, lng: -46.8761 },
  'Bombinhas':                { uf: 'SC', lat: -27.1447, lng: -48.4844 },
  'Campinas':                 { uf: 'SP', lat: -22.9099, lng: -47.0626 },
  'Capão da Canoa':           { uf: 'RS', lat: -29.7458, lng: -50.0111 },
  'Carapicuíba':              { uf: 'SP', lat: -23.5225, lng: -46.8356 },
  'Cotia':                    { uf: 'SP', lat: -23.6031, lng: -46.9189 },
  'Curitiba':                 { uf: 'PR', lat: -25.4284, lng: -49.2733 },
  'Diadema':                  { uf: 'SP', lat: -23.6858, lng: -46.6228 },
  'Embu das Artes':           { uf: 'SP', lat: -23.6486, lng: -46.8525 },
  'Ferraz de Vasconcelos':    { uf: 'SP', lat: -23.5406, lng: -46.3689 },
  'Florianópolis':            { uf: 'SC', lat: -27.5954, lng: -48.5480 },
  'Guarulhos':                { uf: 'SP', lat: -23.4628, lng: -46.5333 },
  'Hortolândia':              { uf: 'SP', lat: -22.8583, lng: -47.2200 },
  'Itajaí':                   { uf: 'SC', lat: -26.9078, lng: -48.6614 },
  'Itapema':                  { uf: 'SC', lat: -27.0894, lng: -48.6111 },
  'Itapevi':                  { uf: 'SP', lat: -23.5489, lng: -46.9339 },
  'Itaquaquecetuba':          { uf: 'SP', lat: -23.4864, lng: -46.3486 },
  'Jandira':                  { uf: 'SP', lat: -23.5272, lng: -46.9017 },
  'Mauá':                     { uf: 'SP', lat: -23.6678, lng: -46.4614 },
  'Mogi das Cruzes':          { uf: 'SP', lat: -23.5228, lng: -46.1883 },
  'Osasco':                   { uf: 'SP', lat: -23.5325, lng: -46.7917 },
  'Paulínia':                 { uf: 'SP', lat: -22.7614, lng: -47.1544 },
  'Poá':                      { uf: 'SP', lat: -23.5325, lng: -46.3450 },
  'Porto Alegre':             { uf: 'RS', lat: -30.0346, lng: -51.2177 },
  'Porto Belo':               { uf: 'SC', lat: -27.1578, lng: -48.5486 },
  'Ribeirão Pires':           { uf: 'SP', lat: -23.7114, lng: -46.4131 },
  'Rio de Janeiro':           { uf: 'RJ', lat: -22.9068, lng: -43.1729 },
  "Santa Bárbara D'Oeste":    { uf: 'SP', lat: -22.7550, lng: -47.4142 },
  'Santana de Parnaíba':      { uf: 'SP', lat: -23.4444, lng: -46.9186 },
  'Santo André':              { uf: 'SP', lat: -23.6639, lng: -46.5383 },
  'São Bernardo do Campo':    { uf: 'SP', lat: -23.6944, lng: -46.5654 },
  'São Caetano do Sul':       { uf: 'SP', lat: -23.6229, lng: -46.5547 },
  'Suzano':                   { uf: 'SP', lat: -23.5425, lng: -46.3108 },
  'Taboão da Serra':          { uf: 'SP', lat: -23.6086, lng: -46.7522 },
  'Valinhos':                 { uf: 'SP', lat: -22.9711, lng: -46.9958 },
  'Vargem Grande Paulista':   { uf: 'SP', lat: -23.6003, lng: -47.0225 },
};

export const CIDADES_BUSCA: string[] = [
  'São Paulo',
  'Americana','Balneário Camboriú','Barueri','Bombinhas','Campinas','Capão da Canoa',
  'Carapicuíba','Cotia','Curitiba','Diadema','Embu das Artes','Ferraz de Vasconcelos','Florianópolis',
  'Guarulhos','Hortolândia','Itajaí','Itapema','Itapevi','Itaquaquecetuba','Jandira','Mauá',
  'Mogi das Cruzes','Osasco','Paulínia','Poá','Porto Alegre','Porto Belo','Ribeirão Pires',
  'Rio de Janeiro',"Santa Bárbara D'Oeste",'Santana de Parnaíba','Santo André','São Bernardo do Campo',
  'São Caetano do Sul','Suzano','Taboão da Serra','Valinhos','Vargem Grande Paulista',
];

// Normaliza string para comparação: minúsculo, sem acentos
export function normStr(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s]/g, '');
}

// O campo `street` do catálogo nunca inclui o tipo de logradouro ("Cesar
// Vallejo", nunca "Rua Cesar Vallejo") — mas é assim que as pessoas digitam
// na prática. Sem isso, buscar "Rua Augusta" não achava nada mesmo com
// "Augusta" existindo, porque a frase inteira precisava bater. Aplicado só
// na comparação (query normalizada), nunca no texto exibido/digitado.
export function stripTipoLogradouro(qNorm: string): string {
  return qNorm.replace(/^(rua|r|avenida|av|alameda|al|travessa|tv|praca|pca|largo|estrada|rodovia|via)\s+/, '').trim();
}
