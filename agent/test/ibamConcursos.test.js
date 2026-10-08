const test = require("node:test");
const assert = require("node:assert/strict");
const {
  searchUrl,
  listContests,
  getContestDetail,
  isResultDocument
} = require("../src/sources/ibamConcursos");

function htmlResponse(html) {
  return { ok: true, arrayBuffer: async () => Buffer.from(html, "latin1") };
}

test("searchUrl usa o filtro busca= por cidade", () => {
  assert.equal(
    searchUrl("Santos", 1),
    "https://www.ibamsp-concursos.org.br/index/todos/?busca=Santos&pg=1"
  );
});

test("listContests pagina enquanto houver link 'proxima' e para quando não houver mais", async () => {
  const page1 = `
    <h3><a href="/informacoes/185/" >SANTOS - CONCURSO PÚBLICO - 79/2026</a></h3>
    <h3><a href="/informacoes/174/" >SANTOS - CONCURSO PÚBLICO - 70/2026</a></h3>
    <a href="/index/todos/?busca=Santos&pg=2" class="proxima">Próxima ›</a>
  `;
  const page2 = `
    <h3><a href="/informacoes/18/" >SANTOS - CAPEP-SAÚDE - CONCURSO PÚBLICO - 02/2024</a></h3>
  `;

  const calls = [];
  const fetchImpl = async url => {
    calls.push(url);
    return htmlResponse(url.includes("pg=2") ? page2 : page1);
  };

  const contests = await listContests("Santos", { fetchImpl });

  assert.deepEqual(contests.map(c => c.id), ["185", "174", "18"]);
  assert.equal(calls.length, 2);
});

test("getContestDetail extrai situação e documentos", async () => {
  const detailHtml = `
    <p class="tipo">Concurso Público</p>
    <h2>SANTOS - CAPEP-SAÚDE - CONCURSO PÚBLICO - 02/2024</h2>
    <p class="situacaoConcurso"><b>Situação:</b> Homologado</p>
    <li class="pdf">
      <a style="flex:1" data-astv="01- Edital de Abertura"
         href="https://anexos.cdn.selecao.net.br/uploads/810/concursos/18/anexos/aaa.pdf"
         target="_blank">01- Edital de Abertura</a>
    </li>
    <li class="pdf">
      <a style="flex:1" data-astv="23- Edital de Homologação"
         href="https://anexos.cdn.selecao.net.br/uploads/810/concursos/18/anexos/bbb.pdf"
         target="_blank">23- Edital de Homologação</a>
    </li>
  `;
  const fetchImpl = async () => htmlResponse(detailHtml);

  const detail = await getContestDetail("18", { fetchImpl });

  assert.equal(detail.title, "SANTOS - CAPEP-SAÚDE - CONCURSO PÚBLICO - 02/2024");
  assert.equal(detail.status, "Homologado");
  assert.deepEqual(detail.documents, [
    { label: "01- Edital de Abertura", url: "https://anexos.cdn.selecao.net.br/uploads/810/concursos/18/anexos/aaa.pdf" },
    { label: "23- Edital de Homologação", url: "https://anexos.cdn.selecao.net.br/uploads/810/concursos/18/anexos/bbb.pdf" }
  ]);
});

test("isResultDocument só aceita rótulos de resultado/homologação/classificação/convocação", () => {
  assert.equal(isResultDocument("23- Edital de Homologação"), true);
  assert.equal(isResultDocument("22- Edital de Divulgação de Classificação Final"), true);
  assert.equal(isResultDocument("Convocação para posse"), true);
  assert.equal(isResultDocument("Lista de Aprovados"), true);
  assert.equal(isResultDocument("01- Edital de Abertura"), false);
  assert.equal(isResultDocument("Cronograma do certame"), false);
  assert.equal(isResultDocument("Edital de Retificação"), false);
});
