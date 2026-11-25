/* ==========================================================================
MOBINTEC - Sistema de Leitura de Assentos por Câmera (Funcional)
Integração real com backend para análise por IA
Suporta: Câmera do celular (local) e ESP32 (câmera fixa do ônibus)
========================================================================== */

(function() {
  'use strict';
  
  const BACKEND_URL = 'https://mobintec-backend.onrender.com';
  const CAMERA_ID = 'onibus-demo';
  const VALIDADE_MS = 15000;
  const INTERVALO_CELULAR_MS = 8000;
  const INTERVALO_FIXA_MS = 4000;
  const PRAZO_ANALISE_MS = 45000;
  const PRAZO_CONSULTA_MS = 20000;
  
  let modo = 'fixa';
  let stream = null;
  let controller = null;
  let timerFixa = null;
  let timerAuto = null;
  let sessao = 0;
  let ciclo = 0;
  let automatico = false;
  let ocupado = false;
  let abrindo = false;
  let leitura = null;
  let ultimoTexto = '';
  let ultimaAnunciada = '';
  
  // Cria o painel da câmera com as classes exatas do style.css
  const painel = document.createElement('section');
  painel.className = 'camera-painel';
  painel.setAttribute('aria-labelledby', 'tituloCameraMobintec');
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
    <p class="camera-nota">O resultado é uma estimativa feita por inteligência artificial, não uma confirmação de lugar livre. A câmera do ônibus é uma câmera de demonstração.</p>
  `;
  
  const video = painel.querySelector('.camera-video');
  const estado = painel.querySelector('.camera-estado');
  const avisoFixa = painel.querySelector('.camera-aviso-fixa');
  const botaoIniciar = painel.querySelector('[data-acao="iniciar"]');
  const botaoParar = painel.querySelector('[data-acao="parar"]');
  const botaoOuvir = painel.querySelector('[data-acao="ouvir"]');
  const botoesFonte = painel.querySelectorAll('[data-fonte]');
  
  function textoInicial() {
    return modo === 'fixa' ?
      'Toque no botão abaixo para ver a análise da câmera do ônibus.' :
      'Toque no botão abaixo para começar a leitura.';
  }
  
  function atualizarRotulos() {
    botoesFonte.forEach(botao => {
      botao.setAttribute('aria-pressed', botao.dataset.fonte === modo ? 'true' : 'false');
    });
    avisoFixa.hidden = modo !== 'fixa';
    botaoIniciar.textContent = modo === 'fixa' ?
      'Ver análise da câmera do ônibus' : 'Começar leitura dos assentos';
    escrever(textoInicial());
  }
  
  function escrever(texto) {
    if (estado.textContent !== texto) estado.textContent = texto;
  }
  
  function recente() {
    return leitura !== null && performance.now() < leitura.expira;
  }
  
  function textoAssentos() {
    let texto;
    if (!recente()) {
      texto = 'Sem leitura atual de assentos. A câmera ainda não fez uma leitura válida. A disponibilidade do assento PCD não foi verificada.';
    } else {
      const origem = leitura.fonte === 'celular' ?
        'Análise da câmera do celular.' : 'Análise da câmera do ônibus.';
      texto = origem + ' ' + leitura.mensagem + ' A disponibilidade do assento PCD não foi verificada.';
    }
    ultimoTexto = texto;
    return texto;
  }
  
  function ehMensagemDaCamera(texto) {
    return typeof texto === 'string' && ultimoTexto !== '' && texto.indexOf(ultimoTexto) !== -1;
  }
  
  function anunciar(texto, forcar) {
    if (!forcar && texto === ultimaAnunciada) return;
    ultimaAnunciada = texto;
    if (typeof avisar === 'function') avisar(texto);
    else escrever(texto);
  }
  
  function ouvir() {
    const texto = textoAssentos();
    escrever(texto);
    anunciar(texto, true);
  }
  
  function cancelarFalaDaCamera() {
    if (typeof ultimaFala !== 'undefined' && ehMensagemDaCamera(ultimaFala) && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
  
  function limparLeitura() {
    leitura = null;
  }
  
  function parar(mostrarMensagem) {
    automatico = false;
    ciclo += 1;
    sessao += 1;
    clearTimeout(timerAuto);
    timerAuto = null;
    clearTimeout(timerFixa);
    timerFixa = null;
    if (controller) { controller.abort(); controller = null; }
    if (stream) { stream.getTracks().forEach(faixa => faixa.stop()); stream = null; }
    video.srcObject = null;
    video.hidden = true;
    ocupado = false;
    abrindo = false;
    botaoIniciar.hidden = false;
    botaoParar.hidden = true;
    limparLeitura();
    cancelarFalaDaCamera();
    ultimaAnunciada = '';
    if (mostrarMensagem !== false) escrever('Leitura parada. Sem leitura atual de assentos.');
  }
  
  function mensagemDeErro(status, json) {
    const detalhe = json && typeof json.detail === 'string' ? json.detail : '';
    if (status === 403) return detalhe || 'A análise pelo celular ainda não foi habilitada no sistema.';
    if (status === 429) return detalhe || 'O sistema está ocupado ou atingiu o limite de análises. Aguarde um pouco.';
    if (status === 400 || status === 409 || status === 413 || status === 415 || status === 422) {
      return detalhe || 'O sistema não aceitou a foto. Vou tentar com outra.';
    }
    if (status === 404) return 'Câmera não cadastrada no sistema.';
    return 'O sistema de análise está indisponível no momento. Tente novamente em instantes.';
  }
  
  async function lerResposta(resposta) {
    let json = null;
    try { json = await resposta.json(); } catch (erro) { json = null; }
    if (!resposta.ok) {
      const falha = new Error(mensagemDeErro(resposta.status, json));
      falha.status = resposta.status;
      throw falha;
    }
    if (!json) throw new Error('Não foi possível ler a resposta do sistema agora. Tente novamente.');
    return json;
  }
  
  function guardarLeitura(json, restante, fonte) {
    const valida = json.estado === 'recente' &&
      typeof json.mensagem === 'string' && json.mensagem.trim() !== '' &&
      Number.isFinite(restante) && restante > 0;
    if (!valida) {
      limparLeitura();
      escrever(json.estado === 'expirado' ?
        'A leitura venceu antes de chegar. Aguardando uma foto nova.' :
        'Não foi possível identificar os assentos agora. Aponte a câmera de novo.');
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
  
  function videoPronto() {
    return !!(stream && stream.active && video.readyState >= 2 && video.videoWidth && video.videoHeight);
  }
  
  async function abrirCamera() {
    if (abrindo || modo !== 'celular') return;
    parar(false);
    const minhaSessao = sessao;
    abrindo = true;
    botaoIniciar.hidden = true;
    botaoParar.hidden = false;
    escrever('Pedindo permissão da câmera…');
    try {
      if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Abra o site por HTTPS no Chrome ou no Safari. A câmera não está disponível neste navegador.');
      }
      const novoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false
      });
      if (minhaSessao !== sessao) {
        novoStream.getTracks().forEach(faixa => faixa.stop());
        return;
      }
      if (document.hidden) {
        novoStream.getTracks().forEach(faixa => faixa.stop());
        parar(false);
        return;
      }
      stream = novoStream;
      video.srcObject = stream;
      video.hidden = false;
      await video.play();
      if (minhaSessao !== sessao) return;
      escrever('Câmera aberta. A leitura é automática. Aponte para os assentos e mantenha o celular firme. Para encerrar, toque em Parar leitura.');
      iniciarAutomatico();
    } catch (erro) {
      if (minhaSessao !== sessao) return;
      parar(false);
      escrever(erro.name === 'NotAllowedError' ?
        'Permissão da câmera negada. Libere a câmera nas configurações do navegador ou toque em Começar leitura dos assentos.' :
        'Não consegui abrir a câmera: ' + erro.message);
    } finally {
      if (minhaSessao === sessao) abrindo = false;
    }
  }
  
  async function capturarFoto() {
    if (!videoPronto()) throw new Error('A imagem ainda não está pronta. Aguarde alguns segundos.');
    const escala = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(video.videoWidth * escala));
    canvas.height = Math.max(1, Math.round(video.videoHeight * escala));
    const contexto = canvas.getContext('2d');
    if (!contexto) throw new Error('Não consegui preparar a foto.');
    contexto.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.8);
    });
    if (!blob) throw new Error('Não consegui capturar a foto.');
    return blob;
  }
  
  async function analisarFoto() {
    if (ocupado) return 'erro';
    if (!videoPronto()) { escrever('A imagem ainda não está pronta. Aguarde alguns segundos.'); return 'erro'; }
    if (document.hidden) { escrever('Mantenha esta página visível para analisar.'); return 'erro'; }
    ocupado = true;
    const minhaSessao = sessao;
    const mostrarPassos = !recente();
    const abortador = new AbortController();
    controller = abortador;
    const prazo = setTimeout(() => abortador.abort(), PRAZO_ANALISE_MS);
    let resultado = 'erro';
    let mensagemErro = '';
    try {
      if (mostrarPassos) escrever('Tirando a foto dos assentos…');
      const capturadoEm = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
      const inicio = performance.now();
      const blob = await capturarFoto();
      if (minhaSessao !== sessao) return 'cancelado';
      const requisicaoId = window.crypto && window.crypto.randomUUID ?
        window.crypto.randomUUID() :
        Date.now() + '-' + Math.random().toString(36).slice(2);
      const formulario = new FormData();
      formulario.append('image', blob, 'captura.jpg');
      formulario.append('capturadoEm', capturadoEm);
      formulario.append('requisicaoId', requisicaoId);
      if (mostrarPassos) escrever('Analisando a imagem…');
      const resposta = await fetch(BACKEND_URL + '/api/analisar', {
        method: 'POST',
        body: formulario,
        signal: abortador.signal,
        cache: 'no-store'
      });
      const json = await lerResposta(resposta);
      if (minhaSessao !== sessao) return 'cancelado';
      if (json.capturadoEm !== capturadoEm || json.requisicaoId !== requisicaoId) {
        throw new Error('A resposta não é da foto atual. Vou tentar de novo.');
      }
      const idade = performance.now() - inicio;
      if (idade >= VALIDADE_MS) {
        mensagemErro = 'A análise demorou demais e foi descartada. Vou tentar uma foto nova.';
        return 'erro';
      }
      const restante = Math.min(VALIDADE_MS - idade, Number(json.validaPorSegundos) * 1000);
      resultado = guardarLeitura(json, restante, 'celular') ? 'ok' : 'erro';
    } catch (erro) {
      if (minhaSessao !== sessao) return 'cancelado';
      if (erro.name === 'AbortError') {
        mensagemErro = 'O sistema demorou para responder. Vou tentar de novo.';
      } else if (erro.status) {
        mensagemErro = erro.message;
      } else if (erro instanceof TypeError) {
        mensagemErro = 'Sem conexão com o sistema de análise. Verifique a internet.';
      } else {
        mensagemErro = erro.message;
      }
      resultado = (erro.status === 401 || erro.status === 403 || erro.status === 404) ? 'fatal' : 'erro';
    } finally {
      clearTimeout(prazo);
      if (controller === abortador) controller = null;
      if (minhaSessao === sessao) ocupado = false;
      if (mensagemErro && resultado !== 'fatal' && !recente()) escrever(mensagemErro);
    }
    if (resultado === 'fatal') { parar(false); escrever(mensagemErro); }
    return resultado;
  }
  
  function agendarCiclo(meuCiclo, ms) {
    clearTimeout(timerAuto);
    timerAuto = setTimeout(() => executarCiclo(meuCiclo), ms);
  }
  
  async function executarCiclo(meuCiclo) {
    if (!automatico || meuCiclo !== ciclo || modo !== 'celular' || !stream || !stream.active || document.hidden) return;
    if (ocupado || !videoPronto()) { agendarCiclo(meuCiclo, 1000); return; }
    const resultado = await analisarFoto();
    if (!automatico || meuCiclo !== ciclo || resultado === 'fatal' || resultado === 'cancelado') return;
    agendarCiclo(meuCiclo, INTERVALO_CELULAR_MS);
  }
  
  function iniciarAutomatico() {
    clearTimeout(timerAuto);
    automatico = true;
    ciclo += 1;
    agendarCiclo(ciclo, 1000);
  }
  
  async function consultarFixa(minhaSessao) {
    if (minhaSessao !== sessao || modo !== 'fixa' || document.hidden) return;
    const inicio = performance.now();
    const abortador = new AbortController();
    controller = abortador;
    const prazo = setTimeout(() => abortador.abort(), PRAZO_CONSULTA_MS);
    let continuar = true;
    try {
      const resposta = await fetch(BACKEND_URL + '/api/cameras/' + CAMERA_ID + '/resultado', {
        cache: 'no-store',
        signal: abortador.signal
      });
      const json = await lerResposta(resposta);
      if (minhaSessao !== sessao) return;
      if (json.estado === 'sem_leitura') {
        limparLeitura();
        escrever('A câmera do ônibus ainda não enviou uma foto válida. Aguarde um instante.');
      } else {
        const restante = Number(json.validaPorSegundos) * 1000 - (performance.now() - inicio);
        guardarLeitura(json, restante, 'fixa');
      }
    } catch (erro) {
      if (minhaSessao !== sessao) return;
      limparLeitura();
      if (erro.status === 404) {
        continuar = false;
        parar(false);
        escrever(erro.message);
        return;
      }
      if (erro.name === 'AbortError') {
        escrever('O sistema demorou para responder. Tentando de novo.');
      } else if (erro.status) {
        escrever(erro.message + ' Tentando de novo.');
      } else {
        escrever('Sem conexão com o sistema. Tentando de novo.');
      }
    } finally {
      clearTimeout(prazo);
      if (controller === abortador) controller = null;
      if (continuar && minhaSessao === sessao && modo === 'fixa') {
        timerFixa = setTimeout(() => consultarFixa(minhaSessao), INTERVALO_FIXA_MS);
      }
    }
  }
  
  function iniciarFixa() {
    parar(false);
    modo = 'fixa';
    botaoIniciar.hidden = true;
    botaoParar.hidden = false;
    escrever('Buscando a análise da câmera do ônibus…');
    consultarFixa(sessao);
  }
  
  botaoIniciar.onclick = () => {
    if (modo === 'celular') abrirCamera();
    else iniciarFixa();
  };
  botaoParar.onclick = () => parar(true);
  botaoOuvir.onclick = ouvir;
  
  function escolherFonte(fonte) {
    parar(false);
    modo = fonte;
    atualizarRotulos();
  }
  
  botoesFonte.forEach(botao => {
    botao.onclick = () => {
      const escolhido = botao.dataset.fonte;
      if (escolhido === modo && !stream && !timerFixa && !abrindo) return;
      escolherFonte(escolhido);
    };
  });
  
  function iniciar(fonte) {
    if (fonte === modo && (stream || timerFixa || abrindo)) return;
    escolherFonte(fonte);
    if (modo === 'celular') abrirCamera();
    else iniciarFixa();
  }
  
  setInterval(() => {
    if (leitura && !recente()) {
      limparLeitura();
      cancelarFalaDaCamera();
      escrever('A leitura anterior venceu. Aguardando uma foto nova.');
    }
  }, 1000);
  
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (stream || timerFixa || abrindo)) parar(true);
  });
  window.addEventListener('pagehide', () => parar(false));
  
  atualizarRotulos();
  
  function montarEm(seletor) {
    const lugar = document.querySelector(seletor);
    if (!lugar) return;
    if (painel.parentNode !== lugar) {
      lugar.appendChild(painel);
      if (stream && video.srcObject) video.play().catch(() => {});
    }
  }
  
  function desmontar() {
    parar(false);
    escrever(textoInicial());
    if (painel.parentNode) painel.parentNode.removeChild(painel);
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
