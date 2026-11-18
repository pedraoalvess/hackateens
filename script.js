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
const URL_DA_IA = "https://mobintec-ia.pdeoliveiraalves840.workers.dev/";


const BOAS_VINDAS = "Bem-vindo ao Mobintec. Toque em qualquer lugar da tela e converse comigo. " +
    "Você pode pedir o ônibus de um destino, procurar hotéis e restaurantes perto de você, abrir o mapa e perguntar o que quiser. " +
    "Se você usa leitor de tela, toque duas vezes no botão do microfone.";

const TEXTO_AJUDA = "Você pode conversar comigo normalmente. Por exemplo: quero falar com a assistente; voltar aos pontos turísticos; quero ir para as Cataratas; tem restaurante perto de mim; " +
    "abre o mapa; quando o ônibus chega; tem assento livre; como é a acessibilidade; quais as paradas; qual o horário; onde estou. " +
    "Para os assentos: ler os assentos com a câmera do celular, ver a câmera do ônibus ou parar a câmera. " +
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

let ultimaFala = ""; // guarda a última mensagem, para o botão "Repetir"
let velocidadeVoz = 1;
let vozLigada = true; // false = o site não fala (bom para quem já usa leitor de tela)    // 1 = normal

// O site fala o texto em voz alta (se o navegador tiver voz).
function falar(texto, naFila, aoTerminar) {
    ultimaFala = texto;
    if (!vozLigada || !window.speechSynthesis) {
        if (aoTerminar) { setTimeout(aoTerminar, 0); } // sem voz: faz a ação logo
        return;
    }
    if (!naFila) {
        window.speechSynthesis.cancel(); // corta a fala anterior
    }
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = "pt-BR";
    fala.rate = velocidadeVoz;
    if (aoTerminar) {
        let feito = false;
        const terminar = function() {
            if (!feito) {
                feito = true;
                aoTerminar();
            }
        };
        fala.onend = terminar;
        fala.onerror = terminar;
        setTimeout(terminar, 12000); // garantia: se o navegador não avisar que terminou
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
    // Também mostra na conversa flutuante (disponível em todas as telas).
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
        const audio = new(window.AudioContext || window.webkitAudioContext)();
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
    numeroDaEscolha = numeroDaEscolha + 1; // ignora respostas atrasadas
    destinoAtual = null;
    dados = null;
    mostrar(pegar("#painel"), false);
}

// Volta ao início. Funciona também com o botão "voltar" do aparelho.
function voltar() {
    const alvo = pegar("#telaMapa").hidden ? "inicio" : "lista"; // do mapa volta para os ônibus; dos ônibus, para o início
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

    // Painel da câmera de assentos: aparece nas Opções e na aba Ônibus. Nas outras telas a câmera é desligada.
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
                history.pushState({ tela: nome }, ""); // para o botão "voltar" do aparelho funcionar
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
        if (idLocal === null) { ligarLocalizacao(silencioso); } else if (!silencioso) { falar("Mapa. " + pegar("#textoLocal").textContent); }
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

let mapa = null; // o mapa
let camada = null; // desenhos da rota atual
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

// O mesmo mapa aparece na tela do ônibus ("#slotMapaOnibus") e na tela do mapa ("#slotMapaTela").
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
    mapa.setView(EMBARQUE.posicao, 11);

    // Mapa de fundo (muda com o tema). Se o da Esri falhar, usa o OpenStreetMap.
    trocarFundoDoMapa();

    camada = L.layerGroup().addTo(mapa);
    camadaPerto = L.layerGroup().addTo(mapa);

    // Pino do embarque e um pino para cada destino.
    L.marker(EMBARQUE.posicao, { icon: criarPino("E", "#ffffff", "#0d0a0b", 36), keyboard: false }).addTo(mapa);
    DESTINOS.forEach(function(destino, indice) {
        const pino = L.marker(destino.posicao, { icon: criarPino(destino.sigla, "#8b1f2f", "#ffffff", 36), keyboard: false });
        pino.on("click", function() { escolherDestino(indice); });
        pino.addTo(mapa);
    });
    setTimeout(function() { mapa.invalidateSize(); }, 60);
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
    const camadaEsri = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/" + estilo + "/MapServer/tile/{z}/{y}/{x}", { maxZoom: 16 });
    camadaEsri.once("tileerror", function() {
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
    botao.setAttribute("aria-label", ligada ?
        "Voz do site ligada. Toque para desligar. Desligue se você já usa um leitor de tela." :
        "Voz do site desligada. Toque para ligar.");
    try { localStorage.setItem("mobintecVoz", ligada ? "ligada" : "desligada"); } catch (e) {}
    if (anunciar) {
        pegar("#textoEstado").textContent = ligada ? "Voz do site ligada." : "Voz do site desligada. Os avisos continuam escritos na tela.";
        falar("Voz do site ligada."); // só fala se ela estiver ligada
    }
}

// Repete a última mensagem: falando, ou só escrevendo se a voz do site estiver desligada.
function repetirUltima() {
    // Se a última fala tinha a leitura dos assentos, confere de novo se ela ainda vale antes de repetir.
    if (window.CameraMobintec && window.CameraMobintec.ehMensagemDaCamera(ultimaFala)) {
        window.CameraMobintec.ouvir();
        return;
    }
    if (vozLigada) {
        falar(ultimaFala);
        return;
    }
    const estado = pegar("#textoEstado");
    estado.textContent = "";
    setTimeout(function() { estado.textContent = ultimaFala; }, 40); // texto novo faz o leitor de tela ler
}

// Tema claro ou escuro (fica salvo no aparelho).
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
let usarModeloProprio = !ReconhecimentoDoNavegador; // true = usa o plano B (Whisper)

let reconhecimento = null; // reconhecimento de voz do navegador
let ouvindo = false;
let iniciando = false; // evita dois toques seguidos criarem dois reconhecimentos
let entendeu = false; // já entendi o que a pessoa disse?

let gravador = null; // plano B: gravador de áudio
let fluxoDoMicrofone = null;
let gravando = false;
let processando = false;
let gravacaoCancelada = false;
let transcritor = null; // plano B: modelo que transforma voz em texto

// Para tudo o que estiver ouvindo ou gravando.
// Destaca a bolha do destino entendido (ela cresce e pulsa) e apaga as outras.
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

// Chamado quando a pessoa toca no microfone (ou em qualquer lugar da tela inicial).
// Modo conversa por voz: depois que a IA responde falando, o microfone liga sozinho de novo.
let modoConversa = false;
let botaoDaConversa = null;

function tocarMicrofone(botao, automatico) {
    if (!automatico) {
        if (ouvindo) { modoConversa = false; } else { modoConversa = true;
            botaoDaConversa = botao; }
    }
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
        for (const resultado of evento.results) {
            texto += " " + resultado[0].transcript;
        }
        pegar("#textoOuvido").textContent = texto.trim();

        const ultimo = evento.results[evento.results.length - 1];
        if (acharDestino(texto) || ultimo.isFinal) {
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
            if (!entendeu) {
                avisar("Não entendi. Toque e diga, por exemplo, Cataratas.");
            }
        }
    };

    // Se o navegador não responder em 10 segundos, libera o botão.
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

// Plano B: grava 6 segundos e transforma em texto com o modelo Whisper (roda no próprio aparelho).
// Baixa cerca de 40 MB na primeira vez e depois fica guardado no navegador.
async function ouvirComModeloProprio(botao) {
    if (gravando) {
        gravador.stop(); // segundo toque: termina a gravação antes
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

    gravador.ondataavailable = function(evento) {
        pedacos.push(evento.data);
    };

    gravador.onstop = async function() {
        gravando = false;
        fluxoDoMicrofone.getTracks().forEach(function(faixa) { faixa.stop(); });
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
            const contexto = new(window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
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
        if (esteGravador.state === "recording") {
            esteGravador.stop();
        }
    }, 6000);
}

async function carregarModelo() {
    if (transcritor) {
        return transcritor;
    }
    const biblioteca = await
    import ("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.web.min.js");
    transcritor = await biblioteca.pipeline("automatic-speech-recognition", "Xenova/whisper-tiny", {
        progress_callback: function(progresso) {
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

// A pessoa pediu para abrir, trocar ou parar a câmera? Devolve "celular", "fixa" (câmera do ônibus), "parar" ou null.
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

// Executa o comando de câmera: mostra o painel (aba Ônibus se há destino escolhido; senão, Opções) e começa.
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

// A pessoa perguntou sobre assentos? (a resposta vem só da câmera, nunca de números inventados)
function perguntaSobreAssento(texto) {
    const t = semAcento(texto);
    return /\b(assentos?|poltronas?)\b/.test(t) ||
        (/\blugar(es)?\b/.test(t) && /\b(livres?|vazios?|sentar)\b/.test(t)) ||
        /\blivres?\b/.test(t);
}

// Abre o painel do ônibus do destino.
function irParaDestino(destino, silencioso) {
    destacarBolha(destino);
    if (!silencioso) { avisar("Certo: ônibus para " + destino.nome + "."); }
    setTimeout(function() {
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
    } else if (destinoAtual && dados) {
        if (acao === "ler_paradas") {
            mostrarAba("Rota");
            avisar(textoParadas());
        }
        if (acao === "ler_acessibilidade") {
            mostrarAba("Onibus");
            avisar(textoAcessibilidade());
        }
        if (acao === "ler_transporte") {
            mostrarAba("Onibus");
            avisar(textoTransporte());
        }
    }
}

function responder(texto) {
    registrarConversa("Você", texto);
    pegar("#textoOuvido").textContent = "“" + texto.trim() + "”";

    // Comando de câmera por voz: "ler os assentos com a câmera do celular", "câmera do ônibus", "parar a câmera".
    const comandoCamera = comandoDeCamera(texto);
    if (comandoCamera) {
        executarComandoDeCamera(comandoCamera);
        return;
    }

    // Comandos de voz para navegar entre as telas (funcionam em qualquer momento).
    const tNav = semAcento(texto);
    if (/\b(assistente|ia|inteligencia artificial|chat)\b/.test(tNav) && /\b(falar|conversar|abrir|abre|abra|quero|chamar|chama)\b/.test(tNav) && pegar("#chatFlutuante").hidden) {
        abrirChat(true);
        avisar("Assistente aberta. Pode perguntar o que quiser.");
        return;
    }
    if (/\b(fechar|feche|sair)\b/.test(tNav) && /\b(assistente|chat|conversa)\b/.test(tNav)) {
        abrirChat(false);
        avisar("Assistente fechada.");
        return;
    }
    if (/\b(voltar|volta|retornar|retorna|inicio|comeco)\b/.test(tNav) && /\b(pontos? turisticos?|destinos?|inicio|comeco|tela inicial)\b/.test(tNav)) {
        abrirChat(false);
        voltar();
        avisar("Voltando aos pontos turísticos. Diga para onde quer ir.");
        return;
    }

    // Assistente flutuante aberta: ela funciona como um "ChatGPT" dentro do MOBINTEC.
    // Tudo o que a pessoa fala ou digita ali vai direto para a IA, que responde e, se for o caso, executa a ação.
    if (URL_DA_IA && !pegar("#chatFlutuante").hidden) {
        perguntarParaIA(texto);
        return;
    }

    // 1) Citou um destino? Só abre o ônibus se pediu para ir. Senão, conversa sobre o lugar.
    const destino = acharDestino(texto);
    if (destino) {
        const pedido = categoriaNoTexto(texto); // ex.: "hotéis perto das Cataratas"
        if (pedido) { pedirPertoDe(destino, pedido); return; }
        if (querIrAoDestino(texto)) { irParaDestino(destino, false); return; }
        if (URL_DA_IA) {
            destacarBolha(destino);
            perguntarParaIA(texto);
            return;
        }
        falarSobreDestino(destino);
        return;
    }

    // Pergunta sobre assento: responde só com o que a câmera leu de verdade (ou avisa que ainda não há leitura).
    if (perguntaSobreAssento(texto)) {
        if (destinoAtual && dados) { mostrarAba("Onibus"); }
        avisar(textoAssento());
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
    if (t.includes("opcoes") || t.includes("configurac")) { abrirTela("opcoes"); return; }
    if (t.includes("restaurante") || t.includes("comer") || t.includes("lanche")) { pedirPerto("restaurantes"); return; }
    if (t.includes("ponto turistico") || t.includes("pontos turisticos") || t.includes("atracao") || t.includes("atracoes") || t.includes("passeio")) { pedirPerto("atracoes"); return; }
    if (t.includes("hotel") || t.includes("hoteis") || t.includes("hospedagem") || t.includes("pousada") || t.includes("perto") || t.includes("proxim")) { pedirPerto("hoteis"); return; }

    // 3) Perguntas sobre o ônibus (precisam de um destino já escolhido).
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

// Assistente de IA: conversa livre. O servidor (pasta "ia") guarda a chave e recebe só o texto e o contexto.
// O tempo do ônibus e o assento PCD vêm sempre dos dados do site, a IA só conversa sobre eles.
let conversa = []; // últimas mensagens, para a IA lembrar do assunto

async function perguntarParaIA(texto) {
    pegar("#textoEstado").textContent = "Pensando…";
    pegar("#textoResposta").textContent = "Pensando…";
    // Se a conversa é sobre comer, dormir ou passear, procura esses lugares antes de perguntar à IA.
    const categoria = categoriaNoTexto(texto);
    const citado = acharDestino(texto); // se citou um destino, procura perto dele
    if (categoria && (citado || posicaoUsuario || destinoAtual)) { await buscarPerto(categoria, citado); }

    let contexto = { destino: "nenhum escolhido ainda" };
    if (destinoAtual && dados) {
        contexto = { destino: destinoAtual.nome, descricao: destinoAtual.descricao, servico: destinoAtual.servico, acessibilidade: destinoAtual.acessibilidade, aConfirmar: destinoAtual.aConfirmar, status: frasePrincipal(true), rota: textoRota(), lugaresPerto: textoPerto(), paradas: textoParadas(), transporte: textoTransporte() };
        mostrarAba("Assistente");
    }
    contexto.todosOsDestinos = DESTINOS.map(function(d) {
        return { nome: d.nome, servico: d.servico, descricao: d.descricao, acessibilidade: d.acessibilidade };
    });
    if (perto.lista.length > 0 && !contexto.lugaresPerto) { contexto.lugaresPerto = textoPerto(); }
    if (distanciaAteVoce !== null) { contexto.voceEstaA = formatarDistancia(distanciaAteVoce) + " do ponto de embarque"; }
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
            // Se a pessoa pediu lugares e a IA abre o mapa, a busca roda assim que a localização chegar.
            if (json.acao === "abrir_mapa" && categoria && !posicaoUsuario && !destinoAtual) { categoriaPendente = categoria; }
            executarAcao(json);
            // Continua a conversa por voz: escuta a próxima pergunta.
            if (modoConversa && botaoDaConversa && (!json.acao || json.acao === "nenhuma")) {
                setTimeout(function() { if (modoConversa && !ouvindo && !iniciando) { tocarMicrofone(botaoDaConversa, true); } }, 400);
            }
        });
    } catch (erro) {
        console.warn("Erro da assistente de IA:", erro); // aparece no Console (F12) para ajudar a achar o problema
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

// ---------- Localização em tempo real (só liga quando a pessoa pede) ----------
let idLocal = null; // número da vigilância de posição (null = desligada)
let posicaoUsuario = null; // [latitude, longitude] da pessoa
let ultimoLimiar = null; // último aviso de proximidade já falado
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
    if (mapa && !dados && !centralizouNaPessoa && !perto.centro) { // sem rota aberta: o mapa vai para onde a pessoa está
        mapa.setView(posicaoUsuario, 15);
        centralizouNaPessoa = true;
    }
    avisarProximidade();
    if (categoriaPendente) { // a pessoa pediu lugares perto antes da localização chegar
        const pedido = categoriaPendente;
        categoriaPendente = null;
        pedirPerto(pedido, true);
    }

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

function ligarLocalizacao(silencioso) {
    if (!navigator.geolocation) {
        avisar("Este navegador não tem localização.");
        return;
    }
    if (idLocal !== null) { // já estava ligada: desliga
        navigator.geolocation.clearWatch(idLocal);
        idLocal = null;
        posicaoUsuario = null;
        distanciaAteVoce = null;
        ultimoLimiar = null;
        ultimaDistanciaMostrada = null;
        centralizouNaPessoa = false;
        if (marcadorVoce) {
            marcadorVoce.remove();
            marcadorVoce = null;
        }
        atualizarBotaoLocal();
        pegar("#textoLocal").textContent = "Localização desligada. O ponto de embarque é no " + EMBARQUE.nome + ".";
        avisar("Localização desligada.");
        return;
    }
    if (!silencioso) { avisar("Ligando a localização. Se o navegador perguntar, escolha permitir."); }
    idLocal = navigator.geolocation.watchPosition(aoReceberPosicao, function() {
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

let destinoAtual = null; // destino escolhido
let dados = null; // dados do ônibus: pontos da rota, tempo, assentos, hotéis
let relogioDoTempo = null;
let numeroDaEscolha = 0; // ajuda a ignorar respostas atrasadas de uma escolha antiga
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
    ["Onibus", "Rota", "Perto", "Assistente"].forEach(function(aba) {
        pegar("#aba" + aba).hidden = aba !== nome;
    });
    document.querySelectorAll(".botao-aba").forEach(function(botao) {
        botao.setAttribute("aria-current", botao.dataset.aba === nome ? "true" : "false");
    });
}

// Texto dos assentos: vem SÓ da leitura real da câmera (seção 10 deste arquivo). Sem leitura, avisa que ainda não há.
function textoAssento() {
    if (window.CameraMobintec) {
        return window.CameraMobintec.textoAssentos();
    }
    return "Sem leitura atual de assentos. A câmera ainda não fez uma leitura válida. A disponibilidade do assento PCD não foi verificada.";
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
let perto = { categoria: "hoteis", nome: "hotéis", referencia: "", centro: null, lista: [] };

// Que tipo de lugar a pessoa pediu? (hotéis, restaurantes ou pontos turísticos). Devolve null se nenhum.
function categoriaNoTexto(texto) {
    const t = semAcento(texto);
    if (/restaurante|comer|fome|almoc|jantar|lanche|cafe/.test(t)) { return "restaurantes"; }
    if (/hotel|hoteis|hospedag|dormir|pousada/.test(t)) { return "hoteis"; } // "hoteis" = hotéis sem acento
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

// Frase principal: tempo de chegada. Com comAssentos = true, acrescenta o resultado REAL da câmera (ou o aviso de que não há leitura).
function frasePrincipal(comAssentos) {
    let quando = "chegou ao ponto de embarque";
    if (dados.segundosAteChegar > 0) {
        const minutos = minutosQueFaltam();
        quando = "chegando em " + minutos + (minutos > 1 ? " minutos" : " minuto");
    }
    const frase = destinoAtual.servico + " " + quando + ".";
    return comAssentos ? frase + " " + textoAssento() : frase;
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
        const pontos = rota.geometry.coordinates.map(function(par) { return [par[1], par[0]]; });
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
    if (posicaoUsuario) { limites.extend(posicaoUsuario); } // mostra também onde a pessoa está
    mapa.fitBounds(limites, { padding: [30, 30] });
}

// Desenha no mapa os lugares perto (hotéis, restaurantes ou pontos turísticos).
function desenharPerto() {
    if (!mapa) { return; }
    camadaPerto.clearLayers();
    perto.lista.forEach(function(lugar) {
        L.marker(lugar.posicao, { icon: criarPino(CATEGORIAS[perto.categoria].sigla, "#ffffff", "#0d0a0b", 30), keyboard: false }).addTo(camadaPerto);
    });
    if (perto.centro) { // busca perto de um destino: mostra o destino (estrela) e todos os resultados
        const limites = L.latLngBounds([perto.centro]);
        perto.lista.forEach(function(lugar) { limites.extend(lugar.posicao); });
        L.marker(perto.centro, { icon: criarPino("★", "#8b1f2f", "#ffffff", 36), keyboard: false }).addTo(camadaPerto);
        mapa.fitBounds(limites, { padding: [40, 40], maxZoom: 16 });
    }
}

// ---------- Transporte turístico e paradas da rota ----------
let paradas = []; // paradas de ônibus no caminho (dados do OpenStreetMap, podem estar incompletos)
let paradasAvisadas = {}; // paradas que já foram faladas durante o percurso
let chegandoAvisado = false;

function textoTransporte() {
    return destinoAtual.servico + ". Operadora: " + destinoAtual.operadora + ". Horários: " + destinoAtual.horarios +
        ". Preço: " + destinoAtual.preco + ". Contato: " + destinoAtual.contato + ".";
}

function textoParadas() {
    if (paradas.length === 0) {
        return "Não encontrei paradas desta rota nos dados do mapa. Os pontos de parada ainda precisam ser confirmados com a operadora.";
    }
    const nomes = paradas.slice(0, 5).map(function(parada) { return parada.nome; });
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
        const latitudes = dados.pontos.map(function(ponto) { return ponto[0]; });
        const longitudes = dados.pontos.map(function(ponto) { return ponto[1]; });
        const margem = 0.002;
        const caixa = [Math.min(...latitudes) - margem, Math.min(...longitudes) - margem,
            Math.max(...latitudes) + margem, Math.max(...longitudes) + margem
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
            // Vê qual ponto da rota está mais perto desta parada.
            let menor = Infinity;
            let ordem = 0;
            dados.pontos.forEach(function(ponto, i) {
                const distancia = distanciaEntre(ponto, [item.lat, item.lon]);
                if (distancia < menor) {
                    menor = distancia;
                    ordem = i;
                }
            });
            if (menor <= 100) { // só as que ficam a até 100 metros da rota
                achadas.push({ nome: (item.tags && item.tags.name) || "parada sem nome", posicao: [item.lat, item.lon], ordem: ordem });
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
    pegar("#tempo").textContent = dados.segundosAteChegar > 0 ? minutosQueFaltam() + " min" : "Chegou";
    const feito = 1 - dados.segundosAteChegar / dados.segundosIniciais; // quanto do caminho o ônibus já andou
    pegar("#barra").style.width = Math.round(Math.min(1, Math.max(0, feito)) * 100) + "%";
}

// Anuncia o status: escreve no alerta (leitor de tela), fala e vibra.
// Com comAssentos = true (botão "Ouvir status"), inclui o resultado real da câmera.
function anunciarStatus(prefixo, comAssentos) {
    desenharPainel();
    const frase = (prefixo ? prefixo + " " : "") + frasePrincipal(comAssentos);
    const alerta = pegar("#alerta");
    alerta.textContent = "";
    setTimeout(function() { alerta.textContent = frase; }, 40); // texto novo faz o leitor de tela falar
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
        return; // a pessoa já escolheu outro destino
    }

    dados = {
        pontos: rota.pontos,
        duracao: rota.duracao,
        distancia: rota.distancia,
        segundosAteChegar: Math.min(rota.duracao, 240 + sortear(120)), // simulado: ônibus a 4 a 6 minutos
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
        navigator.wakeLock.request("screen").catch(function() {});
    }

    relogioDoTempo = setInterval(passarTempo, 1000);
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

// Procura hotéis até 5 km do destino (dados do OpenStreetMap).
// Procura lugares de um tipo perto da pessoa (se a localização estiver ligada) ou perto do destino.
// "base" (opcional) é um destino: procura perto dele, e não perto da pessoa.
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
    if (minhaBusca !== numeroDaBusca) { return false; } // a pessoa já pediu outra coisa
    perto.lista = lista.slice(0, 4);

    // Mostra na lista e no mapa.
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

// Quando a pessoa pede (por voz ou botão): procura e lê o resultado.
// "Hotéis perto das Cataratas": procura perto do destino citado e mostra no mapa.
async function pedirPertoDe(destino, categoria) {
    destacarBolha(destino);
    if (pegar("#telaMapa").hidden) { abrirTela("mapa", true); }
    avisar("Procurando " + CATEGORIAS[categoria].nome + " perto de " + destino.nome + "…");
    const achou = await buscarPerto(categoria, destino);
    if (achou) { avisar(textoPerto()); }
}

let categoriaPendente = null; // pedido de lugares que espera a localização da pessoa

async function pedirPerto(categoria, ficarNaTela) {
    if (!ficarNaTela && pegar("#telaMapa").hidden) {
        abrirTela("mapa", true); // lugares perto aparecem na tela do mapa
    }
    if (!posicaoUsuario && !destinoAtual) { // ainda não sei onde a pessoa está: espera a localização
        categoriaPendente = categoria;
        avisar("Ligando a localização para procurar " + CATEGORIAS[categoria].nome + " perto de você. Se o navegador perguntar, escolha permitir.");
        return;
    }
    if (destinoAtual && ficarNaTela) { mostrarAba("Perto"); }
    avisar("Procurando " + CATEGORIAS[categoria].nome + "…");
    const achou = await buscarPerto(categoria);
    if (achou) { avisar(textoPerto()); }
}

/* ---------- 9) Ligações dos botões e início ---------- */

// Botões de destino da tela inicial (alternativa sem voz) e cartões da lista.
DESTINOS.forEach(function(destino, indice) {
    // Bolha do destino (tela inicial): foto transparente + nome.
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
        const falas = { Onibus: frasePrincipal, Rota: textoRota, Perto: textoPerto, Assistente: function() { return "Pergunte por voz ou digite. Por exemplo: tem assento livre?"; } };
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
// Tema e voz iniciais: o que a pessoa escolheu antes. Se nunca escolheu, o tema segue o do aparelho.
let temaSalvo = null;
let vozSalva = null;
try {
    temaSalvo = localStorage.getItem("mobintecTema");
    vozSalva = localStorage.getItem("mobintecVoz");
    velocidadeVoz = Number(localStorage.getItem("mobintecVelocidade")) || 1;
} catch (e) {}
aplicarTema(temaSalvo ? temaSalvo === "claro" : true, false); // primeira visita: tema claro (design system do projeto)
definirVoz(vozSalva !== "desligada", false);
pegar("#botaoAjuda").onclick = function() { avisar(TEXTO_AJUDA); };
pegar("#botaoOuvirStatus").onclick = function() { if (dados) { anunciarStatus("", true); } };
pegar("#botaoOuvirParadas").onclick = function() { if (dados) { avisar(textoParadas()); } };
pegar("#botaoOuvirHoteis").onclick = function() { if (dados) { avisar(textoPerto()); } };

// Formulário de texto (alternativa à voz).
pegar("#formulario").onsubmit = function(evento) {
    evento.preventDefault();
    responder(pegar("#campoTexto").value);
};

// Pergunta digitada na aba Assistente.
pegar("#formularioAba").onsubmit = function(evento) {
    evento.preventDefault();
    const campo = pegar("#campoAba");
    if (campo.value.trim()) { responder(campo.value);
        campo.value = ""; }
};

// Assistente flutuante: abre em qualquer tela, com microfone e campo de texto.
function abrirChat(aberto) {
    const chat = pegar("#chatFlutuante");
    chat.hidden = !aberto;
    pegar("#botaoChatFlutuante").setAttribute("aria-expanded", aberto ? "true" : "false");
    pegar("#botaoChatFlutuante").hidden = aberto;
    if (aberto) {
        if (!pegar("#conversaFlutuante").children.length) {
            registrarConversa("Assistente", "Olá! Sou a assistente do MOBINTEC. Pode me perguntar qualquer coisa: como usar o site, qual ônibus pegar, se tem assento livre ou o que fazer em Foz do Iguaçu. Fale pelo microfone ou digite.");
        }
        pegar("#campoChat").focus();
    } else {
        pegar("#botaoChatFlutuante").focus();
    }
}
pegar("#botaoChatFlutuante").onclick = function() { abrirChat(true); };
pegar("#botaoFecharChat").onclick = function() { abrirChat(false); };
// Microfone fixo: liga a conversa por voz com a IA em qualquer tela.
function falarDeQualquerLugar() {
    const botao = pegar("#botaoFalarSempre");
    if (!ouvindo && !iniciando) { botao.setAttribute("aria-pressed", "true"); }
    tocarMicrofone(botao);
}
pegar("#botaoFalarSempre").onclick = falarDeQualquerLugar;
// Atalho no teclado: Alt + V liga ou desliga o microfone, mesmo com o foco num campo.
document.addEventListener("keydown", function(evento) {
    if (evento.altKey && (evento.key === "v" || evento.key === "V")) {
        evento.preventDefault();
        falarDeQualquerLugar();
    }
});
// ---- Acessibilidade para quem não enxerga os botões ----
// Botões escondidos que são os primeiros do leitor de tela (aparecem ao receber foco).
pegar("#atalhoFalar").onclick = falarDeQualquerLugar;
pegar("#atalhoAssistente").onclick = function() { abrirChat(true); };
// Alt + A abre ou fecha a assistente.
document.addEventListener("keydown", function(evento) {
    if (evento.altKey && (evento.key === "a" || evento.key === "A")) {
        evento.preventDefault();
        abrirChat(pegar("#chatFlutuante").hidden);
    }
});
// Espaço ou Enter fora de botões e campos liga o microfone.
document.addEventListener("keydown", function(evento) {
    if (evento.altKey || evento.ctrlKey || evento.metaKey) { return; }
    if (evento.key !== " " && evento.key !== "Enter") { return; }
    if (evento.target.closest("button, input, select, textarea, a, [contenteditable], [role=button]")) { return; }
    evento.preventDefault();
    falarDeQualquerLugar();
});
// Toque duplo em qualquer espaço vazio, em qualquer tela, liga o microfone.
document.addEventListener("dblclick", function(evento) {
    if (evento.target.closest("button, input, select, textarea, label, a, form")) { return; }
    if (!pegar("#telaInicio").hidden && tocarEmQualquerLugar) { return; } // o toque simples já liga ali
    falarDeQualquerLugar();
});
// No primeiro toque ou tecla, a página explica em voz alta como falar com a assistente.
let instrucaoFalada = false;

function falarInstrucaoInicial(evento) {
    if (instrucaoFalada) { return; }
    instrucaoFalada = true;
    if (evento && evento.target && evento.target.closest && evento.target.closest("button, input, select, textarea, a")) { return; }
    falar("Para falar com a assistente em qualquer tela, toque duas vezes em um espaço vazio, ou aperte Alt mais V. O botão do microfone também fica no canto de baixo, à esquerda.", true);
}
document.addEventListener("pointerdown", falarInstrucaoInicial, { once: true });
document.addEventListener("keydown", falarInstrucaoInicial, { once: true });
pegar("#botaoMicChat").onclick = function() { tocarMicrofone(pegar("#botaoMicChat")); };
pegar("#formularioChat").onsubmit = function(evento) {
    evento.preventDefault();
    const campo = pegar("#campoChat");
    if (campo.value.trim()) { responder(campo.value);
        campo.value = ""; }
};
document.addEventListener("keydown", function(evento) {
    if (evento.key === "Escape" && !pegar("#chatFlutuante").hidden) { abrirChat(false); }
});

// Na tela inicial, tocar em qualquer lugar liga o microfone (só até o primeiro destino ser entendido).
let tocarEmQualquerLugar = true;
document.addEventListener("click", function(evento) {
    const naTelaInicial = !pegar("#telaInicio").hidden;
    const tocouEmControle = evento.target.closest("button, input, select, textarea, label, a, form, #chatFlutuante");
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
window.addEventListener("popstate", function() {
    const tela = (history.state && history.state.tela) || "inicio";
    abrirTela(tela, false, true);
});

// Link "Ir para o conteúdo": foca o conteúdo sem mudar o endereço da página.
pegar(".pular").onclick = function(evento) {
    evento.preventDefault();
    pegar("#principal").focus();
};

/* ---------- 10) Câmera de assentos (leitura real: câmera do ônibus ou do celular) ---------- */

/*
 * MOBINTEC — leitura REAL de assentos pela câmera.
 *
 * Duas fontes:
 *   1) câmera do ônibus   -> o site só RECEBE a análise: GET /api/cameras/onibus-demo/resultado
 *      (a placa ESP32 envia as fotos para POST /api/cameras/onibus-demo/captura; este aparelho não abre câmera)
 *   2) câmera do celular  -> POST /api/analisar
 *
 * O resto do script.js só usa:
 *   CameraMobintec.montarEm(seletor)   mostra o painel em um lugar da página
 *   CameraMobintec.desmontar()         desliga a câmera e tira o painel da página
 *   CameraMobintec.iniciar(fonte)      "fixa" (câmera do ônibus) ou "celular": escolhe a fonte e começa
 *   CameraMobintec.parar(mensagem)     para tudo
 *   CameraMobintec.textoAssentos()     frase com o resultado REAL (ou aviso de que não há leitura)
 *   CameraMobintec.ouvir()             fala e escreve o resultado atual
 *   CameraMobintec.ehMensagemDaCamera(texto)
 *
 * Nunca há número sorteado aqui: o texto de assentos vem só do que o backend devolveu,
 * e só vale por até 15 segundos depois da foto.
 */

(function() {
    "use strict";

    if (window.CameraMobintec) {
        return;
    }

    const BACKEND = "https://mobintec-backend.onrender.com";
    const CAMERA_ID = "onibus-demo";
    const VALIDADE_MS = 15000; // igual ao VALIDADE_S do backend
    const INTERVALO_CELULAR_MS = 8000; // pausa entre uma análise e a próxima (backend exige no mínimo 5 s)
    const INTERVALO_FIXA_MS = 4000; // de quanto em quanto tempo consulta a câmera ESP32
    const PRAZO_ANALISE_MS = 45000;
    const PRAZO_CONSULTA_MS = 20000; // o Render gratuito pode demorar para acordar

    let modo = "fixa"; // "fixa" = câmera do ônibus (só recebe a análise) ou "celular"
    let fluxo = null; // fluxo da câmera do celular
    let controle = null; // AbortController da requisição em andamento
    let temporizadorFixa = null;
    let temporizadorAuto = null;
    let sessao = 0; // muda a cada parar(): ignora respostas atrasadas
    let ciclo = 0;
    let automatico = false;
    let ocupado = false;
    let abrindo = false;
    let leitura = null; // { fonte, mensagem, expira }
    let ultimoTexto = ""; // último texto de assentos gerado
    let ultimaAnunciada = ""; // último texto de assentos falado em voz alta

    /* ---------- Painel (montado em #slotCameraOpcoes ou #slotCameraOnibus) ---------- */

    const painel = document.createElement("section");
    painel.className = "camera-painel";
    painel.setAttribute("aria-labelledby", "tituloCameraMobintec");
    painel.innerHTML = `
    <h3 id="tituloCameraMobintec" class="text-xl font-semibold">Leitura dos assentos</h3>
    <div class="camera-fontes" role="group" aria-label="Fonte da imagem">
      <button type="button" class="botao" data-fonte="fixa" aria-pressed="true">Câmera do ônibus</button>
      <button type="button" class="botao" data-fonte="celular" aria-pressed="false">Câmera do celular</button>
    </div>
    <video class="camera-video" autoplay muted playsinline hidden aria-label="Prévia da câmera deste aparelho"></video>
    <p class="camera-aviso-fixa">A câmera fica no ônibus e só envia a análise. Este aparelho não abre a câmera: aqui aparece apenas o resultado.</p>
    <p class="camera-estado" role="status" aria-live="polite"></p>
    <div class="camera-acoes">
      <button type="button" class="botao botao-forte" data-acao="iniciar"></button>
      <button type="button" class="botao" data-acao="parar" hidden>Parar leitura</button>
      <button type="button" class="botao" data-acao="ouvir">Ouvir última leitura</button>
    </div>
    <p class="camera-nota">O resultado é uma estimativa feita por inteligência artificial, não uma confirmação de lugar livre. A câmera do ônibus é uma câmera de demonstração.</p>`;

    const video = painel.querySelector(".camera-video");
    const estado = painel.querySelector(".camera-estado");
    const avisoFixa = painel.querySelector(".camera-aviso-fixa");
    const botaoIniciar = painel.querySelector('[data-acao="iniciar"]');
    const botaoParar = painel.querySelector('[data-acao="parar"]');
    const botaoOuvir = painel.querySelector('[data-acao="ouvir"]');
    const botoesFonte = painel.querySelectorAll("[data-fonte]");

    function textoInicial() {
        return modo === "fixa" ?
            "Toque no botão abaixo para ver a análise da câmera do ônibus." :
            "Toque no botão abaixo para começar a leitura.";
    }

    // Atualiza botões e avisos de acordo com a fonte escolhida.
    function atualizarRotulos() {
        botoesFonte.forEach(function(botao) {
            botao.setAttribute("aria-pressed", botao.dataset.fonte === modo ? "true" : "false");
        });
        avisoFixa.hidden = modo !== "fixa";
        botaoIniciar.textContent = modo === "fixa" ?
            "Ver análise da câmera do ônibus" :
            "Começar leitura dos assentos";
        escrever(textoInicial());
    }

    /* ---------- Texto e fala ---------- */

    function escrever(texto) {
        if (estado.textContent !== texto) {
            estado.textContent = texto;
        }
    }

    function recente() {
        return leitura !== null && performance.now() < leitura.expira;
    }

    // Frase usada pela tela, pela voz e pela assistente. Só existe leitura se o backend confirmou uma foto recente.
    function textoAssentos() {
        let texto;
        if (!recente()) {
            texto = "Sem leitura atual de assentos. A câmera ainda não fez uma leitura válida. " +
                "A disponibilidade do assento PCD não foi verificada.";
        } else {
            const origem = leitura.fonte === "celular" ?
                "Análise da câmera do celular." :
                "Análise da câmera do ônibus.";
            texto = origem + " " + leitura.mensagem +
                " A disponibilidade do assento PCD não foi verificada.";
        }
        ultimoTexto = texto;
        return texto;
    }

    function ehMensagemDaCamera(texto) {
        return typeof texto === "string" && ultimoTexto !== "" && texto.indexOf(ultimoTexto) !== -1;
    }

    // Fala e escreve. Sem "forcar", só fala quando o texto mudou (para não repetir a mesma leitura a cada 8 segundos).
    function anunciar(texto, forcar) {
        if (!forcar && texto === ultimaAnunciada) {
            return;
        }
        ultimaAnunciada = texto;
        if (typeof avisar === "function") {
            avisar(texto);
        } else {
            escrever(texto);
        }
    }

    function ouvir() {
        const texto = textoAssentos();
        escrever(texto);
        anunciar(texto, true);
    }

    function cancelarFalaDaCamera() {
        if (typeof ultimaFala !== "undefined" && ehMensagemDaCamera(ultimaFala) && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }

    function limparLeitura() {
        leitura = null;
    }

    /* ---------- Parar tudo ---------- */

    function parar(mostrarMensagem) {
        automatico = false;
        ciclo += 1;
        sessao += 1;

        clearTimeout(temporizadorAuto);
        temporizadorAuto = null;
        clearTimeout(temporizadorFixa);
        temporizadorFixa = null;

        if (controle) {
            controle.abort();
            controle = null;
        }

        if (fluxo) {
            fluxo.getTracks().forEach(function(faixa) { faixa.stop(); });
            fluxo = null;
        }

        video.srcObject = null;
        video.hidden = true;

        ocupado = false;
        abrindo = false;
        botaoIniciar.hidden = false;
        botaoParar.hidden = true;

        limparLeitura();
        cancelarFalaDaCamera();
        ultimaAnunciada = "";

        if (mostrarMensagem !== false) {
            escrever("Leitura parada. Sem leitura atual de assentos.");
        }
    }

    /* ---------- Respostas do backend ---------- */

    function mensagemDeErro(status, json) {
        const detalhe = json && typeof json.detail === "string" ? json.detail : "";
        if (status === 403) { return detalhe || "A análise pelo celular ainda não foi habilitada no sistema."; }
        if (status === 429) { return detalhe || "O sistema está ocupado ou atingiu o limite de análises. Aguarde um pouco."; }
        if (status === 400 || status === 409 || status === 413 || status === 415 || status === 422) {
            return detalhe || "O sistema não aceitou a foto. Vou tentar com outra.";
        }
        if (status === 404) { return "Câmera não cadastrada no sistema."; }
        return "O sistema de análise está indisponível no momento. Tente novamente em instantes.";
    }

    async function lerResposta(resposta) {
        let json = null;
        try {
            json = await resposta.json();
        } catch (erro) {
            json = null;
        }
        if (!resposta.ok) {
            const falha = new Error(mensagemDeErro(resposta.status, json));
            falha.status = resposta.status;
            throw falha;
        }
        if (!json) {
            throw new Error("Não foi possível ler a resposta do sistema agora. Tente novamente.");
        }
        return json;
    }

    function guardarLeitura(json, restante, fonte) {
        const valida = json.estado === "recente" &&
            typeof json.mensagem === "string" && json.mensagem.trim() !== "" &&
            Number.isFinite(restante) && restante > 0;

        if (!valida) {
            limparLeitura();
            escrever(json.estado === "expirado" ?
                "A leitura venceu antes de chegar. Aguardando uma foto nova." :
                "Não foi possível identificar os assentos agora. Aponte a câmera de novo.");
            return false;
        }

        leitura = {
            fonte: fonte,
            mensagem: json.mensagem.trim(),
            expira: performance.now() + Math.min(VALIDADE_MS, restante)
        };

        const texto = textoAssentos();
        escrever(texto);
        anunciar(texto, false);
        return true;
    }

    /* ---------- Câmera do celular ---------- */

    function videoPronto() {
        return !!(fluxo && fluxo.active && video.readyState >= 2 && video.videoWidth && video.videoHeight);
    }

    async function abrirCamera() {
        if (abrindo || modo !== "celular") {
            return;
        }

        parar(false);
        const minhaSessao = sessao;
        abrindo = true;
        botaoIniciar.hidden = true;
        botaoParar.hidden = false;
        escrever("Pedindo permissão da câmera…");

        try {
            if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Abra o site por HTTPS no Chrome ou no Safari. A câmera não está disponível neste navegador.");
            }

            const novoFluxo = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: "environment" }, width: { ideal: 960 }, height: { ideal: 720 } },
                audio: false
            });

            if (minhaSessao !== sessao) {
                novoFluxo.getTracks().forEach(function(faixa) { faixa.stop(); });
                return;
            }
            if (document.hidden) {
                novoFluxo.getTracks().forEach(function(faixa) { faixa.stop(); });
                parar(false);
                return;
            }

            fluxo = novoFluxo;
            video.srcObject = fluxo;
            video.hidden = false;
            await video.play();

            if (minhaSessao !== sessao) {
                return;
            }

            escrever("Câmera aberta. A leitura é automática. Aponte para os assentos e mantenha o celular firme. " +
                "Para encerrar, toque em Parar leitura.");
            iniciarAutomatico();
        } catch (erro) {
            if (minhaSessao !== sessao) {
                return;
            }
            parar(false);
            escrever(erro.name === "NotAllowedError" ?
                "Permissão da câmera negada. Libere a câmera nas configurações do navegador ou toque em Começar leitura dos assentos." :
                "Não consegui abrir a câmera: " + erro.message);
        } finally {
            if (minhaSessao === sessao) {
                abrindo = false;
            }
        }
    }

    async function capturarFoto() {
        if (!videoPronto()) {
            throw new Error("A imagem ainda não está pronta. Aguarde alguns segundos.");
        }

        const escala = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(video.videoWidth * escala));
        canvas.height = Math.max(1, Math.round(video.videoHeight * escala));

        const contexto = canvas.getContext("2d");
        if (!contexto) {
            throw new Error("Não consegui preparar a foto.");
        }
        contexto.drawImage(video, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise(function(resolve) {
            canvas.toBlob(resolve, "image/jpeg", 0.8);
        });
        if (!blob) {
            throw new Error("Não consegui capturar a foto.");
        }
        return blob;
    }

    // Devolve "ok", "erro", "fatal" (para de tentar) ou "cancelado".
    async function analisarFoto() {
        if (ocupado) {
            return "erro";
        }
        if (!videoPronto()) {
            escrever("A imagem ainda não está pronta. Aguarde alguns segundos.");
            return "erro";
        }
        if (document.hidden) {
            escrever("Mantenha esta página visível para analisar.");
            return "erro";
        }

        ocupado = true;
        const minhaSessao = sessao;
        const mostrarPassos = !recente(); // com uma leitura válida na tela, não escreve cada etapa (evita ruído no leitor de tela)
        const abortador = new AbortController();
        controle = abortador;
        const prazo = setTimeout(function() { abortador.abort(); }, PRAZO_ANALISE_MS);

        let resultado = "erro";
        let mensagemErro = "";

        try {
            if (mostrarPassos) { escrever("Tirando a foto dos assentos…"); }

            // Horário da captura em UTC, sem milissegundos (mesmo formato da placa ESP32).
            const capturadoEm = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
            const inicio = performance.now();
            const blob = await capturarFoto();

            if (minhaSessao !== sessao) {
                return "cancelado";
            }

            const requisicaoId = window.crypto && window.crypto.randomUUID ?
                window.crypto.randomUUID() :
                Date.now() + "-" + Math.random().toString(36).slice(2);

            const formulario = new FormData();
            formulario.append("image", blob, "captura.jpg");
            formulario.append("capturadoEm", capturadoEm);
            formulario.append("requisicaoId", requisicaoId);

            if (mostrarPassos) { escrever("Analisando a imagem…"); }

            const resposta = await fetch(BACKEND + "/api/analisar", {
                method: "POST",
                body: formulario,
                signal: abortador.signal,
                cache: "no-store"
            });
            const json = await lerResposta(resposta);

            if (minhaSessao !== sessao) {
                return "cancelado";
            }

            if (json.capturadoEm !== capturadoEm || json.requisicaoId !== requisicaoId) {
                throw new Error("A resposta não é da foto atual. Vou tentar de novo.");
            }

            const idade = performance.now() - inicio;
            if (idade >= VALIDADE_MS) {
                mensagemErro = "A análise demorou demais e foi descartada. Vou tentar uma foto nova.";
                return "erro";
            }

            const restante = Math.min(VALIDADE_MS - idade, Number(json.validaPorSegundos) * 1000);
            resultado = guardarLeitura(json, restante, "celular") ? "ok" : "erro";
        } catch (erro) {
            if (minhaSessao !== sessao) {
                return "cancelado";
            }
            if (erro.name === "AbortError") {
                mensagemErro = "O sistema demorou para responder. Vou tentar de novo.";
            } else if (erro.status) {
                mensagemErro = erro.message;
            } else if (erro instanceof TypeError) {
                mensagemErro = "Sem conexão com o sistema de análise. Verifique a internet.";
            } else {
                mensagemErro = erro.message;
            }
            resultado = (erro.status === 401 || erro.status === 403 || erro.status === 404) ? "fatal" : "erro";
        } finally {
            clearTimeout(prazo);
            if (controle === abortador) {
                controle = null;
            }
            if (minhaSessao === sessao) {
                ocupado = false;
            }
            if (mensagemErro && resultado !== "fatal" && !recente()) {
                escrever(mensagemErro);
            }
        }

        if (resultado === "fatal") {
            parar(false);
            escrever(mensagemErro);
        }
        return resultado;
    }

    function agendarCiclo(meuCiclo, ms) {
        clearTimeout(temporizadorAuto);
        temporizadorAuto = setTimeout(function() { executarCiclo(meuCiclo); }, ms);
    }

    async function executarCiclo(meuCiclo) {
        if (!automatico || meuCiclo !== ciclo || modo !== "celular" || !fluxo || !fluxo.active || document.hidden) {
            return;
        }
        if (ocupado || !videoPronto()) {
            agendarCiclo(meuCiclo, 1000);
            return;
        }

        const resultado = await analisarFoto();

        if (!automatico || meuCiclo !== ciclo || resultado === "fatal" || resultado === "cancelado") {
            return;
        }
        agendarCiclo(meuCiclo, INTERVALO_CELULAR_MS);
    }

    function iniciarAutomatico() {
        clearTimeout(temporizadorAuto);
        automatico = true;
        ciclo += 1;
        agendarCiclo(ciclo, 1000);
    }

    /* ---------- Câmera ESP32 (consulta o último resultado no backend) ---------- */

    async function consultarFixa(minhaSessao) {
        if (minhaSessao !== sessao || modo !== "fixa" || document.hidden) {
            return;
        }

        const inicio = performance.now();
        const abortador = new AbortController();
        controle = abortador;
        const prazo = setTimeout(function() { abortador.abort(); }, PRAZO_CONSULTA_MS);
        let continuar = true;

        try {
            const resposta = await fetch(BACKEND + "/api/cameras/" + CAMERA_ID + "/resultado", {
                cache: "no-store",
                signal: abortador.signal
            });
            const json = await lerResposta(resposta);

            if (minhaSessao !== sessao) {
                return;
            }

            if (json.estado === "sem_leitura") {
                limparLeitura();
                escrever("A câmera do ônibus ainda não enviou uma foto válida. Aguarde um instante.");
            } else {
                const restante = Number(json.validaPorSegundos) * 1000 - (performance.now() - inicio);
                guardarLeitura(json, restante, "fixa");
            }
        } catch (erro) {
            if (minhaSessao !== sessao) {
                return;
            }
            limparLeitura();
            if (erro.status === 404) {
                continuar = false;
                parar(false);
                escrever(erro.message);
                return;
            }
            if (erro.name === "AbortError") {
                escrever("O sistema demorou para responder. Tentando de novo.");
            } else if (erro.status) {
                escrever(erro.message + " Tentando de novo.");
            } else {
                escrever("Sem conexão com o sistema. Tentando de novo.");
            }
        } finally {
            clearTimeout(prazo);
            if (controle === abortador) {
                controle = null;
            }
            if (continuar && minhaSessao === sessao && modo === "fixa") {
                temporizadorFixa = setTimeout(function() { consultarFixa(minhaSessao); }, INTERVALO_FIXA_MS);
            }
        }
    }

    function iniciarFixa() {
        parar(false);
        modo = "fixa";
        botaoIniciar.hidden = true;
        botaoParar.hidden = false;
        escrever("Buscando a análise da câmera do ônibus…");
        consultarFixa(sessao);
    }

    /* ---------- Botões do painel ---------- */

    botaoIniciar.onclick = function() {
        if (modo === "celular") {
            abrirCamera();
        } else {
            iniciarFixa();
        }
    };

    botaoParar.onclick = function() {
        parar(true);
    };

    botaoOuvir.onclick = ouvir;

    function escolherFonte(fonte) {
        parar(false);
        modo = fonte;
        atualizarRotulos();
    }

    botoesFonte.forEach(function(botao) {
        botao.onclick = function() {
            const escolhido = botao.dataset.fonte;
            if (escolhido === modo && !fluxo && !temporizadorFixa && !abrindo) {
                return;
            }
            escolherFonte(escolhido);
        };
    });

    // Chamado pela voz ou pelo script.js: escolhe a fonte e começa a leitura.
    function iniciar(fonte) {
        if (fonte === modo && (fluxo || temporizadorFixa || abrindo)) {
            return; // já está funcionando
        }
        escolherFonte(fonte);
        if (modo === "celular") {
            abrirCamera();
        } else {
            iniciarFixa();
        }
    }

    /* ---------- Segurança: leitura velha não vale ---------- */

    setInterval(function() {
        if (leitura && !recente()) {
            limparLeitura();
            cancelarFalaDaCamera();
            escrever("A leitura anterior venceu. Aguardando uma foto nova.");
        }
    }, 1000);

    // Câmera só fica ligada com a página visível.
    document.addEventListener("visibilitychange", function() {
        if (document.hidden && (fluxo || temporizadorFixa || abrindo)) {
            parar(true);
        }
    });

    window.addEventListener("pagehide", function() {
        parar(false);
    });

    atualizarRotulos();

    /* ---------- Ligação com o script.js ---------- */

    function montarEm(seletor) {
        const lugar = document.querySelector(seletor);
        if (!lugar) {
            return;
        }
        if (painel.parentNode !== lugar) {
            lugar.appendChild(painel);
            if (fluxo && video.srcObject) {
                video.play().catch(function() {}); // mudar o vídeo de lugar pode pausá-lo
            }
        }
    }

    function desmontar() {
        parar(false);
        escrever(textoInicial());
        if (painel.parentNode) {
            painel.parentNode.removeChild(painel);
        }
    }

    window.CameraMobintec = {
        montarEm: montarEm,
        desmontar: desmontar,
        iniciar: iniciar,
        textoAssentos: textoAssentos,
        ouvir: ouvir,
        ehMensagemDaCamera: ehMensagemDaCamera,
        parar: parar
    };
})();

// Começa na tela inicial e fala as boas-vindas (o navegador pode bloquear a fala até o primeiro toque).
abrirTela("inicio", true);
window.addEventListener("load", function() { falar(BOAS_VINDAS); });