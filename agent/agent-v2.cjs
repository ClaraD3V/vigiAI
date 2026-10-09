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
const { sendWhatsApp } = require("./src/notifications/whatsapp.cjs");

const config = {
  searchCity: "Santos",
  searchNumber: "11659",
  searchName: "JOSUEL DE JESUS MIRANDA",
  // searchNumber: "11254",
  // searchName: "MARINA DE JESUS SOARES",
  baseUrl: "https://www.ibamsp-concursos.org.br",
  whatsappNumber: process.env.WHATSAPP_PHONE,
};

let browser;

// ============================================================
// SISTEMA DE LOGS ESTRUTURADO
// ============================================================

class Logger {
  constructor() {
    this.startTime = Date.now();
  }

  header() {
    console.log("\n" + "═".repeat(70));
    console.log(`🤖 vigiAI Agent v2 | Busca Inteligente`);
    console.log(`   Target: ${config.searchName} (${config.searchNumber})`);
    console.log(`   Cidade: ${config.searchCity}`);
    console.log("═".repeat(70) + "\n");
  }

  phase(number, name) {
    const elapsed = this.elapsed();
    console.log(`\n[${elapsed}] ⏳ FASE ${number}: ${name}`);
    console.log("─".repeat(70));
  }

  step(text, status = "info") {
    const icons = {
      info: "   └─",
      loading: "   ⏳",
      success: "   ✅",
      error: "   ❌",
      warning: "   ⚠️ ",
    };
    console.log(`${icons[status]} ${text}`);
  }

  result(title, value) {
    console.log(`   📊 ${title}: ${value}`);
  }

  success(text) {
    const elapsed = this.elapsed();
    console.log(`\n[${elapsed}] ✅ ${text}`);
  }

  error(text) {
    const elapsed = this.elapsed();
    console.log(`\n[${elapsed}] ❌ ${text}`);
  }

  section(text) {
    console.log(`\n📋 ${text}`);
  }

  elapsed() {
    const ms = Date.now() - this.startTime;
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(min).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  separator() {
    console.log("═".repeat(70));
  }

  jsonData(data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

const log = new Logger();
log.header();

// ============================================================
// FASE 1: Navegação Inteligente
// ============================================================

async function phase1Navigation() {
  log.phase(1, "Navegação Inteligente");

  try {
    log.step("Iniciando navegador Chromium...", "loading");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    log.step("Navegador iniciado", "success");

    log.step(`Acessando ${config.baseUrl}/index/todos/`, "loading");
    await page.goto(`${config.baseUrl}/index/todos/`, { waitUntil: "networkidle" });
    log.step("Página carregada", "success");

    log.step(`Filtrando por cidade: ${config.searchCity}`, "loading");
    const searchUrl = `${config.baseUrl}/index/todos/?busca=${encodeURIComponent(
      config.searchCity
    )}`;
    await page.goto(searchUrl, { waitUntil: "networkidle" });
    log.step("Filtro aplicado", "success");

    log.step("Extraindo lista de editais...", "loading");
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

    log.result("Editais encontrados", editais.length);
    return { page, editais };
  } catch (error) {
    log.error(`Erro na Fase 1: ${error.message}`);
    throw error;
  }
}

// ============================================================
// FASE 2: Identificar Documento com LLM
// ============================================================

async function phase2IdentifyDocument(page, editalId, editalTitle, current, total) {
  try {
    log.step(`[${current}/${total}] ${editalTitle}`, "loading");

    const editalUrl = `${config.baseUrl}/informacoes/${editalId}/`;
    await page.goto(editalUrl, { waitUntil: "networkidle" });

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
      log.step("Nenhum PDF encontrado", "warning");
      return null;
    }

    log.result("PDFs identificados", docs.length);
    const classificationDoc = await identifyWithLLM(docs, editalTitle);
    return classificationDoc;
  } catch (error) {
    log.step(`Erro ao processar edital: ${error.message}`, "error");
    return null;
  }
}

async function identifyWithLLM(docs, editalTitle) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    log.step("LLM não configurado, usando regex", "warning");
    const keywords = ["classificação final", "divulgação de classificação"];
    for (const keyword of keywords) {
      const found = docs.find((d) => {
        const lower = d.label.toLowerCase();
        return lower.includes(keyword) && !lower.includes("isenção");
      });
      if (found) {
        log.step(`Encontrado (regex): ${found.label}`, "success");
        return found;
      }
    }
    log.step("Nenhum documento de classificação encontrado", "warning");
    return null;
  }

  try {
    log.step("Analisando com LLM...", "loading");

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
      const keywords = ["classificação final", "divulgação de classificação"];
      for (const keyword of keywords) {
        const found = docs.find((d) => {
          const lower = d.label.toLowerCase();
          return lower.includes(keyword) && !lower.includes("isenção");
        });
        if (found) {
          log.step(`Encontrado (fallback): ${found.label}`, "success");
          return found;
        }
      }
      return null;
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content?.trim() || "";

    if (answer === "NENHUM") {
      log.step("LLM: nenhum documento de classificação", "warning");
      return null;
    }

    const found = docs.find((d) =>
      d.label.toLowerCase().includes(answer.toLowerCase())
    );
    if (found) {
      log.step(`LLM identificou: ${found.label}`, "success");
      return found;
    }

    const partial = docs.find((d) =>
      d.label.toLowerCase().includes("classificação")
    );
    if (partial) {
      log.step(`Match parcial: ${partial.label}`, "success");
      return partial;
    }

    return null;
  } catch (error) {
    log.step(`Erro LLM: ${error.message}`, "warning");
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
        log.step(`Encontrado (fallback): ${found.label}`, "success");
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
  log.phase(3, "Extração de Texto com OCR (Tesseract.js)");

  try {
    log.step("Processando PDF...", "loading");
    const text = await extractTextWithTesseract(pdfUrl, 10);

    if (!text || text.trim().length === 0) {
      log.step("Nenhum texto extraível do PDF", "warning");
      return null;
    }

    log.result("Linhas de texto extraídas", text.split("\n").length);

    log.step(`Procurando por: ${config.searchName}`, "loading");
    const result = await findUserInText(text, config.searchNumber, config.searchName);

    return result;
  } catch (error) {
    log.error(`Erro na Fase 3: ${error.message}`);
    return null;
  }
}

// ============================================================
// FASE 4: Notificação e Cadastro
// ============================================================

async function phase4NotifyAndStore(foundUser) {
  log.phase(4, "Notificação e Cadastro");

  try {
    const subject = `✅ Aprovado no Edital - Inscrição ${foundUser.numero_inscricao}`;
    const emailMessage = `Olá ${foundUser.nome},\n\n` +
      `Você foi APROVADO no edital!\n\n` +
      `📋 Inscrição: ${foundUser.numero_inscricao}\n` +
      `🎯 Nome: ${foundUser.nome}\n` +
      `📄 Edital: ${foundUser.editalTitle}\n\n` +
      `Documento: ${foundUser.documentUrl}\n\n` +
      `Confira os detalhes no portal do IBAMSP.`;

    log.step("Enviando email...", "loading");
    await sendEmail("rianvinicius9@gmail.com", subject, emailMessage);
    log.step("Email enviado", "success");

    if (config.whatsappNumber) {
      log.step("Enviando WhatsApp...", "loading");
      const whatsappMessage = `Olá ${foundUser.nome}! 🎉\n\n` +
        `Você foi encontrado no edital!\n\n` +
        `📋 Inscrição: ${foundUser.numero_inscricao}\n` +
        `📄 Edital: ${foundUser.editalTitle}\n\n` +
        `Confira: ${foundUser.documentUrl}`;

      await sendWhatsApp(config.whatsappNumber, whatsappMessage);
      log.step("WhatsApp enviado", "success");
    } else {
      log.step("WhatsApp não configurado (WHATSAPP_PHONE)", "warning");
    }

    log.section("Dados para Supabase");
    const dbData = {
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
    };
    log.jsonData(dbData);
    log.step("Pronto para cadastro no banco de dados", "success");
  } catch (error) {
    log.error(`Erro na Fase 4: ${error.message}`);
    throw error;
  }
}

// ============================================================
// ORQUESTRAÇÃO PRINCIPAL
// ============================================================

async function main() {
  try {
    // Fase 1
    const { page, editais } = await phase1Navigation();

    log.phase(2, "Análise Inteligente com LLM");

    let foundUser = null;
    let processados = 0;

    // Loop por editais
    for (let i = 0; i < editais.length; i++) {
      const edital = editais[i];

      // Fase 2
      const classificationDoc = await phase2IdentifyDocument(
        page,
        edital.id,
        edital.title,
        i + 1,
        editais.length
      );

      processados++;

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

    log.result("Editais processados", processados);

    // Resultados finais
    console.log("\n" + "═".repeat(70));
    if (foundUser) {
      log.success("USUÁRIO ENCONTRADO!");
      log.section("Dados do Candidato");
      log.jsonData(foundUser);

      // Fase 4
      await phase4NotifyAndStore(foundUser);
    } else {
      log.error("Usuário não encontrado nos editais processados");
      log.section("Próximas Ações");
      log.step("Verificar se PDFs têm texto extraível", "info");
      log.step("Aumentar número de editais verificados", "info");
      log.step("Configurar OPENROUTER_API_KEY para melhorar precisão", "info");
    }
    log.separator();

    // Cleanup
    await page.close();
    await browser.close();
  } catch (error) {
    log.error(`Erro fatal: ${error.message}`);
    if (browser) await browser.close();
    process.exit(1);
  }
}

// Executar
main();
