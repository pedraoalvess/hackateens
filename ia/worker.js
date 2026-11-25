// Função da assistente de IA do MOBINTEC.
// Usa o Gemini (Google AI Studio). A chave fica guardada AQUI, no servidor.
// Fallback: Gemini principal -> Gemini Lite -> Workers AI da Cloudflare.

const SISTEMA = 
  "Você é a assistente do MOBINTEC, um site de ônibus turísticos em Foz do Iguaçu feito para pessoas com deficiência visual. " +
  "Responda SEMPRE no mesmo idioma em que o usuário fez a pergunta (português, inglês ou espanhol). " +
  "Use no máximo 3 frases curtas e simples, pois será ouvido em voz alta (sem listas, sem símbolos, sem emojis). " +
  "Regras de Ouro: " +
  "1. Para horários, use APENAS o campo 'proximoHorario' do contexto. Nunca invente horários. " +
  "2. Para paradas e desembarque, use os campos 'paradas' e 'ondeDescer' do contexto. " +
  "3. Para gratuidade, verifique o campo 'gratuidade'. Se for true, avise que há gratuidade para PCD com cartão BPC/LOAS. " +
  "4. Se um dado estiver marcado como 'A confirmar' ou não existir no contexto, diga que ainda não foi confirmado. " +
  "5. Sobre turismo em geral, ajude com cuidado e avise que a informação pode estar desatualizada. " +
  "Ações permitidas (use APENAS estas): 'abrir_onibus', 'abrir_mapa', 'ligar_localizacao', 'ler_paradas', 'ler_acessibilidade', 'ler_transporte', 'ler_embarque', 'trocar_embarque', 'voltar'. " +
  "Use uma ação apenas quando o usuário pedir claramente. Quando usar uma ação, diga na 'resposta' o que vai fazer em uma frase. " +
  "Se o usuário só perguntar sobre um lugar, converse e ofereça abrir o ônibus, sem usar ação. " +
  "Quando 'lugaresPerto' estiver no contexto, recomende 1 ou 2 lugares dessa lista com a distância e use a ação 'abrir_mapa'. " +
  "Em emergência, oriente ligar para 192 (SAMU) ou 193 (Bombeiros). " +
  "Responda SEMPRE e SOMENTE com um JSON neste formato exato: {\"resposta\": \"texto curto para ser falado\", \"acao\": \"nome_da_acao_ou_nenhuma\", \"destino\": \"nome_exato_do_destino_ou_vazio\"}";

const ENDERECO_GEMINI = "https://generativelanguage.googleapis.com/v1beta/models/";

// Ações que o site pode executar. A IA só pode retornar estas.
const ACOES = [
  "abrir_onibus", "abrir_mapa", "ligar_localizacao", "ler_paradas",
  "ler_acessibilidade", "ler_transporte", "ler_embarque", "trocar_embarque", "voltar"
];

function lerRespostaDaIA(texto) {
  try {
    const json = JSON.parse(texto.replace(/`json|`/g, "").trim());
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
    erro.temporario = [429, 500, 503].includes(resposta.status);
    throw erro;
  }
  if (dados.promptFeedback && dados.promptFeedback.blockReason) { throw new Error("pergunta bloqueada: " + dados.promptFeedback.blockReason); }
  const partes = dados.candidates && dados.candidates[0] && dados.candidates[0].content && dados.candidates[0].content.parts;
  const texto = partes && partes.map(function (p) { return p.text || ""; }).join(" ").trim();
  if (!texto) { throw new Error("sem texto"); }
  return texto;
}

async function perguntarAoWorkersAI(env, sistema, mensagens) {
  const resultado = await env.AI.run(env.MODELO_CLOUDFLARE || "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    { messages: [{ role: "system", content: sistema }].concat(mensagens), max_tokens: 250 });
  const texto = resultado.response || (resultado.choices && resultado.choices[0] && resultado.choices[0].message && resultado.choices[0].message.content);
  if (!texto) { throw new Error("sem texto"); }
  return String(texto).trim();
}

export default {
  async fetch(request, env) {
    const origem = request.headers.get("Origin") || "";
    const permitidas = String(env.ORIGEM_PERMITIDA || "").split(",").map(function (o) { return o.trim(); });
    const liberada = permitidas.includes("") || permitidas.includes(origem) ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origem) || origem === "null";
    const cabecalhos = {
      "Access-Control-Allow-Origin": liberada ? (origem || "*") : permitidas[0],
      "Vary": "Origin",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };
    if (request.method === "OPTIONS") { return new Response(null, { headers: cabecalhos }); }
    if (request.method !== "POST") { return new Response(JSON.stringify({ erro: "use POST" }), { status: 405, headers: cabecalhos }); }
    
    try {
      const { pergunta, historico, contexto } = await request.json();
      if (typeof pergunta !== "string" || !pergunta.trim() || pergunta.length > 300) { throw new Error("pergunta inválida"); }
      
      const mensagens = (Array.isArray(historico) ? historico : []).slice(-10)
        .filter(function (m) { return (m.role === "user" || m.role === "assistant") && typeof m.content === "string"; })
        .map(function (m) { return { role: m.role, content: m.content.slice(0, 600) }; });
      while (mensagens.length && mensagens[0].role !== "user") { mensagens.shift(); }
      mensagens.push({ role: "user", content: pergunta.trim() });
      
      const sistemaCompleto = SISTEMA + "\n\nContexto atual do site: " + JSON.stringify(contexto || {}).slice(0, 4000);
      let texto = "";
      let ultimoErro = null;
      
      const modelos = [env.MODELO || "gemini-2.0-flash", env.MODELO_RESERVA || "gemini-2.0-flash-lite"];
      for (let i = 0; i < modelos.length && !texto; i++) {
        const tentativas = i === 0 ? 2 : 1;
        for (let t = 0; t < tentativas && !texto; t++) {
          try {
            texto = await perguntarAoGemini(modelos[i], env, sistemaCompleto, mensagens);
          } catch (erro) {
            ultimoErro = erro;
            if (!erro.temporario) { break; }
            await new Promise(function (r) { setTimeout(r, 800); });
          }
        }
      }
      
      if (!texto && env.AI) {
        try { texto = await perguntarAoWorkersAI(env, sistemaCompleto, mensagens); } catch (erro) { ultimoErro = erro; }
      }
      if (!texto) { throw ultimoErro || new Error("sem texto"); }
      
      return new Response(JSON.stringify(lerRespostaDaIA(texto)), { headers: cabecalhos });
    } catch (erro) {
      return new Response(JSON.stringify({ erro: "falha", detalhe: String(erro.message || erro).slice(0, 200) }), { status: 500, headers: cabecalhos });
    }
  }
};
