const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "../styles/landing.css"), "utf8");

// ---------- conteúdo ----------

test("a landing não carrega o styles.css das outras páginas", () => {
  assert.doesNotMatch(html, /styles\.css/);
  assert.match(html, /landing\.css/);
});

test("não voltaram conteúdos antigos", () => {
  for (const proibido of ["CPF", "nascimento", "Telegram", "Instagram", "Concurso Público X", "Básico", "Pro ", "planTable", "planCards", "script.js"]) {
    assert.equal(html.includes(proibido), false, `index.html ainda contém "${proibido}"`);
  }
});

test("sem emojis na página", () => {
  assert.doesNotMatch(html, /\p{Extended_Pictographic}/u);
});

test("usa só as três famílias de fonte definidas", () => {
  const families = [...css.matchAll(/--(serif|sans|mono):\s*"([^"]+)"/g)].map(match => match[2]);
  assert.deepEqual(families, ["Newsreader", "Instrument Sans", "IBM Plex Mono"]);
  const declared = [...css.matchAll(/font(?:-family)?:[^;]*?var\(--(serif|sans|mono)\)/g)];
  assert.ok(declared.length > 0);
  assert.equal(/font(?:-family)?:\s*(?!var|inherit)[^;]*(Georgia|system-ui|Arial|Helvetica)/.test(css.replace(/--(serif|sans|mono):[^;]+;/g, "")), false);
});

test("números e mensagens combinados para a landing", () => {
  for (const texto of ["Ctrl+F em edital?", "R$ 4,99", "733", "15.289", "635 páginas", "2.496", "00h05", "99 nomes aparecem mais de uma vez", "Edital nº 149/2026", "sala 121"]) {
    assert.ok(html.includes(texto), `faltou "${texto}"`);
  }
  assert.match(html, /account\.html#criar/);
});

// ---------- contraste (WCAG) ----------

function tokens(block) {
  return Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].map(match => [match[1], match[2]]));
}

const light = tokens(css.slice(css.indexOf(":root {"), css.indexOf("@media (prefers-color-scheme: dark)")));
const darkStart = css.indexOf("@media (prefers-color-scheme: dark)");
const dark = { ...light, ...tokens(css.slice(darkStart, css.indexOf(":root {", darkStart + 40) > 0 ? css.indexOf("}\n}", darkStart) : undefined)) };

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [texto, fundo, mínimo]. 4.5 para texto normal; botões e títulos grandes ainda passam de 4.5.
const PAIRS = [
  ["ink", "paper", 4.5],
  ["muted", "paper", 4.5],
  ["accent", "paper", 4.5],
  ["accent-ink", "accent", 4.5],
  ["mark-ink", "mark", 4.5],
  ["sheet-ink", "sheet", 4.5],
  ["sheet-muted", "sheet", 4.5],
  ["sheet-ink", "mark", 4.5],
  ["bubble-ink", "bubble", 4.5],
  ["bubble-muted", "bubble", 4.5],
  ["panel-ink", "panel", 4.5],
  ["panel-muted", "panel", 4.5],
  ["panel-btn-ink", "panel-btn", 4.5],
  ["paper", "ink", 4.5] // número do passo na linha do tempo
];

for (const [mode, set] of [["claro", light], ["escuro", dark]]) {
  test(`contraste mínimo de texto no modo ${mode}`, () => {
    for (const [fg, bg, min] of PAIRS) {
      assert.ok(set[fg] && set[bg], `token ausente: ${fg}/${bg}`);
      const value = ratio(set[fg], set[bg]);
      assert.ok(value >= min, `${fg} (${set[fg]}) sobre ${bg} (${set[bg]}) no modo ${mode}: ${value.toFixed(2)} < ${min}`);
    }
  });
}

test("o texto sobre o amarelo usa sempre a tinta escura, também no modo escuro", () => {
  assert.equal(dark["mark-ink"], light["mark-ink"]);
  assert.equal(dark.mark, light.mark);
  assert.ok(ratio(dark["mark-ink"], dark.mark) >= 7);
});
