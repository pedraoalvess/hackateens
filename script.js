/* ==========================================================================
MOBINTEC - script do site
Tudo foi escrito de forma simples, em português, com uma ideia por linha.
Partes: 1) ajudantes  2) dados  3) fala  4) telas  5) mapa  6) microfone
7) assistente  8) localização  9) painel do ônibus  10) botões
(A câmera foi movida para camera.js)
========================================================================== */

/* ---------- 1) Ajudantes ---------- */
function pegar(seletor) {
  return document.querySelector(seletor);
}

function semAcento(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function sortear(max) {
  return Math.floor(Math.random() * max);
}

function formatarDistancia(metros) {
  if (metros < 1000) {
    return Math.round(metros) + " metros";
  }
  return (metros / 1000).toFixed(1).replace(".", ",") + " km";
}

function distanciaEntre(a, b) {
  const raio = 6371000;
  const grau = Math.PI / 180;
  const dLat = (b[0] - a[0]) * grau;
  const dLon = (b[1] - a[1]) * grau;
  const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(a[0] * grau) * Math.cos(b[0] * grau) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * raio * Math.asin(Math.sqrt(x));
}

function mostrar(elemento, visivel) {
  elemento.hidden = !visivel;
  elemento.setAttribute("aria-hidden", visivel ? "false" : "true");
}

// Pega o embarque escolhido do destino atual (ou o primeiro, se não escolheu)
function embarqueAtual() {
  if (!destinoAtual) return null;
  if (destinoAtual.embarqueEscolhido) {
    return destinoAtual.embarqueEscolhido;
  }
  return destinoAtual.embarques[0];
}

/* ---------- 2) Dados do projeto ---------- */
const VELOCIDADE_TESTE = 5;
const URL_DA_IA = "https://mobintec-ia.pdeoliveiraalves840.workers.dev/";

const BOAS_VINDAS = "Bem-vindo ao Mobintec. Toque em qualquer lugar da tela e converse comigo. " +
  "Você pode pedir o ônibus de um destino, escolher onde embarcar, perguntar sobre gratuidade para pessoas com deficiência, " +
  "e saber o próximo horário. Se você usa leitor de tela, toque duas vezes no botão do microfone.";

const TEXTO_AJUDA = "Você pode conversar comigo normalmente. Por exemplo: quero ir para as Cataratas; " +
  "onde eu embarco; qual o próximo ônibus; tem gratuidade para PCD; tem restaurante perto de mim; " +
  "abre o mapa; quando o ônibus chega; tem assento livre; como é a acessibilidade; trocar embarque; " +
  "quais são as paradas; onde eu desço. " +
  "Para os assentos: ler os assentos com a câmera do celular, ver a câmera do ônibus ou parar a câmera. " +
  "Também funcionam: repetir, mais devagar, mais rápido, silêncio, desligar a voz e voltar.";

function acharDestino(texto) {
  const limpo = semAcento(texto);
  for (const destino of DESTINOS) {
    for (const palavra of destino.palavras) {
      if (limpo.includes(semAcento(palavra))) {
        return destino;
      }
    }
  }
  return null;
}

/* ---------- 3) Fala, sons e vibração ---------- */
let ultimaFala = "";
let velocidadeVoz = 1;
let vozLigada = true;

function falar(texto, naFila, aoTerminar) {
  ultimaFala = texto;
  if (!vozLigada || !window.speechSynthesis) {
    if (aoTerminar) { setTimeout(aoTerminar, 0); }
    return;
  }
  if (!naFila) {
    window.speechSynthesis.cancel();
  }
  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = "pt-BR";
  fala.rate = velocidadeVoz;
  if (aoTerminar) {
    let feito = false;
    const terminar = function() {
      if (!feito) { feito = true; aoTerminar(); }
    };
    fala.onend = terminar;
    fala.onerror = terminar;
    setTimeout(terminar, 12000);
  }
  window.speechSynthesis.speak(fala);
}

function registrarConversa(quem, texto) {
  const lista = pegar("#conversa");
  const item = document.createElement("li");
  item.className = quem === "Você" ? "voce" : "assistente";
  item.textContent = quem + ": " + texto;
  lista.appendChild(item);
  while (lista.children.length > 6) { lista.removeChild(lista.firstChild); }
  const flutuante = document.getElementById("conversaFlutuante");
  if (flutuante) {
    const copia = document.createElement("li");
    copia.className = item.className;
    copia.textContent = texto;
    flutuante.appendChild(copia);
    while (flutuante.children.length > 30) { flutuante.removeChild(flutuante.firstChild); }
    flutuante.scrollTop = flutuante.scrollHeight;
  }
}

function avisar(texto, aoTerminar) {
  pegar("#textoEstado").textContent = texto;
  pegar("#textoResposta").textContent = texto;
  registrarConversa("Assistente", texto);
  falar(texto, false, aoTerminar);
}

function apitar(frequencia) {
  try {
    const audio = new (window.AudioContext || window.webkitAudioContext)();
    const tom = audio.createOscillator();
    tom.frequency.value = frequencia;
    tom.connect(audio.destination);
    tom.start();
    tom.stop(audio.currentTime + 0.12);
  } catch (erro) {}
}

function vibrar(padrao) {
  if (navigator.vibrate) { navigator.vibrate(padrao); }
}

/* ---------- 4) Telas ---------- */
function pararAcompanhamento() {
  clearInterval(relogioDoTempo);
  numeroDaEscolha = numeroDaEscolha + 1;
  destinoAtual = null;
  dados = null;
  mostrar(pegar("#painel"), false);
}

function voltar() {
  const alvo = pegar("#telaMapa").hidden ? "inicio" : "lista";
  if (history.state && history.state.tela && history.state.tela !== alvo) {
    history.back();
  } else {
    abrirTela(alvo, false, true);
  }
}

function abrirTela(nome, silencioso, semHistorico) {
  pararMicrofone();
  mostrar(pegar("#telaInicio"), nome === "inicio");
  mostrar(pegar("#telaOpcoes"), nome === "opcoes");
  mostrar(pegar("#telaLista"), nome === "lista");
  mostrar(pegar("#telaMapa"), nome === "mapa");

  if (window.CameraMobintec) {
    if (nome === "opcoes") {
      window.CameraMobintec.montarEm("#slotCameraOpcoes");
    } else if (nome === "lista") {
      window.CameraMobintec.montarEm("#slotCameraOnibus");
    } else {
      window.CameraMobintec.desmontar();
    }
  }

  if (nome !== "inicio" && !semHistorico) {
    try {
      if (!(history.state && history.state.tela === nome)) {
        history.pushState({ tela: nome }, "");
      }
    } catch (erro) {}
  }

  if (nome === "lista") {
    colocarMapaEm("#slotMapaOnibus");
    criarMapa();
    desenharRotaNoMapa();
    pegar("#tituloLista").focus();
    falar("Ônibus turísticos. Escolha um destino.");
  } else if (nome === "opcoes") {
    pegar("#tituloOpcoes").focus();
    falar("Opções.");
  } else if (nome === "mapa") {
    colocarMapaEm("#slotMapaTela");
    criarMapa();
    desenharRotaNoMapa();
    mostrarVoceNoMapa();
    pegar("#tituloMapa").focus();
    desenharPerto();
    if (idLocal === null) {
      ligarLocalizacao(silencioso);
    } else if (!silencioso) {
      falar("Mapa. " + pegar("#textoLocal").textContent);
    }
  } else {
    pararAcompanhamento();
    limparBolhas();
    tocarEmQualquerLugar = true;
    if (!silencioso) { falar("Conversa. Toque em qualquer lugar e fale."); }
    pegar("#tituloInicio").focus();
  }
  window.scrollTo(0, 0);
}

/* ---------- 5) Mapa ---------- */
let mapa = null;
let camada = null;
let marcadorOnibus = null;
let marcadorVoce = null;
let camadaPerto = null;
let distanciaAteVoce = null;

function criarPino(texto, corFundo, corTexto, tamanho) {
  return L.divIcon({
    className: "",
    iconSize: [tamanho, tamanho],
    iconAnchor: [tamanho / 2, tamanho / 2],
    html: '<div class="pino" style="width:' + tamanho + 'px;height:' + tamanho + 'px;background:' +
      corFundo + ';color:' + corTexto + '">' + texto + "</div>"
  });
}

function colocarMapaEm(idDoLugar) {
  const lugar = pegar(idDoLugar);
  const bloco = pegar("#blocoMapa");
  if (bloco.parentNode !== lugar) { lugar.appendChild(bloco); }
}

function criarMapa() {
  if (!window.L) {
    pegar("#mensagemMapa").textContent = "O mapa não carregou. Tudo continua disponível em texto.";
    return;
  }
  if (mapa) {
    setTimeout(function() { mapa.invalidateSize(); }, 60);
    return;
  }
  mapa = L.map("mapa", { keyboard: false, zoomControl: false, attributionControl: false });
  mapa.setView([-25.54, -54.55], 11);
  trocarFundoDoMapa();
  camada = L.layerGroup().addTo(mapa);
  camadaPerto = L.layerGroup().addTo(mapa);

  DESTINOS.forEach(function(destino, indice) {
    const pino = L.marker(destino.posicao, {
      icon: criarPino(destino.sigla, "#8b1f2f", "#ffffff", 36),
      keyboard: false
    });
    pino.on("click", function() { escolherDestino(indice); });
    pino.addTo(mapa);

    destino.embarques.forEach(function(embarque) {
      const pinoE = L.marker(embarque.posicao, {
        icon: criarPino("E", "#ffffff", "#0d0a0b", 26),
        keyboard: false
      });
      pinoE.on("click", function() { escolherDestino(indice); });
      pinoE.addTo(mapa);
    });
  });

  setTimeout(function() { mapa.invalidateSize(); }, 60);
}

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
  const camadaEsri = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/" + estilo + "/MapServer/tile/{z}/{y}/{x}",
    { maxZoom: 16 }
  );
  camadaEsri.once("tileerror", function() {
    usandoMapaReserva = true;
    pegar("#mensagemMapa").textContent = "Usando o mapa reserva.";
    trocarFundoDoMapa();
  });
  camadaEsri.addTo(mapa);
  fundoMapa = camadaEsri;
}

function corDaRota() {
  return document.body.classList.contains("claro") ? "#a9583e" : "#ffb3c4";
}

function definirVoz(ligada, anunciar) {
  vozLigada = ligada;
  if (!ligada && window.speechSynthesis) { window.speechSynthesis.cancel(); }
  const botao = pegar("#botaoVoz");
  botao.textContent = ligada ? "Voz do site: ligada" : "Voz do site: desligada";
  botao.setAttribute("aria-label", ligada ?
    "Voz do site ligada. Toque para desligar. Desligue se você já usa um leitor de tela." :
    "Voz do site desligada. Toque para ligar.");
  try { localStorage.setItem("mobintecVoz", ligada ? "ligada" : "desligada"); } catch (e) {}
  if (anunciar) {
    pegar("#textoEstado").textContent = ligada ?
      "Voz do site ligada." : "Voz do site desligada. Os avisos continuam escritos na tela.";
    falar("Voz do site ligada.");
  }
}

function repetirUltima() {
  if (window.CameraMobintec && window.CameraMobintec.ehMensagemDaCamera(ultimaFala)) {
    window.CameraMobintec.ouvir();
    return;
  }
  if (vozLigada) { falar(ultimaFala); return; }
  const estado = pegar("#textoEstado");
  estado.textContent = "";
  setTimeout(function() { estado.textContent = ultimaFala; }, 40);
}

function aplicarTema(claro, anunciar) {
  document.body.classList.toggle("claro", claro);
  const botao = pegar("#botaoTema");
  botao.textContent = claro ? "Tema escuro" : "Tema claro";
  botao.setAttribute("aria-label", claro ? "Trocar para tema escuro" : "Trocar para tema claro");
  document.querySelector('meta[name="theme-color"]').setAttribute("content", claro ? "#fdf6f7" : "#0d0a0b");
  try { localStorage.setItem("mobintecTema", claro ? "claro" : "escuro"); } catch (e) {}
  trocarFundoDoMapa();
  if (camada) {
    camada.eachLayer(function(item) {
      if (item.setStyle) { item.setStyle({ color: corDaRota() }); }
    });
  }
  if (anunciar) { avisar(claro ? "Tema claro ativado." : "Tema escuro ativado."); }
}

/* ---------- 6) Microfone ---------- */
const ReconhecimentoDoNavegador = window.SpeechRecognition || window.webkitSpeechRecognition;
let usarModeloProprio = !ReconhecimentoDoNavegador;
let reconhecimento = null;
let ouvindo = false;
let iniciando = false;
let entendeu = false;
let gravador = null;
let fluxoDoMicrofone = null;
let gravando = false;
let processando = false;
let gravacaoCancelada = false;
let transcritor = null;

function destacarBolha(destino) {
  document.querySelectorAll(".bolha").forEach(function(bolha, indice) {
    bolha.classList.toggle("ativa", DESTINOS[indice] === destino);
    bolha.classList.toggle("apagada", DESTINOS[indice] !== destino);
  });
}

function limparBolhas() {
  document.querySelectorAll(".bolha").forEach(function(bolha) {
    bolha.classList.remove("ativa", "apagada");
  });
}

function pararMicrofone() {
  if (reconhecimento && (ouvindo || iniciando)) {
    try { reconhecimento.abort(); } catch (erro) {}
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
  const micChat = document.getElementById("botaoMicChat");
  if (micChat) { micChat.setAttribute("aria-pressed", "false"); }
  const micFixo = document.getElementById("botaoFalarSempre");
  if (micFixo) { micFixo.setAttribute("aria-pressed", "false"); }
}

let modoConversa = false;
let botaoDaConversa = null;

function tocarMicrofone(botao, automatico) {
  if (!automatico) {
    if (ouvindo) { modoConversa = false; } else { modoConversa = true; botaoDaConversa = botao; }
  }
  if (iniciando) { return; }
  if (ouvindo) {
    pararMicrofone();
    avisar("Microfone desligado.");
    return;
  }
  if (window.speechSynthesis) { window.speechSynthesis.cancel(); }
  limparBolhas();
  if (usarModeloProprio) {
    ouvirComModeloProprio(botao);
  } else {
    ouvirComNavegador(botao);
  }
}

function ouvirComNavegador(botao) {
  const este = new ReconhecimentoDoNavegador();
  reconhecimento = este;
  este.lang = "pt-BR";
  este.interimResults = true;
  entendeu = false;
  iniciando = true;
  pegar("#textoOuvido").textContent = "";

  este.onstart = function() {
    if (este !== reconhecimento) { return; }
    iniciando = false;
    ouvindo = true;
    apitar(880);
    pegar("#anel").classList.add("ouvindo");
    botao.setAttribute("aria-pressed", "true");
    pegar("#textoEstado").textContent = "Ouvindo… fale agora.";
  };

  este.onresult = function(evento) {
    if (este !== reconhecimento || entendeu) { return; }
    let texto = "";
    for (const resultado of evento.results) { texto += " " + resultado[0].transcript; }
    pegar("#textoOuvido").textContent = texto.trim();
    const ultimo = evento.results[evento.results.length - 1];
    if (ultimo.isFinal) {
      entendeu = true;
      pararMicrofone();
      const fraseLimpa = semAcento(texto.trim());
      if (/^(parar|pare|chega|tchau|encerrar|sair)( conversa)?$/.test(fraseLimpa)) {
        modoConversa = false;
        avisar("Conversa encerrada. Toque no microfone quando quiser falar de novo.");
        return;
      }
      responder(texto);
    }
  };

  este.onerror = function(evento) {
    if (este !== reconhecimento) { return; }
    iniciando = false;
    const erro = evento.error;
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
      modoConversa = false;
      avisar("Não ouvi nada. Toque e fale de novo.");
    } else if (erro === "audio-capture") {
      entendeu = true;
      avisar("Nenhum microfone encontrado.");
    }
  };

  este.onend = function() {
    if (este !== reconhecimento) { return; }
    const estavaOuvindo = ouvindo;
    pararMicrofone();
    if (estavaOuvindo) {
      apitar(440);
      if (!entendeu) { avisar("Não entendi. Toque e diga, por exemplo, Cataratas."); }
    }
  };

  setTimeout(function() {
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

async function ouvirComModeloProprio(botao) {
  if (gravando) { gravador.stop(); return; }
  if (processando) { return; }
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

  gravador.ondataavailable = function(evento) { pedacos.push(evento.data); };

  gravador.onstop = async function() {
    gravando = false;
    fluxoDoMicrofone.getTracks().forEach(function(faixa) { faixa.stop(); });
    pegar("#anel").classList.remove("ouvindo");
    botao.setAttribute("aria-pressed", "false");
    if (gravacaoCancelada) { return; }
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
  setTimeout(function() {
    if (esteGravador.state === "recording") { esteGravador.stop(); }
  }, 6000);
}

async function carregarModelo() {
  if (transcritor) { return transcritor; }
  const biblioteca = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.web.min.js");
  transcritor = await biblioteca.pipeline("automatic-speech-recognition", "Xenova/whisper-tiny", {
    progress_callback: function(progresso) {
      if (progresso.status === "progress") {
        pegar("#textoEstado").textContent = "Baixando a voz do site: " + Math.round(progresso.progress) + "% (só na primeira vez)";
      }
    }
  });
  return transcritor;
}

/* ---------- 7) Assistente ---------- */
function querIrAoDestino(texto) {
  return /quero ir|vou para|ir para|ir ao|ir a |me leva|levar|acompanhar|onibus|rota|abrir|vamos/.test(semAcento(texto));
}

function comandoDeCamera(texto) {
  const t = semAcento(texto);
  const falaCamera = /\bcameras?\b/.test(t);
  const verboDeUso = /\b(abrir|abre|abra|ligar|liga|ligue|iniciar|inicia|inicie|usar|use|ativar|ativa|ative|ler|leia|analisar|analise|reconhecer|reconheca|reconhecimento)\b/.test(t);
  const falaAssento = /\b(assentos?|poltronas?)\b/.test(t);
  if (falaCamera && /\b(parar|pare|desligar|desliga|desligue|fechar|feche|encerrar|encerre)\b/.test(t)) { return "parar"; }
  if (/\b(esp32|esp)\b/.test(t)) { return "fixa"; }
  if ((falaCamera || (verboDeUso && falaAssento)) && /\b(celular|telefone|aparelho|cel)\b/.test(t)) { return "celular"; }
  if (falaCamera && /\bonibus\b/.test(t)) { return "fixa"; }
  if (falaCamera && verboDeUso) { return "celular"; }
  return null;
}

function executarComandoDeCamera(comando) {
  if (!window.CameraMobintec) {
    avisar("A câmera de assentos não está disponível agora.");
    return;
  }
  if (comando === "parar") {
    window.CameraMobintec.parar(false);
    avisar("Câmera parada. Sem leitura atual de assentos.");
    return;
  }
  if (destinoAtual && dados) {
    if (pegar("#telaLista").hidden) { abrirTela("lista", true); }
    mostrarAba("Onibus");
  } else if (pegar("#telaOpcoes").hidden) {
    abrirTela("opcoes", true);
  }
  avisar(comando === "celular" ?
    "Abrindo a câmera do celular. Se o navegador perguntar, escolha permitir. Aponte para os assentos." :
    "Buscando a análise da câmera do ônibus.");
  window.CameraMobintec.iniciar(comando);
}

function perguntaSobreAssento(texto) {
  const t = semAcento(texto);
  return /\b(assentos?|poltronas?)\b/.test(t) ||
    (/\blugar(es)?\b/.test(t) && /\b(livres?|vazios?|sentar)\b/.test(t)) ||
    /\blivres?\b/.test(t);
}

function irParaDestino(destino, silencioso) {
  destacarBolha(destino);
  if (!silencioso) { avisar("Certo: ônibus para " + destino.nome + "."); }
  setTimeout(function() {
    abrirTela("lista");
    escolherDestino(DESTINOS.indexOf(destino));
  }, silencioso ? 0 : 900);
}

function falarSobreDestino(destino) {
  destacarBolha(destino);
  const embarque = destino.embarques[0];
  const gratuidadeTexto = embarque.gratuidade ? " Gratuidade para pessoas com deficiência." : "";
  avisar(destino.nome + ". " + destino.descricao +
    " O embarque é em " + embarque.nome + "." + gratuidadeTexto +
    " Acessibilidade: " + embarque.acessibilidade +
    " Para acompanhar o ônibus, diga: quero ir.");
}

// Explica uma opção de embarque em detalhes, para a pessoa entender antes de escolher.
function explicarEmbarque(embarque, numero) {
  let texto = "Opção " + numero + ": " + embarque.nome + ". ";
  texto += "É um " + embarque.tipo.toLowerCase() + ". ";
  texto += embarque.instrucao + " ";
  texto += "O percurso é: " + embarque.rota + " ";
  if (embarque.paradas && embarque.paradas.length > 0) {
    if (embarque.paradas.length <= 3) {
      texto += "As paradas são: " + embarque.paradas.join(", ") + ". ";
    } else {
      texto += "Tem " + embarque.paradas.length + " paradas no caminho. ";
    }
  }
  texto += "Você deve descer: " + embarque.ondeDescer + " ";
  if (embarque.gratuidade) {
    texto += "Este embarque tem gratuidade para pessoas com deficiência. " + embarque.preco + ". ";
  } else {
    texto += "O preço é: " + embarque.preco + ". ";
  }
  texto += "Sobre acessibilidade: " + embarque.acessibilidade;
  return texto;
}

// Mostra as opções de embarque com explicação completa antes de pedir para escolher.
function mostrarOpcoesDeEmbarque(destino) {
  const embarques = destino.embarques;
  if (embarques.length === 1) {
    destino.embarqueEscolhido = embarques[0];
    iniciarAcompanhamento(destino);
    return;
  }
  let texto = "Para ir a " + destino.nome + ", você tem " + embarques.length + " formas de chegar lá. Vou explicar cada uma. ";
  embarques.forEach(function(embarque, indice) {
    texto += explicarEmbarque(embarque, indice + 1) + " ";
  });
  if (embarques.length === 2) {
    texto += "Diga o número da opção que prefere: 1 para " + embarques[0].nome + ", ou 2 para " + embarques[1].nome + ".";
  } else {
    texto += "Diga o número da opção que prefere.";
  }
  if (embarques[0].gratuidade) {
    texto += " Lembre-se: a opção " + embarques[0].nome + " tem gratuidade para pessoas com deficiência.";
  }
  destinoPendente = destino;
  avisar(texto);
}

let destinoPendente = null;

function escolherEmbarque(destino, indice) {
  if (indice < 0 || indice >= destino.embarques.length) {
    avisar("Opção inválida. Escolha um número de 1 a " + destino.embarques.length + ".");
    return;
  }
  destino.embarqueEscolhido = destino.embarques[indice];
  destinoPendente = null;
  iniciarAcompanhamento(destino);
}

function iniciarAcompanhamento(destino) {
  const embarque = destino.embarqueEscolhido;
  let prefixo = "Você escolheu " + destino.nome + ". Embarque em " + embarque.nome + ". ";
  if (embarque.gratuidade) { prefixo += "Gratuidade para pessoas com deficiência. "; }
  if (posicaoUsuario) {
    const dist = distanciaEntre(posicaoUsuario, embarque.posicao);
    prefixo += "Você está a " + formatarDistancia(dist) + " do embarque. ";
  }
  prefixo += proximoHorarioDe(embarque).texto;
  abrirTela("lista");
  escolherDestinoComEmbarque(DESTINOS.indexOf(destino));
  setTimeout(function() { avisar(prefixo); }, 500);
}

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
  } else if (acao === "abrir_camera_celular") {
    executarComandoDeCamera("celular");
  } else if (acao === "abrir_camera_onibus") {
    executarComandoDeCamera("fixa");
  } else if (acao === "parar_camera") {
    executarComandoDeCamera("parar");
  } else if (acao === "ler_assentos") {
    if (destinoAtual && dados) { mostrarAba("Onibus"); }
    avisar(textoAssento());
  } else if (acao === "abrir_opcoes") {
    abrirTela("opcoes");
  } else if (acao === "trocar_tema") {
    aplicarTema(!document.body.classList.contains("claro"), true);
  } else if (acao === "ler_embarque") {
    avisar(textoEmbarque());
  } else if (acao === "trocar_embarque") {
    if (destinoAtual) { mostrarOpcoesDeEmbarque(destinoAtual); }
  } else if (destinoAtual && dados) {
    if (acao === "ler_paradas") { mostrarAba("Rota"); avisar(textoParadas()); }
    if (acao === "ler_acessibilidade") { mostrarAba("Onibus"); avisar(textoAcessibilidade()); }
    if (acao === "ler_transporte") { mostrarAba("Onibus"); avisar(textoTransporte()); }
  }
}

function responder(texto) {
  registrarConversa("Você", texto);
  // CORREÇÃO: Aspas normais em vez de curvas
  pegar("#textoOuvido").textContent = '"' + texto.trim() + '"';

  if (destinoPendente) {
    const t = semAcento(texto.trim());
    const numero = parseInt(t);
    if (!isNaN(numero) && numero >= 1 && numero <= destinoPendente.embarques.length) {
      escolherEmbarque(destinoPendente, numero - 1);
      return;
    }
    for (let i = 0; i < destinoPendente.embarques.length; i++) {
      const embarque = destinoPendente.embarques[i];
      if (semAcento(texto).includes(semAcento(embarque.nome)) ||
          semAcento(texto).includes(semAcento(embarque.tipo)) ||
          (embarque.gratuidade && /(gratuid|gratu|pcd|deficiencia|bpc|loas)/.test(t))) {
        escolherEmbarque(destinoPendente, i);
        return;
      }
    }
  }

  const comandoCamera = comandoDeCamera(texto);
  if (comandoCamera) { executarComandoDeCamera(comandoCamera); return; }

  const tNav = semAcento(texto);

  if (/\b(assistente|ia|inteligencia artificial|chat)\b/.test(tNav) &&
      /\b(falar|conversar|abrir|abre|abra|quero|chamar|chama)\b/.test(tNav) &&
      pegar("#chatFlutuante").hidden) {
    abrirChat(true);
    avisar("Assistente aberta. Pode perguntar o que quiser.");
    return;
  }
  if (/\b(fechar|feche|sair)\b/.test(tNav) && /\b(assistente|chat|conversa)\b/.test(tNav)) {
    abrirChat(false);
    avisar("Assistente fechada.");
    return;
  }
  if (/\b(voltar|volta|retornar|retorna|inicio|comeco)\b/.test(tNav) &&
      /\b(pontos? turisticos?|destinos?|inicio|comeco|tela inicial)\b/.test(tNav)) {
    abrirChat(false);
    voltar();
    avisar("Voltando aos pontos turísticos. Diga para onde quer ir.");
    return;
  }

  const t = semAcento(texto);
  if (/\b(gratuid|gratu|pcd|deficiencia|bpc|loas|cadeirante)\b/.test(t)) {
    if (destinoAtual) {
      const embarque = embarqueAtual();
      if (embarque.gratuidade) {
        avisar("Sim! " + embarque.nome + " tem gratuidade para pessoas com deficiência. " + embarque.preco);
      } else {
        avisar("Este embarque não tem gratuidade. " + embarque.preco +
          " Mas você pode trocar para a Linha 120, que tem gratuidade. Diga: trocar embarque.");
      }
    } else {
      avisar("A Linha 120 do Terminal Urbano tem gratuidade para pessoas com deficiência. " +
        "Apresente o cartão BPC/LOAS ou comprovante de deficiência no ônibus.");
    }
    return;
  }

  if (/\b(onde embarco|onde pego|ponto de embarque|lugar de partida|onde sai|qual embarque|quais paradas|onde descer|onde desço)\b/.test(t)) {
    if (destinoAtual) {
      avisar(textoEmbarque());
    } else {
      avisar("Escolha um destino primeiro. Diga, por exemplo, quero ir para as Cataratas.");
    }
    return;
  }

  if (/\b(trocar|mudar|alterar|outro)\b/.test(t) && /\b(embarque|ponto|partida|onibus)\b/.test(t)) {
    if (destinoAtual) {
      mostrarOpcoesDeEmbarque(destinoAtual);
    } else {
      avisar("Escolha um destino primeiro.");
    }
    return;
  }

  if (/\b(horario|horarios|que horas|proximo onibus|proxima partida)\b/.test(t)) {
    if (destinoAtual) {
      const embarque = embarqueAtual();
      avisar("Para " + destinoAtual.nome + ", embarque em " + embarque.nome + ": " +
        proximoHorarioDe(embarque).texto);
    } else {
      avisar("Escolha um destino primeiro.");
    }
    return;
  }

  if (URL_DA_IA && !pegar("#chatFlutuante").hidden) { perguntarParaIA(texto); return; }

  const destino = acharDestino(texto);
  if (destino) {
    const pedido = categoriaNoTexto(texto);
    if (pedido) { pedirPertoDe(destino, pedido); return; }
    if (querIrAoDestino(texto)) {
      if (destino.embarques.length > 1) {
        destacarBolha(destino);
        mostrarOpcoesDeEmbarque(destino);
      } else {
        irParaDestino(destino, false);
      }
      return;
    }
    if (URL_DA_IA) { destacarBolha(destino); perguntarParaIA(texto); return; }
    falarSobreDestino(destino);
    return;
  }

  if (perguntaSobreAssento(texto)) {
    if (destinoAtual && dados) { mostrarAba("Onibus"); }
    avisar(textoAssento());
    return;
  }

  if (URL_DA_IA && texto.trim().split(/\s+/).length > 5) { perguntarParaIA(texto); return; }

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
  if (t.includes("opcoes") || t.includes("configurac")) { abrirTela("opcoes"); return; }
  if (t.includes("restaurante") || t.includes("comer") || t.includes("lanche")) { pedirPerto("restaurantes"); return; }
  if (t.includes("ponto turistico") || t.includes("pontos turisticos") || t.includes("atracao") || t.includes("atracoes") || t.includes("passeio")) { pedirPerto("atracoes"); return; }
  if (t.includes("hotel") || t.includes("hoteis") || t.includes("hospedagem") || t.includes("pousada") || t.includes("perto") || t.includes("proxim")) { pedirPerto("hoteis"); return; }

  if (!destinoAtual) {
    if (URL_DA_IA) { perguntarParaIA(texto); return; }
    avisar("Primeiro diga um destino, por exemplo Cataratas.");
    return;
  }
  if (t.includes("transporte") || t.includes("horario") || t.includes("preco") || t.includes("valor") || t.includes("contato") || t.includes("operadora")) {
    mostrarAba("Onibus");
    avisar(textoTransporte());
    return;
  }
  if (t.includes("acessibilidade") || t.includes("rampa")) {
    mostrarAba("Onibus");
    avisar(textoAcessibilidade());
    return;
  }
  if (t.includes("assento") || t.includes("poltrona") || t.includes("lugar") || t.includes("livre")) {
    mostrarAba("Onibus");
    avisar(textoAssento());
    return;
  }
  if (t.includes("parada") || t.includes("ponto de onibus")) {
    mostrarAba("Rota");
    avisar(textoParadas());
    return;
  }
  if (t.includes("rota") || t.includes("caminho") || t.includes("linha") || t.includes("distancia")) {
    mostrarAba("Rota");
    avisar(textoRota());
    return;
  }
  if (t.includes("onibus") || t.includes("chega") || t.includes("minuto") || t.includes("tempo") || t.includes("onde")) {
    mostrarAba("Onibus");
    avisar(frasePrincipal());
    return;
  }
  if (URL_DA_IA) { perguntarParaIA(texto); return; }
  avisar("Não entendi. Diga ajuda para ouvir os comandos.");
}

let conversa = [];

async function perguntarParaIA(texto) {
  pegar("#textoEstado").textContent = "Pensando…";
  pegar("#textoResposta").textContent = "Pensando…";

  const categoria = categoriaNoTexto(texto);
  const citado = acharDestino(texto);
  if (categoria && (citado || posicaoUsuario || destinoAtual)) { await buscarPerto(categoria, citado); }

  let contexto = {
    destino: "nenhum escolhido ainda",
    avisoImportante: "A posição do ônibus e o tempo de chegada são SIMULAÇÃO de demonstração. " +
      "Os horários são SIMULADOS, não oficiais. A distância até o ponto de embarque é REAL, calculada pelo GPS do celular."
  };

  if (destinoAtual && dados) {
    const embarque = embarqueAtual();
    contexto = {
      destino: destinoAtual.nome,
      descricao: destinoAtual.descricao,
      servico: destinoAtual.servico,
      embarque: embarque.nome,
      instrucaoEmbarque: embarque.instrucao,
      rota: embarque.rota,
      paradas: embarque.paradas,
      ondeDescer: embarque.ondeDescer,
      gratuidade: embarque.gratuidade,
      preco: embarque.preco,
      acessibilidade: embarque.acessibilidade,
      aConfirmar: destinoAtual.aConfirmar,
      status: frasePrincipal(true),
      rotaTexto: textoRota(),
      lugaresPerto: textoPerto(),
      paradasTexto: textoParadas(),
      transporte: textoTransporte(),
      proximoHorario: proximoHorarioDe(embarque).texto,
      horariosDoDia: embarque.horarios.map(function(h) { return h.hora; }).join(", "),
      operadora: embarque.operadora,
      contato: embarque.contato,
      todosOsEmbarques: destinoAtual.embarques.map(function(e) {
        return { nome: e.nome, tipo: e.tipo, gratuidade: e.gratuidade, preco: e.preco, posicao: e.posicao };
      })
    };
    mostrarAba("Assistente");
  }

  contexto.todosOsDestinos = DESTINOS.map(function(d) {
    const item = {
      nome: d.nome,
      servico: d.servico,
      descricao: d.descricao,
      embarques: d.embarques.map(function(e) {
        return { nome: e.nome, tipo: e.tipo, gratuidade: e.gratuidade, preco: e.preco };
      })
    };
    if (posicaoUsuario) {
      item.distanciasDosEmbarques = d.embarques.map(function(e) {
        return { nome: e.nome, distancia: formatarDistancia(distanciaEntre(posicaoUsuario, e.posicao)) };
      });
    }
    return item;
  });

  if (perto.lista.length > 0 && !contexto.lugaresPerto) { contexto.lugaresPerto = textoPerto(); }

  if (posicaoUsuario) {
    contexto.localizacaoLigada = true;
    const embarque = embarqueAtual();
    if (embarque && distanciaAteVoce !== null) {
      contexto.distanciaAteEmbarque = formatarDistancia(distanciaAteVoce);
      contexto.voceEstaA = formatarDistancia(distanciaAteVoce) + " do ponto de embarque " + embarque.nome;
    }
  } else {
    contexto.localizacaoLigada = false;
    contexto.voceEstaA = "Localização desligada: não sei a distância até o embarque.";
  }

  try {
    const controle = new AbortController();
    const prazo = setTimeout(function() { controle.abort(); }, 30000);
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
    conversa = conversa.slice(-10);
    avisar(json.resposta, function() {
      if (json.acao === "abrir_mapa" && categoria && !posicaoUsuario && !destinoAtual) { categoriaPendente = categoria; }
      executarAcao(json);
      if (modoConversa && botaoDaConversa && (!json.acao || json.acao === "nenhuma")) {
        setTimeout(function() {
          if (modoConversa && !ouvindo && !iniciando) { tocarMicrofone(botaoDaConversa, true); }
        }, 400);
      }
    });
  } catch (erro) {
    console.warn("Erro da assistente de IA:", erro);
    modoConversa = false;
    const motivo = erro.name === "AbortError" ? " Ela demorou demais para responder." :
      (erro instanceof TypeError ? " Sem internet ou o site não tem permissão para falar com ela." : "");
    avisar("Não consegui falar com a assistente agora." + motivo + " Tente de novo ou diga ajuda para ouvir os comandos.");
  }
}

function mudarVelocidade(nova) {
  velocidadeVoz = Math.min(1.6, Math.max(0.6, nova));
  try { localStorage.setItem("mobintecVelocidade", velocidadeVoz); } catch (e) {}
  falar("Velocidade da voz alterada.");
}

/* ---------- 8) Localização em tempo real ---------- */
let idLocal = null;
let posicaoUsuario = null;
let ultimoLimiar = null;
let ultimaDistanciaMostrada = null;
let centralizouNaPessoa = false;

function mostrarVoceNoMapa() {
  if (!mapa || !posicaoUsuario) { return; }
  if (marcadorVoce) {
    marcadorVoce.setLatLng(posicaoUsuario);
  } else {
    marcadorVoce = L.marker(posicaoUsuario, {
      icon: criarPino("EU", "#5de08a", "#0d0a0b", 40),
      keyboard: false
    }).addTo(mapa);
  }
}

function atualizarBotaoLocal() {
  pegar("#botaoLocal").textContent = idLocal !== null ? "Desligar minha localização" : "Ativar minha localização";
}

function atualizarDistanciaDoEmbarque() {
  if (!posicaoUsuario || !destinoAtual) { return; }
  const embarque = embarqueAtual();
  if (!embarque) { return; }
  distanciaAteVoce = distanciaEntre(posicaoUsuario, embarque.posicao);
  if (ultimaDistanciaMostrada === null || Math.abs(distanciaAteVoce - ultimaDistanciaMostrada) >= 25) {
    ultimaDistanciaMostrada = distanciaAteVoce;
    pegar("#textoLocal").textContent = "Você está a " + formatarDistancia(distanciaAteVoce) +
      " do ponto de embarque, " + embarque.nome + ".";
  }
}

function aoReceberPosicao(posicao) {
  posicaoUsuario = [posicao.coords.latitude, posicao.coords.longitude];
  atualizarDistanciaDoEmbarque();
  mostrarVoceNoMapa();

  if (mapa && !dados && !centralizouNaPessoa && !perto.centro) {
    mapa.setView(posicaoUsuario, 15);
    centralizouNaPessoa = true;
  }
  avisarProximidade();

  if (categoriaPendente) {
    const pedido = categoriaPendente;
    categoriaPendente = null;
    pedirPerto(pedido, true);
  }

  if (distanciaAteVoce === null) { return; }
  let faixa = null;
  if (distanciaAteVoce <= 50) { faixa = 50; }
  else if (distanciaAteVoce <= 200) { faixa = 200; }
  else if (distanciaAteVoce <= 500) { faixa = 500; }
  if (faixa !== null && (ultimoLimiar === null || faixa < ultimoLimiar)) {
    ultimoLimiar = faixa;
    const embarque = embarqueAtual();
    avisar(faixa === 50 ?
      "Você chegou ao ponto de embarque, " + embarque.nome + "." :
      "Você está a menos de " + faixa + " metros do ponto de embarque.");
    if (faixa === 50) { vibrar([300, 120, 300]); }
  }
}

function ligarLocalizacao(silencioso) {
  if (!navigator.geolocation) {
    avisar("Este navegador não tem localização.");
    return;
  }
  const embarque = embarqueAtual();

  if (idLocal !== null) {
    navigator.geolocation.clearWatch(idLocal);
    idLocal = null;
    posicaoUsuario = null;
    distanciaAteVoce = null;
    ultimoLimiar = null;
    ultimaDistanciaMostrada = null;
    centralizouNaPessoa = false;
    if (marcadorVoce) { marcadorVoce.remove(); marcadorVoce = null; }
    atualizarBotaoLocal();
    pegar("#textoLocal").textContent = "Localização desligada." + (embarque ? " O ponto de embarque é " + embarque.nome + "." : "");
    avisar("Localização desligada.");
    return;
  }

  if (!silencioso) { avisar("Ligando a localização. Se o navegador perguntar, escolha permitir."); }
  idLocal = navigator.geolocation.watchPosition(aoReceberPosicao, function() {
    if (idLocal !== null) { navigator.geolocation.clearWatch(idLocal); }
    idLocal = null;
    atualizarBotaoLocal();
    avisar("Não consegui sua localização. Libere a localização no navegador." + (embarque ? " O embarque é " + embarque.nome + "." : ""));
  }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
  atualizarBotaoLocal();
}

function textoEmbarque() {
  if (!destinoAtual) {
    return "Você ainda não escolheu um destino. Diga, por exemplo, quero ir para as Cataratas, que eu digo onde embarcar.";
  }
  const embarque = embarqueAtual();
  let frase = "Para " + destinoAtual.nome + ", você escolheu " + embarque.nome + ". ";
  frase += embarque.instrucao + " ";
  frase += "O percurso é: " + embarque.rota + " ";
  frase += "As paradas são: " + embarque.paradas.join("; ") + ". ";
  frase += "Você deve descer: " + embarque.ondeDescer;
  if (embarque.gratuidade) {
    frase += " Este embarque tem gratuidade para pessoas com deficiência.";
  }
  if (distanciaAteVoce !== null) {
    frase += " Você está a " + formatarDistancia(distanciaAteVoce) + " do ponto de embarque.";
  }
  return frase;
}

function falarLocalizacao() {
  if (idLocal === null) {
    ligarLocalizacao();
    return;
  }
  if (!posicaoUsuario) {
    avisar("Ainda estou buscando sua localização. Aguarde um instante.");
    return;
  }
  atualizarDistanciaDoEmbarque();
  let frase = pegar("#textoLocal").textContent;
  if (destinoAtual) {
    const embarque = embarqueAtual();
    frase += " " + proximoHorarioDe(embarque).texto;
  }
  avisar(frase);
}

/* ---------- 9) Painel do ônibus ---------- */
let destinoAtual = null;
let dados = null;
let relogioDoTempo = null;
let numeroDaEscolha = 0;
let ultimoMinuto = 0;

function minutosQueFaltam() {
  return Math.max(1, Math.ceil(dados.segundosAteChegar / 60));
}

function textoAcessibilidade() {
  if (!destinoAtual) return "Escolha um destino primeiro.";
  const embarque = embarqueAtual();
  return "Acessibilidade do embarque " + embarque.nome + ". " + embarque.acessibilidade;
}

function mostrarAba(nome) {
  ["Onibus", "Rota", "Perto", "Assistente"].forEach(function(aba) {
    pegar("#aba" + aba).hidden = aba !== nome;
  });
  document.querySelectorAll(".botao-aba").forEach(function(botao) {
    botao.setAttribute("aria-current", botao.dataset.aba === nome ? "true" : "false");
  });
}

function textoAssento() {
  if (window.CameraMobintec) { return window.CameraMobintec.textoAssentos(); }
  return "Sem leitura atual de assentos. A câmera ainda não fez uma leitura válida. A disponibilidade do assento PCD não foi verificada.";
}

function textoRota() {
  if (!destinoAtual) return "Escolha um destino primeiro.";
  const embarque = embarqueAtual();
  return destinoAtual.servico + ": de " + embarque.nome + " até " + destinoAtual.nome + ", " +
    formatarDistancia(dados.distancia) + ", cerca de " + Math.round(dados.duracao / 60) + " minutos de viagem.";
}

const CATEGORIAS = {
  hoteis: { nome: "hotéis", sigla: "H", filtro: '["tourism"~"hotel|hostel|guest_house|motel|apartment"]' },
  restaurantes: { nome: "restaurantes", sigla: "R", filtro: '["amenity"~"restaurant|cafe|fast_food|bar"]' },
  atracoes: { nome: "pontos turísticos", sigla: "T", filtro: '["tourism"~"attraction|museum|viewpoint|zoo|theme_park|gallery"]' }
};

let perto = { categoria: "hoteis", nome: "hotéis", referencia: "", centro: null, lista: [] };

function categoriaNoTexto(texto) {
  const t = semAcento(texto);
  if (/restaurante|comer|fome|almoc|jantar|lanche|cafe/.test(t)) { return "restaurantes"; }
  if (/hotel|hoteis|hospedag|dormir|pousada/.test(t)) { return "hoteis"; }
  if (/ponto turistico|pontos turisticos|atracao|atracoes|museu|mirante|o que fazer/.test(t)) { return "atracoes"; }
  return null;
}

let numeroDaBusca = 0;

function textoPerto() {
  if (perto.lista.length === 0) {
    return "Não encontrei " + perto.nome + " perto de " + perto.referencia + " nos dados do mapa.";
  }
  const nomes = perto.lista.map(function(lugar) {
    return lugar.nome + ", a " + formatarDistancia(lugar.distancia);
  });
  return "Perto de " + perto.referencia + ", " + perto.nome + ": " + nomes.join("; ") + ".";
}

function frasePrincipal(comAssentos) {
  let quando = "chegou ao ponto de embarque";
  if (dados.segundosAteChegar > 0) {
    const minutos = minutosQueFaltam();
    quando = "chegando em " + minutos + (minutos > 1 ? " minutos" : " minuto");
  }
  const frase = destinoAtual.servico + " " + quando + ".";
  return comAssentos ? frase + " " + textoAssento() : frase;
}

async function buscarRota(origem, destino) {
  try {
    const endereco = "https://router.project-osrm.org/route/v1/driving/" +
      origem[1] + "," + origem[0] + ";" + destino[1] + "," + destino[0] +
      "?overview=full&geometries=geojson";
    const resposta = await fetch(endereco);
    const json = await resposta.json();
    const rota = json.routes[0];
    const pontos = rota.geometry.coordinates.map(function(par) { return [par[1], par[0]]; });
    return { pontos: pontos, duracao: rota.duration, distancia: rota.distance };
  } catch (erro) {
    const metros = distanciaEntre(origem, destino);
    return { pontos: [origem, destino], duracao: Math.max(60, metros / 8), distancia: metros };
  }
}

function posicaoDoOnibus() {
  const parte = dados.segundosAteChegar / dados.duracao;
  const indice = Math.round(parte * (dados.pontos.length - 1));
  return dados.pontos[Math.min(dados.pontos.length - 1, Math.max(0, indice))];
}

function desenharRotaNoMapa() {
  if (!mapa || !dados || !destinoAtual) { return; }
  camada.clearLayers();
  L.polyline(dados.pontos, { color: corDaRota(), weight: 6 }).addTo(camada);
  const embarque = embarqueAtual();
  if (embarque) {
    L.marker(embarque.posicao, {
      icon: criarPino("E", "#ffffff", "#0d0a0b", 30),
      keyboard: false
    }).addTo(camada);
  }
  L.marker(destinoAtual.posicao, {
    icon: criarPino(destinoAtual.sigla, "#8b1f2f", "#ffffff", 36),
    keyboard: false
  }).addTo(camada);
  marcadorOnibus = L.marker(posicaoDoOnibus(), {
    icon: criarPino(destinoAtual.sigla, "#ffffff", "#0d0a0b", 46),
    keyboard: false
  }).addTo(camada);
  const limites = L.polyline(dados.pontos).getBounds();
  if (posicaoUsuario) { limites.extend(posicaoUsuario); }
  mapa.fitBounds(limites, { padding: [30, 30] });
}

function desenharPerto() {
  if (!mapa) { return; }
  camadaPerto.clearLayers();
  perto.lista.forEach(function(lugar) {
    L.marker(lugar.posicao, {
      icon: criarPino(CATEGORIAS[perto.categoria].sigla, "#ffffff", "#0d0a0b", 30),
      keyboard: false
    }).addTo(camadaPerto);
  });
  if (perto.centro) {
    const limites = L.latLngBounds([perto.centro]);
    perto.lista.forEach(function(lugar) { limites.extend(lugar.posicao); });
    L.marker(perto.centro, { icon: criarPino("★", "#8b1f2f", "#ffffff", 36), keyboard: false }).addTo(camadaPerto);
    mapa.fitBounds(limites, { padding: [40, 40], maxZoom: 16 });
  }
}

/* ---------- Horários, transporte e paradas ---------- */
let paradas = [];
let paradasAvisadas = {};
let chegandoAvisado = false;

function proximoHorarioDe(embarque) {
  if (!embarque || !embarque.horarios || embarque.horarios.length === 0) {
    return { texto: "Horários a confirmar com a operadora.", minutos: null, hora: null };
  }
  const agora = new Date();
  const agoraMin = agora.getHours() * 60 + agora.getMinutes();
  const emMinutos = embarque.horarios.map(function(h) {
    const partes = h.hora.split(":");
    return parseInt(partes[0], 10) * 60 + parseInt(partes[1], 10);
  });

  let escolhido = null;
  let faltam = null;
  for (let i = 0; i < emMinutos.length; i++) {
    if (emMinutos[i] > agoraMin) {
      escolhido = embarque.horarios[i].hora;
      faltam = emMinutos[i] - agoraMin;
      break;
    }
  }

  const aviso = embarque.horariosSimulados ? " Horário de demonstração, confirme com a operadora." : "";

  if (escolhido === null) {
    return {
      texto: "As partidas de hoje já passaram. A primeira de amanhã é às " + embarque.horarios[0].hora + "." + aviso,
      minutos: null, hora: null
    };
  }

  let tempoTexto;
  if (faltam < 60) {
    tempoTexto = "faltam " + faltam + (faltam === 1 ? " minuto" : " minutos");
  } else {
    const h = Math.floor(faltam / 60);
    const m = faltam % 60;
    tempoTexto = "faltam " + h + (h === 1 ? " hora" : " horas") + (m > 0 ? " e " + m + " minutos" : "");
  }
  return {
    texto: "Próxima partida às " + escolhido + ", " + tempoTexto + "." + aviso,
    minutos: faltam, hora: escolhido
  };
}

function textoTransporte() {
  if (!destinoAtual) { return "Escolha um destino primeiro."; }
  const embarque = embarqueAtual();
  const lista = embarque.horarios ? embarque.horarios.map(function(h) { return h.hora; }).join(", ") : "a confirmar";
  let texto = destinoAtual.servico + ". Embarque em " + embarque.nome + ". " + embarque.instrucao + ". ";
  texto += "Percurso: " + embarque.rota + " ";
  texto += proximoHorarioDe(embarque).texto;
  texto += " Partidas previstas no dia: " + lista + ". ";
  texto += "Você deve descer: " + embarque.ondeDescer + " ";
  if (embarque.gratuidade) {
    texto += "Gratuidade para pessoas com deficiência. " + embarque.preco + " ";
  } else {
    texto += "Preço: " + embarque.preco + " ";
  }
  texto += "Operadora: " + embarque.operadora + ". Contato: " + embarque.contato + ".";
  return texto;
}

function textoParadas() {
  if (paradas.length === 0) {
    return "Não encontrei paradas desta rota nos dados do mapa. Os pontos de parada ainda precisam ser confirmados com a operadora.";
  }
  const nomes = paradas.slice(0, 5).map(function(parada) { return parada.nome; });
  return "Há " + paradas.length + " paradas no caminho até " + destinoAtual.nome +
    ". As primeiras: " + nomes.join("; ") + (paradas.length > 5 ? ", e outras" : "") +
    ". Dados do mapa, podem estar incompletos.";
}

async function buscarParadas() {
  const minhaEscolha = numeroDaEscolha;
  paradas = [];
  paradasAvisadas = {};
  chegandoAvisado = false;
  pegar("#textoParadas").textContent = "Procurando paradas no caminho…";
  pegar("#listaParadas").replaceChildren();
  try {
    const latitudes = dados.pontos.map(function(ponto) { return ponto[0]; });
    const longitudes = dados.pontos.map(function(ponto) { return ponto[1]; });
    const margem = 0.002;
    const caixa = [
      Math.min.apply(null, latitudes) - margem,
      Math.min.apply(null, longitudes) - margem,
      Math.max.apply(null, latitudes) + margem,
      Math.max.apply(null, longitudes) + margem
    ].join(",");
    const consulta = '[out:json][timeout:20];node["highway"="bus_stop"](' + caixa + ");out 600;";
    const resposta = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: new URLSearchParams({ data: consulta })
    });
    const json = await resposta.json();
    if (minhaEscolha !== numeroDaEscolha) { return; }
    const achadas = [];
    json.elements.forEach(function(item) {
      let menor = Infinity;
      let ordem = 0;
      dados.pontos.forEach(function(ponto, i) {
        const distancia = distanciaEntre(ponto, [item.lat, item.lon]);
        if (distancia < menor) { menor = distancia; ordem = i; }
      });
      if (menor <= 100) {
        achadas.push({
          nome: (item.tags && item.tags.name) || "parada sem nome",
          posicao: [item.lat, item.lon],
          ordem: ordem
        });
      }
    });
    achadas.sort(function(a, b) { return a.ordem - b.ordem; });
    paradas = achadas.slice(0, 40);
  } catch (erro) {
    if (minhaEscolha !== numeroDaEscolha) { return; }
    paradas = [];
  }
  const itens = paradas.slice(0, 8).map(function(parada) {
    const item = document.createElement("li");
    item.textContent = parada.nome;
    return item;
  });
  pegar("#listaParadas").replaceChildren(...itens);
  pegar("#textoParadas").textContent = paradas.length === 0 ?
    "Nenhuma parada encontrada nos dados do mapa. A confirmar com a operadora." :
    paradas.length + " paradas no caminho" + (paradas.length > 8 ? " (mostrando as 8 primeiras)." : ".");
}

function avisarProximidade() {
  if (!destinoAtual || !posicaoUsuario) { return; }
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

function desenharPainel() {
  pegar("#tempo").textContent = dados.segundosAteChegar > 0 ? minutosQueFaltam() + " min" : "Chegou";
  const feito = 1 - dados.segundosAteChegar / dados.segundosIniciais;
  pegar("#barra").style.width = Math.round(Math.min(1, Math.max(0, feito)) * 100) + "%";
}

function anunciarStatus(prefixo, comAssentos) {
  desenharPainel();
  const frase = (prefixo ? prefixo + " " : "") + frasePrincipal(comAssentos);
  const alerta = pegar("#alerta");
  alerta.textContent = "";
  setTimeout(function() { alerta.textContent = frase; }, 40);
  falar(frase);
  if (dados.segundosAteChegar === 0) {
    vibrar([400, 150, 400]);
  } else if (prefixo) {
    vibrar([200, 100, 200]);
  } else {
    vibrar(80);
  }
}

async function escolherDestino(indice) {
  const destino = DESTINOS[indice];
  if (destino.embarques.length > 1 && !destino.embarqueEscolhido) {
    destacarBolha(destino);
    mostrarOpcoesDeEmbarque(destino);
    return;
  }
  if (!destino.embarqueEscolhido) {
    destino.embarqueEscolhido = destino.embarques[0];
  }
  iniciarAcompanhamento(destino);
}

async function escolherDestinoComEmbarque(indice) {
  clearInterval(relogioDoTempo);
  numeroDaEscolha = numeroDaEscolha + 1;
  const minhaEscolha = numeroDaEscolha;
  destinoAtual = DESTINOS[indice];

  ultimoLimiar = null;
  ultimaDistanciaMostrada = null;
  chegandoAvisado = false;
  paradasAvisadas = {};
  atualizarDistanciaDoEmbarque();

  const embarque = embarqueAtual();
  pegar("#tituloPainel").textContent = destinoAtual.servico + " · " + destinoAtual.nome;
  pegar("#textoRota").textContent = "Calculando a rota…";
  pegar("#listaHoteis").replaceChildren();
  mostrar(pegar("#painel"), true);
  if (mapa) { camada.clearLayers(); }

  const rota = await buscarRota(embarque.posicao, destinoAtual.posicao);
  if (minhaEscolha !== numeroDaEscolha) { return; }

  dados = {
    pontos: rota.pontos,
    duracao: Math.max(60, rota.duracao),
    distancia: rota.distancia,
    segundosAteChegar: Math.min(Math.max(60, rota.duracao), 240 + sortear(120))
  };
  dados.segundosIniciais = dados.segundosAteChegar;
  ultimoMinuto = minutosQueFaltam();

  desenharRotaNoMapa();
  pegar("#textoRota").textContent = textoRota();
  pegar("#textoDestino").textContent = destinoAtual.descricao;
  pegar("#textoAcessibilidade").textContent = textoAcessibilidade();
  pegar("#textoConfirmar").textContent = "Ainda a confirmar: " + destinoAtual.aConfirmar.join("; ") + ".";
  pegar("#textoTransporte").textContent = textoTransporte();
  mostrarAba("Onibus");

  pegar("#linkMaps").href = "https://www.google.com/maps/dir/?api=1&destination=" +
    embarque.posicao[0] + "," + embarque.posicao[1] + "&travelmode=walking";

  pegar("#tituloPainel").focus();
  if (navigator.wakeLock) {
    navigator.wakeLock.request("screen").catch(function() {});
  }
  relogioDoTempo = setInterval(passarTempo, 1000);
  buscarPerto("hoteis");
  buscarParadas();
}

function passarTempo() {
  dados.segundosAteChegar = Math.max(0, dados.segundosAteChegar - VELOCIDADE_TESTE);
  if (marcadorOnibus) { marcadorOnibus.setLatLng(posicaoDoOnibus()); }
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

async function buscarPerto(categoria, base) {
  const tipo = CATEGORIAS[categoria];
  document.querySelectorAll(".botao-cat").forEach(function(botao) {
    botao.setAttribute("aria-current", botao.dataset.cat === categoria ? "true" : "false");
  });
  const centro = base ? base.posicao : (posicaoUsuario || (destinoAtual ? destinoAtual.posicao : null));
  if (!centro) { return false; }
  const minhaBusca = numeroDaBusca + 1;
  numeroDaBusca = minhaBusca;
  perto = {
    categoria: categoria,
    nome: tipo.nome,
    referencia: base ? base.nome : (posicaoUsuario ? "você" : destinoAtual.nome),
    centro: base ? base.posicao : null,
    lista: []
  };
  pegar("#textoPerto").textContent = "Procurando " + tipo.nome + " perto de " + perto.referencia + "…";
  const lista = [];
  try {
    const raio = !base && posicaoUsuario ? 3000 : 5000;
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
    lista.sort(function(a, b) { return a.distancia - b.distancia; });
  } catch (erro) {
    lista.length = 0;
  }
  if (minhaBusca !== numeroDaBusca) { return false; }
  perto.lista = lista.slice(0, 4);
  const itens = perto.lista.map(function(lugar) {
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
  pegar("#listaPertoMapa").replaceChildren(...itens.map(function(item) { return item.cloneNode(true); }));
  desenharPerto();
  return true;
}

async function pedirPertoDe(destino, categoria) {
  destacarBolha(destino);
  if (pegar("#telaMapa").hidden) { abrirTela("mapa", true); }
  avisar("Procurando " + CATEGORIAS[categoria].nome + " perto de " + destino.nome + "…");
  const achou = await buscarPerto(categoria, destino);
  if (achou) { avisar(textoPerto()); }
}

let categoriaPendente = null;

async function pedirPerto(categoria, ficarNaTela) {
  if (!ficarNaTela && pegar("#telaMapa").hidden) { abrirTela("mapa", true); }
  if (!posicaoUsuario && !destinoAtual) {
    categoriaPendente = categoria;
    if (idLocal === null) { ligarLocalizacao(true); }
    avisar("Ligando a localização para procurar " + CATEGORIAS[categoria].nome +
      " perto de você. Se o navegador perguntar, escolha permitir.");
    return;
  }
  if (destinoAtual && ficarNaTela) { mostrarAba("Perto"); }
  avisar("Procurando " + CATEGORIAS[categoria].nome + "…");
  const achou = await buscarPerto(categoria);
  if (achou) { avisar(textoPerto()); }
}

/* ---------- 10) Ligações dos botões e início ---------- */
DESTINOS.forEach(function(destino, indice) {
  const bolha = document.createElement("button");
  bolha.className = "bolha b" + (indice + 1);
  bolha.setAttribute("aria-label", "Escolher " + destino.nome);
  bolha.innerHTML = '<span class="foto" aria-hidden="true"></span><span class="nome"></span>';
  bolha.querySelector(".foto").style.backgroundImage = "url(" + destino.foto + ")";
  bolha.querySelector(".nome").textContent = destino.nome;
  bolha.onclick = function() { irParaDestino(destino, false); };
  pegar("#bolhas").appendChild(bolha);

  const cartao = document.createElement("li");
  cartao.className = "cartao";
  cartao.innerHTML = '<h3 class="font-serif text-3xl"></h3><p class="pilula"></p><button class="botao botao-forte">Acompanhar o ônibus</button>';
  cartao.querySelector("h3").textContent = destino.nome;
  cartao.querySelector("p").textContent = destino.servico;
  const acompanhar = cartao.querySelector("button");
  acompanhar.setAttribute("aria-label", "Acompanhar o " + destino.servico + " até " + destino.nome);
  acompanhar.onclick = function() { escolherDestino(indice); };
  pegar("#cartoes").appendChild(cartao);
});

pegar("#botaoMicrofone").onclick = function() { tocarMicrofone(pegar("#botaoMicrofone")); };
pegar("#botaoPerguntar").onclick = function() { tocarMicrofone(pegar("#botaoPerguntar")); };

document.querySelectorAll(".botao-aba").forEach(function(botao) {
  botao.onclick = function() {
    if (!dados) { return; }
    mostrarAba(botao.dataset.aba);
    const falas = {
      Onibus: frasePrincipal,
      Rota: textoRota,
      Perto: textoPerto,
      Assistente: function() { return "Pergunte por voz ou digite. Por exemplo: onde eu embarco?"; }
    };
    avisar(falas[botao.dataset.aba]());
  };
});

document.querySelectorAll(".botao-cat").forEach(function(botao) {
  botao.onclick = function() { pedirPerto(botao.dataset.cat, true); };
});

pegar("#botaoAbrirMapa").onclick = function() { abrirTela("mapa"); };
pegar("#botaoVoltarMapa").onclick = function() { voltar(); };
pegar("#botaoLocal").onclick = function() { ligarLocalizacao(); };
pegar("#botaoOpcoes").onclick = function() { abrirTela("opcoes"); };
pegar("#botaoVoltarOpcoes").onclick = function() { voltar(); };
pegar("#botaoVoltar").onclick = function() { voltar(); };
pegar("#botaoRepetir").onclick = function() { repetirUltima(); };
pegar("#botaoVoz").onclick = function() { definirVoz(!vozLigada, true); };
pegar("#botaoTema").onclick = function() { aplicarTema(!document.body.classList.contains("claro"), true); };

let temaSalvo = null;
let vozSalva = null;
try {
  temaSalvo = localStorage.getItem("mobintecTema");
  vozSalva = localStorage.getItem("mobintecVoz");
  velocidadeVoz = Number(localStorage.getItem("mobintecVelocidade")) || 1;
} catch (e) {}
aplicarTema(temaSalvo ? temaSalvo === "claro" : true, false);
definirVoz(vozSalva !== "desligada", false);

pegar("#botaoAjuda").onclick = function() { avisar(TEXTO_AJUDA); };
pegar("#botaoOuvirStatus").onclick = function() { if (dados) { anunciarStatus("", true); } };
pegar("#botaoOuvirParadas").onclick = function() { if (dados) { avisar(textoParadas()); } };
pegar("#botaoOuvirHoteis").onclick = function() { if (dados) { avisar(textoPerto()); } };

pegar("#formulario").onsubmit = function(evento) {
  evento.preventDefault();
  responder(pegar("#campoTexto").value);
};

pegar("#formularioAba").onsubmit = function(evento) {
  evento.preventDefault();
  const campo = pegar("#campoAba");
  if (campo.value.trim()) { responder(campo.value); campo.value = ""; }
};

function abrirChat(aberto) {
  const chat = pegar("#chatFlutuante");
  chat.hidden = !aberto;
  pegar("#botaoChatFlutuante").setAttribute("aria-expanded", aberto ? "true" : "false");
  pegar("#botaoChatFlutuante").hidden = aberto;
  if (aberto) {
    if (!pegar("#conversaFlutuante").children.length) {
      registrarConversa("Assistente", "Olá! Sou a assistente do MOBINTEC. Pode me perguntar qualquer coisa: onde embarcar, quão longe você está do embarque, se tem gratuidade para PCD, qual o próximo horário, se tem assento livre ou o que fazer em Foz do Iguaçu. Fale pelo microfone ou digite.");
    }
    pegar("#campoChat").focus();
  } else {
    pegar("#botaoChatFlutuante").focus();
  }
}

pegar("#botaoChatFlutuante").onclick = function() { abrirChat(true); };
pegar("#botaoFecharChat").onclick = function() { abrirChat(false); };

function falarDeQualquerLugar() {
  const botao = pegar("#botaoFalarSempre");
  if (!ouvindo && !iniciando) { botao.setAttribute("aria-pressed", "true"); }
  tocarMicrofone(botao);
}

pegar("#botaoFalarSempre").onclick = falarDeQualquerLugar;

document.addEventListener("keydown", function(evento) {
  if (evento.altKey && (evento.key === "v" || evento.key === "V")) {
    evento.preventDefault();
    falarDeQualquerLugar();
  }
});

pegar("#atalhoFalar").onclick = falarDeQualquerLugar;
pegar("#atalhoAssistente").onclick = function() { abrirChat(true); };

document.addEventListener("keydown", function(evento) {
  if (evento.altKey && (evento.key === "a" || evento.key === "A")) {
    evento.preventDefault();
    abrirChat(pegar("#chatFlutuante").hidden);
  }
});

document.addEventListener("keydown", function(evento) {
  if (evento.altKey || evento.ctrlKey || evento.metaKey) { return; }
  if (evento.key !== " " && evento.key !== "Enter") { return; }
  if (evento.target.closest("button, input, select, textarea, a, [contenteditable], [role=button]")) { return; }
  evento.preventDefault();
  falarDeQualquerLugar();
});

document.addEventListener("dblclick", function(evento) {
  if (evento.target.closest("button, input, select, textarea, label, a, form")) { return; }
  if (!pegar("#telaInicio").hidden && tocarEmQualquerLugar) { return; }
  falarDeQualquerLugar();
});

let instrucaoFalada = false;

function falarInstrucaoInicial(evento) {
  if (instrucaoFalada) { return; }
  instrucaoFalada = true;
  if (evento && evento.target && evento.target.closest &&
      evento.target.closest("button, input, select, textarea, a")) { return; }
  falar("Para falar com a assistente em qualquer tela, toque duas vezes em um espaço vazio, ou aperte Alt mais V. O botão do microfone também fica no canto de baixo, à esquerda.", true);
}

document.addEventListener("pointerdown", falarInstrucaoInicial, { once: true });
document.addEventListener("keydown", falarInstrucaoInicial, { once: true });

pegar("#botaoMicChat").onclick = function() { tocarMicrofone(pegar("#botaoMicChat")); };

pegar("#formularioChat").onsubmit = function(evento) {
  evento.preventDefault();
  const campo = pegar("#campoChat");
  if (campo.value.trim()) { responder(campo.value); campo.value = ""; }
};

document.addEventListener("keydown", function(evento) {
  if (evento.key === "Escape" && !pegar("#chatFlutuante").hidden) { abrirChat(false); }
});

let tocarEmQualquerLugar = true;

document.addEventListener("click", function(evento) {
  const naTelaInicial = !pegar("#telaInicio").hidden;
  const tocouEmControle = evento.target.closest("button, input, select, textarea, label, a, form, #chatFlutuante");
  if (tocarEmQualquerLugar && naTelaInicial && !tocouEmControle) {
    tocarMicrofone(pegar("#botaoMicrofone"));
  }
});

const navegador = navigator.userAgent;
if (/Instagram|FBAN|FBAV|FB_IAB|WhatsApp|TikTok|; wv)/i.test(navegador)) {
  mostrar(pegar("#aviso"), true);
  pegar("#aviso").textContent = "Você abriu o site dentro de outro aplicativo (como Instagram ou WhatsApp), onde a voz não funciona. Toque nos três pontinhos e escolha 'Abrir no navegador'.";
} else if (!ReconhecimentoDoNavegador) {
  mostrar(pegar("#aviso"), true);
  pegar("#aviso").textContent = "Este navegador não tem voz própria. O site vai usar a voz dele, que baixa cerca de 40 MB na primeira vez.";
}

window.addEventListener("popstate", function() {
  const tela = (history.state && history.state.tela) || "inicio";
  abrirTela(tela, false, true);
});

pegar(".pular").onclick = function(evento) {
  evento.preventDefault();
  pegar("#principal").focus();
};

abrirTela("inicio", true);
window.addEventListener("load", function() { falar(BOAS_VINDAS); });
