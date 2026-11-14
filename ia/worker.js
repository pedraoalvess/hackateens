// Função da assistente de IA do MOBINTEC.
// Usa o Gemini (Google AI Studio, versão gratuita). A chave fica guardada AQUI, no servidor, e nunca no site.
// Se o Gemini estiver ocupado ("high demand"), tenta de novo, depois um modelo reserva e, por último, o Workers AI da Cloudflare.
// Passo a passo no arquivo LEIA-ME.md.

const SISTEMA =
  "Você é a assistente do MOBINTEC, um site de ônibus turísticos em Foz do Iguaçu feito para pessoas com deficiência visual. " +
  "Responda sempre em português do Brasil, em no máximo 3 frases curtas e simples, pensando que será ouvido em voz alta (sem listas, sem símbolos, sem emojis). " +
  "Para tempo de chegada, assento, rota, hotéis e acessibilidade use APENAS os dados do contexto; se o dado não estiver lá ou estiver marcado como 'A confirmar', diga que ainda não foi confirmado. Nunca invente horários nem condições de acessibilidade. " +
  "Sobre turismo em geral, ajude com cuidado e avise que a informação pode estar desatualizada. " +
  "Você conhece os destinos em 'todosOsDestinos' e pode compará-los. Responda SEMPRE e SOMENTE com um JSON neste formato: {\"resposta\": \"texto curto para ser falado\", \"acao\": \"nenhuma\", \"destino\": \"\"}. Use 'acao' só quando a pessoa pedir claramente: 'abrir_onibus' (quer ir ou acompanhar o ônibus; coloque em 'destino' o nome exato de um destino de 'todosOsDestinos'), 'abrir_mapa', 'ligar_localizacao', 'ler_paradas', 'ler_acessibilidade', 'ler_transporte' ou 'voltar'. Em qualquer outro caso use 'nenhuma'. Quando usar uma ação, diga na 'resposta' o que vai fazer, em uma frase. Se a pessoa só perguntar sobre um lugar, converse e ofereça abrir o ônibus, sem usar ação. Quando 'lugaresPerto' estiver no contexto, recomende um ou dois lugares dessa lista e diga a distância; nunca cite lugares que não estejam na lista. Faça no máximo uma pergunta por vez. " +
  "Em emergência, oriente ligar para 192 (SAMU) ou 193 (Bombeiros).";

const ENDERECO_GEMINI = "https://generativelanguage.googleapis.com/v1beta/models/";

// A IA responde em JSON com o texto e, se for o caso, uma ação para o site executar. Outros formatos viram só texto.
const ACOES = ["abrir_onibus", "abrir_mapa", "ligar_localizacao", "ler_paradas", "ler_acessibilidade", "ler_transporte", "voltar"];
function lerRespostaDaIA(texto) {
  try {
    const json = JSON.parse(texto.replace(/```json|```/g, "").trim());
    if (json && typeof json.resposta === "string" && json.resposta.trim()) {
      return {
        resposta: json.resposta.trim(),
        acao: ACOES.includes(json.acao) ? json.acao : "nenhuma",
        destino: typeof json.destino === "string" ? json.destino.slice(0, 60) : ""
      };
    }
  } catch (erro) { }
  return { resposta: texto, acao: "nenhuma", destino: "" };
}

// Pergunta ao Gemini. "mensagens" é uma lista [{ role: "user" ou "assistant", content: "..." }].
async function perguntarAoGemini(modelo, env, sistema, mensagens) {
  const resposta = await fetch(ENDERECO_GEMINI + modelo + ":generateContent", {
    method: "POST",
    headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sistema }] },
      contents: mensagens.map(function (m) { return { role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }; }),
      generationConfig: { maxOutputTokens: 1024, temperature: 0.4, responseMimeType: "application/json" }
    })
  });
  const dados = await resposta.json();
  if (dados.error) {
    const erro = new Error(dados.error.message || "erro do Gemini");
    erro.temporario = [429, 500, 503].includes(resposta.status);   // ocupado ou limite: vale tentar de novo
    throw erro;
  }
  if (dados.promptFeedback && dados.promptFeedback.blockReason) { throw new Error("pergunta bloqueada: " + dados.promptFeedback.blockReason); }
  const partes = dados.candidates && dados.candidates[0] && dados.candidates[0].content && dados.candidates[0].content.parts;
  const texto = partes && partes.map(function (p) { return p.text || ""; }).join("").trim();
  if (!texto) { throw new Error("sem texto"); }
  return texto;
}

// Plano C: Workers AI da Cloudflare (só funciona se o wrangler.toml tiver o bloco [ai]).
async function perguntarAoWorkersAI(env, sistema, mensagens) {
  const resultado = await env.AI.run(env.MODELO_CLOUDFLARE || "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    { messages: [{ role: "system", content: sistema }].concat(mensagens), max_tokens: 250 });
  const texto = resultado.response || (resultado.choices && resultado.choices[0] && resultado.choices[0].message && resultado.choices[0].message.content);
  if (!texto) { throw new Error("sem texto"); }
  return String(texto).trim();
}

export default {
  async fetch(request, env) {
    const cabecalhos = {
      "Access-Control-Allow-Origin": env.ORIGEM_PERMITIDA || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };
    if (request.method === "OPTIONS") { return new Response(null, { headers: cabecalhos }); }
    if (request.method !== "POST") { return new Response(JSON.stringify({ erro: "use POST" }), { status: 405, headers: cabecalhos }); }

    try {
      const { pergunta, historico, contexto } = await request.json();
      if (typeof pergunta !== "string" || !pergunta.trim() || pergunta.length > 300) { throw new Error("pergunta inválida"); }

      // Histórico curto e limpo (a primeira mensagem precisa ser do usuário).
      const mensagens = (Array.isArray(historico) ? historico : []).slice(-6)
        .filter(function (m) { return (m.role === "user" || m.role === "assistant") && typeof m.content === "string"; })
        .map(function (m) { return { role: m.role, content: m.content.slice(0, 600) }; });
      while (mensagens.length && mensagens[0].role !== "user") { mensagens.shift(); }
      mensagens.push({ role: "user", content: pergunta.trim() });
      const sistema = SISTEMA + "\n\nContexto atual do site: " + JSON.stringify(contexto || {}).slice(0, 3000);

      let texto = "";
      let ultimoErro = null;

      // Plano A e B: Gemini. O modelo principal tem 2 tentativas; o reserva, 1.
      const modelos = [env.MODELO || "gemini-3.6-flash", env.MODELO_RESERVA || "gemini-3.5-flash-lite"];
      for (let i = 0; i < modelos.length && !texto; i++) {
        const tentativas = i === 0 ? 2 : 1;
        for (let t = 0; t < tentativas && !texto; t++) {
          try {
            texto = await perguntarAoGemini(modelos[i], env, sistema, mensagens);
          } catch (erro) {
            ultimoErro = erro;
            if (!erro.temporario) { break; }                         // erro que não adianta repetir: passa para o próximo modelo
            await new Promise(function (r) { setTimeout(r, 800); });  // ocupado: espera um pouco e tenta de novo
          }
        }
      }

      // Plano C: Workers AI.
      if (!texto && env.AI) {
        try { texto = await perguntarAoWorkersAI(env, sistema, mensagens); } catch (erro) { ultimoErro = erro; }
      }

      if (!texto) { throw ultimoErro || new Error("sem texto"); }
      return new Response(JSON.stringify(lerRespostaDaIA(texto)), { headers: cabecalhos });
    } catch (erro) {
      return new Response(JSON.stringify({ erro: "falha", detalhe: String(erro.message || erro).slice(0, 200) }), { status: 500, headers: cabecalhos });
    }
  }
};