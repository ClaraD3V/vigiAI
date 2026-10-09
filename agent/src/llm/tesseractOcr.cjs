/**
 * Extração de texto de PDFs
 * Usa pdfjs-dist com worker local
 */

const pdfjs = require("pdfjs-dist");
const path = require("path");

// Usar arquivo local do worker, não CDN
pdfjs.GlobalWorkerOptions.workerSrc = path.join(
  require.resolve("pdfjs-dist/build/pdf.worker.js")
);

async function extractTextWithTesseract(pdfUrl, maxPages = 3) {
  try {
    console.log("    👁️ Extraindo texto do PDF...");

    // 1. Baixar PDF
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      console.log(`    ⚠️ Erro ao baixar: HTTP ${response.status}`);
      return null;
    }

    const pdfBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`    📥 PDF baixado (${pdfBuffer.length} bytes)`);

    // 2. Usar pdfjs para extrair texto
    try {
      // pdfjs quer Uint8Array, não Buffer
      const uint8Array = new Uint8Array(pdfBuffer);
      const pdf = await pdfjs.getDocument(uint8Array).promise;
      const pagesToProcess = Math.min(maxPages, pdf.numPages);

      console.log(`    📄 Processando ${pagesToProcess} páginas...`);

      let allText = "";

      for (let i = 1; i <= pagesToProcess; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item) => item.str)
            .join(" ");

          if (pageText.trim().length > 0) {
            allText += `\n--- Página ${i} ---\n${pageText}`;
            console.log(
              `    ✓ Página ${i}: ${pageText.substring(0, 50)}...`
            );
          } else {
            console.log(`    ℹ️ Página ${i}: sem texto`);
          }
        } catch (pageError) {
          console.log(`    ⚠️ Erro na página ${i}`);
        }
      }

      if (allText.trim().length > 0) {
        console.log(`    ✅ Texto extraído (${allText.length} caracteres)`);
        return allText;
      }

      console.log("    ℹ️ Nenhum texto encontrado no PDF");
      return null;
    } catch (pdfError) {
      console.log("    ⚠️ Erro ao processar PDF:", pdfError.message);
      return null;
    }
  } catch (error) {
    console.error("    ❌ Erro extração:", error.message);
    return null;
  }
}

async function findUserInText(text, searchNumber, searchName) {
  if (!text) return null;

  const textUpper = text.toUpperCase();
  const numberFound = text.includes(searchNumber);
  const nameFound = textUpper.includes(searchName.toUpperCase());

  if (numberFound && nameFound) {
    // Extrair contexto (linha onde foi encontrado)
    const lines = text.split("\n");
    const context = lines
      .filter(
        (line) =>
          line.toUpperCase().includes(searchName.toUpperCase()) ||
          line.includes(searchNumber)
      )
      .slice(0, 3)
      .join("\n");

    return {
      encontrado: true,
      numero_inscricao: searchNumber,
      nome: searchName,
      contexto: context,
    };
  }

  return null;
}

module.exports = {
  extractTextWithTesseract,
  findUserInText,
};

