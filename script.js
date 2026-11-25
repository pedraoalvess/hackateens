/* ==========================================================================
MOBINTEC - script do site (Versão com Modo Acessível)
========================================================================== */

/* ---------- 1) Ajudantes ---------- */
function pegar(seletor) { return document.querySelector(seletor); }
function semAcento(texto) { return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function sortear(max) { return Math.floor(Math.random() * max); }
function formatarDistancia(metros) {
  if (metros < 1000) return Math.round(metros) + " metros";
  return (metros / 1000).toFixed(1).replace(".", ",") + " km";
}
function distanciaEntre(a, b) {
  const raio = 6371000, grau = Math.PI / 180;
  const dLat = (b[0] - a[0]) * grau, dLon = (b[1] - a[1]) * grau;
  const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[0] * grau) * Math.cos(b[0] * grau) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * raio * Math.asin(Math.sqrt(x));
}
function mostrar(elemento, visivel) {
  if (!elemento) return;
  elemento.hidden = !visivel;
  elemento.setAttribute("aria-hidden", visivel ? "false" : "true");
}
function embarqueAtual() {
  if (!destinoAtual) return null;
  return destinoAtual.embarqueEscolhido || destinoAtual.embarques[0];
}

/* ---------- 2) Dados ---------- */
const VELOCIDADE_TESTE = 5;
const URL_DA_IA = "https://mobintec-ia.pdeoliveiraalves840.workers.dev/";
const BOAS_VINDAS = "Bem-vindo ao Mobintec. Escolha o modo de uso: visual ou acessível.";
const TEXTO_AJUDA = "Comandos: quero ir para as cataratas, onde eu embarco, tem gratuidade, abre o mapa, repetir, mais devagar, desligar a voz, trocar destino, ligar localização, quanto tempo falta, qual a distância, abrir google maps, falar operadora.";

let modoAtual = 'visual'; // 'visual' ou 'acessivel'
let passoAcessivel = 0; // 0=escolha destino, 1=escolha embarque, 2=info essencial, 3=perguntar mais

function acharDestino(texto) {
  const limpo = semAcento(texto);
  for (const destino of DESTINOS) {
    for (const palavra of destino.palavras) {
      if (limpo.includes(semAcento(palavra))) return destino;
    }
  }
  return null;
}

/* ---------- 3) Fala ---------- */
let ultimaFala = "", velocidadeVoz = 1, vozLigada = true;
function falar(texto, naFila, aoTerminar) {
  ultimaFala = texto;
  if (!vozLigada || !window.speechSynthesis) { if (aoTerminar) setTimeout(aoTerminar, 0); return; }
  if (!naFila) window.speechSynthesis.cancel();
  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = (typeof idiomaAtual !== "undefined" && idiomaAtual === "en") ? "en-US" : (typeof idiomaAtual !== "undefined" && idiomaAtual === "es") ? "es-ES" : "pt-BR";
  fala.rate = velocidadeVoz;
  if (aoTerminar) {
    let feito = false;
    const terminar = () => { if (!feito) { feito = true; aoTerminar(); } };
    fala.onend = terminar; fala.onerror = terminar; setTimeout(terminar, 12000);
  }
  window.speechSynthesis.speak(fala);
}
function registrarConversa(quem, texto) {
  const lista = pegar("#conversa");
  if (!lista) return;
  const item = document.createElement("li");
  item.className = quem === "Você" ? "voce" : "assistente";
  item.textContent = quem + ": " + texto;
  lista.appendChild(item);
  while (lista.children.length > 6) lista.removeChild(lista.firstChild);
}
function avisar(texto, aoTerminar) {
  const estado = pegar("#textoEstado");
  const estadoAcessivel = pegar("#textoAcessivel");
  const resposta = pegar("#textoResposta");
  if (estado) estado.textContent = texto;
  if (estadoAcessivel) estadoAcessivel.textContent = texto;
  if (resposta) resposta.textContent = texto;
  registrarConversa("Assistente", texto);
  falar(texto, false, aoTerminar);
}
function apitar(frequencia) {
  try {
    const audio = new (window.AudioContext || window.webkitAudioContext)();
    const tom = audio.createOscillator(); tom.frequency.value = frequencia; tom.connect(audio.destination);
    tom.start(); tom.stop(audio.currentTime + 0.12);
  } catch (e) {}
}
function vibrar(padrao) { if (navigator.vibrate) navigator.vibrate(padrao); }

/* ---------- 4) Telas ---------- */
function pararAcompanhamento() {
  clearInterval(relogioDoTempo); numeroDaEscolha++; destinoAtual = null; dados = null;
  const painel = pegar("#painel"); if (painel) mostrar(painel, false);
  mostrarTodosDestinos();
}
function voltar() {
  const alvo = pegar("#telaMapa") && pegar("#telaMapa").hidden ? "inicio" : "lista";
  if (history.state && history.state.tela && history.state.tela !== alvo) history.back();
  else abrirTela(alvo, false, true);
}

function escolherModo(modo) {
  modoAtual = modo;
  mostrar(pegar("#telaEscolhaModo"), false);
  
  if (modo === 'visual') {
    mostrar(pegar("#telaInicio"), true);
    falar("Modo visual ativado. Toque em qualquer lugar e fale para escolher um destino.");
  } else {
    mostrar(pegar("#telaAcessivel"), true);
    passoAcessivel = 0;
    iniciarFluxoAcessivel();
  }
}

function iniciarFluxoAcessivel() {
  if (passoAcessivel === 0) {
    const destinos = DESTINOS.map(d => d.nome).join(", ");
    avisar("Escolha seu destino em Foz do Iguaçu. Você pode ir para: " + destinos + ". Diga o nome do destino.");
  }
}

function abrirTela(nome, silencioso, semHistorico) {
  pararMicrofone();
  mostrar(pegar("#telaEscolhaModo"), false);
  mostrar(pegar("#telaInicio"), nome === "inicio");
  mostrar(pegar("#telaAcessivel"), nome === "acessivel");
  mostrar(pegar("#telaOpcoes"), nome === "opcoes");
  mostrar(pegar("#telaLista"), nome === "lista");
  mostrar(pegar("#telaMapa"), nome === "mapa");

  if (window.CameraMobintec) {
    if (nome === "opcoes") window.CameraMobintec.montarEm("#slotCameraOpcoes");
    else if (nome === "lista") window.CameraMobintec.montarEm("#slotCameraOnibus");
    else window.CameraMobintec.desmontar();
  }

  if (nome !== "inicio" && nome !== "escolhamodo" && !semHistorico) {
    try { if (!(history.state && history.state.tela === nome)) history.pushState({ tela: nome }, ""); } catch (e) {}
  }

  if (nome === "lista") {
    colocarMapaEm("#slotMapaOnibus"); criarMapa(); desenharRotaNoMapa();
    const titulo = pegar("#tituloLista"); if (titulo) titulo.focus();
    if (!silencioso) falar("Ônibus turísticos. Escolha um destino.");
  } else if (nome === "opcoes") {
    const titulo = pegar("#tituloOpcoes"); if (titulo) titulo.focus(); if (!silencioso) falar("Opções.");
  } else if (nome === "mapa") {
    colocarMapaEm("#slotMapaTela"); criarMapa(); desenharRotaNoMapa(); mostrarVoceNoMapa();
    const titulo = pegar("#tituloMapa"); if (titulo) titulo.focus(); desenharPerto();
    if (idLocal === null) ligarLocalizacao(silencioso);
    else if (!silencioso) falar("Mapa. " + (pegar("#textoLocal") ? pegar("#textoLocal").textContent : ""));
  } else if (nome === "acessivel") {
    const titulo = pegar("#tituloAcessivel"); if (titulo) titulo.focus();
    if (!silencioso) iniciarFluxoAcessivel();
  } else {
    pararAcompanhamento(); limparBolhas(); tocarEmQualquerLugar = true;
    if (!silencioso && modoAtual === 'visual') falar("Conversa. Toque em qualquer lugar e fale.");
    const titulo = pegar("#tituloInicio"); if (titulo) titulo.focus();
  }
  window.scrollTo(0, 0);
}
