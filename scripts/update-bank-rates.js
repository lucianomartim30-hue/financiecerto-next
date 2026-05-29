#!/usr/bin/env node
/**
 * update-bank-rates.js
 *
 * 1. Busca a taxa média de crédito imobiliário SFH no BCB (Série 20714)
 * 2. Compara com TAXA_SBPE_ANUAL em lib/calculos.ts
 * 3. Se a diferença for > 0.3 p.p., busca a taxa real da Caixa via Playwright
 * 4. Se confirmada mudança, atualiza BANCOS_SBPE e TAXA_SBPE_ANUAL em calculos.ts
 *    e cria relatório de mudança.
 *
 * Uso:
 *   node scripts/update-bank-rates.js           # atualização completa
 *   node scripts/update-bank-rates.js --dry-run  # só mostra o que mudaria
 *   node scripts/update-bank-rates.js --signal-only  # só verifica sinal BCB
 */

'use strict';

const fs      = require('fs');
const https   = require('https');
const path    = require('path');

const CALCULOS_PATH = path.join(__dirname, '..', 'lib', 'calculos.ts');
const DRY_RUN       = process.argv.includes('--dry-run');
const SIGNAL_ONLY   = process.argv.includes('--signal-only');
const THRESHOLD_PP  = 0.30; // diferença mínima (p.p.) para disparar atualização

// ─── BCB Série 20714: taxa média SFH poupança PF ─────────────────────────────
const BCB_SERIE_URL =
  'https://api.bcb.gov.br/dados/serie/bcdata.sgs.20714/dados/ultimos/3?formato=json';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'financiecerto-rate-monitor/1.0' } }, res => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} em ${url}`));
        res.resume();
        return;
      }
      let raw = '';
      res.on('data', c => { raw += c; });
      res.on('end', () => {
        try   { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error(`JSON inválido: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

/** Extrai o valor de TAXA_SBPE_ANUAL do arquivo calculos.ts */
function lerTaxaAtual(conteudo) {
  const m = conteudo.match(/export const TAXA_SBPE_ANUAL\s*=\s*([\d.]+)/);
  if (!m) throw new Error('TAXA_SBPE_ANUAL não encontrada em calculos.ts');
  return parseFloat(m[1]);
}

/** Converte taxa mensal BCB → anual (capitalização composta) */
function mensalParaAnual(taxaMensal) {
  return ((1 + taxaMensal / 100) ** 12 - 1) * 100;
}

// ─── Etapa 1: Sinal BCB ───────────────────────────────────────────────────────
async function verificarSinalBCB() {
  console.log('📡 Buscando taxa média SFH no BCB (Série 20714)...');
  const dados = await fetchJSON(BCB_SERIE_URL);

  if (!Array.isArray(dados) || dados.length === 0) {
    throw new Error('BCB retornou dados vazios para Série 20714');
  }

  // Último registro disponível
  const ultimo      = dados[dados.length - 1];
  const taxaMensal  = parseFloat(ultimo.valor);
  const taxaAnual   = mensalParaAnual(taxaMensal);

  console.log(`   Último dado BCB: ${ultimo.data} | ${taxaMensal.toFixed(4)}% a.m. → ${taxaAnual.toFixed(2)}% a.a.`);

  return { taxaAnual, referencia: ultimo.data };
}

// ─── Etapa 2: Caixa via Playwright ───────────────────────────────────────────
async function buscarTaxaCaixaPlaywright() {
  console.log('\n🌐 Abrindo simulador da Caixa via Playwright...');

  let playwright, browser;
  try {
    playwright = require('playwright');
  } catch {
    console.warn('⚠️  Playwright não instalado. Pulando etapa de scraping da Caixa.');
    console.warn('   Execute: npx playwright install chromium --with-deps');
    return null;
  }

  browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Página de taxas vigentes da Caixa
    await page.goto(
      'https://www.caixa.gov.br/voce/habitacao/financiamento-habitacional/taxas-juros-modalidades-vigentes/paginas/default.aspx',
      { waitUntil: 'networkidle', timeout: 30000 },
    );

    // Tenta extrair taxa pelo texto da página
    const texto = await page.innerText('body');
    const taxas = [];

    // Padrões: "10,50" / "11,19" / "10.50" — procura porcentagens na faixa 8-15%
    const regex = /\b((?:8|9|10|11|12|13|14)\d*[,.]?\d*)\s*%\s*a\.?a\.?/gi;
    let m;
    while ((m = regex.exec(texto)) !== null) {
      const v = parseFloat(m[1].replace(',', '.'));
      if (v >= 8 && v <= 15) taxas.push(v);
    }

    if (taxas.length === 0) {
      console.warn('⚠️  Não encontrei taxas no texto da página da Caixa.');
      return null;
    }

    // A menor taxa encontrada = correntista (referência)
    const taxaCorrentista = Math.min(...taxas);
    console.log(`   Taxas detectadas na página: ${[...new Set(taxas)].sort((a,b)=>a-b).join('%, ')}%`);
    console.log(`   → Taxa correntista identificada: ${taxaCorrentista}% a.a.`);

    return taxaCorrentista;

  } finally {
    await browser.close();
  }
}

// ─── Etapa 3: Atualizar calculos.ts ──────────────────────────────────────────
function atualizarTaxaCaixa(conteudo, novaTaxa, taxaBalcao) {
  let novo = conteudo;

  // Atualiza TAXA_SBPE_ANUAL
  novo = novo.replace(
    /export const TAXA_SBPE_ANUAL\s*=\s*[\d.]+/,
    `export const TAXA_SBPE_ANUAL   = ${novaTaxa.toFixed(2)}`,
  );

  // Atualiza Caixa correntista no BANCOS_SBPE
  novo = novo.replace(
    /(\{ banco: 'Caixa Econômica Federal',\s*taxa: )[\d.]+/,
    `$1${novaTaxa.toFixed(2)}`,
  );

  // Atualiza Caixa balcão (correntista + 0.30 p.p. como referência)
  if (taxaBalcao) {
    novo = novo.replace(
      /(\{ banco: 'Caixa Econômica Federal',\s*taxa: [\d.]+[^}]*obs: 'Balcão[^}]*',\s*taxa:\s*)[\d.]+/,
      `$1${taxaBalcao.toFixed(2)}`,
    );
  }

  return novo;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const conteudo   = fs.readFileSync(CALCULOS_PATH, 'utf8');
  const taxaAtual  = lerTaxaAtual(conteudo);

  console.log(`\n💼 Taxa atual em calculos.ts: TAXA_SBPE_ANUAL = ${taxaAtual}% a.a.\n`);

  // Etapa 1: Sinal BCB
  const { taxaAnual: mediaBCB, referencia } = await verificarSinalBCB();
  const diferenca = Math.abs(mediaBCB - taxaAtual);

  console.log(`\n📊 Comparação:`);
  console.log(`   Média mercado BCB (${referencia}): ${mediaBCB.toFixed(2)}% a.a.`);
  console.log(`   Referência Caixa no código:        ${taxaAtual.toFixed(2)}% a.a.`);
  console.log(`   Diferença:                         ${diferenca.toFixed(2)} p.p.`);

  if (diferenca < THRESHOLD_PP) {
    console.log(`\n✅ Diferença (${diferenca.toFixed(2)} p.p.) abaixo do limiar (${THRESHOLD_PP} p.p.) — nenhuma atualização necessária.`);
    process.exit(0);
  }

  console.log(`\n⚠️  Diferença de ${diferenca.toFixed(2)} p.p. detectada — verificando taxa real da Caixa...`);

  if (SIGNAL_ONLY) {
    console.log('\n[--signal-only] Parando aqui. Execute sem a flag para atualizar.');
    process.exit(2); // exit 2 = sinal detectado, mas sem atualização
  }

  // Etapa 2: Taxa real da Caixa
  const novaTaxaCaixa = await buscarTaxaCaixaPlaywright();

  if (!novaTaxaCaixa) {
    console.log('\n❌ Não foi possível obter a taxa real da Caixa. Nenhum arquivo alterado.');
    console.log('   Verifique manualmente: https://www.caixa.gov.br/taxas-vigentes');
    process.exit(1);
  }

  const mudancaCaixa = Math.abs(novaTaxaCaixa - taxaAtual);
  if (mudancaCaixa < 0.05) {
    console.log(`\n✅ Taxa Caixa confirmada como ${novaTaxaCaixa}% — diferença mínima, sem alteração necessária.`);
    process.exit(0);
  }

  const taxaBalcao = parseFloat((novaTaxaCaixa + 0.30).toFixed(2));
  console.log(`\n📝 Nova taxa detectada: ${novaTaxaCaixa}% a.a. (correntista) | ${taxaBalcao}% a.a. (balcão)`);

  if (DRY_RUN) {
    console.log('\n[--dry-run] Nenhum arquivo alterado. Valores que seriam aplicados:');
    console.log(`  TAXA_SBPE_ANUAL: ${taxaAtual} → ${novaTaxaCaixa}`);
    process.exit(0);
  }

  // Etapa 3: Atualiza arquivo
  const novoConteudo = atualizarTaxaCaixa(conteudo, novaTaxaCaixa, taxaBalcao);

  if (novoConteudo === conteudo) {
    console.warn('\n⚠️  Substituição não aplicada — verifique os padrões de regex em update-bank-rates.js');
    process.exit(1);
  }

  fs.writeFileSync(CALCULOS_PATH, novoConteudo, 'utf8');

  const hoje  = new Date();
  const label = `${hoje.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`;
  console.log(`\n✅ lib/calculos.ts atualizado — Caixa ${taxaAtual}% → ${novaTaxaCaixa}% a.a. (${label})`);
  console.log('\n⚠️  ATENÇÃO: Verifique manualmente as taxas dos outros bancos:');
  console.log('   Bradesco: https://banco.bradesco/html/classic/produtos-servicos/financiamentos');
  console.log('   Itaú:     https://www.itau.com.br/creditos/financiamentos-e-emprestimos');
  console.log('   Santander:https://www.santander.com.br/financiamentos');
  console.log('   BB:       https://www.bb.com.br/financiamento-imobiliario');
}

main().catch(err => {
  console.error(`\n❌ Erro: ${err.message}`);
  process.exit(1);
});
