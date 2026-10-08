"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const config = require("../config");
const { extractPdfText } = require("./extractPdfText");

function cachePath(cacheKey) {
  return path.join(config.dataDir, "cache", "pdf", `${cacheKey}.txt`);
}

async function readCache(cacheKey) {
  try {
    return await fs.readFile(cachePath(cacheKey), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function writeCache(cacheKey, text) {
  const file = cachePath(cacheKey);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, text, "utf8");
}

/**
 * Baixa e extrai o texto de um PDF uma única vez por `cacheKey`, cacheando em
 * disco. Qualquer chamada futura com a mesma chave lê do cache, sem rede.
 */
async function getCachedPdfText(cacheKey, url, { fetchImpl = fetch } = {}) {
  const cached = await readCache(cacheKey);
  if (cached !== null) return cached;

  const response = await fetchImpl(url);
  if (!response.ok) return null;

  const buffer = Buffer.from(await response.arrayBuffer());
  let text;
  try {
    text = await extractPdfText(buffer);
  } catch (error) {
    // Alguns PDFs vêm corrompidos/malformados (ex.: "bad XRef entry") e o
    // parser não consegue nem abrir o arquivo. Tratamos como "sem texto"
    // (mesmo caminho dos PDFs escaneados) em vez de derrubar a sincronização
    // inteira, e cacheamos o resultado vazio para não re-baixar a cada ciclo.
    console.warn(`[pdfTextCache] falha ao extrair texto de ${url}: ${error.message}`);
    text = "";
  }
  await writeCache(cacheKey, text);
  return text;
}

module.exports = { getCachedPdfText };
