"use strict";

const pdfParse = require("pdf-parse");

async function extractPdfText(buffer) {
  const result = await pdfParse(buffer);
  return result.text;
}

module.exports = { extractPdfText };
