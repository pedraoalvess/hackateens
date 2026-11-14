/* ==========================================================================
   MOBINTEC - script do site
   Tudo foi escrito de forma simples, em português, com uma ideia por linha.
   Partes: 1) ajudantes  2) dados  3) fala  4) telas  5) mapa  6) microfone
           7) assistente  8) painel do ônibus  9) ligações dos botões
   ========================================================================== */

/* ---------- 1) Ajudantes ---------- */

// Pega um elemento da página pelo seletor (ex.: "#botaoVoltar").
function pegar(seletor) {
  return document.querySelector(seletor);
}

// Deixa o texto em minúsculas e sem acentos, para comparar palavras.
function semAcento(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Sorteia um número inteiro de 0 até max - 1.
function sortear(max) {
  return Math.floor(Math.random() * max);
}

// Escreve uma distância em metros ou quilômetros.
function formatarDistancia(metros) {
  if (metros < 1000) {
    return Math.round(metros) + " metros";
  }
  return (metros / 1000).toFixed(1).replace(".", ",") + " km";
}

// Distância em metros entre dois pontos [latitude, longitude]. Não depende do mapa.
function distanciaEntre(a, b) {
  const raio = 6371000;
  const grau = Math.PI / 180;
  const dLat = (b[0] - a[0]) * grau;
  const dLon = (b[1] - a[1]) * grau;
  const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(a[0] * grau) * Math.cos(b[0] * grau) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * raio * Math.asin(Math.sqrt(x));
}

// Mostra ou esconde um elemento, avisando também os leitores de tela.
function mostrar(elemento, visivel) {
  elemento.hidden = !visivel;
  elemento.setAttribute("aria-hidden", visivel ? "false" : "true");
}

/* ---------- 2) Dados do projeto ---------- */

// Quantos segundos "passam" a cada segundo real no teste. Use 1 para tempo real.
const VELOCIDADE_TESTE = 5;

// Endereço da função da assistente de IA (veja a pasta "ia"). Deixe vazio ("") para desligar a IA.
const URL_DA_IA = "";


const BOAS_VINDAS = "Bem-vindo ao Mobintec. Toque em qualquer lugar da tela e converse comigo. " +
  "Você pode pedir o ônibus de um destino, procurar hotéis e restaurantes perto de você, abrir o mapa e perguntar o que quiser. " +
  "Se você usa leitor de tela, toque duas vezes no botão do microfone.";

const TEXTO_AJUDA = "Você pode conversar comigo normalmente. Por exemplo: quero ir para as Cataratas; tem restaurante perto de mim; " +
  "abre o mapa; quando o ônibus chega; tem assento livre; como é a acessibilidade; quais as paradas; qual o horário; onde estou. " +
  "Também funcionam: repetir, mais devagar, mais rápido, silêncio, desligar a voz e voltar.";

// Devolve o destino citado em um texto, ou null se não achar nenhum.
function acharDestino(texto) {
  const limpo = semAcento(texto);
  for (const destino of DESTINOS) {
    for (const palavra of destino.palavras) {
      if (limpo.includes(palavra)) {
        return destino;
      }
    }
  }
  return null;
}

/* ---------- 3) Fala, sons e vibração ---------- */

let ultimaFala = "";      // guarda a última mensagem, para o botão "Repetir"
let velocidadeVoz = 1;
let vozLigada = true;      // false = o site não fala (bom para quem já usa leitor de tela)    // 1 = normal

// O site fala o texto em voz alta (se o navegador tiver voz).
function falar(texto, naFila, aoTerminar) {
  ultimaFala = texto;
  if (!vozLigada || !window.speechSynthesis) {
    if (aoTerminar) { setTimeout(aoTerminar, 0); }   // sem voz: faz a ação logo
    return;
  }
  if (!naFila) {
    window.speechSynthesis.cancel();   // corta a fala anterior
  }
  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = "pt-BR";
  fala.rate = velocidadeVoz;
  if (aoTerminar) {
    let feito = false;
    const terminar = function () { if (!feito) { feito = true; aoTerminar(); } };
    fala.onend = terminar;
    fala.onerror = terminar;
    setTimeout(terminar, 12000);   // garantia: se o navegador não avisar que terminou
  }
  window.speechSynthesis.speak(fala);
}

// Guarda as últimas mensagens da conversa na tela inicial.
function registrarConversa(quem, texto) {
  const lista = pegar("#conversa");
  const item = document.createElement("li");
  item.className = quem === "Você" ? "voce" : "assistente";
  item.textContent = quem + ": " + texto;
  lista.appendChild(item);
  while (lista.children.length > 6) { lista.removeChild(lista.firstChild); }
}

// Mostra a mensagem na tela e também fala.
function avisar(texto, aoTerminar) {
  pegar("#textoEstado").textContent = texto;
  pegar("#textoResposta").textContent = texto;
  registrarConversa("Assistente", texto);
  falar(texto, false, aoTerminar);
}

// Toca um bipe curto (agudo = começou a ouvir, grave = terminou).
function apitar(frequencia) {
  try {
    const audio = new (window.AudioContext || window.webkitAudioContext)();
    const tom = audio.createOscillator();
    tom.frequency.value = frequencia;
    tom.connect(audio.destination);
    tom.start();
    tom.stop(audio.currentTime + 0.12);
  } catch (erro) {
    // sem som: tudo bem, o resto continua funcionando
  }
}

// Faz o celular vibrar (só funciona em alguns aparelhos).
function vibrar(padrao) {
  if (navigator.vibrate) {
    navigator.vibrate(padrao);
  }
}

/* ---------- 4) Telas ---------- */

// Para os avisos do ônibus (quando a pessoa volta ao início para escolher outro destino).
function pararAcompanhamento() {
  clearInterval(relogioDoTempo);
  clearInterval(relogioDaCamera);
  numeroDaEscolha = numeroDaEscolha + 1;   // ignora respostas atrasadas
  destinoAtual = null;
  dados = null;
  mostrar(pegar("#painel"), false);
}

// Volta ao início. Funciona também com o botão "voltar" do aparelho.
function voltar() {
  const alvo = pegar("#telaMapa").hidden ? "inicio" : "lista";   // do mapa volta para os ônibus; dos ônibus, para o início
  if (history.state && history.state.tela && history.state.tela !== alvo) {
    history.back();
  } else {
    abrirTela(alvo, false, true);
  }
}

function abrirTela(nome, silencioso, semHistorico) {
  pararMicrofone();
  mostrar(pegar("#telaInicio"), nome === "inicio");
  mostrar(pegar("#telaLista"), nome === "lista");
  mostrar(pegar("#telaMapa"), nome === "mapa");

  if (nome !== "inicio" && !semHistorico) {
    try {
      if (!(history.state && history.state.tela === nome)) {
        history.pushState({ tela: nome }, "");   // para o botão "voltar" do aparelho funcionar
      }
    } catch (erro) { }
  }

  if (nome === "lista") {
    pegar("#tituloLista").focus();
    falar("Ônibus turísticos. Escolha um destino.");
  } else if (nome === "mapa") {
    criarMapa();
    desenharRotaNoMapa();
    mostrarVoceNoMapa();
    pegar("#tituloMapa").focus();
    desenharPerto();
    if (idLocal === null) { ligarLocalizacao(); } else { falar("Mapa. " + pegar("#textoLocal").textContent); }
  } else {
    pararAcompanhamento();
    limparBolhas();
    tocarEmQualquerLugar = true;
    if (!silencioso) { falar("Conversa. Toque em qualquer lugar e fale."); }
    pegar("#tituloInicio").focus();
  }
  window.scrollTo(0, 0);
}

/* ---------- 5) Mapa (Leaflet + OpenStreetMap) ---------- */

let mapa = null;          // o mapa
let camada = null;        // desenhos da rota atual
let marcadorOnibus = null;
let marcadorVoce = null;
let camadaPerto = null;
let distanciaAteVoce = null;

// Cria um pino redondo com um texto dentro.
function criarPino(texto, corFundo, corTexto, tamanho) {
  return L.divIcon({
    className: "",
    iconSize: [tamanho, tamanho],
    iconAnchor: [tamanho / 2, tamanho / 2],
    html: '<div class="pino" style="width:' + tamanho + 'px;height:' + tamanho + 'px;background:' +
      corFundo + ';color:' + corTexto + '">' + texto + "</div>"
  });
}

function criarMapa() {
  if (!window.L) {
    pegar("#mensagemMapa").textContent = "O mapa não carregou. Tudo continua disponível em texto.";
    return;
  }
  if (mapa) {
    setTimeout(function () { mapa.invalidateSize(); }, 60);
    return;
  }
  mapa = L.map("mapa", { keyboard: false, zoomControl: false, attributionControl: false });
  mapa.setView(EMBARQUE.posicao, 11);

  // Mapa de fundo (muda com o tema). Se o da Esri falhar, usa o OpenStreetMap.
  trocarFundoDoMapa();

  camada = L.layerGroup().addTo(mapa);
  camadaPerto = L.layerGroup().addTo(mapa);

  // Pino do embarque e um pino para cada destino.
  L.marker(EMBARQUE.posicao, { icon: criarPino("E", "#ffffff", "#0d0a0b", 36), keyboard: false }).addTo(mapa);
  DESTINOS.forEach(function (destino, indice) {
    const pino = L.marker(destino.posicao, { icon: criarPino(destino.sigla, "#8b1f2f", "#ffffff", 36), keyboard: false });
    pino.on("click", function () { escolherDestino(indice); });
    pino.addTo(mapa);
  });
  setTimeout(function () { mapa.invalidateSize(); }, 60);
}

// Fundo do mapa conforme o tema (Esri: cinza claro ou escuro, sem chave). Se falhar, usa o OpenStreetMap.
let fundoMapa = null;
let usandoMapaReserva = false;
function trocarFundoDoMapa() {
  if (!mapa) { return; }
  if (fundoMapa) { mapa.removeLayer(fundoMapa); }

  if (usandoMapaReserva) {
    fundoMapa = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(mapa);
    return;
  }

  const estilo = document.body.classList.contains("claro") ? "World_Light_Gray_Base" : "World_Dark_Gray_Base";
  const camadaEsri = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/" + estilo + "/MapServer/tile/{z}/{y}/{x}",
    { maxZoom: 16 });
  camadaEsri.once("tileerror", function () {
    usandoMapaReserva = true;
    pegar("#mensagemMapa").textContent = "Usando o mapa reserva.";
    trocarFundoDoMapa();
  });
  camadaEsri.addTo(mapa);
  fundoMapa = camadaEsri;
}

// Cor da rota no mapa: rosé no tema escuro, bordô no tema claro (para ter contraste).
function corDaRota() {
  return document.body.classList.contains("claro") ? "#a9583e" : "#ffb3c4";
}

// Liga ou desliga a voz do site. Quem usa leitor de tela pode desligar para não ouvir duas vozes ao mesmo tempo.
function definirVoz(ligada, anunciar) {
  vozLigada = ligada;
  if (!ligada && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  const botao = pegar("#botaoVoz");
  botao.textContent = ligada ? "Voz do site: ligada" : "Voz do site: desligada";
  botao.setAttribute("aria-label", ligada
    ? "Voz do site ligada. Toque para desligar. Desligue se você já usa um leitor de tela."
    : "Voz do site desligada. Toque para ligar.");
  try { localStorage.setItem("mobintecVoz", ligada ? "ligada" : "desligada"); } catch (e) { }
  if (anunciar) {
    pegar("#textoEstado").textContent = ligada ? "Voz do site ligada." : "Voz do site desligada. Os avisos continuam escritos na tela.";
    falar("Voz do site ligada.");   // só fala se ela estiver ligada
  }
}

// Repete a última mensagem: falando, ou só escrevendo se a voz do site estiver desligada.
function repetirUltima() {
  if (vozLigada) {
    falar(ultimaFala);
    return;
  }
  const estado = pegar("#textoEstado");
  estado.textContent = "";
  setTimeout(function () { estado.textContent = ultimaFala; }, 40);   // texto novo faz o leitor de tela ler
}

// Tema claro ou escuro (fica salvo no aparelho).
function aplicarTema(claro, anunciar) {
  document.body.classList.toggle("claro", claro);
  const botao = pegar("#botaoTema");
  botao.textContent = claro ? "Tema escuro" : "Tema claro";
  botao.setAttribute("aria-label", claro ? "Trocar para tema escuro" : "Trocar para tema claro");
  document.querySelector('meta[name="theme-color"]').setAttribute("content", claro ? "#fdf6f7" : "#0d0a0b");
  try { localStorage.setItem("mobintecTema", claro ? "claro" : "escuro"); } catch (e) { }
  trocarFundoDoMapa();
  if (camada) {
    camada.eachLayer(function (item) {
      if (item.setStyle) { item.setStyle({ color: corDaRota() }); }
    });
  }
  if (anunciar) { avisar(claro ? "Tema claro ativado." : "Tema escuro ativado."); }
}

/* ---------- 6) Microfone ---------- */

const ReconhecimentoDoNavegador = window.SpeechRecognition || window.webkitSpeechRecognition;
let usarModeloProprio = !ReconhecimentoDoNavegador;  // true = usa o plano B (Whisper)

let reconhecimento = null;   // reconhecimento de voz do navegador
let ouvindo = false;
let iniciando = false;       // evita dois toques seguidos criarem dois reconhecimentos
let entendeu = false;        // já entendi o que a pessoa disse?

let gravador = null;         // plano B: gravador de áudio
let fluxoDoMicrofone = null;
let gravando = false;
let processando = false;
let gravacaoCancelada = false;
let transcritor = null;      // plano B: modelo que transforma voz em texto

// Para tudo o que estiver ouvindo ou gravando.
// Destaca a bolha do destino entendido (ela cresce e pulsa) e apaga as outras.
function destacarBolha(destino) {
  document.querySelectorAll(".bolha").forEach(function (bolha, indice) {
    bolha.classList.toggle("ativa", DESTINOS[indice] === destino);
    bolha.classList.toggle("apagada", DESTINOS[indice] !== destino);
  });
}

function limparBolhas() {
  document.querySelectorAll(".bolha").forEach(function (bolha) {
    bolha.classList.remove("ativa", "apagada");
  });
}

function pararMicrofone() {
  if (reconhecimento && (ouvindo || iniciando)) {
    try { reconhecimento.abort(); } catch (erro) { }
  }
  if (gravando) {
    gravacaoCancelada = true;
    gravador.stop();
  }
  ouvindo = false;
  iniciando = false;
  pegar("#anel").classList.remove("ouvindo");
  pegar("#botaoMicrofone").setAttribute("aria-pressed", "false");
  pegar("#botaoPerguntar").setAttribute("aria-pressed", "false");
}

// Chamado quando a pessoa toca no microfone (ou em qualquer lugar da tela inicial).
function tocarMicrofone(botao) {
  if (iniciando) {
    return;
  }
  if (ouvindo) {
    pararMicrofone();
    avisar("Microfone desligado.");
    return;
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  limparBolhas();
  if (usarModeloProprio) {
    ouvirComModeloProprio(botao);
  } else {
    ouvirComNavegador(botao);
  }
}

// Plano A: voz do próprio navegador (Chrome, Edge, Safari).
function ouvirComNavegador(botao) {
  const este = new ReconhecimentoDoNavegador();
  reconhecimento = este;
  este.lang = "pt-BR";
  este.interimResults = true;
  entendeu = false;
  iniciando = true;
  pegar("#textoOuvido").textContent = "";

  este.onstart = function () {
    if (este !== reconhecimento) { return; }
    iniciando = false;
    ouvindo = true;
    apitar(880);
    pegar("#anel").classList.add("ouvindo");
    botao.setAttribute("aria-pressed", "true");
    pegar("#textoEstado").textContent = "Ouvindo… fale agora.";
  };

  este.onresult = function (evento) {
    if (este !== reconhecimento || entendeu) { return; }
    let texto = "";
    for (const resultado of evento.results) {
      texto += " " + resultado[0].transcript;
    }
    pegar("#textoOuvido").textContent = texto.trim();

    const ultimo = evento.results[evento.results.length - 1];
    if (acharDestino(texto) || ultimo.isFinal) {
      entendeu = true;
      pararMicrofone();
      responder(texto);
    }
  };

  este.onerror = function (evento) {
    if (este !== reconhecimento) { return; }
    iniciando = false;
    const erro = evento.error;

    // Se o serviço de voz do navegador não funciona, passa para o plano B.
    if (erro === "network" || erro === "service-not-allowed" || erro === "language-not-supported") {
      entendeu = true;
      usarModeloProprio = true;
      avisar("A voz do navegador não está disponível. Usando a voz do próprio site.");
      ouvirComModeloProprio(botao);
    } else if (erro === "not-allowed") {
      entendeu = true;
      avisar("Permissão do microfone negada. Libere o microfone nas configurações do navegador ou escolha o destino na lista.");
    } else if (erro === "no-speech") {
      entendeu = true;
      avisar("Não ouvi nada. Toque e fale de novo.");
    } else if (erro === "audio-capture") {
      entendeu = true;
      avisar("Nenhum microfone encontrado.");
    }
  };

  este.onend = function () {
    if (este !== reconhecimento) { return; }
    const estavaOuvindo = ouvindo;
    pararMicrofone();
    if (estavaOuvindo) {
      apitar(440);
      if (!entendeu) {
        avisar("Não entendi. Toque e diga, por exemplo, Cataratas.");
      }
    }
  };

  // Se o navegador não responder em 10 segundos, libera o botão.
  setTimeout(function () {
    if (este === reconhecimento && iniciando) {
      iniciando = false;
      avisar("O microfone demorou para responder. Toque de novo ou escolha o destino na lista.");
    }
  }, 10000);

  try {
    este.start();
  } catch (erro) {
    iniciando = false;
    avisar("Não consegui ligar o microfone. Escolha o destino na lista.");
  }
}

// Plano B: grava 6 segundos e transforma em texto com o modelo Whisper (roda no próprio aparelho).
// Baixa cerca de 40 MB na primeira vez e depois fica guardado no navegador.
async function ouvirComModeloProprio(botao) {
  if (gravando) {
    gravador.stop();       // segundo toque: termina a gravação antes
    return;
  }
  if (processando) {
    return;
  }
  try {
    fluxoDoMicrofone = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (erro) {
    avisar("Não consegui usar o microfone. Libere a permissão nas configurações do navegador ou escolha o destino na lista.");
    return;
  }

  const pedacos = [];
  gravacaoCancelada = false;
  gravador = new MediaRecorder(fluxoDoMicrofone);
  const esteGravador = gravador;

  gravador.ondataavailable = function (evento) {
    pedacos.push(evento.data);
  };

  gravador.onstop = async function () {
    gravando = false;
    fluxoDoMicrofone.getTracks().forEach(function (faixa) { faixa.stop(); });
    pegar("#anel").classList.remove("ouvindo");
    botao.setAttribute("aria-pressed", "false");
    if (gravacaoCancelada) {
      return;
    }
    apitar(440);
    processando = true;
    avisar("Entendendo o que você disse…");
    try {
      const audioBruto = await new Blob(pedacos, { type: esteGravador.mimeType }).arrayBuffer();
      const contexto = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const audio = await contexto.decodeAudioData(audioBruto);
      contexto.close();
      const modelo = await carregarModelo();
      const resultado = await modelo(audio.getChannelData(0), { language: "portuguese", task: "transcribe" });
      pegar("#textoOuvido").textContent = resultado.text.trim();
      responder(resultado.text);
    } catch (erro) {
      avisar("Não consegui entender o áudio. Verifique a internet ou escolha o destino na lista.");
    }
    processando = false;
  };

  gravador.start();
  gravando = true;
  apitar(880);
  pegar("#anel").classList.add("ouvindo");
  botao.setAttribute("aria-pressed", "true");
  pegar("#textoEstado").textContent = "Ouvindo… fale agora e toque de novo para terminar.";
  setTimeout(function () {
    if (esteGravador.state === "recording") {
      esteGravador.stop();
    }
  }, 6000);
}

async function carregarModelo() {
  if (transcritor) {
    return transcritor;
  }
  const biblioteca = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.web.min.js");
  transcritor = await biblioteca.pipeline("automatic-speech-recognition", "Xenova/whisper-tiny", {
    progress_callback: function (progresso) {
      if (progresso.status === "progress") {
        pegar("#textoEstado").textContent = "Baixando a voz do site: " + Math.round(progresso.progress) + "% (só na primeira vez)";
      }
    }
  });
  return transcritor;
}

/* ---------- 7) Assistente: entende o que a pessoa falou ou digitou ---------- */

// A pessoa quer ir até o destino (e não só conversar sobre ele)?
function querIrAoDestino(texto) {
  return /quero ir|vou para|ir para|ir ao|ir a |me leva|levar|acompanhar|onibus|rota|abrir|vamos/.test(semAcento(texto));
}

// Abre o painel do ônibus do destino.
function irParaDestino(destino, silencioso) {
  destacarBolha(destino);
  if (!silencioso) { avisar("Certo: ônibus para " + destino.nome + "."); }
  setTimeout(function () {
    abrirTela("lista");
    escolherDestino(DESTINOS.indexOf(destino));
  }, silencioso ? 0 : 900);
}

// Conta sobre o lugar (sem abrir o ônibus) e oferece abrir.
function falarSobreDestino(destino) {
  destacarBolha(destino);
  avisar(destino.nome + ". " + destino.descricao + " Acessibilidade: " + destino.acessibilidade + " Para acompanhar o ônibus, diga: quero ir.");
}

// Faz o que a assistente de IA pediu (só as ações desta lista).
function executarAcao(resposta) {
  const acao = resposta.acao;
  if (acao === "abrir_onibus") {
    const destino = acharDestino(resposta.destino || "");
    if (destino) { irParaDestino(destino, true); }
  } else if (acao === "abrir_mapa") {
    abrirTela("mapa");
  } else if (acao === "ligar_localizacao") {
    if (idLocal === null) { ligarLocalizacao(); }
  } else if (acao === "voltar") {
    voltar();
  } else if (destinoAtual && dados) {
    if (acao === "ler_paradas") { mostrarAba("Rota"); avisar(textoParadas()); }
    if (acao === "ler_acessibilidade") { mostrarAba("Onibus"); avisar(textoAcessibilidade()); }
    if (acao === "ler_transporte") { mostrarAba("Onibus"); avisar(textoTransporte()); }
  }
}

function responder(texto) {
  registrarConversa("Você", texto);
  pegar("#textoOuvido").textContent = "“" + texto.trim() + "”";

  // 1) Citou um destino? Só abre o ônibus se pediu para ir. Senão, conversa sobre o lugar.
  const destino = acharDestino(texto);
  if (destino) {
    if (querIrAoDestino(texto)) { irParaDestino(destino, false); return; }
    if (URL_DA_IA) { destacarBolha(destino); perguntarParaIA(texto); return; }
    falarSobreDestino(destino);
    return;
  }

  // Com a IA ligada, frases longas são conversa livre e vão direto para ela (os comandos são frases curtas).
  if (URL_DA_IA && texto.trim().split(/\s+/).length > 5) {
    perguntarParaIA(texto);
    return;
  }

  // 2) Comandos gerais (funcionam em qualquer momento).
  const t = semAcento(texto);
  if (t.includes("claro") && (t.includes("tema") || t.includes("modo") || t.includes("fundo") || t.split(" ").length <= 2)) { aplicarTema(true, true); return; }
  if (t.includes("escuro") && (t.includes("tema") || t.includes("modo") || t.includes("fundo") || t.split(" ").length <= 2)) { aplicarTema(false, true); return; }
  if (t.includes("tema") || t.includes("trocar cor")) { aplicarTema(!document.body.classList.contains("claro"), true); return; }
  if (t.includes("repet") || t.includes("de novo")) { repetirUltima(); return; }
  if (t.includes("devagar") || t.includes("lent")) { mudarVelocidade(velocidadeVoz - 0.2); return; }
  if (t.includes("rapido") || t.includes("depressa")) { mudarVelocidade(velocidadeVoz + 0.2); return; }
  if (t.includes("voz") && (t.includes("desligar") || t.includes("desativar"))) { definirVoz(false, true); return; }
  if (t.includes("voz") && (t.includes("ligar") || t.includes("ativar"))) { definirVoz(true, true); return; }
  if (t.includes("silencio") || t.includes("parar de falar")) {
    if (window.speechSynthesis) { window.speechSynthesis.cancel(); }
    return;
  }
  if (t.includes("ajuda") || t.includes("comandos")) { avisar(TEXTO_AJUDA); return; }
  if (t.includes("voltar") || t.includes("inicio")) { voltar(); return; }
  if (t.includes("onde estou") || t.includes("localizacao")) { falarLocalizacao(); return; }
  if (t.includes("mapa")) { abrirTela("mapa"); return; }
  if (t.includes("restaurante") || t.includes("comer") || t.includes("lanche")) { pedirPerto("restaurantes"); return; }
  if (t.includes("ponto turistico") || t.includes("pontos turisticos") || t.includes("atracao") || t.includes("atracoes") || t.includes("passeio")) { pedirPerto("atracoes"); return; }
  if (t.includes("hotel") || t.includes("hospedagem") || t.includes("pousada") || t.includes("perto") || t.includes("proxim")) { pedirPerto("hoteis"); return; }

  // 3) Perguntas sobre o ônibus (precisam de um destino já escolhido).
  if (!destinoAtual) {
    if (URL_DA_IA) { perguntarParaIA(texto); return; }
    avisar("Primeiro diga um destino, por exemplo Cataratas.");
    return;
  }
  if (t.includes("transporte") || t.includes("horario") || t.includes("preco") || t.includes("valor") || t.includes("contato") || t.includes("operadora")) { mostrarAba("Onibus"); avisar(textoTransporte()); return; }
  if (t.includes("acessibilidade") || t.includes("rampa")) { mostrarAba("Onibus"); avisar(textoAcessibilidade()); return; }
  if (t.includes("assento") || t.includes("poltrona") || t.includes("lugar") || t.includes("livre")) { mostrarAba("Onibus"); avisar(textoAssento()); return; }
  if (t.includes("parada") || t.includes("ponto de onibus")) { mostrarAba("Rota"); avisar(textoParadas()); return; }
  if (t.includes("rota") || t.includes("caminho") || t.includes("linha") || t.includes("distancia")) { mostrarAba("Rota"); avisar(textoRota()); return; }
  if (t.includes("onibus") || t.includes("chega") || t.includes("minuto") || t.includes("tempo") || t.includes("onde")) { mostrarAba("Onibus"); avisar(frasePrincipal()); return; }

  if (URL_DA_IA) { perguntarParaIA(texto); return; }
  avisar("Não entendi. Diga ajuda para ouvir os comandos.");
}

// Assistente de IA: conversa livre. O servidor (pasta "ia") guarda a chave e recebe só o texto e o contexto.
// O tempo do ônibus e o assento PCD vêm sempre dos dados do site, a IA só conversa sobre eles.
let conversa = [];   // últimas mensagens, para a IA lembrar do assunto

async function perguntarParaIA(texto) {
  pegar("#textoEstado").textContent = "Pensando…";
  pegar("#textoResposta").textContent = "Pensando…";
  // Se a conversa é sobre comer, dormir ou passear, procura esses lugares antes de perguntar à IA.
  const frase = semAcento(texto);
  let categoria = null;
  if (/restaurante|comer|fome|almoc|jantar|lanche|cafe/.test(frase)) { categoria = "restaurantes"; }
  else if (/hotel|hospedag|dormir|pousada/.test(frase)) { categoria = "hoteis"; }
  else if (/ponto turistico|atracao|atracoes|passeio|visitar|conhecer|museu|mirante/.test(frase)) { categoria = "atracoes"; }
  if (categoria && (posicaoUsuario || destinoAtual)) { await buscarPerto(categoria); }

  let contexto = { destino: "nenhum escolhido ainda" };
  if (destinoAtual && dados) {
    contexto = { destino: destinoAtual.nome, descricao: destinoAtual.descricao, servico: destinoAtual.servico, acessibilidade: destinoAtual.acessibilidade, aConfirmar: destinoAtual.aConfirmar, status: frasePrincipal(), rota: textoRota(), lugaresPerto: textoPerto(), paradas: textoParadas(), transporte: textoTransporte() };
    mostrarAba("Assistente");
  }
  contexto.todosOsDestinos = DESTINOS.map(function (d) {
    return { nome: d.nome, servico: d.servico, descricao: d.descricao, acessibilidade: d.acessibilidade };
  });
  if (perto.lista.length > 0 && !contexto.lugaresPerto) { contexto.lugaresPerto = textoPerto(); }
  if (distanciaAteVoce !== null) { contexto.voceEstaA = formatarDistancia(distanciaAteVoce) + " do ponto de embarque"; }
  try {
    const controle = new AbortController();
    const prazo = setTimeout(function () { controle.abort(); }, 15000);
    const resposta = await fetch(URL_DA_IA, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pergunta: texto, historico: conversa, contexto: contexto }),
      signal: controle.signal
    });
    clearTimeout(prazo);
    const json = await resposta.json();
    if (!resposta.ok || !json.resposta) { throw new Error(json.detalhe || json.erro || "sem resposta"); }
    conversa.push({ role: "user", content: texto });
    conversa.push({ role: "assistant", content: json.resposta });
    conversa = conversa.slice(-6);
    avisar(json.resposta, function () { executarAcao(json); });
  } catch (erro) {
    console.warn("Erro da assistente de IA:", erro);   // aparece no Console (F12) para ajudar a achar o problema
    avisar("Não consegui falar com a assistente agora. Diga ajuda para ouvir os comandos.");
  }
}

function mudarVelocidade(nova) {
  velocidadeVoz = Math.min(1.6, Math.max(0.6, nova));
  try { localStorage.setItem("mobintecVelocidade", velocidadeVoz); } catch (e) { }
  falar("Velocidade da voz alterada.");
}

// ---------- Localização em tempo real (só liga quando a pessoa pede) ----------
let idLocal = null;                 // número da vigilância de posição (null = desligada)
let posicaoUsuario = null;          // [latitude, longitude] da pessoa
let ultimoLimiar = null;            // último aviso de proximidade já falado
let ultimaDistanciaMostrada = null;
let centralizouNaPessoa = false;

function mostrarVoceNoMapa() {
  if (!mapa || !posicaoUsuario) { return; }
  if (marcadorVoce) {
    marcadorVoce.setLatLng(posicaoUsuario);
  } else {
    marcadorVoce = L.marker(posicaoUsuario, { icon: criarPino("EU", "#5de08a", "#0d0a0b", 40), keyboard: false }).addTo(mapa);
  }
}

function atualizarBotaoLocal() {
  pegar("#botaoLocal").textContent = idLocal !== null ? "Desligar minha localização" : "Ativar minha localização";
}

function aoReceberPosicao(posicao) {
  posicaoUsuario = [posicao.coords.latitude, posicao.coords.longitude];
  distanciaAteVoce = distanciaEntre(posicaoUsuario, EMBARQUE.posicao);
  mostrarVoceNoMapa();
  if (mapa && !dados && !centralizouNaPessoa) {   // sem rota aberta: o mapa vai para onde a pessoa está
    mapa.setView(posicaoUsuario, 15);
    centralizouNaPessoa = true;
  }
  avisarProximidade();

  // O texto só muda quando a distância muda bastante (para não ficar falando toda hora).
  if (ultimaDistanciaMostrada === null || Math.abs(distanciaAteVoce - ultimaDistanciaMostrada) >= 25) {
    ultimaDistanciaMostrada = distanciaAteVoce;
    pegar("#textoLocal").textContent = "Você está a " + formatarDistancia(distanciaAteVoce) + " do ponto de embarque, " + EMBARQUE.nome + ".";
  }

  // Avisos falados ao chegar perto do embarque: um por faixa de distância.
  let faixa = null;
  if (distanciaAteVoce <= 50) { faixa = 50; } else if (distanciaAteVoce <= 200) { faixa = 200; } else if (distanciaAteVoce <= 500) { faixa = 500; }
  if (faixa !== null && (ultimoLimiar === null || faixa < ultimoLimiar)) {
    ultimoLimiar = faixa;
    avisar(faixa === 50 ? "Você chegou ao ponto de embarque." : "Você está a menos de " + faixa + " metros do ponto de embarque.");
  }
}

function ligarLocalizacao() {
  if (!navigator.geolocation) {
    avisar("Este navegador não tem localização.");
    return;
  }
  if (idLocal !== null) {   // já estava ligada: desliga
    navigator.geolocation.clearWatch(idLocal);
    idLocal = null;
    posicaoUsuario = null;
    distanciaAteVoce = null;
    ultimoLimiar = null;
    ultimaDistanciaMostrada = null;
    centralizouNaPessoa = false;
    if (marcadorVoce) { marcadorVoce.remove(); marcadorVoce = null; }
    atualizarBotaoLocal();
    pegar("#textoLocal").textContent = "Localização desligada. O ponto de embarque é no " + EMBARQUE.nome + ".";
    avisar("Localização desligada.");
    return;
  }
  avisar("Ligando a localização. Se o navegador perguntar, escolha permitir.");
  idLocal = navigator.geolocation.watchPosition(aoReceberPosicao, function () {
    navigator.geolocation.clearWatch(idLocal);
    idLocal = null;
    atualizarBotaoLocal();
    avisar("Não consegui sua localização. Libere a localização no navegador. O embarque é no " + EMBARQUE.nome + ".");
  }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
  atualizarBotaoLocal();
}

function falarLocalizacao() {
  if (idLocal === null) {
    ligarLocalizacao();
  } else {
    avisar(pegar("#textoLocal").textContent);
  }
}

/* ---------- 8) Painel do ônibus ---------- */

let destinoAtual = null;   // destino escolhido
let dados = null;          // dados do ônibus: pontos da rota, tempo, assentos, hotéis
let relogioDoTempo = null;
let relogioDaCamera = null;
let numeroDaEscolha = 0;   // ajuda a ignorar respostas atrasadas de uma escolha antiga
let ultimoMinuto = 0;

// Minutos que faltam (nunca menos de 1, enquanto o ônibus não chegou).
function minutosQueFaltam() {
  return Math.max(1, Math.ceil(dados.segundosAteChegar / 60));
}

function textoAcessibilidade() {
  return "Acessibilidade em " + destinoAtual.nome + ". " + destinoAtual.acessibilidade;
}

// Mostra só uma parte do painel por vez (menos informação ao mesmo tempo): Onibus, Rota, Perto ou Assistente.
function mostrarAba(nome) {
  ["Onibus", "Rota", "Perto", "Assistente"].forEach(function (aba) {
    pegar("#aba" + aba).hidden = aba !== nome;
  });
  document.querySelectorAll(".botao-aba").forEach(function (botao) {
    botao.setAttribute("aria-current", botao.dataset.aba === nome ? "true" : "false");
  });
}

function textoAssento() {
  const estado = dados.assentoPcdOcupado ? "ocupada" : "livre";
  return "Poltrona PCD " + estado + ". " + dados.assentosLivres + " de 12 assentos livres.";
}

function textoRota() {
  return destinoAtual.servico + ": de " + EMBARQUE.nome + " até " + destinoAtual.nome + ", " +
    formatarDistancia(dados.distancia) + ", cerca de " + Math.round(dados.duracao / 60) + " minutos de viagem.";
}

// Tipos de lugar que a pessoa pode pedir (dados do OpenStreetMap).
const CATEGORIAS = {
  hoteis: { nome: "hotéis", sigla: "H", filtro: '["tourism"~"hotel|hostel|guest_house|motel|apartment"]' },
  restaurantes: { nome: "restaurantes", sigla: "R", filtro: '["amenity"~"restaurant|cafe|fast_food|bar"]' },
  atracoes: { nome: "pontos turísticos", sigla: "T", filtro: '["tourism"~"attraction|museum|viewpoint|zoo|theme_park|gallery"]' }
};
let perto = { categoria: "hoteis", nome: "hotéis", referencia: "", lista: [] };
let numeroDaBusca = 0;

function textoPerto() {
  if (perto.lista.length === 0) {
    return "Não encontrei " + perto.nome + " perto de " + perto.referencia + " nos dados do mapa.";
  }
  const nomes = perto.lista.map(function (lugar) {
    return lugar.nome + ", a " + formatarDistancia(lugar.distancia);
  });
  return "Perto de " + perto.referencia + ", " + perto.nome + ": " + nomes.join("; ") + ".";
}

// Frase principal: tempo de chegada + assento PCD.
function frasePrincipal() {
  let quando = "chegou ao ponto de embarque";
  if (dados.segundosAteChegar > 0) {
    const minutos = minutosQueFaltam();
    quando = "chegando em " + minutos + (minutos > 1 ? " minutos" : " minuto");
  }
  const assento = dados.assentoPcdOcupado ? "ocupado" : "livre";
  return destinoAtual.servico + " " + quando + " com assento PCD " + assento + ". " +
    dados.assentosLivres + " assentos livres.";
}

// Busca a rota de carro (OSRM). Sem internet, usa uma linha reta.
async function buscarRota(origem, destino) {
  try {
    const endereco = "https://router.project-osrm.org/route/v1/driving/" +
      origem[1] + "," + origem[0] + ";" + destino[1] + "," + destino[0] +
      "?overview=full&geometries=geojson";
    const resposta = await fetch(endereco);
    const json = await resposta.json();
    const rota = json.routes[0];
    const pontos = rota.geometry.coordinates.map(function (par) { return [par[1], par[0]]; });
    return { pontos: pontos, duracao: rota.duration, distancia: rota.distance };
  } catch (erro) {
    const metros = distanciaEntre(origem, destino);
    return { pontos: [origem, destino], duracao: metros / 8, distancia: metros };
  }
}

// Posição do ônibus na rota, de acordo com o tempo que falta.
function posicaoDoOnibus() {
  const parte = dados.segundosAteChegar / dados.duracao;
  const indice = Math.round(parte * (dados.pontos.length - 1));
  return dados.pontos[indice];
}

// Desenha no mapa a rota, o destino, o ônibus e os lugares perto (só se o mapa já foi aberto).
function desenharRotaNoMapa() {
  if (!mapa || !dados || !destinoAtual) { return; }
  camada.clearLayers();
  L.polyline(dados.pontos, { color: corDaRota(), weight: 6 }).addTo(camada);
  L.marker(destinoAtual.posicao, { icon: criarPino(destinoAtual.sigla, "#8b1f2f", "#ffffff", 36), keyboard: false }).addTo(camada);
  marcadorOnibus = L.marker(posicaoDoOnibus(), { icon: criarPino(destinoAtual.sigla, "#ffffff", "#0d0a0b", 46), keyboard: false }).addTo(camada);
  const limites = L.polyline(dados.pontos).getBounds();
  if (posicaoUsuario) { limites.extend(posicaoUsuario); }   // mostra também onde a pessoa está
  mapa.fitBounds(limites, { padding: [30, 30] });
}

// Desenha no mapa os lugares perto (hotéis, restaurantes ou pontos turísticos).
function desenharPerto() {
  if (!mapa) { return; }
  camadaPerto.clearLayers();
  perto.lista.forEach(function (lugar) {
    L.marker(lugar.posicao, { icon: criarPino(CATEGORIAS[perto.categoria].sigla, "#ffffff", "#0d0a0b", 30), keyboard: false }).addTo(camadaPerto);
  });
}

// ---------- Transporte turístico e paradas da rota ----------
let paradas = [];                  // paradas de ônibus no caminho (dados do OpenStreetMap, podem estar incompletos)
let paradasAvisadas = {};          // paradas que já foram faladas durante o percurso
let chegandoAvisado = false;

function textoTransporte() {
  return destinoAtual.servico + ". Operadora: " + destinoAtual.operadora + ". Horários: " + destinoAtual.horarios +
    ". Preço: " + destinoAtual.preco + ". Contato: " + destinoAtual.contato + ".";
}

function textoParadas() {
  if (paradas.length === 0) {
    return "Não encontrei paradas desta rota nos dados do mapa. Os pontos de parada ainda precisam ser confirmados com a operadora.";
  }
  const nomes = paradas.slice(0, 5).map(function (parada) { return parada.nome; });
  return "Há " + paradas.length + " paradas no caminho até " + destinoAtual.nome + ". As primeiras: " + nomes.join("; ") +
    (paradas.length > 5 ? ", e outras" : "") + ". Dados do mapa, podem estar incompletos.";
}

// Procura as paradas de ônibus que ficam perto da rota, na ordem do percurso.
async function buscarParadas() {
  const minhaEscolha = numeroDaEscolha;
  paradas = [];
  paradasAvisadas = {};
  chegandoAvisado = false;
  pegar("#textoParadas").textContent = "Procurando paradas no caminho…";
  pegar("#listaParadas").replaceChildren();
  try {
    const latitudes = dados.pontos.map(function (ponto) { return ponto[0]; });
    const longitudes = dados.pontos.map(function (ponto) { return ponto[1]; });
    const margem = 0.002;
    const caixa = [Math.min(...latitudes) - margem, Math.min(...longitudes) - margem,
      Math.max(...latitudes) + margem, Math.max(...longitudes) + margem].join(",");
    const consulta = '[out:json][timeout:20];node["highway"="bus_stop"](' + caixa + ");out 600;";
    const resposta = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: new URLSearchParams({ data: consulta })
    });
    const json = await resposta.json();
    if (minhaEscolha !== numeroDaEscolha) { return; }

    const achadas = [];
    json.elements.forEach(function (item) {
      // Vê qual ponto da rota está mais perto desta parada.
      let menor = Infinity;
      let ordem = 0;
      dados.pontos.forEach(function (ponto, i) {
        const distancia = distanciaEntre(ponto, [item.lat, item.lon]);
        if (distancia < menor) { menor = distancia; ordem = i; }
      });
      if (menor <= 100) {   // só as que ficam a até 100 metros da rota
        achadas.push({ nome: (item.tags && item.tags.name) || "parada sem nome", posicao: [item.lat, item.lon], ordem: ordem });
      }
    });
    achadas.sort(function (a, b) { return a.ordem - b.ordem; });
    paradas = achadas.slice(0, 40);
  } catch (erro) {
    if (minhaEscolha !== numeroDaEscolha) { return; }
    paradas = [];
  }

  const itens = paradas.slice(0, 8).map(function (parada) {
    const item = document.createElement("li");
    item.textContent = parada.nome;
    return item;
  });
  pegar("#listaParadas").replaceChildren(...itens);
  pegar("#textoParadas").textContent = paradas.length === 0
    ? "Nenhuma parada encontrada nos dados do mapa. A confirmar com a operadora."
    : paradas.length + " paradas no caminho" + (paradas.length > 8 ? " (mostrando as 8 primeiras)." : ".");
}

// Com a localização ligada: avisa quando a pessoa passa perto de uma parada e quando está chegando ao destino.
function avisarProximidade() {
  if (!destinoAtual) { return; }
  const ateDestino = distanciaEntre(posicaoUsuario, destinoAtual.posicao);
  if (ateDestino <= 300 && !chegandoAvisado) {
    chegandoAvisado = true;
    avisar("Você está chegando em " + destinoAtual.nome + ".");
    return;
  }
  for (let i = 0; i < paradas.length; i++) {
    const distancia = distanciaEntre(posicaoUsuario, paradas[i].posicao);
    if (!paradasAvisadas[i] && distancia <= 100) {
      paradasAvisadas[i] = true;
      avisar("Parada " + paradas[i].nome + ", a " + formatarDistancia(distancia) + ".");
      return;
    }
  }
}

// Atualiza os textos e cores do painel.
function desenharPainel() {
  const cor = dados.assentoPcdOcupado ? "ocupado" : "";
  pegar("#alerta").className = "alerta " + cor;
  pegar("#selo").className = "selo " + cor;
  pegar("#selo").textContent = dados.assentoPcdOcupado ? "✕ OCUPADA" : "✓ LIVRE";
  pegar("#tempo").textContent = dados.segundosAteChegar > 0 ? minutosQueFaltam() + " min" : "Chegou";
  const feito = 1 - dados.segundosAteChegar / dados.segundosIniciais;   // quanto do caminho o ônibus já andou
  pegar("#barra").style.width = Math.round(Math.min(1, Math.max(0, feito)) * 100) + "%";
  pegar("#textoCamera").textContent = "Poltrona PCD " + (dados.assentoPcdOcupado ? "ocupada" : "livre") + ". " +
    dados.assentosLivres + " de 12 assentos livres. Atualizado às " + new Date().toLocaleTimeString("pt-BR") + ".";
}

// Anuncia o status: escreve no alerta (leitor de tela), fala e vibra.
function anunciarStatus(prefixo) {
  desenharPainel();
  const frase = (prefixo ? prefixo + " " : "") + frasePrincipal();
  const alerta = pegar("#alerta");
  alerta.textContent = "";
  setTimeout(function () { alerta.textContent = frase; }, 40);   // texto novo faz o leitor de tela falar
  falar(frase);
  if (dados.segundosAteChegar === 0) {
    vibrar([400, 150, 400]);
  } else if (prefixo) {
    vibrar([200, 100, 200]);
  } else {
    vibrar(80);
  }
}

// Escolhe um destino (pela voz, pela lista ou pelo mapa).
async function escolherDestino(indice) {
  clearInterval(relogioDoTempo);
  clearInterval(relogioDaCamera);
  numeroDaEscolha = numeroDaEscolha + 1;
  const minhaEscolha = numeroDaEscolha;
  destinoAtual = DESTINOS[indice];

  pegar("#tituloPainel").textContent = destinoAtual.servico + " · " + destinoAtual.nome;
  pegar("#textoRota").textContent = "Calculando a rota…";
  pegar("#listaHoteis").replaceChildren();
  mostrar(pegar("#painel"), true);
  if (mapa) {
    camada.clearLayers();
  }

  const rota = await buscarRota(EMBARQUE.posicao, destinoAtual.posicao);
  if (minhaEscolha !== numeroDaEscolha) {
    return;   // a pessoa já escolheu outro destino
  }

  dados = {
    pontos: rota.pontos,
    duracao: rota.duracao,
    distancia: rota.distancia,
    segundosAteChegar: Math.min(rota.duracao, 240 + sortear(120)),   // simulado: ônibus a 4 a 6 minutos
    assentoPcdOcupado: false,                                        // simulado: câmera com IA
    assentosLivres: 2 + sortear(8),                                  // simulado
  };
  dados.segundosIniciais = dados.segundosAteChegar;
  ultimoMinuto = minutosQueFaltam();

  desenharRotaNoMapa();

  pegar("#textoRota").textContent = textoRota();
  pegar("#textoDestino").textContent = destinoAtual.descricao;
  pegar("#textoAcessibilidade").textContent = destinoAtual.acessibilidade;
  pegar("#textoConfirmar").textContent = "Ainda a confirmar: " + destinoAtual.aConfirmar.join("; ") + ".";
  pegar("#textoTransporte").textContent = textoTransporte();
  mostrarAba("Onibus");
  pegar("#linkMaps").href = "https://www.google.com/maps/dir/?api=1&destination=" +
    EMBARQUE.posicao[0] + "," + EMBARQUE.posicao[1] + "&travelmode=walking";

  anunciarStatus("Você escolheu " + destinoAtual.nome + ".");
  pegar("#tituloPainel").focus();

  // Mantém a tela acesa durante o acompanhamento (se o navegador permitir).
  if (navigator.wakeLock) {
    navigator.wakeLock.request("screen").catch(function () { });
  }

  relogioDoTempo = setInterval(passarTempo, 1000);
  relogioDaCamera = setInterval(lerCamera, 12000);
  buscarPerto("hoteis");
  buscarParadas();
}

// A cada segundo: o ônibus anda e o tempo diminui.
function passarTempo() {
  dados.segundosAteChegar = Math.max(0, dados.segundosAteChegar - VELOCIDADE_TESTE);
  if (marcadorOnibus) {
    marcadorOnibus.setLatLng(posicaoDoOnibus());
  }

  if (dados.segundosAteChegar === 0) {
    clearInterval(relogioDoTempo);
    anunciarStatus("");
  } else if (minutosQueFaltam() !== ultimoMinuto) {
    ultimoMinuto = minutosQueFaltam();
    anunciarStatus("");
  } else {
    desenharPainel();
  }
}

// A cada 12 segundos: nova "leitura" da câmera (simulada).
function lerCamera() {
  const estavaOcupado = dados.assentoPcdOcupado;
  if (Math.random() < 0.3) {
    dados.assentoPcdOcupado = !dados.assentoPcdOcupado;
  }
  dados.assentosLivres = Math.min(12, Math.max(0, dados.assentosLivres + sortear(3) - 1));
  if (estavaOcupado !== dados.assentoPcdOcupado) {
    anunciarStatus("Atenção.");     // o assento PCD mudou
  } else {
    desenharPainel();
  }
}

// Procura hotéis até 5 km do destino (dados do OpenStreetMap).
// Procura lugares de um tipo perto da pessoa (se a localização estiver ligada) ou perto do destino.
async function buscarPerto(categoria) {
  const tipo = CATEGORIAS[categoria];
  document.querySelectorAll(".botao-cat").forEach(function (botao) {
    botao.setAttribute("aria-current", botao.dataset.cat === categoria ? "true" : "false");
  });
  const centro = posicaoUsuario || (destinoAtual ? destinoAtual.posicao : null);
  if (!centro) { return false; }

  const minhaBusca = numeroDaBusca + 1;
  numeroDaBusca = minhaBusca;
  perto = { categoria: categoria, nome: tipo.nome, referencia: posicaoUsuario ? "você" : destinoAtual.nome, lista: [] };
  pegar("#textoPerto").textContent = "Procurando " + tipo.nome + " perto de " + perto.referencia + "…";

  const lista = [];
  try {
    const raio = posicaoUsuario ? 3000 : 5000;
    const consulta = "[out:json][timeout:15];nwr" + tipo.filtro + '["name"]' +
      "(around:" + raio + "," + centro[0] + "," + centro[1] + ");out center 40;";
    const resposta = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: new URLSearchParams({ data: consulta })
    });
    const json = await resposta.json();
    for (const item of json.elements) {
      const ponto = item.center ? [item.center.lat, item.center.lon] : [item.lat, item.lon];
      if (ponto[0] && item.tags && item.tags.name) {
        lista.push({ nome: item.tags.name, posicao: ponto, distancia: distanciaEntre(centro, ponto) });
      }
    }
    lista.sort(function (a, b) { return a.distancia - b.distancia; });
  } catch (erro) {
    lista.length = 0;
  }
  if (minhaBusca !== numeroDaBusca) { return false; }   // a pessoa já pediu outra coisa
  perto.lista = lista.slice(0, 4);

  // Mostra na lista e no mapa.
  const itens = perto.lista.map(function (lugar) {
    const item = document.createElement("li");
    item.textContent = lugar.nome + " · " + formatarDistancia(lugar.distancia);
    return item;
  });
  if (itens.length === 0) {
    const vazio = document.createElement("li");
    vazio.textContent = "Nenhum resultado nos dados do mapa.";
    itens.push(vazio);
  }
  pegar("#listaHoteis").replaceChildren(...itens);
  pegar("#textoPerto").textContent = "Mostrando " + tipo.nome + " perto de " + perto.referencia + ".";
  pegar("#listaPertoMapa").replaceChildren(...itens.map(function (item) { return item.cloneNode(true); }));
  desenharPerto();
  return true;
}

// Quando a pessoa pede (por voz ou botão): procura e lê o resultado.
async function pedirPerto(categoria) {
  if (!posicaoUsuario && !destinoAtual) {
    avisar("Para procurar lugares, diga um destino ou ative a localização no mapa.");
    return;
  }
  if (destinoAtual) { mostrarAba("Perto"); }
  avisar("Procurando " + CATEGORIAS[categoria].nome + "…");
  const achou = await buscarPerto(categoria);
  if (achou) { avisar(textoPerto()); }
}

/* ---------- 9) Ligações dos botões e início ---------- */

// Botões de destino da tela inicial (alternativa sem voz) e cartões da lista.
DESTINOS.forEach(function (destino, indice) {
  // Bolha do destino (tela inicial): foto transparente + nome.
  const bolha = document.createElement("button");
  bolha.className = "bolha b" + (indice + 1);
  bolha.setAttribute("aria-label", "Escolher " + destino.nome);
  bolha.innerHTML = '<span class="foto" aria-hidden="true"></span><span class="nome"></span>';
  bolha.querySelector(".foto").style.backgroundImage = "url(" + destino.foto + ")";
  bolha.querySelector(".nome").textContent = destino.nome;
  bolha.onclick = function () { irParaDestino(destino, false); };
  pegar("#bolhas").appendChild(bolha);

  const cartao = document.createElement("li");
  cartao.className = "cartao";
  cartao.innerHTML = '<h3 class="font-serif text-3xl"></h3><p class="pilula"></p><button class="botao botao-forte">Acompanhar o ônibus</button>';
  cartao.querySelector("h3").textContent = destino.nome;
  cartao.querySelector("p").textContent = destino.servico;
  const acompanhar = cartao.querySelector("button");
  acompanhar.setAttribute("aria-label", "Acompanhar o " + destino.servico + " até " + destino.nome);
  acompanhar.onclick = function () { escolherDestino(indice); };
  pegar("#cartoes").appendChild(cartao);
});

pegar("#botaoMicrofone").onclick = function () { tocarMicrofone(pegar("#botaoMicrofone")); };
pegar("#botaoPerguntar").onclick = function () { tocarMicrofone(pegar("#botaoPerguntar")); };
document.querySelectorAll(".botao-aba").forEach(function (botao) {
  botao.onclick = function () {
    if (!dados) { return; }
    mostrarAba(botao.dataset.aba);
    const falas = { Onibus: frasePrincipal, Rota: textoRota, Perto: textoPerto, Assistente: function () { return "Pergunte por voz ou digite. Por exemplo: tem assento livre?"; } };
    avisar(falas[botao.dataset.aba]());
  };
});
document.querySelectorAll(".botao-cat").forEach(function (botao) {
  botao.onclick = function () { pedirPerto(botao.dataset.cat); };
});
pegar("#botaoAbrirMapa").onclick = function () { abrirTela("mapa"); };
pegar("#botaoVoltarMapa").onclick = function () { voltar(); };
pegar("#botaoLocal").onclick = function () { ligarLocalizacao(); };
pegar("#botaoVoltar").onclick = function () { voltar(); };
pegar("#botaoRepetir").onclick = function () { repetirUltima(); };
pegar("#botaoVoz").onclick = function () { definirVoz(!vozLigada, true); };
pegar("#botaoTema").onclick = function () { aplicarTema(!document.body.classList.contains("claro"), true); };
// Tema e voz iniciais: o que a pessoa escolheu antes. Se nunca escolheu, o tema segue o do aparelho.
let temaSalvo = null;
let vozSalva = null;
try { temaSalvo = localStorage.getItem("mobintecTema"); vozSalva = localStorage.getItem("mobintecVoz"); velocidadeVoz = Number(localStorage.getItem("mobintecVelocidade")) || 1; } catch (e) { }
aplicarTema(temaSalvo ? temaSalvo === "claro" : true, false);   // primeira visita: tema claro (design system do projeto)
definirVoz(vozSalva !== "desligada", false);
pegar("#botaoAjuda").onclick = function () { avisar(TEXTO_AJUDA); };
pegar("#botaoOuvirStatus").onclick = function () { if (dados) { anunciarStatus(""); } };
pegar("#botaoOuvirParadas").onclick = function () { if (dados) { avisar(textoParadas()); } };
pegar("#botaoOuvirHoteis").onclick = function () { if (dados) { avisar(textoPerto()); } };

// Formulário de texto (alternativa à voz).
pegar("#formulario").onsubmit = function (evento) {
  evento.preventDefault();
  responder(pegar("#campoTexto").value);
};

// Na tela inicial, tocar em qualquer lugar liga o microfone (só até o primeiro destino ser entendido).
let tocarEmQualquerLugar = true;
document.addEventListener("click", function (evento) {
  const naTelaInicial = !pegar("#telaInicio").hidden;
  const tocouEmControle = evento.target.closest("button, input, a");
  if (tocarEmQualquerLugar && naTelaInicial && !tocouEmControle) {
    tocarMicrofone(pegar("#botaoMicrofone"));
  }
});

// Avisos para quem abriu o site em um lugar onde a voz não funciona.
const navegador = navigator.userAgent;
if (/Instagram|FBAN|FBAV|FB_IAB|WhatsApp|TikTok|; wv\)/i.test(navegador)) {
  mostrar(pegar("#aviso"), true);
  pegar("#aviso").textContent = "Você abriu o site dentro de outro aplicativo (como Instagram ou WhatsApp), onde a voz não funciona. " +
    "Toque nos três pontinhos e escolha “Abrir no navegador”.";
} else if (!ReconhecimentoDoNavegador) {
  mostrar(pegar("#aviso"), true);
  pegar("#aviso").textContent = "Este navegador não tem voz própria. O site vai usar a voz dele, que baixa cerca de 40 MB na primeira vez.";
}

// O botão "voltar" do aparelho leva ao início (só se a lista estiver aberta).
window.addEventListener("popstate", function () {
  const tela = (history.state && history.state.tela) || "inicio";
  abrirTela(tela, false, true);
});

// Link "Ir para o conteúdo": foca o conteúdo sem mudar o endereço da página.
pegar(".pular").onclick = function (evento) {
  evento.preventDefault();
  pegar("#principal").focus();
};

// Começa na tela inicial e fala as boas-vindas (o navegador pode bloquear a fala até o primeiro toque).
abrirTela("inicio", true);
window.addEventListener("load", function () { falar(BOAS_VINDAS); });