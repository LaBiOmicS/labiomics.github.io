/*
 * Catálogo de projetos do LaBiOmicS.
 * Para adicionar um projeto, acrescente um objeto a esta lista.
 *   repo      : "Owner/nome" no GitHub (usado nos links e para buscar a última versão)
 *   site      : página do projeto
 *   category  : uma das chaves de CATEGORIES
 *   status    : "beta", "estável" etc.
 *   version   : último release publicado no GitHub (ou a versão do código, se ainda não houver release).
 *               Exibida de imediato; o site a substitui pelo release mais recente buscado na API do GitHub.
 */
// A ordem das categorias define a ordem de exibição: bioinformática sempre primeiro.
window.CATEGORIES = {
  bio: "Bioinformática",
  ia: "Plugins de IA para pesquisa",
  ensino: "Ensino e dados abertos",
};

window.PROJECTS = [
  {
    name: "nextSSR",
    repo: "LaBiOmicS/nextSSR",
    version: "v0.2.0",
    site: "https://labiomics.github.io/nextSSR/",
    category: "bio",
    status: "beta",
    summary:
      "Busca rápida e precisa de microssatélites (SSR), compatível com o MISA, na linha de comando ou no navegador.",
    details:
      "Substituto direto do MISA escrito em Rust, com saída idêntica byte a byte no modo compatível. O modo nativo encontra SSRs imperfeitos, desenha primers e confere por PCR in silico que cada par amplifica um único produto. Relatório HTML, GFF3, BED e TSV; no navegador, os dados são analisados localmente, sem upload.",
    platforms: ["CLI", "Navegador"],
    tags: ["microssatélites", "MISA", "primers", "PCR in silico", "WebAssembly"],
    language: "Rust",
    license: "MIT",
    extra: { label: "Rodar no navegador", url: "https://labiomics.github.io/nextSSR/" },
  },
  {
    name: "academic-peer-review",
    repo: "LaBiOmicS/academic-peer-review",
    version: "v1.4.1",
    site: "https://labiomics.github.io/academic-peer-review/",
    category: "ia",
    status: "beta",
    summary:
      "Painel de revisão por pares assistida por IA para manuscritos científicos, com meta-revisão editorial de severidade calibrada.",
    details:
      "Auditoria determinística antes da revisão (statcheck, citações e retratações via OpenAlex, FAIR, proveniência de IA, conteúdo oculto, escopo do periódico). Relatórios em Markdown, CSV, JSON e PDF.",
    platforms: ["Claude Code", "Antigravity"],
    tags: ["peer review", "integridade científica", "OpenAlex", "statcheck"],
    language: "Python",
    license: "MIT",
  },
  {
    name: "congress-abstract-review",
    repo: "LaBiOmicS/congress-abstract-review",
    version: "v0.1.1",
    site: "https://labiomics.github.io/congress-abstract-review/",
    category: "ia",
    status: "beta",
    summary:
      "Avaliação de resumos e resumos expandidos de congressos com conformidade ao edital, pontuação por barema e planilha para a comissão.",
    details:
      "Avaliadores independentes pontuam cada critério do barema e o plugin sugere aprovação ou reprovação. Serve à comissão científica e ao autor que quer revisar o resumo antes de submeter.",
    platforms: ["Claude Code", "Antigravity"],
    tags: ["eventos científicos", "barema", "edital"],
    language: "Python",
    license: "MIT",
  },
  {
    name: "whoqol-toolkit",
    repo: "LaBiOmicS/whoqol-toolkit",
    version: "v0.3.0",
    site: "https://labiomics.github.io/whoqol-toolkit/",
    category: "ia",
    status: "beta",
    summary:
      "Pontuação pelas regras da OMS, psicometria e estatística para publicação de questionários WHOQOL.",
    details:
      "Suporta WHOQOL-BREF, OLD, EUROHIS-QOL 8, HIV, SRPB, DIS e WHOQOL-100. Gera tabelas APA, figuras e rascunho de métodos e resultados a partir de um pacote Python testado e determinístico.",
    platforms: ["Claude Code", "Antigravity"],
    tags: ["qualidade de vida", "psicometria", "WHOQOL-BREF", "MCP"],
    language: "Python",
    license: "MIT",
  },
  {
    name: "HumaninFinder",
    repo: "LaBiOmicS/humaninfinder",
    version: "v1.0.0b4",
    site: "https://labiomics.github.io/humaninfinder/",
    category: "bio",
    status: "beta",
    summary:
      "Localização e anotação por homologia de Humanin e SHLP1-6 em mitogenomas, contigs e montagens nucleares.",
    details:
      "Localiza cada peptídeo pela posição no gene MT-RNR2 com perfis HMM, distinguindo cópias mitocondriais de NUMTs. Disponível no PyPI e executável no navegador.",
    platforms: ["CLI", "PyPI", "Navegador"],
    tags: ["peptídeos mitocondriais", "MT-RNR2", "HMM", "genômica"],
    language: "Python",
    license: "MIT",
    extra: { label: "Rodar no navegador", url: "https://labiomics.github.io/humaninfinder/app/" },
  },
  {
    name: "EpiDados",
    repo: "LaBiOmicS/epidados",
    version: "v0.1.0",
    site: "https://labiomics.github.io/epidados",
    category: "ensino",
    status: "beta",
    summary:
      "Dados reais do DATASUS para ensinar saúde, epidemiologia e ciência de dados.",
    details:
      "Estudos de caso interprofissionais (veterinária, medicina, enfermagem, farmácia, odontologia) e datasets prontos para scikit-learn. Atualizado mensalmente via GitHub Actions e validado contra o TabNet.",
    platforms: ["Site", "Datasets para IA"],
    tags: ["DATASUS", "Saúde Única", "epidemiologia", "machine learning"],
    language: "Python",
    license: "MIT",
  },
];
