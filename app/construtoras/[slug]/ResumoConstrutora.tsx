/**
 * Resumo em texto da construtora, gerado no servidor a partir do catálogo.
 * O Search Console marcava dezenas de páginas de construtora como "rastreada, mas
 * não indexada": só tinham uma grade de cartões e uma frase genérica, sem
 * conteúdo próprio. Aqui cada página ganha texto único (números reais dela) e
 * links pros bairros onde a construtora tem empreendimentos.
 */
import Link from 'next/link';
import type { GrupoConstrutora } from '@/lib/construtoras-catalogo';
import { temPrecoReal } from '@/lib/filtro-breve-lancamento';
import { neighborhoodToSlug, slugToLocation } from '@/lib/locations';
import { bairroSlugsValidos } from '@/lib/bairros-validos';

function brl(v: number): string {
  return 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

function lista(itens: string[]): string {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

export default async function ResumoConstrutora({ construtora }: { construtora: GrupoConstrutora }) {
  const imoveis = construtora.imoveis;
  const total = imoveis.length;
  const porStatus = {
    planta: imoveis.filter(i => i.status_norm === 'na planta').length,
    obras: imoveis.filter(i => i.status_norm === 'em obras').length,
    pronto: imoveis.filter(i => i.status_norm === 'pronto').length,
  };
  const comPreco = imoveis.filter(i => temPrecoReal({ min_price: i.min_price }));
  const maisBarato = comPreco.length
    ? comPreco.reduce((a, b) => (a.min_price! <= b.min_price! ? a : b))
    : null;
  const maisCaro = comPreco.length
    ? comPreco.reduce((a, b) => ((a.min_price ?? 0) >= (b.min_price ?? 0) ? a : b))
    : null;

  const estagios = [
    porStatus.planta > 0 && `${porStatus.planta} na planta ou em lançamento`,
    porStatus.obras > 0 && `${porStatus.obras} em obras`,
    porStatus.pronto > 0 && `${porStatus.pronto} prontos para morar`,
  ].filter((x): x is string => !!x);

  let bairrosComPagina: Array<{ slug: string; nome: string }> = [];
  try {
    const validos = await bairroSlugsValidos();
    const vistos = new Set<string>();
    for (const i of imoveis) {
      if (!i.neighborhood || !i.state) continue;
      const slug = neighborhoodToSlug(i.neighborhood, i.state);
      if (vistos.has(slug) || !slugToLocation(slug).city || !validos.has(slug)) continue;
      vistos.add(slug);
      bairrosComPagina.push({ slug, nome: i.neighborhood });
    }
    bairrosComPagina = bairrosComPagina.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).slice(0, 24);
  } catch {
    bairrosComPagina = [];
  }

  return (
    <section aria-label={`Sobre a ${construtora.nome}`} style={{ margin: '28px 0 6px', maxWidth: '850px' }}>
      <h2 style={{ fontSize: '20px', color: 'var(--text)', marginBottom: '10px' }}>
        {construtora.nome}: empreendimentos, preços e onde estão
      </h2>
      <p style={{ color: 'var(--text)', lineHeight: 1.7, marginBottom: '10px' }}>
        {`A ${construtora.nome} tem ${total} ${total === 1 ? 'empreendimento' : 'empreendimentos'} no catálogo do FinancieCerto`}
        {construtora.cidades.length > 0 && `, em ${lista(construtora.cidades.slice(0, 5))}${construtora.cidades.length > 5 ? ' e outras cidades' : ''}`}
        {'. '}
        {estagios.length > 0 && `Desses, ${lista(estagios)}. `}
        {maisBarato && `Os preços começam em ${brl(maisBarato.min_price!)}, no ${maisBarato.name}`}
        {maisBarato && maisCaro && maisCaro.id !== maisBarato.id && maisCaro.min_price! > maisBarato.min_price!
          ? `; o maior valor inicial é ${brl(maisCaro.min_price!)}, no ${maisCaro.name}.`
          : maisBarato ? '.' : ''}
      </p>
      <p style={{ color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '10px' }}>
        Antes de escolher, simule o financiamento com a sua renda: o resultado mostra se o seu perfil se encaixa no
        Minha Casa Minha Vida, no SBPE ou no SFI e qual parcela cabe no seu orçamento.
      </p>
      {bairrosComPagina.length > 0 && (
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.9, margin: 0 }}>
          Bairros com empreendimentos da {construtora.nome}:{' '}
          {bairrosComPagina.map((b, idx) => (
            <span key={b.slug}>
              <Link href={`/bairro/${b.slug}`} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>{b.nome}</Link>
              {idx < bairrosComPagina.length - 1 ? ', ' : '.'}
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
