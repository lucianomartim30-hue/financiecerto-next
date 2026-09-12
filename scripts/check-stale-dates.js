#!/usr/bin/env node
/**
 * Verifica se sobrou algum mês/ano escrito à mão (ex.: "jul/2026") nos
 * arquivos mais sensíveis do site — o conhecimento do chatbot João e os
 * simuladores — que já são a fonte da TR/taxas mostradas ao usuário.
 *
 * Isso existe porque esse exato bug já aconteceu duas vezes: alguém escreve
 * "jul/2026" na mão em vez de usar mesAnoAtual()/TR_MENSAL, e meses depois
 * o site (ou o João) continua "falando" do mês antigo, sem ninguém notar.
 *
 * Não tenta adivinhar sozinho o que é "desatualizado" — datas de mudança de
 * regra (ex.: "teto atualizado em out/2025", "antes de abr/2026") são
 * legítimas e ficam de fora do escopo abaixo. O que importa é vasculhar só
 * os arquivos onde uma data solta tende a ser um valor "atual" esquecido.
 *
 * Uso:
 *   node scripts/check-stale-dates.js            → imprime achados
 *   node scripts/check-stale-dates.js --json      → saída em JSON (p/ CI)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Referências históricas já revisadas manualmente (datas de troca de regra,
// exemplos de contrato, comentários de código) — ficam de fora do alerta
// mensal enquanto a linha continuar exatamente igual. Se a linha mudar
// (mesmo um pouco), ela sai da lista e volta a ser reportada pra revisão.
const ALLOWLIST_PATH = path.join(__dirname, 'stale-dates-allowlist.json');
const allowlist = fs.existsSync(ALLOWLIST_PATH)
  ? JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'))
  : [];

function estaNaAllowlist(achado) {
  return allowlist.some(a =>
    a.arquivo === achado.arquivo && a.valor === achado.valor && a.trecho === achado.trecho
  );
}

// Arquivos onde uma data solta e desatualizada é o bug real de negócio:
// conhecimento do chatbot + telas dos simuladores. lib/calculos.ts fica de
// fora de propósito: TR_HISTORICO_36M guarda meses passados por definição.
const ALVOS = [
  'app/api/chat/route.ts',
  'app/simulador/page.tsx',
  'app/simulador/historico-tr/page.tsx',
  'app/imoveis/[id]/ImovelDetailClient.tsx',
];

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const REGEX_MES_ANO = new RegExp(`\\b(${MESES.join('|')})\\/(\\d{2}|\\d{4})\\b`, 'gi');

function mesAnoAtual() {
  const agora = new Date();
  return { mes: MESES[agora.getMonth()], ano: agora.getFullYear() };
}

function normalizaAno(anoStr) {
  return anoStr.length === 2 ? 2000 + parseInt(anoStr, 10) : parseInt(anoStr, 10);
}

function escanear() {
  const { mes: mesAtual, ano: anoAtual } = mesAnoAtual();
  const achados = [];

  for (const rel of ALVOS) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;

    const linhas = fs.readFileSync(abs, 'utf8').split('\n');
    linhas.forEach((linha, i) => {
      let m;
      REGEX_MES_ANO.lastIndex = 0;
      while ((m = REGEX_MES_ANO.exec(linha)) !== null) {
        const mesEncontrado = m[1].toLowerCase();
        const anoEncontrado = normalizaAno(m[2]);
        const ehMesAtual = mesEncontrado === mesAtual && anoEncontrado === anoAtual;
        achados.push({
          arquivo: rel,
          linha: i + 1,
          trecho: linha.trim().slice(0, 160),
          valor: m[0],
          ehMesAtual,
        });
      }
    });
  }

  return { mesAtual, anoAtual, achados };
}

function main() {
  const jsonMode = process.argv.includes('--json');
  const { mesAtual, anoAtual, achados } = escanear();

  // O que interessa reportar: datas que NÃO batem com o mês/ano de hoje e
  // que ainda não foram revisadas e aprovadas em stale-dates-allowlist.json.
  const suspeitos = achados.filter(a => !a.ehMesAtual && !estaNaAllowlist(a));

  if (jsonMode) {
    console.log(JSON.stringify({ mesAtual, anoAtual, suspeitos }, null, 2));
    return;
  }

  console.log(`Mês/ano atual: ${mesAtual}/${anoAtual}`);
  console.log(`Arquivos verificados: ${ALVOS.length}`);
  console.log(`Datas encontradas: ${achados.length} (${suspeitos.length} não batem com o mês atual)\n`);

  if (suspeitos.length === 0) {
    console.log('✅ Nenhuma data suspeita encontrada.');
    return;
  }

  for (const s of suspeitos) {
    console.log(`⚠️  ${s.arquivo}:${s.linha} — "${s.valor}"`);
    console.log(`    ${s.trecho}`);
  }
}

main();
