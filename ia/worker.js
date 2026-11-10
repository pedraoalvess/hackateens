
const SISTEMA =
  "Você é a assistente do MOBINTEC, um site de ônibus turísticos em Foz do Iguaçu feito para pessoas com deficiência visual. " +
  "Responda sempre em português do Brasil, em no máximo 3 frases curtas e simples, pensando que será ouvido em voz alta (sem listas, sem símbolos, sem emojis). " +
  "Para tempo de chegada, assento, rota, hotéis e acessibilidade use APENAS os dados do contexto; se o dado não estiver lá ou estiver marcado como 'A confirmar', diga que ainda não foi confirmado. Nunca invente horários nem condições de acessibilidade. " +
  "Sobre turismo em geral, ajude com cuidado e avise que a informação pode estar desatualizada. " +
  "Em emergência, oriente ligar para 192 (SAMU) ou 193 (Bombeiros).";

export default {
  async fetch(request, env) {
    const cabecalhos = {
      "Access-Control-Allow-Origin": env.ORIGEM_PERMITIDA || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json; charset=utf-8"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cabecalhos
      });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ erro: "Use o método POST." }),
        { status: 405, headers: cabecalhos }
      );
    }

    try {
      // Verifica se a chave foi configurada no Cloudflare.
      if (!env.GEMINI_API_KEY) {
        throw new Error("Secret GEMINI_API_KEY não configurado no Cloudflare.");
      }

      const corpo = await request.json();
      const pergunta = corpo.pergunta;
      const historico = corpo.historico;
      const contexto = corpo.contexto;

      if (
        typeof pergunta !== "string" ||
        !pergunta.trim() ||
        pergunta.length > 300
      ) {
        throw new Error("Pergunta inválida.");
      }

      // Organiza o histórico da conversa.
      const conversa = (Array.isArray(historico) ? historico : [])
        .slice(-6)
        .filter(function (m) {
          return (
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string"
          );
        })
        .map(function (m) {
          return {
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content.slice(0, 600) }]
          };
        });

      // A primeira mensagem precisa ser do usuário.
      while (conversa.length && conversa[0].role !== "user") {
        conversa.shift();
      }

      conversa.push({
        role: "user",
        parts: [{ text: pergunta.trim() }]
      });

      // Modelo configurável pelo Cloudflare.
      const modelo = env.MODELO || "gemini-3.8-flash";

      // Monta a requisição para o Gemini.
      const url =
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        modelo +
        ":generateContent";

      const resposta = await fetch(url, {
        method: "POST",
        headers: {
          "x-goog-api-key": env.GEMINI_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text:
                  SISTEMA +
                  "\n\nContexto atual do site: " +
                  JSON.stringify(contexto || {}).slice(0, 3000)
              }
            ]
          },
          contents: conversa,
          generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.4
          }
        })
      });

      const dados = await resposta.json();

      // Identifica erros retornados pelo Google.
      if (!resposta.ok) {
        const mensagem =
          dados.error?.message || "Erro na comunicação com o Gemini.";

        return new Response(
          JSON.stringify({
            erro: "falha no Gemini",
            detalhe: mensagem.slice(0, 200)
          }),
          {
            status: resposta.status,
            headers: cabecalhos
          }
        );
      }

      if (
        dados.promptFeedback &&
        dados.promptFeedback.blockReason
      ) {
        throw new Error(
          "Pergunta bloqueada: " + dados.promptFeedback.blockReason
        );
      }

      // Extrai a resposta gerada pela IA.
      const partes =
        dados.candidates?.[0]?.content?.parts;

      const texto = partes
        ?.map(function (p) {
          return p.text || "";
        })
        .join("")
        .trim();

      if (!texto) {
        throw new Error("O Gemini não retornou uma resposta em texto.");
      }

      return new Response(
        JSON.stringify({ resposta: texto }),
        {
          status: 200,
          headers: cabecalhos
        }
      );

    } catch (erro) {
      return new Response(
        JSON.stringify({
          erro: "falha",
          detalhe: String(erro.message || erro).slice(0, 200)
        }),
        {
          status: 500,
          headers: cabecalhos
        }
      );
    }
  }
};