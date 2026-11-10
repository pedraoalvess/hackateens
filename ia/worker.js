
const SISTEMA =
  "Você é a assistente do MOBINTEC, um site de ônibus turísticos em Foz do Iguaçu feito para pessoas com deficiência visual. " +
  "Responda sempre em português do Brasil, em no máximo 3 frases curtas e simples, pensando que será ouvido em voz alta (sem listas, sem símbolos, sem emojis). " +
  "Para tempo de chegada, assento, rota, hotéis e acessibilidade use APENAS os dados do contexto; se o dado não estiver lá ou estiver marcado como 'A confirmar', diga que ainda não foi confirmado. Nunca invente horários nem condições de acessibilidade. " +
  "Sobre turismo em geral, ajude com cuidado e avise que a informação pode estar desatualizada. " +
  "Em emergência, oriente ligar para 192 (SAMU) ou 193 (Bombeiros).";

// Aguarda alguns milissegundos antes de tentar novamente.
function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  async fetch(request, env) {
    const cabecalhos = {
      "Access-Control-Allow-Origin": env.ORIGEM_PERMITIDA || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json; charset=utf-8"
    };

    function retornar(dados, status = 200) {
      return new Response(JSON.stringify(dados), {
        status,
        headers: cabecalhos
      });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cabecalhos
      });
    }

    if (request.method !== "POST") {
      return retornar({ erro: "Use o método POST." }, 405);
    }

    try {
      // Verifica a chave de API.
      if (!env.GEMINI_API_KEY) {
        throw new Error(
          "Secret GEMINI_API_KEY não configurado no Cloudflare."
        );
      }

      // Recebe os dados enviados pelo site.
      const corpo = await request.json();

      const pergunta = corpo.pergunta;
      const historico = corpo.historico;
      const contexto = corpo.contexto;

      if (
        typeof pergunta !== "string" ||
        !pergunta.trim() ||
        pergunta.length > 300
      ) {
        return retornar({ erro: "Pergunta inválida." }, 400);
      }

      // Organiza o histórico.
      const conversa = (
        Array.isArray(historico) ? historico : []
      )
        .slice(-6)
        .filter(m =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string"
        )
        .map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content.slice(0, 600) }]
        }));

      // A primeira mensagem precisa ser do usuário.
      while (
        conversa.length &&
        conversa[0].role !== "user"
      ) {
        conversa.shift();
      }

      conversa.push({
        role: "user",
        parts: [{ text: pergunta.trim() }]
      });

      // Modelo configurado no Cloudflare.
      const modelo = env.MODELO || "gemini-3.8-flash";

      const url =
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        modelo +
        ":generateContent";

      const corpoGemini = {
        systemInstruction: {
          parts: [{
            text:
              SISTEMA +
              "\n\nContexto atual do site: " +
              JSON.stringify(contexto || {}).slice(0, 3000)
          }]
        },
        contents: conversa,
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.4
        }
      };

      let dados = null;
      let ultimoErro = "";

      // Faz até duas tentativas em caso de instabilidade.
      for (let tentativa = 1; tentativa <= 2; tentativa++) {
        const resposta = await fetch(url, {
          method: "POST",
          headers: {
            "x-goog-api-key": env.GEMINI_API_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(corpoGemini)
        });

        // Lê como texto primeiro, evitando erro se não for JSON.
        const textoResposta = await resposta.text();

        // Tenta interpretar o JSON.
        try {
          dados = JSON.parse(textoResposta);
        } catch {
          dados = null;
        }

        // Verifica erros temporários.
        if (
          !resposta.ok &&
          [429, 503, 524].includes(resposta.status)
        ) {
          ultimoErro =
            dados?.error?.message ||
            "Serviço temporariamente indisponível. HTTP " +
            resposta.status;

          // Tenta novamente somente uma vez.
          if (tentativa < 2) {
            await esperar(1200);
            continue;
          }

          return retornar({
            erro: "serviço temporariamente indisponível",
            detalhe: ultimoErro
          }, 503);
        }

        // Outros erros HTTP.
        if (!resposta.ok) {
          return retornar({
            erro: "falha no Gemini",
            detalhe:
              dados?.error?.message ||
              textoResposta.slice(0, 200) ||
              "Erro HTTP " + resposta.status
          }, resposta.status >= 400 && resposta.status < 600
            ? resposta.status
            : 502);
        }

        // Resposta sem JSON válido.
        if (!dados) {
          throw new Error(
            "O Gemini retornou uma resposta que não é JSON."
          );
        }

        break;
      }

      if (!dados) {
        throw new Error(ultimoErro || "Sem resposta do Gemini.");
      }

      // Verifica bloqueios de segurança.
      if (dados.promptFeedback?.blockReason) {
        throw new Error(
          "Pergunta bloqueada: " +
          dados.promptFeedback.blockReason
        );
      }

      // Extrai a resposta da IA.
      const partes =
        dados.candidates?.[0]?.content?.parts;

      const texto = partes
        ?.map(p => p.text || "")
        .join("")
        .trim();

      if (!texto) {
        throw new Error(
          "O Gemini não retornou uma resposta em texto."
        );
      }

      return retornar({
        resposta: texto
      });

    } catch (erro) {
      return retornar({
        erro: "falha",
        detalhe: String(
          erro.message || erro
        ).slice(0, 200)
      }, 500);
    }
  }
};