import ImoveisClientPage from './ImoveisClientPage';
import { ListaHubsSEO } from '@/components/ListaImoveisSEO';
import { bairrosMaisImoveis, construtorasMaisImoveis } from '@/lib/imoveis-listagem-seo';

// A vitrine é client-side: o HTML inicial chegava ao Google com ~350 caracteres e
// nenhum link pra bairros, construtoras ou imóveis. Os links abaixo vão no HTML
// do servidor e dão caminho de rastreamento pro resto do catálogo.
export const revalidate = 1800;

export default async function ImoveisPage() {
  const [bairros, construtoras] = await Promise.all([bairrosMaisImoveis(), construtorasMaisImoveis()]);
  return (
    <>
      {/* H1 real pro Google e leitores de tela, visualmente oculto (o cabeçalho
          visual da vitrine é busca/filtros, não título de página). */}
      <h1 style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
        Imóveis e empreendimentos à venda com simulação de financiamento
      </h1>
      <ImoveisClientPage />
      <ListaHubsSEO
        titulo="Imóveis à venda por bairro"
        intro="Explore os bairros com mais empreendimentos à venda. Em cada um você vê os imóveis, os valores e simula o financiamento."
        links={bairros}
      />
      <ListaHubsSEO
        titulo="Imóveis por construtora"
        intro="Veja os empreendimentos das construtoras e incorporadoras com mais lançamentos no catálogo."
        links={construtoras}
      />
    </>
  );
}
