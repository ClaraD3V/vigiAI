#!/usr/bin/env node
/**
 * vigiAI Agent v2 - Agente Inteligente Completo
 * Busca usuários em editais de concursos usando:
 * - Playwright (automação browser)
 * - LLM OpenRouter (decisões)
 * - Claude Vision (OCR)
 */

require("dotenv").config();
const { chromium } = require("playwright");
const { extractTextWithTesseract, findUserInText } = require("./src/llm/tesseractOcr.cjs");
const { sendEmail } = require("./src/notifications/email.cjs");

const config = {
  searchCity: "Santos",
  searchNumber: "11659",
  searchName: "JOSUEL DE JESUS MIRANDA",
  whatsappNumber: "5513982208272",
  baseUrl: "https://www.ibamsp-concursos.org.br",
};

let browser;

console.log(`\n${"=".repeat(70)}`);
console.log(`🤖 AGENTE vigiAI v2 - Buscando ${config.searchNumber} ${config.searchName}`);
console.log(`${"=".repeat(70)}\n`);

// ============================================================
// FASE 1: Navegação Inteligente
// ============================================================

async function phase1Navigation() {
  console.log("📱 FASE 1: Navegação Inteligente\n");

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log(`🔗 Acessando ${config.baseUrl}/index/todos/`);
    await page.goto(`${config.baseUrl}/index/todos/`, { waitUntil: "networkidle" });

    // Procurar e preencher busca
    console.log(`🔍 Buscando por: ${config.searchCity}`);
    const searchUrl = `${config.baseUrl}/index/todos/?busca=${encodeURIComponent(
      config.searchCity
    )}`;
    await page.goto(searchUrl, { waitUntil: "networkidle" });

    // Extrair editais
    console.log("📋 Extraindo lista de editais...");
    const editais = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll("h3 a").forEach((link) => {
        const href = link.getAttribute("href");
        const match = href?.match(/\/informacoes\/(\d+)\//);
        if (match) {
          items.push({
            id: match[1],
            title: link.textContent.trim(),
          });
        }
      });
      return items;
    });

    console.log(`✅ Encontrados ${editais.length} editais\n`);
    return { page, editais };
  } catch (error) {
    console.error("❌ Erro Fase 1:", error.message);
    throw error;
  }
}

// ============================================================
// FASE 2: Identificar Documento com LLM
// ============================================================

async function phase2IdentifyDocument(page, editalId, editalTitle) {
  try {
    // Acessar página do edital
    const editalUrl = `${config.baseUrl}/informacoes/${editalId}/`;
    await page.goto(editalUrl, { waitUntil: "networkidle" });

    // Extrair documentos
    const docs = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll("a[data-astv]").forEach((link) => {
        const label = link.getAttribute("data-astv") || "";
        const href = link.getAttribute("href") || "";
        if (href.includes(".pdf")) {
          items.push({ label, url: href });
        }
      });
      return items;
    });

    if (!docs.length) {
      console.log(`  ⚠️ Nenhum PDF encontrado`);
      return null;
    }

    console.log(`  📄 ${docs.length} documentos encontrados`);

    // Usar LLM para identificar classificação final
    const classificationDoc = await identifyWithLLM(docs, editalTitle);

    return classificationDoc;
  } catch (error) {
    console.error(`  ❌ Erro ao processar edital ${editalId}:`, error.message);
    return null;
  }
}

async function identifyWithLLM(docs, editalTitle) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  // Fallback: sem chave, usar regex
  if (!apiKey || apiKey.trim() === "") {
    console.log("  Sem LLM, procurando por Classificacao Final...");
    // APENAS classificação final, nunca isenção/recurso
    const keywords = ["classificação final", "divulgação de classificação"];
    for (const keyword of keywords) {
      const found = docs.find((d) => {
        const lower = d.label.toLowerCase();
        return lower.includes(keyword) && !lower.includes("isenção");
      });
      if (found) {
        console.log(`  ✓ Encontrado: ${found.label}`);
        return found;
      }
    }
    console.log("  Nenhum documento de Classificacao Final encontrado");
    return null;
  }

  try {
    console.log("  🤖 Usando LLM para identificar...");

    const prompt = `Análise de edital: ${editalTitle}

Documentos disponíveis:
${docs.map((d) => `- ${d.label}`).join("\n")}

Qual é o documento de "Classificação Final" ou "Resultado de Classificação"?
Responda APENAS com o nome exato ou "NENHUM".`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://vigiAI.local",
        "X-Title": "vigiAI Agent",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      // Fallback para regex
      const keywords = ["classificação final", "divulgação de classificação"];
      for (const keyword of keywords) {
        const found = docs.find((d) => {
          const lower = d.label.toLowerCase();
          return lower.includes(keyword) && !lower.includes("isenção");
        });
        if (found) {
          console.log(`  ✓ Encontrado: ${found.label}`);
          return found;
        }
      }
      return null;
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content?.trim() || "";

    if (answer === "NENHUM") {
      console.log("  ❌ LLM: nenhum documento de classificação");
      return null;
    }

    const found = docs.find((d) =>
      d.label.toLowerCase().includes(answer.toLowerCase())
    );
    if (found) {
      console.log(`  ✓ LLM identificou: ${found.label}`);
      return found;
    }

    // Fallback se LLM respondeu algo estranho
    const partial = docs.find((d) =>
      d.label.toLowerCase().includes("classificação")
    );
    if (partial) {
      console.log(`  ✓ Match parcial: ${partial.label}`);
      return partial;
    }

    return null;
  } catch (error) {
    console.error("  ⚠️ Erro LLM:", error.message);
    // Fallback para regex
    const keywords = [
      "classificação final",
      "divulgação de classificação",
      "resultado",
    ];
    for (const keyword of keywords) {
      const found = docs.find((d) =>
        d.label.toLowerCase().includes(keyword)
      );
      if (found) {
        console.log(`  ✓ Fallback (erro): ${found.label}`);
        return found;
      }
    }
    return null;
  }
}

// ============================================================
// FASE 3: OCR com Tesseract.js (100% Gratuito)
// ============================================================

async function phase3ExtractWithOCR(pdfUrl, editalTitle) {
  console.log(`  👁️ FASE 3: OCR com Tesseract (gratuito)\n`);

  // Extrair texto do PDF
  const text = await extractTextWithTesseract(pdfUrl, 10);

  if (!text || text.trim().length === 0) {
    console.log("    ⚠️ Nenhum texto extraível");
    return null;
  }

  // Procurar pelo usuário
  const result = await findUserInText(text, config.searchNumber, config.searchName);

  return result;
}

// ============================================================
// FASE 4: Notificação e Cadastro
// ============================================================

async function phase4NotifyAndStore(foundUser) {
  console.log(`\n📧 FASE 4: Notificação por Email\n`);

  // Email
  console.log(`📧 Enviando email...`);
  const subject = `✅ Aprovado no Edital - Inscrição ${foundUser.numero_inscricao}`;
  const message = `Olá ${foundUser.nome},\n\n` +
    `Você foi APROVADO no edital!\n\n` +
    `📋 Inscrição: ${foundUser.numero_inscricao}\n` +
    `🎯 Nome: ${foundUser.nome}\n` +
    `📄 Edital: ${foundUser.editalTitle}\n\n` +
    `Documento: ${foundUser.documentUrl}\n\n` +
    `Confira os detalhes no portal do IBAMSP.`;

  await sendEmail("rianvinicius9@gmail.com", subject, message);
  console.log("✅ Email enviado");

  // Banco de dados (estrutura)
  console.log(`\n💾 Dados prontos para Supabase:`);
  console.log(JSON.stringify(
    {
      fullName: foundUser.nome,
      registrationNumber: foundUser.numero_inscricao,
      city: config.searchCity,
      status: "ativo",
      whatsappPhone: config.whatsappNumber,
      foundIn: {
        editalTitle: foundUser.editalTitle,
        documentUrl: foundUser.documentUrl,
      },
      discoveredAt: new Date().toISOString(),
    },
    null,
    2
  ));
}

// ============================================================
// ORQUESTRAÇÃO PRINCIPAL
// ============================================================

async function main() {
  try {
    // Fase 1
    const { page, editais } = await phase1Navigation();

    let foundUser = null;

    // Loop por editais
    for (const edital of editais) {
      // Processa TODOS os editais, não só 5
      console.log(`\n🔎 Edital ${edital.id}: ${edital.title}`);

      // Fase 2
      const classificationDoc = await phase2IdentifyDocument(
        page,
        edital.id,
        edital.title
      );

      if (!classificationDoc) continue;

      // Fase 3
      const user = await phase3ExtractWithOCR(
        classificationDoc.url,
        edital.title
      );

      if (user && user.encontrado) {
        foundUser = {
          ...user,
          editalTitle: edital.title,
          documentUrl: classificationDoc.url,
        };
        break;
      }
    }

    // Resultados
    console.log("\n" + "=".repeat(70));
    if (foundUser) {
      console.log("✅ USUÁRIO ENCONTRADO!");
      console.log(JSON.stringify(foundUser, null, 2));

      // Fase 4
      await phase4NotifyAndStore(foundUser);
    } else {
      console.log("❌ Usuário não encontrado nos editais processados");
      console.log("\n💡 Próximas ações:");
      console.log("  1. Verificar se PDFs têm texto extraível");
      console.log("  2. Aumentar número de editais verificados");
      console.log("  3. Configurar OPENROUTER_API_KEY para melhorar");
    }
    console.log("=".repeat(70) + "\n");

    // Cleanup
    await page.close();
    await browser.close();
  } catch (error) {
    console.error("\n❌ Erro fatal:", error.message);
    if (browser) await browser.close();
    process.exit(1);
  }
}

// Executar
main();
