"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const config = require("../config");
const { normalize } = require("../text/normalize");
const { getCachedPdfText } = require("../text/pdfTextCache");

const MAX_PAGES = 20;

const RESULT_KEYWORDS = ["HOMOLOGA", "CLASSIFICACAO FINAL", "RESULTADO", "CONVOCA", "APROVAD"];

function searchUrl(city, page) {
  return `${config.source.baseUrl}/index/todos/?busca=${encodeURIComponent(city)}&pg=${page}`;
}

function contestUrl(id) {
  return `${config.source.baseUrl}/informacoes/${id}/`;
}

async function fetchHtml(url, fetchImpl) {
  const response = await fetchImpl(url);
  if (!response.ok) return null;
  const buffer = Buffer.from(await response.arrayBuffer());
  // O site declara charset iso-8859-1, mas na prática usa windows-1252
  // (ex.: byte 0x96 = travessão "–", inválido em iso-8859-1 estrito).
  return new TextDecoder("windows-1252").decode(buffer);
}

function parseContestItems(html) {
  const items = [];
  const pattern = /<h3><a href="\/informacoes\/(\d+)\/"\s*>([^<]+)<\/a><\/h3>/g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    items.push({ id: match[1], title: match[2].trim() });
  }
  return items;
}

function hasNextPage(html) {
  return /class="proxima"/.test(html);
}

/**
 * Lista concursos de `city` usando o filtro server-side (`busca=`) do IBAM.
 * Pagina até não haver mais link "próxima" (cap de segurança em MAX_PAGES).
 */
async function listContests(city, { fetchImpl = fetch } = {}) {
  const seen = new Map();

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const html = await fetchHtml(searchUrl(city, page), fetchImpl);
    if (!html) break;

    const items = parseContestItems(html);
    if (items.length === 0) break;

    for (const item of items) seen.set(item.id, item);

    if (!hasNextPage(html)) break;
  }

  return [...seen.values()];
}

function parseStatus(html) {
  const match = html.match(/<p class="situacaoConcurso"><b>Situa[^<]*:<\/b>\s*([^<]+)<\/p>/);
  return match ? match[1].trim() : null;
}

function parseTitle(html) {
  const match = html.match(/<p class="tipo">[^<]*<\/p>\s*<h2>([^<]+)<\/h2>/);
  return match ? match[1].trim() : null;
}

function parseDocuments(html) {
  const documents = [];
  const tagPattern = /<a\b[^>]*>/g;
  let tagMatch;
  while ((tagMatch = tagPattern.exec(html)) !== null) {
    const tag = tagMatch[0];
    const labelMatch = tag.match(/data-astv="([^"]*)"/);
    const urlMatch = tag.match(/href="(https:\/\/anexos\.cdn\.selecao\.net\.br[^"]+\.pdf)"/);
    if (labelMatch && urlMatch) {
      documents.push({ label: labelMatch[1].trim(), url: urlMatch[1] });
    }
  }
  return documents;
}

/** Busca status + lista de documentos de um concurso específico. */
async function getContestDetail(id, { fetchImpl = fetch } = {}) {
  const html = await fetchHtml(contestUrl(id), fetchImpl);
  if (!html) return null;

  return {
    title: parseTitle(html),
    status: parseStatus(html),
    documents: parseDocuments(html)
  };
}

/**
 * Allowlist (não blocklist): só documentos cujo rótulo indique
 * homologação/classificação/resultado/convocação passam. Editais de
 * abertura, retificação, cronograma, isenção etc. nunca são baixados —
 * é isso que mantém o custo de banda/parsing baixo.
 */
function isResultDocument(label) {
  const normalized = normalize(label);
  return RESULT_KEYWORDS.some(keyword => normalized.includes(keyword));
}

function documentCacheKey(url) {
  return crypto.createHash("sha1").update(url).digest("hex");
}

const MIN_EXPECTED_TEXT_LENGTH = 50;

async function getDocumentText(url, { fetchImpl = fetch } = {}) {
  const text = await getCachedPdfText(documentCacheKey(url), url, { fetchImpl });
  // Alguns editais antigos são PDFs escaneados (imagem, sem camada de texto)
  // — pdf-parse não tem como extrair nomes deles. Sem OCR (fora de escopo),
  // o documento fica sem matching possível; avisamos em vez de falhar calado.
  if (text !== null && text.trim().length < MIN_EXPECTED_TEXT_LENGTH) {
    console.warn(`[ibamConcursos] documento sem texto extraível (provável PDF escaneado): ${url}`);
  }
  return text;
}

function documentsIndexFile(city) {
  return path.join(config.dataDir, "ibam", `documentos-${normalize(city)}.json`);
}

async function listKnownDocuments(city) {
  try {
    return JSON.parse(await fs.readFile(documentsIndexFile(city), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function isDocumentKnown(city, url) {
  const documents = await listKnownDocuments(city);
  return documents.some(doc => doc.url === url);
}

async function registerKnownDocument(city, document) {
  const file = documentsIndexFile(city);
  const documents = await listKnownDocuments(city);
  if (documents.some(doc => doc.url === document.url)) return;

  documents.push({ ...document, discoveredAt: new Date().toISOString() });
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(documents, null, 2), "utf8");
}

module.exports = {
  searchUrl,
  contestUrl,
  listContests,
  getContestDetail,
  isResultDocument,
  getDocumentText,
  listKnownDocuments,
  isDocumentKnown,
  registerKnownDocument
};
