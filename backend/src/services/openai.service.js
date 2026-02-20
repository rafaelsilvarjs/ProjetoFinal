// Modo local: nao chama OpenAI e nao consome credito.
// Se quiser trocar depois, implemente aqui a chamada real por feature flag.
async function generateActivity(topic) {
  return [
    `Atividade sobre ${topic}`,
    "",
    "1) Explique o conceito principal com suas palavras.",
    "2) Cite dois exemplos praticos do tema.",
    "3) Monte um mini resumo critico (5 linhas).",
    "4) Proponha uma pergunta para debate em sala."
  ].join("\n")
}

module.exports = {
  generateActivity
}
