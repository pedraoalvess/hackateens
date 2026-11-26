/* ==========================================================================
   MOBINTEC - script completo (sem chat flutuante, sem barra de topo)
   IA integrada ao microfone redondo principal via responder() -> perguntarParaIA()
   ========================================================================== */

/* ---------- 1) Ajudantes (~linha 6) ---------- */
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

/* ---------- 2) Dados (~linha 30) ---------- */
const VELOCIDADE_TESTE = 5;
const URL_DA_IA = "https://mobintec-ia.pdeoliveiraalves840.workers.dev/";
const BOAS_VINDAS = "Bem-vindo ao Mobintec. Escolha como você quer usar: modo visual, com mapa e botões na tela, ou modo acessível, apenas com voz e microfone. Toque no botão do modo que você preferir.";
const TEXTO_AJUDA = "Comandos: quero ir para as cataratas, onde eu embarco, tem gratuidade, abre o mapa, repetir, mais devagar, desligar a voz, trocar destino, ligar localização, quanto tempo falta, qual a distância, abrir google maps, falar operadora.";

let modoAtual = 'visual';
let passoAcessivel = 0;

function acharDestino(texto) {
  const limpo = semAcento(texto);
  for (const destino of DESTINOS) {
    for (const palavra of destino.palavras) {
      if (limpo.includes(semAcento(palavra))) return destino;
    }
  }
  return null;
}

/* ---------- 3) Fala (~linha 50) ---------- */
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

/* ---------- 4) Telas e Modo (~linha 100) ---------- */
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
  document.body.classList.remove('modo-visual', 'modo-acessivel');
  document.body.classList.add('modo-' + modo);
  if (modo === 'visual') {
    mostrar(pegar("#telaInicio"), true);
    falar("Modo visual ativado. Toque no microfone e fale para escolher um destino.");
  } else {
    mostrar(pegar("#telaAcessivel"), true);
    passoAcessivel = 0;
    iniciarFluxoAcessivel();
  }
}

function iniciarFluxoAcessivel() {
  if (passoAcessivel === 0) {
    const destinos = DESTINOS.map(d => d.nome).join(", ");
    avisar("Escolha seu destino em Foz do Iguaçu. Você pode ir para: " + destinos + ". Toque no microfone e diga o nome do destino.");
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
    if (!silencioso && modoAtual === 'visual') falar("Toque no microfone e fale.");
    const titulo = pegar("#tituloInicio"); if (titulo) titulo.focus();
  }
  window.scrollTo(0, 0);
}

/* ---------- 5) Mapa (~linha 180) ---------- */
let mapa = null, camada = null, marcadorOnibus = null, marcadorVoce = null, camadaPerto = null, distanciaAteVoce = null;
function criarPino(texto, corFundo, corTexto, tamanho) {
  return L.divIcon({ className: "", iconSize: [tamanho, tamanho], iconAnchor: [tamanho / 2, tamanho / 2],
    html: '<div class="pino" style="width:' + tamanho + 'px;height:' + tamanho + 'px;background:' + corFundo + ';color:' + corTexto + '">' + texto + "</div>" });
}
function colocarMapaEm(id) {
  const lugar = pegar(id), bloco = pegar("#blocoMapa");
  if (lugar && bloco && bloco.parentNode !== lugar) lugar.appendChild(bloco);
}
function criarMapa() {
  if (!window.L) { const msg = pegar("#mensagemMapa"); if (msg) msg.textContent = "O mapa não carregou."; return; }
  if (mapa) { setTimeout(() => mapa.invalidateSize(), 60); return; }
  mapa = L.map("mapa", { keyboard: false, zoomControl: false, attributionControl: false });
  mapa.setView([-25.54, -54.55], 11); trocarFundoDoMapa();
  camada = L.layerGroup().addTo(mapa); camadaPerto = L.layerGroup().addTo(mapa);
  DESTINOS.forEach((destino, i) => {
    L.marker(destino.posicao, { icon: criarPino(destino.sigla, "#8b1f2f", "#ffffff", 36), keyboard: false })
      .on("click", () => escolherDestino(i)).addTo(mapa);
    destino.embarques.forEach(embarque => {
      L.marker(embarque.posicao, { icon: criarPino("E", "#ffffff", "#0d0a0b", 26), keyboard: false })
        .on("click", () => escolherDestino(i)).addTo(mapa);
    });
  });
  setTimeout(() => mapa.invalidateSize(), 60);
}
let fundoMapa = null, usandoMapaReserva = false;
function trocarFundoDoMapa() {
  if (!mapa) return;
  if (fundoMapa) mapa.removeLayer(fundoMapa);
  if (usandoMapaReserva) { fundoMapa = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(mapa); return; }
  const estilo = document.body.classList.contains("claro") ? "World_Light_Gray_Base" : "World_Dark_Gray_Base";
  const esri = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/" + estilo + "/MapServer/tile/{z}/{y}/{x}", { maxZoom: 16 });
  esri.once("tileerror", () => { usandoMapaReserva = true; const msg = pegar("#mensagemMapa"); if (msg) msg.textContent = "Usando mapa reserva."; trocarFundoDoMapa(); });
  esri.addTo(mapa); fundoMapa = esri;
}
function corDaRota() { return document.body.classList.contains("claro") ? "#8b1f2f" : "#ffb3c4"; }
function definirVoz(ligada, anunciar) {
  vozLigada = ligada; if (!ligada && window.speechSynthesis) window.speechSynthesis.cancel();
  const botao = pegar("#botaoVoz");
  if (botao) {
    botao.textContent = ligada ? "Voz do site: ligada" : "Voz do site: desligada";
    botao.setAttribute("aria-label", ligada ? "Voz ligada. Toque para desligar." : "Voz desligada. Toque para ligar.");
  }
  try { localStorage.setItem("mobintecVoz", ligada ? "ligada" : "desligada"); } catch (e) {}
  if (anunciar) { const estado = pegar("#textoEstado"); if (estado) estado.textContent = ligada ? "Voz ligada." : "Voz desligada."; falar(ligada ? "Voz ligada." : "Voz desligada."); }
}
function repetirUltima() {
  if (window.CameraMobintec && window.CameraMobintec.ehMensagemDaCamera(ultimaFala)) { window.CameraMobintec.ouvir(); return; }
  if (vozLigada) { falar(ultimaFala); return; }
  const estado = pegar("#textoEstado"); if (estado) { estado.textContent = ""; setTimeout(() => estado.textContent = ultimaFala, 40); }
}
function aplicarTema(claro, anunciar) {
  document.body.classList.toggle("claro", claro);
  const botao = pegar("#botaoTema");
  if (botao) { botao.textContent = claro ? "Tema escuro" : "Tema claro"; botao.setAttribute("aria-label", claro ? "Trocar para escuro" : "Trocar para claro"); }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", claro ? "#faf9f5" : "#0d0a0b");
  try { localStorage.setItem("mobintecTema", claro ? "claro" : "escuro"); } catch (e) {}
  trocarFundoDoMapa();
  if (camada) camada.eachLayer(item => { if (item.setStyle) item.setStyle({ color: corDaRota() }); });
  if (anunciar) avisar(claro ? "Tema claro." : "Tema escuro.");
}

/* ---------- 6) Microfone (~linha 265) ---------- */
const ReconhecimentoDoNavegador = window.SpeechRecognition || window.webkitSpeechRecognition;
let usarModeloProprio = !ReconhecimentoDoNavegador, reconhecimento = null, ouvindo = false, iniciando = false, entendeu = false;
let gravador = null, fluxoDoMicrofone = null, gravando = false, processando = false, gravacaoCancelada = false, transcritor = null;

function destacarBolha(destino) {
  document.querySelectorAll(".bolha").forEach((b, i) => { b.classList.toggle("ativa", DESTINOS[i] === destino); b.classList.toggle("apagada", DESTINOS[i] !== destino); });
}
function limparBolhas() { document.querySelectorAll(".bolha").forEach(b => b.classList.remove("ativa", "apagada")); }

function pararMicrofone() {
  if (reconhecimento && (ouvindo || iniciando)) { try { reconhecimento.abort(); } catch (e) {} }
  if (gravando) { gravacaoCancelada = true; gravador.stop(); }
  ouvindo = false; iniciando = false;
  const anel = pegar("#anel"); if (anel) anel.classList.remove("ouvindo");
  const anelAcessivel = pegar("#anelAcessivel"); if (anelAcessivel) anelAcessivel.classList.remove("ouvindo");
  ["#botaoMicrofone", "#botaoMicrofoneAcessivel", "#botaoPerguntar", "#botaoPerguntarPainel"].forEach(id => {
    const b = pegar(id); if (b) b.setAttribute("aria-pressed", "false");
  });
}

let modoConversa = false, botaoDaConversa = null;
function tocarMicrofone(botao, automatico) {
  if (!botao) return;
  if (!automatico) { if (ouvindo) modoConversa = false; else { modoConversa = true; botaoDaConversa = botao; } }
  if (iniciando) return;
  if (ouvindo) { pararMicrofone(); avisar("Microfone desligado."); return; }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  limparBolhas();
  if (usarModeloProprio) ouvirComModeloProprio(botao); else ouvirComNavegador(botao);
}

function ouvirComNavegador(botao) {
  const este = new ReconhecimentoDoNavegador(); reconhecimento = este; este.lang = "pt-BR"; este.interimResults = true; entendeu = false; iniciando = true;
  const ouvido = pegar("#textoOuvido"); if (ouvido) ouvido.textContent = "";
  const ouvidoAcessivel = pegar("#textoOuvidoAcessivel"); if (ouvidoAcessivel) ouvidoAcessivel.textContent = "";

  este.onstart = () => {
    if (este !== reconhecimento) return;
    iniciando = false; ouvindo = true; apitar(880);
    const anel = pegar("#anel"); if (anel) anel.classList.add("ouvindo");
    const anelAcessivel = pegar("#anelAcessivel"); if (anelAcessivel) anelAcessivel.classList.add("ouvindo");
    if (botao) botao.setAttribute("aria-pressed", "true");
    const estado = pegar("#textoEstado"); if (estado) estado.textContent = "Ouvindo… fale agora.";
    const estadoAcessivel = pegar("#textoAcessivel"); if (estadoAcessivel) estadoAcessivel.textContent = "Ouvindo… fale agora.";
  };

  este.onresult = evento => {
    if (este !== reconhecimento || entendeu) return;
    let texto = ""; for (const r of evento.results) texto += " " + r[0].transcript;
    const ouvido = pegar("#textoOuvido"); if (ouvido) ouvido.textContent = texto.trim();
    const ouvidoAcessivel = pegar("#textoOuvidoAcessivel"); if (ouvidoAcessivel) ouvidoAcessivel.textContent = texto.trim();
    if (evento.results[evento.results.length - 1].isFinal) {
      entendeu = true; pararMicrofone();
      if (/^(parar|pare|chega|tchau|encerrar|sair)( conversa)?$/.test(semAcento(texto.trim()))) { modoConversa = false; avisar("Conversa encerrada."); return; }
      responder(texto);
    }
  };

  este.onerror = evento => {
    if (este !== reconhecimento) return; iniciando = false;
    if (evento.error === "network" || evento.error === "service-not-allowed") { entendeu = true; usarModeloProprio = true; avisar("Voz do navegador indisponível. Usando voz do site."); ouvirComModeloProprio(botao); }
    else if (evento.error === "not-allowed") { entendeu = true; avisar("Permissão do microfone negada."); }
    else if (evento.error === "no-speech") { entendeu = true; modoConversa = false; avisar("Não ouvi nada."); }
  };

  este.onend = () => {
    if (este !== reconhecimento) return; const estava = ouvindo; pararMicrofone();
    if (estava) { apitar(440); if (!entendeu) avisar("Não entendi. Toque e diga, por exemplo, Cataratas."); }
  };

  setTimeout(() => { if (este === reconhecimento && iniciando) { iniciando = false; avisar("Microfone demorou."); } }, 10000);
  try { este.start(); } catch (e) { iniciando = false; avisar("Não consegui ligar o microfone."); }
}

async function ouvirComModeloProprio(botao) {
  if (gravando) { gravador.stop(); return; } if (processando) return;
  try { fluxoDoMicrofone = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { avisar("Não consegui usar o microfone."); return; }
  const pedacos = []; gravacaoCancelada = false; gravador = new MediaRecorder(fluxoDoMicrofone); const esteGravador = gravador;
  gravador.ondataavailable = e => pedacos.push(e.data);
  gravador.onstop = async () => {
    gravando = false; fluxoDoMicrofone.getTracks().forEach(t => t.stop());
    const anel = pegar("#anel"); if (anel) anel.classList.remove("ouvindo");
    const anelAcessivel = pegar("#anelAcessivel"); if (anelAcessivel) anelAcessivel.classList.remove("ouvindo");
    if (botao) botao.setAttribute("aria-pressed", "false");
    if (gravacaoCancelada) return; apitar(440); processando = true; avisar("Entendendo…");
    try {
      const audioBruto = await new Blob(pedacos, { type: esteGravador.mimeType }).arrayBuffer();
      const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const audio = await ctx.decodeAudioData(audioBruto); ctx.close();
      const modelo = await carregarModelo();
      const res = await modelo(audio.getChannelData(0), { language: "portuguese", task: "transcribe" });
      const ouvido = pegar("#textoOuvido"); if (ouvido) ouvido.textContent = res.text.trim();
      responder(res.text);
    } catch (e) { avisar("Não entendi o áudio."); }
    processando = false;
  };
  gravador.start(); gravando = true; apitar(880);
  const anel = pegar("#anel"); if (anel) anel.classList.add("ouvindo");
  const anelAcessivel = pegar("#anelAcessivel"); if (anelAcessivel) anelAcessivel.classList.add("ouvindo");
  if (botao) botao.setAttribute("aria-pressed", "true");
  const estado = pegar("#textoEstado"); if (estado) estado.textContent = "Ouvindo… toque de novo para terminar.";
  setTimeout(() => { if (esteGravador.state === "recording") esteGravador.stop(); }, 6000);
}

async function carregarModelo() {
  if (transcritor) return transcritor;
  const bib = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.web.min.js");
  transcritor = await bib.pipeline("automatic-speech-recognition", "Xenova/whisper-tiny", {
    progress_callback: p => { if (p.status === "progress") { const estado = pegar("#textoEstado"); if (estado) estado.textContent = "Baixando voz: " + Math.round(p.progress) + "%"; } }
  });
  return transcritor;
}

/* ---------- 7) Assistente / destinos (~linha 400) ---------- */
function querIrAoDestino(texto) { return /quero ir|vou para|ir para|ir ao|me leva|acompanhar|onibus|rota|abrir|vamos/.test(semAcento(texto)); }
function comandoDeCamera(texto) {
  const t = semAcento(texto);
  if (/\bcameras?\b/.test(t) && /\b(parar|pare|desligar|fechar|encerrar)\b/.test(t)) return "parar";
  if (/\b(esp32|esp)\b/.test(t)) return "fixa";
  if (/\bcameras?\b/.test(t) && /\b(celular|telefone|aparelho)\b/.test(t)) return "celular";
  if (/\bcameras?\b/.test(t) && /\bonibus\b/.test(t)) return "fixa";
  return null;
}
function executarComandoDeCamera(comando) {
  if (!window.CameraMobintec) { avisar("Câmera indisponível."); return; }
  if (comando === "parar") { window.CameraMobintec.parar(false); avisar("Câmera parada."); return; }
  if (destinoAtual && dados) { if (pegar("#telaLista") && pegar("#telaLista").hidden) abrirTela("lista", true); mostrarAba("Onibus"); }
  else if (pegar("#telaOpcoes") && pegar("#telaOpcoes").hidden) abrirTela("opcoes", true);
  avisar(comando === "celular" ? "Abrindo câmera do celular." : "Buscando análise da câmera do ônibus.");
  window.CameraMobintec.iniciar(comando);
}
function perguntaSobreAssento(texto) {
  const t = semAcento(texto);
  return /\b(assentos?|poltronas?)\b/.test(t) || (/\blugar(es)?\b/.test(t) && /\b(livres?|vazios?|sentar)\b/.test(t)) || /\blivres?\b/.test(t);
}
function irParaDestino(destino, silencioso) {
  destacarBolha(destino); if (!silencioso) avisar("Certo: ônibus para " + destino.nome + ".");
  setTimeout(() => { abrirTela("lista"); escolherDestino(DESTINOS.indexOf(destino)); }, silencioso ? 0 : 900);
}
function falarSobreDestino(destino) {
  destacarBolha(destino); const emb = destino.embarques[0];
  avisar(destino.nome + ". " + destino.descricao + " Embarque em " + emb.nome + (emb.gratuidade ? " (gratuidade para PCD)." : "") + " Acessibilidade: " + emb.acessibilidade);
}
function explicarEmbarque(embarque, num) {
  let t = "Opção " + num + ": " + embarque.nome + ". É um " + embarque.tipo.toLowerCase() + ". " + embarque.instrucao + " Percurso: " + embarque.rota + " ";
  if (embarque.paradas && embarque.paradas.length > 0) t += (embarque.paradas.length <= 3 ? "Paradas: " + embarque.paradas.join(", ") + ". " : "Tem " + embarque.paradas.length + " paradas. ");
  t += "Desça: " + embarque.ondeDescer + " ";
  t += (embarque.gratuidade ? "Tem gratuidade para PCD. " + embarque.preco + ". " : "Preço: " + embarque.preco + ". ");
  return t + "Acessibilidade: " + embarque.acessibilidade;
}

function mostrarApenasDestinoEscolhido(destino) {
  const cartoes = document.querySelectorAll("#cartoes .cartao");
  cartoes.forEach((cartao, i) => {
    if (DESTINOS[i] === destino) {
      cartao.style.display = "";
      cartao.querySelectorAll("button").forEach(btn => { if (btn.textContent.includes("Acompanhar")) btn.style.display = "none"; });
      const antigos = cartao.querySelector(".botoes-embarque"); if (antigos) antigos.remove();
      const box = document.createElement("div");
      box.className = "botoes-embarque";
      box.style.cssText = "display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:1rem;";
      if (destino.embarques.length > 1 && !destino.embarqueEscolhido) {
        destino.embarques.forEach((emb, idx) => {
          const btn = document.createElement("button");
          btn.className = "botao botao-forte";
          btn.style.cssText = "flex:1;min-width:200px;";
          btn.textContent = (idx + 1) + ". " + emb.nome + (emb.gratuidade ? " (Gratuidade PCD)" : "");
          btn.setAttribute("aria-label", "Escolher " + emb.nome);
          btn.onclick = () => escolherEmbarque(destino, idx);
          box.appendChild(btn);
        });
      } else if (destino.embarqueEscolhido) {
        const btnTrocar = document.createElement("button");
        btnTrocar.className = "botao";
        btnTrocar.style.cssText = "width:100%;";
        btnTrocar.textContent = "🔄 Trocar embarque";
        btnTrocar.onclick = () => { destino.embarqueEscolhido = null; mostrarApenasDestinoEscolhido(destino); mostrarOpcoesDeEmbarque(destino); };
        box.appendChild(btnTrocar);
      }
      cartao.appendChild(box);
    } else { cartao.style.display = "none"; }
  });
}

function mostrarTodosDestinos() {
  document.querySelectorAll("#cartoes .cartao").forEach(cartao => {
    cartao.style.display = "";
    const box = cartao.querySelector(".botoes-embarque"); if (box) box.remove();
    cartao.querySelectorAll("button").forEach(btn => { if (btn.textContent.includes("Acompanhar")) btn.style.display = ""; });
  });
}

function mostrarOpcoesDeEmbarque(destino) {
  const embarques = destino.embarques;
  mostrarApenasDestinoEscolhido(destino);
  abrirTela("lista");
  if (embarques.length === 1) { destino.embarqueEscolhido = embarques[0]; iniciarAcompanhamento(destino); return; }
  let t = "Para ir a " + destino.nome + ", você tem " + embarques.length + " formas. ";
  embarques.forEach((emb, i) => t += explicarEmbarque(emb, i + 1) + " ");
  t += embarques.length === 2 ? "Diga 1 para " + embarques[0].nome + ", ou 2 para " + embarques[1].nome + "." : "Diga o número da opção.";
  if (embarques[0].gratuidade) t += " Lembre-se: a opção " + embarques[0].nome + " tem gratuidade.";
  destinoPendente = destino;
  avisar(t);
}
let destinoPendente = null;
function escolherEmbarque(destino, indice) {
  if (indice < 0 || indice >= destino.embarques.length) { avisar("Opção inválida."); return; }
  destino.embarqueEscolhido = destino.embarques[indice]; destinoPendente = null; iniciarAcompanhamento(destino);
}
function iniciarAcompanhamento(destino) {
  const emb = destino.embarqueEscolhido;
  let p = "Você escolheu " + destino.nome + ". ";
  if (!emb) {
    p += "Para ir a " + destino.nome + ", você tem " + destino.embarques.length + " formas. Diga o número da opção, ou toque no botão na tela.";
    destinoPendente = destino; abrirTela("lista"); mostrarApenasDestinoEscolhido(destino);
    setTimeout(() => avisar(p), 300); return;
  }
  p += "Embarque em " + emb.nome + ". ";
  if (emb.gratuidade) p += "Gratuidade para PCD. ";
  if (emb.sustentabilidade) p += emb.sustentabilidade + " ";
  if (posicaoUsuario) p += "Você está a " + formatarDistancia(distanciaEntre(posicaoUsuario, emb.posicao)) + " do embarque. ";
  p += proximoHorarioDe(emb).texto;
  abrirTela("lista"); mostrarApenasDestinoEscolhido(destino); escolherDestinoComEmbarque(DESTINOS.indexOf(destino));
  setTimeout(() => avisar(p), 500);
}
function executarAcao(resposta) {
  const acao = resposta.acao;
  if (acao === "abrir_onibus") { const d = acharDestino(resposta.destino || ""); if (d) irParaDestino(d, true); }
  else if (acao === "abrir_mapa") abrirTela("mapa");
  else if (acao === "ligar_localizacao") { if (idLocal === null) ligarLocalizacao(); }
  else if (acao === "voltar") voltar();
  else if (acao === "abrir_camera_celular") executarComandoDeCamera("celular");
  else if (acao === "abrir_camera_onibus") executarComandoDeCamera("fixa");
  else if (acao === "parar_camera") executarComandoDeCamera("parar");
  else if (acao === "ler_assentos") { if (destinoAtual && dados) mostrarAba("Onibus"); avisar(textoAssento()); }
  else if (acao === "abrir_opcoes") abrirTela("opcoes");
  else if (acao === "trocar_tema") aplicarTema(!document.body.classList.contains("claro"), true);
  else if (acao === "ler_embarque") avisar(textoEmbarque());
  else if (acao === "trocar_embarque") { if (destinoAtual) mostrarOpcoesDeEmbarque(destinoAtual); }
  else if (destinoAtual && dados) {
    if (acao === "ler_paradas") { mostrarAba("Rota"); avisar(textoParadas()); }
    if (acao === "ler_acessibilidade") { mostrarAba("Onibus"); avisar(textoAcessibilidade()); }
    if (acao === "ler_transporte") { mostrarAba("Onibus"); avisar(textoTransporte()); }
  }
}

/* ---------- 8) Responder: comandos locais + IA (~linha 520) ---------- */
function responder(texto) {
  registrarConversa("Você", texto);
  const ouvido = pegar("#textoOuvido"); if (ouvido) ouvido.textContent = '"' + texto.trim() + '"';
  const ouvidoAcessivel = pegar("#textoOuvidoAcessivel"); if (ouvidoAcessivel) ouvidoAcessivel.textContent = '"' + texto.trim() + '"';

  const eco = pegar("#ecoPergunta");
  if (eco) { eco.textContent = "💬 Você perguntou: \"" + texto.trim() + "\""; eco.style.display = "block"; }
  const campoPainel = pegar("#campoPainel"); if (campoPainel) campoPainel.value = "";

  const telaEscolha = pegar("#telaEscolhaModo");
  if (telaEscolha && !telaEscolha.hidden) {
    const tModo = semAcento(texto);
    if (/\b(visual|tela|mapa|botao|ver|verdadeiro|completo)\b/.test(tModo)) { escolherModo('visual'); return; }
    if (/\b(acessivel|cego|voz|audio|somente|ouvinte|deficiente|baixa visao)\b/.test(tModo)) { escolherModo('acessivel'); return; }
    avisar("Primeiro escolha um modo. Toque em modo visual ou modo acessível."); return;
  }

  if (destinoPendente) {
    const tp = semAcento(texto.trim()), num = parseInt(tp);
    if (!isNaN(num) && num >= 1 && num <= destinoPendente.embarques.length) { escolherEmbarque(destinoPendente, num - 1); return; }
    for (let i = 0; i < destinoPendente.embarques.length; i++) {
      const emb = destinoPendente.embarques[i];
      if (semAcento(texto).includes(semAcento(emb.nome)) || semAcento(texto).includes(semAcento(emb.tipo)) || (emb.gratuidade && /(gratuid|gratu|pcd|deficiencia|bpc|loas)/.test(tp))) {
        escolherEmbarque(destinoPendente, i); return;
      }
    }
  }

  const cmdCam = comandoDeCamera(texto); if (cmdCam) { executarComandoDeCamera(cmdCam); return; }
  const t = semAcento(texto);

  if (/\b(trocar|mudar|alterar)\b/.test(t) && /\b(destino|ponto|lugar)\b/.test(t)) { pararAcompanhamento(); abrirTela(modoAtual === 'acessivel' ? 'acessivel' : 'inicio'); avisar("Voltando para escolher outro destino."); return; }
  if (/\b(ligar|ativar)\b/.test(t) && /\b(localizacao|gps|local)\b/.test(t)) { if (idLocal === null) ligarLocalizacao(); else avisar("Localização já está ligada."); return; }
  if (/\b(desligar|desativar)\b/.test(t) && /\b(localizacao|gps|local)\b/.test(t)) { if (idLocal !== null) ligarLocalizacao(); else avisar("Localização já está desligada."); return; }
  if (/\b(quanto tempo|tempo falta|quanto falta|tempo ate chegar)\b/.test(t)) {
    if (destinoAtual && dados) { const m = minutosQueFaltam(); avisar("Faltam " + m + (m === 1 ? " minuto" : " minutos") + " para chegar."); }
    else avisar("Escolha um destino primeiro."); return;
  }
  if (/\b(qual distancia|qual a distancia|estou perto|distancia)\b/.test(t)) {
    if (distanciaAteVoce !== null) avisar("Você está a " + formatarDistancia(distanciaAteVoce) + " do ponto de embarque.");
    else if (posicaoUsuario && destinoAtual) avisar("Você está a " + formatarDistancia(distanciaEntre(posicaoUsuario, embarqueAtual().posicao)) + " do embarque.");
    else avisar("Ligue a localização para ver a distância."); return;
  }
  if (/\b(abrir|abre)\b/.test(t) && /\b(google maps|maps|mapa google)\b/.test(t)) {
    if (destinoAtual) { const emb = embarqueAtual(); window.open("https://www.google.com/maps/dir/?api=1&destination=" + emb.posicao[0] + "," + emb.posicao[1] + "&travelmode=walking", "_blank"); avisar("Abrindo Google Maps."); }
    else avisar("Escolha um destino primeiro."); return;
  }
  if (/\b(operadora|telefone|contato|ligar para)\b/.test(t)) {
    if (destinoAtual) { const emb = embarqueAtual(); avisar("Operadora: " + emb.operadora + ". Contato: " + emb.contato + "."); }
    else avisar("Escolha um destino primeiro."); return;
  }
  if (/\b(gratuid|gratu|pcd|deficiencia|bpc|loas)\b/.test(t)) {
    if (destinoAtual) { const emb = embarqueAtual(); avisar(emb.gratuidade ? "Sim! " + emb.nome + " tem gratuidade. " + emb.preco : "Este não tem. Mas a Linha 120 tem. Diga: trocar embarque."); }
    else avisar("A Linha 120 tem gratuidade para PCD. Apresente o cartão BPC/LOAS."); return;
  }
  if (/\b(onde embarco|onde pego|ponto de embarque|quais paradas|onde descer|onde desço)\b/.test(t)) {
    if (destinoAtual) avisar(textoEmbarque()); else avisar("Escolha um destino primeiro."); return;
  }
  if (/\b(trocar|mudar|alterar|outro)\b/.test(t) && /\b(embarque|ponto|onibus)\b/.test(t)) {
    if (destinoAtual) mostrarOpcoesDeEmbarque(destinoAtual); else avisar("Escolha um destino primeiro."); return;
  }
  if (/\b(horario|horarios|que horas|proximo onibus)\b/.test(t)) {
    if (destinoAtual) { const emb = embarqueAtual(); avisar("Para " + destinoAtual.nome + ", embarque em " + emb.nome + ": " + proximoHorarioDe(emb).texto); }
    else avisar("Escolha um destino primeiro."); return;
  }

  const destino = acharDestino(texto);
  if (destino) {
    const pedido = categoriaNoTexto(texto); if (pedido) { pedirPertoDe(destino, pedido); return; }
    if (querIrAoDestino(texto)) { if (destino.embarques.length > 1) { destacarBolha(destino); mostrarOpcoesDeEmbarque(destino); } else irParaDestino(destino, false); return; }
    if (URL_DA_IA) { destacarBolha(destino); perguntarParaIA(texto); return; }
    falarSobreDestino(destino); return;
  }
  if (perguntaSobreAssento(texto)) { if (destinoAtual && dados) mostrarAba("Onibus"); avisar(textoAssento()); return; }
  if (t.includes("claro") && t.includes("tema")) { aplicarTema(true, true); return; }
  if (t.includes("escuro") && t.includes("tema")) { aplicarTema(false, true); return; }
  if (t.includes("repet") || t.includes("de novo")) { repetirUltima(); return; }
  if (t.includes("devagar") || t.includes("mais baixo")) { velocidadeVoz = Math.max(0.6, velocidadeVoz - 0.2); try { localStorage.setItem("mobintecVelocidade", velocidadeVoz); } catch (e) {} falar("Velocidade diminuída."); return; }
  if (t.includes("rapido") || t.includes("mais alto")) { velocidadeVoz = Math.min(1.6, velocidadeVoz + 0.2); try { localStorage.setItem("mobintecVelocidade", velocidadeVoz); } catch (e) {} falar("Velocidade aumentada."); return; }
  if (t.includes("voz") && t.includes("desligar")) { definirVoz(false, true); return; }
  if (t.includes("voz") && t.includes("ligar")) { definirVoz(true, true); return; }
  if (t.includes("silencio")) { if (window.speechSynthesis) window.speechSynthesis.cancel(); return; }
  if (t.includes("ajuda") || t.includes("comandos")) { avisar(TEXTO_AJUDA); return; }
  if (t.includes("voltar") || t.includes("inicio")) { voltar(); return; }
  if (t.includes("localizacao")) { falarLocalizacao(); return; }
  if (t.includes("mapa")) { abrirTela("mapa"); return; }
  if (t.includes("opcoes")) { abrirTela("opcoes"); return; }
  if (t.includes("restaurante") || t.includes("comer")) { pedirPerto("restaurantes"); return; }
  if (t.includes("ponto turistico") || t.includes("passeio")) { pedirPerto("atracoes"); return; }
  if (t.includes("hotel") || t.includes("perto")) { pedirPerto("hoteis"); return; }

  if (!destinoAtual) { if (URL_DA_IA) perguntarParaIA(texto); else avisar("Primeiro diga um destino, por exemplo Cataratas."); return; }
  if (t.includes("transporte") || t.includes("preco") || t.includes("operadora")) { mostrarAba("Onibus"); avisar(textoTransporte()); return; }
  if (t.includes("acessibilidade") || t.includes("rampa")) { mostrarAba("Onibus"); avisar(textoAcessibilidade()); return; }
  if (t.includes("assento") || t.includes("livre")) { mostrarAba("Onibus"); avisar(textoAssento()); return; }
  if (t.includes("parada")) { mostrarAba("Rota"); avisar(textoParadas()); return; }
  if (t.includes("rota") || t.includes("distancia")) { mostrarAba("Rota"); avisar(textoRota()); return; }
  if (t.includes("onibus") || t.includes("chega") || t.includes("tempo")) { mostrarAba("Onibus"); avisar(frasePrincipal()); return; }
  if (URL_DA_IA) { perguntarParaIA(texto); return; }
  avisar("Não entendi. Diga ajuda.");
}

let conversa = [];
async function perguntarParaIA(texto) {
  const estado = pegar("#textoEstado"), resposta = pegar("#textoResposta");
  if (estado) estado.textContent = "Pensando…"; if (resposta) resposta.textContent = "Pensando…";
  const categoria = categoriaNoTexto(texto), citado = acharDestino(texto);
  if (categoria && (citado || posicaoUsuario || destinoAtual)) await buscarPerto(categoria, citado);
  let contexto = { destino: "nenhum", aviso: "Posição e horários são simulação. Distância é real via GPS." };
  if (destinoAtual && dados) {
    const emb = embarqueAtual();
    contexto = { destino: destinoAtual.nome, descricao: destinoAtual.descricao, servico: destinoAtual.servico, embarque: emb.nome, instrucaoEmbarque: emb.instrucao, rota: emb.rota, paradas: emb.paradas, ondeDescer: emb.ondeDescer, gratuidade: emb.gratuidade, sustentabilidade: emb.sustentabilidade, preco: emb.preco, acessibilidade: emb.acessibilidade, aConfirmar: destinoAtual.aConfirmar, status: frasePrincipal(true), rotaTexto: textoRota(), lugaresPerto: textoPerto(), paradasTexto: textoParadas(), transporte: textoTransporte(), proximoHorario: proximoHorarioDe(emb).texto, horariosDoDia: emb.horarios.map(h => h.hora).join(", "), operadora: emb.operadora, contato: emb.contato, todosOsEmbarques: destinoAtual.embarques.map(e => ({ nome: e.nome, tipo: e.tipo, gratuidade: e.gratuidade, preco: e.preco })) };
  }
  contexto.todosOsDestinos = DESTINOS.map(d => ({ nome: d.nome, servico: d.servico, descricao: d.descricao, embarques: d.embarques.map(e => ({ nome: e.nome, tipo: e.tipo, gratuidade: e.gratuidade, preco: e.preco })) }));
  if (perto.lista.length > 0 && !contexto.lugaresPerto) contexto.lugaresPerto = textoPerto();
  if (posicaoUsuario) {
    contexto.localizacaoLigada = true; const emb = embarqueAtual();
    if (emb && distanciaAteVoce !== null) { contexto.distanciaAteEmbarque = formatarDistancia(distanciaAteVoce); contexto.voceEstaA = formatarDistancia(distanciaAteVoce) + " do embarque " + emb.nome; }
  } else { contexto.localizacaoLigada = false; contexto.voceEstaA = "Localização desligada."; }
  try {
    const controle = new AbortController(), prazo = setTimeout(() => controle.abort(), 30000);
    const res = await fetch(URL_DA_IA, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pergunta: texto, historico: conversa, contexto }), signal: controle.signal });
    clearTimeout(prazo); const json = await res.json();
    if (!res.ok || !json.resposta) throw new Error(json.detalhe || json.erro || "sem resposta");
    conversa.push({ role: "user", content: texto }); conversa.push({ role: "assistant", content: json.resposta }); conversa = conversa.slice(-10);
    avisar(json.resposta, () => {
      const ecoA = pegar("#ecoPergunta");
      if (ecoA) { ecoA.textContent = "🤖 " + json.resposta; ecoA.style.display = "block"; }
      if (json.acao === "abrir_mapa" && categoria && !posicaoUsuario && !destinoAtual) categoriaPendente = categoria;
      executarAcao(json);
      if (modoConversa && botaoDaConversa && (!json.acao || json.acao === "nenhuma")) setTimeout(() => { if (modoConversa && !ouvindo && !iniciando) tocarMicrofone(botaoDaConversa, true); }, 400);
    });
  } catch (e) {
    console.warn("Erro IA:", e); modoConversa = false;
    const motivo = e.name === "AbortError" ? "Demorou demais." : (e instanceof TypeError ? "Sem internet." : "");
    avisar("Não consegui falar com a assistente. " + motivo + " Tente de novo.");
  }
}

/* ---------- 9) Localização (~linha 700) ---------- */
let idLocal = null, posicaoUsuario = null, ultimoLimiar = null, ultimaDistanciaMostrada = null, centralizouNaPessoa = false;
function mostrarVoceNoMapa() {
  if (!mapa || !posicaoUsuario) return;
  if (marcadorVoce) marcadorVoce.setLatLng(posicaoUsuario);
  else marcadorVoce = L.marker(posicaoUsuario, { icon: criarPino("EU", "#5de08a", "#0d0a0b", 40), keyboard: false }).addTo(mapa);
}
function atualizarBotaoLocal() { const b = pegar("#botaoLocal"); if (b) b.textContent = idLocal !== null ? "Desligar localização" : "Ativar minha localização"; }
function atualizarDistanciaDoEmbarque() {
  if (!posicaoUsuario || !destinoAtual) return;
  const emb = embarqueAtual(); if (!emb) return;
  distanciaAteVoce = distanciaEntre(posicaoUsuario, emb.posicao);
  if (ultimaDistanciaMostrada === null || Math.abs(distanciaAteVoce - ultimaDistanciaMostrada) >= 25) {
    ultimaDistanciaMostrada = distanciaAteVoce;
    const textoLocal = pegar("#textoLocal");
    if (textoLocal) textoLocal.textContent = "Você está a " + formatarDistancia(distanciaAteVoce) + " do ponto de embarque, " + emb.nome + ".";
  }
}
function aoReceberPosicao(posicao) {
  posicaoUsuario = [posicao.coords.latitude, posicao.coords.longitude];
  atualizarDistanciaDoEmbarque(); mostrarVoceNoMapa();
  if (mapa && !dados && !centralizouNaPessoa && !perto.centro) { mapa.setView(posicaoUsuario, 15); centralizouNaPessoa = true; }
  avisarProximidade();
  if (categoriaPendente) { const p = categoriaPendente; categoriaPendente = null; pedirPerto(p, true); }
  if (distanciaAteVoce === null) return;
  let faixa = null;
  if (distanciaAteVoce <= 50) faixa = 50; else if (distanciaAteVoce <= 200) faixa = 200; else if (distanciaAteVoce <= 500) faixa = 500;
  if (faixa !== null && (ultimoLimiar === null || faixa < ultimoLimiar)) {
    ultimoLimiar = faixa; const emb = embarqueAtual();
    avisar(faixa === 50 ? "Você chegou ao ponto de embarque, " + emb.nome + "." : "Você está a menos de " + faixa + " metros do embarque.");
    if (faixa === 50) vibrar([300, 120, 300]);
  }
}
function ligarLocalizacao(silencioso) {
  if (!navigator.geolocation) { avisar("Navegador sem localização."); return; }
  const emb = embarqueAtual();
  if (idLocal !== null) {
    navigator.geolocation.clearWatch(idLocal); idLocal = null; posicaoUsuario = null; distanciaAteVoce = null; ultimoLimiar = null; ultimaDistanciaMostrada = null; centralizouNaPessoa = false;
    if (marcadorVoce) { marcadorVoce.remove(); marcadorVoce = null; }
    atualizarBotaoLocal();
    const textoLocal = pegar("#textoLocal"); if (textoLocal) textoLocal.textContent = "Localização desligada." + (emb ? " Embarque: " + emb.nome + "." : "");
    avisar("Localização desligada."); return;
  }
  if (!silencioso) avisar("Ligando localização. Permita no navegador.");
  idLocal = navigator.geolocation.watchPosition(aoReceberPosicao, () => {
    if (idLocal !== null) navigator.geolocation.clearWatch(idLocal); idLocal = null; atualizarBotaoLocal();
    avisar("Não consegui localização. Permita no navegador." + (emb ? " Embarque: " + emb.nome + "." : ""));
  }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
  atualizarBotaoLocal();
}
function textoEmbarque() {
  if (!destinoAtual) return "Escolha um destino primeiro.";
  const emb = embarqueAtual();
  let f = "Para " + destinoAtual.nome + ", você escolheu " + emb.nome + ". " + emb.instrucao + " Percurso: " + emb.rota + " Paradas: " + (emb.paradas ? emb.paradas.join("; ") : "") + ". Desça: " + emb.ondeDescer;
  if (emb.gratuidade) f += " Tem gratuidade para PCD.";
  if (emb.sustentabilidade) f += " " + emb.sustentabilidade;
  if (distanciaAteVoce !== null) f += " Você está a " + formatarDistancia(distanciaAteVoce) + " do embarque.";
  return f;
}
function falarLocalizacao() {
  if (idLocal === null) { ligarLocalizacao(); return; }
  if (!posicaoUsuario) { avisar("Buscando localização..."); return; }
  atualizarDistanciaDoEmbarque();
  let f = pegar("#textoLocal") ? pegar("#textoLocal").textContent : "";
  if (destinoAtual) f += " " + proximoHorarioDe(embarqueAtual()).texto;
  avisar(f);
}

/* ---------- 10) Painel, rota, paradas, perto (~linha 790) ---------- */
let destinoAtual = null, dados = null, relogioDoTempo = null, numeroDaEscolha = 0, ultimoMinuto = 0;
function minutosQueFaltam() { return Math.max(1, Math.ceil(dados.segundosAteChegar / 60)); }
function textoAcessibilidade() { if (!destinoAtual) return "Escolha um destino."; const emb = embarqueAtual(); return "Acessibilidade do embarque " + emb.nome + ". " + emb.acessibilidade; }
function mostrarAba(nome) {
  ["Onibus", "Rota", "Perto", "Assistente"].forEach(aba => { const el = pegar("#aba" + aba); if (el) el.hidden = aba !== nome; });
  document.querySelectorAll(".botao-aba").forEach(b => b.setAttribute("aria-current", b.dataset.aba === nome ? "true" : "false"));
}
function textoAssento() { if (window.CameraMobintec) return window.CameraMobintec.textoAssentos(); return "Sem leitura atual de assentos."; }
function textoRota() { if (!destinoAtual || !dados) return "Escolha um destino."; const emb = embarqueAtual(); return destinoAtual.servico + ": de " + emb.nome + " até " + destinoAtual.nome + ", " + formatarDistancia(dados.distancia) + ", cerca de " + Math.round(dados.duracao / 60) + " min."; }
const CATEGORIAS = { hoteis: { nome: "hotéis", sigla: "H", filtro: '["tourism"~"hotel|hostel|guest_house|motel|apartment"]' }, restaurantes: { nome: "restaurantes", sigla: "R", filtro: '["amenity"~"restaurant|cafe|fast_food|bar"]' }, atracoes: { nome: "pontos turísticos", sigla: "T", filtro: '["tourism"~"attraction|museum|viewpoint|zoo|theme_park|gallery"]' } };
let perto = { categoria: "hoteis", nome: "hotéis", referencia: "", centro: null, lista: [] };
function categoriaNoTexto(texto) {
  const t = semAcento(texto);
  if (/restaurante|comer|fome|almoc|jantar|lanche|cafe/.test(t)) return "restaurantes";
  if (/hotel|hoteis|hospedag|dormir|pousada/.test(t)) return "hoteis";
  if (/ponto turistico|pontos turisticos|atracao|atracoes|museu|mirante|o que fazer/.test(t)) return "atracoes";
  return null;
}
let numeroDaBusca = 0;
function textoPerto() {
  if (perto.lista.length === 0) return "Não encontrei " + perto.nome + " perto de " + perto.referencia + ".";
  return "Perto de " + perto.referencia + ", " + perto.nome + ": " + perto.lista.map(l => l.nome + ", a " + formatarDistancia(l.distancia)).join("; ") + ".";
}
function frasePrincipal(comAssentos) {
  if (!dados || !destinoAtual) return "Escolha um destino.";
  let quando = "chegou ao embarque";
  if (dados.segundosAteChegar > 0) { const m = minutosQueFaltam(); quando = "chegando em " + m + (m > 1 ? " minutos" : " minuto"); }
  const f = destinoAtual.servico + " " + quando + ".";
  return comAssentos ? f + " " + textoAssento() : f;
}
async function buscarRota(origem, destino) {
  try {
    const res = await fetch("https://router.project-osrm.org/route/v1/driving/" + origem[1] + "," + origem[0] + ";" + destino[1] + "," + destino[0] + "?overview=full&geometries=geojson");
    const json = await res.json(); const rota = json.routes[0];
    return { pontos: rota.geometry.coordinates.map(p => [p[1], p[0]]), duracao: rota.duration, distancia: rota.distance };
  } catch (e) {
    const m = distanciaEntre(origem, destino); return { pontos: [origem, destino], duracao: Math.max(60, m / 8), distancia: m };
  }
}
function posicaoDoOnibus() {
  const parte = dados.segundosAteChegar / dados.duracao, idx = Math.round(parte * (dados.pontos.length - 1));
  return dados.pontos[Math.min(dados.pontos.length - 1, Math.max(0, idx))];
}
function desenharRotaNoMapa() {
  if (!mapa || !dados || !destinoAtual) return;
  camada.clearLayers(); L.polyline(dados.pontos, { color: corDaRota(), weight: 6 }).addTo(camada);
  const emb = embarqueAtual();
  if (emb) L.marker(emb.posicao, { icon: criarPino("E", "#ffffff", "#0d0a0b", 30), keyboard: false }).addTo(camada);
  L.marker(destinoAtual.posicao, { icon: criarPino(destinoAtual.sigla, "#8b1f2f", "#ffffff", 36), keyboard: false }).addTo(camada);
  marcadorOnibus = L.marker(posicaoDoOnibus(), { icon: criarPino(destinoAtual.sigla, "#ffffff", "#0d0a0b", 46), keyboard: false }).addTo(camada);
  const limites = L.polyline(dados.pontos).getBounds(); if (posicaoUsuario) limites.extend(posicaoUsuario);
  mapa.fitBounds(limites, { padding: [30, 30] });
}
function desenharPerto() {
  if (!mapa) return; camadaPerto.clearLayers();
  perto.lista.forEach(l => L.marker(l.posicao, { icon: criarPino(CATEGORIAS[perto.categoria].sigla, "#ffffff", "#0d0a0b", 30), keyboard: false }).addTo(camadaPerto));
  if (perto.centro) {
    const limites = L.latLngBounds([perto.centro]); perto.lista.forEach(l => limites.extend(l.posicao));
    L.marker(perto.centro, { icon: criarPino("★", "#8b1f2f", "#ffffff", 36), keyboard: false }).addTo(camadaPerto);
    mapa.fitBounds(limites, { padding: [40, 40], maxZoom: 16 });
  }
}
let paradas = [], paradasAvisadas = {}, chegandoAvisado = false;
function proximoHorarioDe(embarque) {
  if (!embarque || !embarque.horarios || embarque.horarios.length === 0) return { texto: "Horários a confirmar.", minutos: null, hora: null };
  const agora = new Date(), agoraMin = agora.getHours() * 60 + agora.getMinutes();
  const emMinutos = embarque.horarios.map(h => { const p = h.hora.split(":"); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); });
  let escolhido = null, faltam = null;
  for (let i = 0; i < emMinutos.length; i++) {
    if (emMinutos[i] > agoraMin) { escolhido = embarque.horarios[i].hora; faltam = emMinutos[i] - agoraMin; break; }
  }
  const aviso = embarque.horariosSimulados ? " (Horário de demonstração)" : "";
  if (escolhido === null) return { texto: "Partidas de hoje passaram. Primeira de amanhã: " + embarque.horarios[0].hora + aviso, minutos: null, hora: null };
  let tempo = faltam < 60 ? "faltam " + faltam + (faltam === 1 ? " minuto" : " minutos") : "faltam " + Math.floor(faltam / 60) + (Math.floor(faltam / 60) === 1 ? " hora" : " horas") + (faltam % 60 > 0 ? " e " + (faltam % 60) + " minutos" : "");
  return { texto: "Próxima partida às " + escolhido + ", " + tempo + aviso, minutos: faltam, hora: escolhido };
}
function textoTransporte() {
  if (!destinoAtual) return "Escolha um destino.";
  const emb = embarqueAtual(), lista = emb.horarios ? emb.horarios.map(h => h.hora).join(", ") : "a confirmar";
  let t = destinoAtual.servico + ". Embarque: " + emb.nome + ". " + emb.instrucao + " Percurso: " + emb.rota + " " + proximoHorarioDe(emb).texto + " Partidas: " + lista + ". Desça: " + emb.ondeDescer + " ";
  t += emb.gratuidade ? "Gratuidade para PCD. " + emb.preco + " " : "Preço: " + emb.preco + " ";
  if (emb.sustentabilidade) t += emb.sustentabilidade + " ";
  return t + "Operadora: " + emb.operadora + ". Contato: " + emb.contato + ".";
}
function textoParadas() {
  if (paradas.length === 0) return "Nenhuma parada encontrada nos dados do mapa.";
  return "Há " + paradas.length + " paradas até " + destinoAtual.nome + ". Primeiras: " + paradas.slice(0, 5).map(p => p.nome).join("; ") + (paradas.length > 5 ? ", e outras." : ".");
}
async function buscarParadas() {
  const minha = numeroDaEscolha; paradas = []; paradasAvisadas = {}; chegandoAvisado = false;
  const txt = pegar("#textoParadas"); if (txt) txt.textContent = "Procurando paradas…";
  const listaEl = pegar("#listaParadas"); if (listaEl) listaEl.replaceChildren();
  try {
    const lats = dados.pontos.map(p => p[0]), lons = dados.pontos.map(p => p[1]), margem = 0.002;
    const caixa = [Math.min(...lats) - margem, Math.min(...lons) - margem, Math.max(...lats) + margem, Math.max(...lons) + margem].join(",");
    const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: new URLSearchParams({ data: '[out:json][timeout:20];node["highway"="bus_stop"](' + caixa + ');out 600;' }) });
    const json = await res.json(); if (minha !== numeroDaEscolha) return;
    const achadas = [];
    json.elements.forEach(item => {
      let menor = Infinity, ordem = 0;
      dados.pontos.forEach((p, i) => { const d = distanciaEntre(p, [item.lat, item.lon]); if (d < menor) { menor = d; ordem = i; } });
      if (menor <= 100) achadas.push({ nome: (item.tags && item.tags.name) || "parada sem nome", posicao: [item.lat, item.lon], ordem });
    });
    achadas.sort((a, b) => a.ordem - b.ordem); paradas = achadas.slice(0, 40);
  } catch (e) { if (minha !== numeroDaEscolha) return; paradas = []; }
  const itens = paradas.slice(0, 8).map(p => { const el = document.createElement("li"); el.textContent = p.nome; return el; });
  if (listaEl) listaEl.replaceChildren(...itens);
  if (txt) txt.textContent = paradas.length === 0 ? "Nenhuma parada encontrada." : paradas.length + " paradas no caminho" + (paradas.length > 8 ? " (mostrando 8)." : ".");
}
function avisarProximidade() {
  if (!destinoAtual || !posicaoUsuario) return;
  if (distanciaEntre(posicaoUsuario, destinoAtual.posicao) <= 300 && !chegandoAvisado) { chegandoAvisado = true; avisar("Você está chegando em " + destinoAtual.nome + "."); return; }
  for (let i = 0; i < paradas.length; i++) {
    if (!paradasAvisadas[i] && distanciaEntre(posicaoUsuario, paradas[i].posicao) <= 100) {
      paradasAvisadas[i] = true; avisar("Parada " + paradas[i].nome + ", a " + formatarDistancia(distanciaEntre(posicaoUsuario, paradas[i].posicao)) + "."); return;
    }
  }
}
function desenharPainel() {
  if (!dados) return;
  const tempo = pegar("#tempo"); if (tempo) tempo.textContent = dados.segundosAteChegar > 0 ? minutosQueFaltam() + " min" : "Chegou";
  const barra = pegar("#barra"); if (barra) barra.style.width = Math.round(Math.min(1, Math.max(0, 1 - dados.segundosAteChegar / dados.segundosIniciais)) * 100) + "%";
}
function anunciarStatus(prefixo, comAssentos) {
  desenharPainel(); const f = (prefixo ? prefixo + " " : "") + frasePrincipal(comAssentos);
  const alerta = pegar("#alerta"); if (alerta) { alerta.textContent = ""; setTimeout(() => alerta.textContent = f, 40); }
  falar(f);
  if (dados.segundosAteChegar === 0) vibrar([400, 150, 400]); else if (prefixo) vibrar([200, 100, 200]); else vibrar(80);
}
async function escolherDestino(indice) {
  const destino = DESTINOS[indice];
  if (destino.embarques.length > 1 && !destino.embarqueEscolhido) { destacarBolha(destino); mostrarOpcoesDeEmbarque(destino); return; }
  if (!destino.embarqueEscolhido) destino.embarqueEscolhido = destino.embarques[0];
  iniciarAcompanhamento(destino);
}
async function escolherDestinoComEmbarque(indice) {
  clearInterval(relogioDoTempo); numeroDaEscolha++; const minha = numeroDaEscolha; destinoAtual = DESTINOS[indice];
  ultimoLimiar = null; ultimaDistanciaMostrada = null; chegandoAvisado = false; paradasAvisadas = {}; atualizarDistanciaDoEmbarque();
  const emb = embarqueAtual();
  const titulo = pegar("#tituloPainel"); if (titulo) titulo.textContent = destinoAtual.servico + " · " + destinoAtual.nome;
  const rotaTxt = pegar("#textoRota"); if (rotaTxt) rotaTxt.textContent = "Calculando rota…";
  const hoteis = pegar("#listaHoteis"); if (hoteis) hoteis.replaceChildren();
  const painel = pegar("#painel"); if (painel) mostrar(painel, true);
  if (mapa && camada) camada.clearLayers();
  const rota = await buscarRota(emb.posicao, destinoAtual.posicao); if (minha !== numeroDaEscolha) return;
  dados = { pontos: rota.pontos, duracao: Math.max(60, rota.duracao), distancia: rota.distancia, segundosAteChegar: Math.min(Math.max(60, rota.duracao), 240 + sortear(120)) };
  dados.segundosIniciais = dados.segundosAteChegar; ultimoMinuto = minutosQueFaltam();
  desenharRotaNoMapa();
  const rTxt = pegar("#textoRota"); if (rTxt) rTxt.textContent = textoRota();
  const dTxt = pegar("#textoDestino"); if (dTxt) dTxt.textContent = destinoAtual.descricao;
  const aTxt = pegar("#textoAcessibilidade"); if (aTxt) aTxt.textContent = textoAcessibilidade();
  const cTxt = pegar("#textoConfirmar"); if (cTxt) cTxt.textContent = "A confirmar: " + destinoAtual.aConfirmar.join("; ") + ".";
  const tTxt = pegar("#textoTransporte"); if (tTxt) tTxt.textContent = textoTransporte();
  mostrarAba("Onibus"); desenharPainel();
  const link = pegar("#linkMaps"); if (link) link.href = "https://www.google.com/maps/dir/?api=1&destination=" + emb.posicao[0] + "," + emb.posicao[1] + "&travelmode=walking";
  if (titulo) titulo.focus();
  if (navigator.wakeLock) navigator.wakeLock.request("screen").catch(() => {});
  relogioDoTempo = setInterval(passarTempo, 1000); buscarPerto("hoteis"); buscarParadas();
}
function passarTempo() {
  if (!dados) return;
  dados.segundosAteChegar = Math.max(0, dados.segundosAteChegar - VELOCIDADE_TESTE);
  if (marcadorOnibus) marcadorOnibus.setLatLng(posicaoDoOnibus());
  if (dados.segundosAteChegar === 0) { clearInterval(relogioDoTempo); anunciarStatus(""); }
  else if (minutosQueFaltam() !== ultimoMinuto) { ultimoMinuto = minutosQueFaltam(); anunciarStatus(""); }
  else desenharPainel();
}
async function buscarPerto(categoria, base) {
  const tipo = CATEGORIAS[categoria];
  document.querySelectorAll(".botao-cat").forEach(b => b.setAttribute("aria-current", b.dataset.cat === categoria ? "true" : "false"));
  const centro = base ? base.posicao : (posicaoUsuario || (destinoAtual ? destinoAtual.posicao : null)); if (!centro) return false;
  const minha = numeroDaBusca + 1; numeroDaBusca = minha;
  perto = { categoria, nome: tipo.nome, referencia: base ? base.nome : (posicaoUsuario ? "você" : destinoAtual.nome), centro: base ? base.posicao : null, lista: [] };
  const txt = pegar("#textoPerto"); if (txt) txt.textContent = "Procurando " + tipo.nome + " perto de " + perto.referencia + "…";
  const lista = [];
  try {
    const raio = !base && posicaoUsuario ? 3000 : 5000;
    const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: new URLSearchParams({ data: "[out:json][timeout:15];nwr" + tipo.filtro + '["name"](around:' + raio + "," + centro[0] + "," + centro[1] + ");out center 40;" }) });
    const json = await res.json();
    for (const item of json.elements) {
      const p = item.center ? [item.center.lat, item.center.lon] : [item.lat, item.lon];
      if (p[0] && item.tags && item.tags.name) lista.push({ nome: item.tags.name, posicao: p, distancia: distanciaEntre(centro, p) });
    }
    lista.sort((a, b) => a.distancia - b.distancia);
  } catch (e) { lista.length = 0; }
  if (minha !== numeroDaBusca) return false;
  perto.lista = lista.slice(0, 4);
  const itens = perto.lista.map(l => { const el = document.createElement("li"); el.textContent = l.nome + " · " + formatarDistancia(l.distancia); return el; });
  if (itens.length === 0) { const v = document.createElement("li"); v.textContent = "Nenhum resultado."; itens.push(v); }
  const hoteis = pegar("#listaHoteis"); if (hoteis) hoteis.replaceChildren(...itens);
  if (txt) txt.textContent = "Mostrando " + tipo.nome + " perto de " + perto.referencia + ".";
  desenharPerto(); return true;
}
async function pedirPertoDe(destino, categoria) {
  destacarBolha(destino); if (pegar("#telaMapa") && pegar("#telaMapa").hidden) abrirTela("mapa", true);
  avisar("Procurando " + CATEGORIAS[categoria].nome + " perto de " + destino.nome + "…");
  const achou = await buscarPerto(categoria, destino); if (achou) avisar(textoPerto());
}
let categoriaPendente = null;
async function pedirPerto(categoria, ficarNaTela) {
  if (!ficarNaTela && pegar("#telaMapa") && pegar("#telaMapa").hidden) abrirTela("mapa", true);
  if (!posicaoUsuario && !destinoAtual) {
    categoriaPendente = categoria; if (idLocal === null) ligarLocalizacao(true);
    avisar("Ligando localização para procurar " + CATEGORIAS[categoria].nome + " perto de você."); return;
  }
  if (destinoAtual && ficarNaTela) mostrarAba("Perto");
  avisar("Procurando " + CATEGORIAS[categoria].nome + "…");
  const achou = await buscarPerto(categoria); if (achou) avisar(textoPerto());
}

/* ---------- 11) Botões e inicialização (~linha 960) ---------- */
function adicionarEvento(seletor, evento, funcao) {
  const el = document.querySelector(seletor);
  if (el) el.addEventListener(evento, funcao);
}

DESTINOS.forEach((destino, i) => {
  const bolha = document.createElement("button");
  bolha.className = "bolha b" + (i + 1);
  bolha.setAttribute("aria-label", "Escolher " + destino.nome);
  bolha.innerHTML = '<span class="foto" aria-hidden="true"></span><span class="nome"></span>';
  const foto = bolha.querySelector(".foto"); if (foto) foto.style.backgroundImage = "url(" + destino.foto + ")";
  const nome = bolha.querySelector(".nome"); if (nome) nome.textContent = destino.nome;
  bolha.onclick = () => irParaDestino(destino, false);
  const bolhas = pegar("#bolhas"); if (bolhas) bolhas.appendChild(bolha);

  const cartao = document.createElement("li"); cartao.className = "cartao";
  cartao.innerHTML = '<h3 class="font-serif text-3xl"></h3><p class="pilula"></p><button class="botao botao-forte">Acompanhar o ônibus</button>';
  const h3 = cartao.querySelector("h3"); if (h3) h3.textContent = destino.nome;
  const p = cartao.querySelector("p"); if (p) p.textContent = destino.servico;
  const btn = cartao.querySelector("button");
  if (btn) { btn.setAttribute("aria-label", "Acompanhar o " + destino.servico + " até " + destino.nome); btn.onclick = () => escolherDestino(i); }
  const cartoes = pegar("#cartoes"); if (cartoes) cartoes.appendChild(cartao);
});

adicionarEvento("#botaoModoVisual", "click", () => escolherModo('visual'));
adicionarEvento("#botaoModoAcessivel", "click", () => escolherModo('acessivel'));
adicionarEvento("#botaoMicrofone", "click", () => tocarMicrofone(pegar("#botaoMicrofone")));
adicionarEvento("#botaoMicrofoneAcessivel", "click", () => tocarMicrofone(pegar("#botaoMicrofoneAcessivel")));
adicionarEvento("#botaoPerguntar", "click", () => tocarMicrofone(pegar("#botaoPerguntar")));
adicionarEvento("#botaoPerguntarPainel", "click", () => tocarMicrofone(pegar("#botaoPerguntarPainel")));

document.querySelectorAll(".botao-aba").forEach(botao => {
  botao.addEventListener("click", () => {
    if (!dados) return; mostrarAba(botao.dataset.aba);
    const falas = { Onibus: frasePrincipal, Rota: textoRota, Perto: textoPerto, Assistente: () => "Toque no microfone e pergunte o que quiser." };
    avisar(falas[botao.dataset.aba]());
  });
});
document.querySelectorAll(".botao-cat").forEach(botao => { botao.addEventListener("click", () => pedirPerto(botao.dataset.cat, true)); });

adicionarEvento("#botaoAbrirMapa", "click", () => abrirTela("mapa"));
adicionarEvento("#botaoVoltarMapa", "click", voltar);
adicionarEvento("#botaoLocal", "click", ligarLocalizacao);
adicionarEvento("#botaoOpcoes", "click", () => abrirTela("opcoes"));
adicionarEvento("#botaoVoltarOpcoes", "click", voltar);
adicionarEvento("#botaoVoltar", "click", voltar);
adicionarEvento("#botaoVoltarModo", "click", () => {
  document.body.classList.remove('modo-visual', 'modo-acessivel');
  mostrar(pegar("#telaAcessivel"), false);
  mostrar(pegar("#telaInicio"), false);
  mostrar(pegar("#telaEscolhaModo"), true);
});
adicionarEvento("#botaoRepetir", "click", repetirUltima);
adicionarEvento("#botaoVoz", "click", () => definirVoz(!vozLigada, true));
adicionarEvento("#botaoTema", "click", () => aplicarTema(!document.body.classList.contains("claro"), true));

let temaSalvo = null, vozSalva = null;
try { temaSalvo = localStorage.getItem("mobintecTema"); vozSalva = localStorage.getItem("mobintecVoz"); velocidadeVoz = Number(localStorage.getItem("mobintecVelocidade")) || 1; } catch (e) {}
aplicarTema(temaSalvo ? temaSalvo === "claro" : false, false);
definirVoz(vozSalva !== "desligada", false);

adicionarEvento("#botaoAjuda", "click", () => avisar(TEXTO_AJUDA));
adicionarEvento("#botaoOuvirStatus", "click", () => { if (dados) anunciarStatus("", true); });
adicionarEvento("#botaoOuvirParadas", "click", () => { if (dados) avisar(textoParadas()); });
adicionarEvento("#botaoOuvirHoteis", "click", () => { if (dados) avisar(textoPerto()); });

adicionarEvento("#formulario", "submit", e => { e.preventDefault(); const c = pegar("#campoTexto"); if (c && c.value.trim()) { responder(c.value); c.value = ""; } });
adicionarEvento("#formularioAba", "submit", e => { e.preventDefault(); const c = pegar("#campoAba"); if (c && c.value.trim()) { responder(c.value); c.value = ""; } });
adicionarEvento("#formularioPainel", "submit", e => { e.preventDefault(); const c = pegar("#campoPainel"); if (c && c.value.trim()) { responder(c.value); c.value = ""; } });

/* Atalhos: acionam o microfone da tela atual (sem chat) */
function microfoneDaTela() {
  const acessivel = pegar("#telaAcessivel");
  if (acessivel && !acessivel.hidden) return pegar("#botaoMicrofoneAcessivel");
  const inicio = pegar("#telaInicio");
  if (inicio && !inicio.hidden) return pegar("#botaoMicrofone");
  return pegar("#botaoPerguntarPainel") || pegar("#botaoMicrofone");
}
adicionarEvento("#atalhoFalar", "click", () => { const m = microfoneDaTela(); if (m) tocarMicrofone(m); });
document.addEventListener("keydown", e => {
  if (e.altKey && (e.key === "v" || e.key === "V" || e.key === "a" || e.key === "A")) {
    e.preventDefault(); const m = microfoneDaTela(); if (m) tocarMicrofone(m);
  }
});

let instrucaoFalada = false;
function falarInstrucaoInicial(e) {
  if (instrucaoFalada) return; instrucaoFalada = true;
  if (e && e.target && e.target.closest && e.target.closest("button, input, select, textarea, a")) return;
  falar("Para falar com a assistente, toque no microfone, ou aperte Alt mais V.", true);
}
document.addEventListener("pointerdown", falarInstrucaoInicial, { once: true });
document.addEventListener("keydown", falarInstrucaoInicial, { once: true });

/* Toque em espaço vazio: só nas telas que têm microfone (nunca na escolha de modo) */
let tocarEmQualquerLugar = true;
document.addEventListener("click", e => {
  const inicio = pegar("#telaInicio");
  const acessivel = pegar("#telaAcessivel");
  const naTelaCerta = (inicio && !inicio.hidden) || (acessivel && !acessivel.hidden);
  const tocou = e.target.closest("button, input, select, textarea, label, a, form");
  if (tocarEmQualquerLugar && naTelaCerta && !tocou) tocarMicrofone(microfoneDaTela());
});

const navegador = navigator.userAgent;
if (/(Instagram|FBAN|FBAV|FB_IAB|WhatsApp|TikTok|; wv)/i.test(navegador)) {
  const aviso = pegar("#aviso"); if (aviso) { mostrar(aviso, true); aviso.textContent = "Abra no navegador (Chrome/Safari) para a voz funcionar."; }
} else if (!ReconhecimentoDoNavegador) {
  const aviso = pegar("#aviso"); if (aviso) { mostrar(aviso, true); aviso.textContent = "Navegador sem voz própria. O site baixará ~40MB na primeira vez."; }
}

window.addEventListener("popstate", () => { const tela = (history.state && history.state.tela) || "inicio"; abrirTela(tela, false, true); });

const linkPular = document.querySelector("a.pular");
if (linkPular) {
  linkPular.addEventListener("click", e => { e.preventDefault(); const principal = pegar("#principal"); if (principal) principal.focus(); });
}

/* Inicialização: só a escolha de modo aparece */
mostrar(pegar("#telaEscolhaModo"), false);
mostrar(pegar("#telaInicio"), false);
mostrar(pegar("#telaAcessivel"), false);
mostrar(pegar("#telaOpcoes"), false);
mostrar(pegar("#telaLista"), false);
mostrar(pegar("#telaMapa"), false);
mostrar(pegar("#telaEscolhaModo"), true);
setTimeout(() => falar(BOAS_VINDAS), 600);
