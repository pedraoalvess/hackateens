window.CameraMobintec = {
  montarEm: function(seletor) {
    const lugar = document.querySelector(seletor);
    if (!lugar) return;
    
    lugar.innerHTML = `
      <section class="camera-painel" aria-labelledby="tituloCameraMobintec">
        <h3 id="tituloCameraMobintec">Leitura dos assentos</h3>
        <div class="camera-fontes" role="group" aria-label="Fonte da imagem">
          <button type="button" class="botao" data-fonte="fixa" aria-pressed="true">Câmera do ônibus</button>
          <button type="button" class="botao" data-fonte="celular" aria-pressed="false">Câmera do celular</button>
        </div>
        <p class="camera-aviso-fixa">A câmera fica no ônibus e só envia a análise. Este aparelho não abre a câmera: aqui aparece apenas o resultado.</p>
        <p class="camera-estado" role="status" aria-live="polite">Toque no botão abaixo para ver a análise da câmera do ônibus.</p>
        <div class="camera-acoes">
          <button type="button" class="botao botao-forte" data-acao="iniciar">Ver análise da câmera do ônibus</button>
          <button type="button" class="botao" data-acao="parar" hidden>Parar leitura</button>
          <button type="button" class="botao" data-acao="ouvir">Ouvir última leitura</button>
        </div>
        <p class="camera-nota">O resultado é uma estimativa feita por inteligência artificial, não uma confirmação de lugar livre. A câmera do ônibus é uma câmera de demonstração.</p>
      </section>
    `;
    
    // Adiciona event listeners
    const botoesFonte = lugar.querySelectorAll('[data-fonte]');
    const botaoIniciar = lugar.querySelector('[data-acao="iniciar"]');
    const botaoParar = lugar.querySelector('[data-acao="parar"]');
    const botaoOuvir = lugar.querySelector('[data-acao="ouvir"]');
    const estado = lugar.querySelector('.camera-estado');
    const avisoFixa = lugar.querySelector('.camera-aviso-fixa');
    
    let modo = 'fixa';
    
    botoesFonte.forEach(botao => {
      botao.onclick = () => {
        modo = botao.dataset.fonte;
        botoesFonte.forEach(b => b.setAttribute('aria-pressed', b.dataset.fonte === modo ? 'true' : 'false'));
        avisoFixa.hidden = modo !== 'fixa';
        botaoIniciar.textContent = modo === 'fixa' ? 'Ver análise da câmera do ônibus' : 'Começar leitura dos assentos';
      };
    });
    
    botaoIniciar.onclick = () => {
      estado.textContent = 'Câmera em desenvolvimento. Em breve estará disponível.';
      botaoIniciar.hidden = true;
      botaoParar.hidden = false;
    };
    
    botaoParar.onclick = () => {
      estado.textContent = 'Leitura parada.';
      botaoIniciar.hidden = false;
      botaoParar.hidden = true;
    };
    
    botaoOuvir.onclick = () => {
      if (typeof avisar === 'function') {
        avisar('Leitura da câmera em desenvolvimento. A disponibilidade do assento PCD não foi verificada.');
      }
    };
  },
  
  desmontar: function() {},
  
  iniciar: function(modo) {
    // Não faz nada nesta versão
  },
  
  textoAssentos: function() {
    return 'Leitura da câmera em desenvolvimento. A disponibilidade do assento PCD não foi verificada.';
  },
  
  ouvir: function() {
    if (typeof avisar === 'function') {
      avisar(this.textoAssentos());
    }
  },
  
  ehMensagemDaCamera: function(texto) {
    return false;
  },
  
  parar: function() {}
};
