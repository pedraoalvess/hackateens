// MOBINTEC - Sistema de Câmera para Leitura de Assentos
window.CameraMobintec = {
  montarEm: function(seletor) {
    const lugar = document.querySelector(seletor);
    if (!lugar) return;
    
    lugar.innerHTML = `
      <div class="camera-painel" style="background: var(--dark-2); padding: 1rem; border-radius: 8px; margin-top: 1rem;">
        <h3 style="color: var(--on-dark); margin-bottom: 1rem;">📷 Leitura de Assentos</h3>
        <p style="color: var(--on-dark-soft); margin-bottom: 1rem;">
          Escolha a fonte da câmera para verificar a disponibilidade de assentos.
        </p>
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
          <button class="botao" data-fonte="fixa" style="flex: 1;">
            🚌 Câmera do ônibus
          </button>
          <button class="botao" data-fonte="celular" style="flex: 1;">
            📱 Câmera do celular
          </button>
        </div>
        <div id="cameraStatus" style="color: var(--on-dark-soft); font-size: 0.9rem;">
          Selecione uma fonte para começar.
        </div>
      </div>
    `;
    
    // Adiciona event listeners
    const botoes = lugar.querySelectorAll('[data-fonte]');
    botoes.forEach(botao => {
      botao.addEventListener('click', () => {
        const fonte = botao.dataset.fonte;
        this.iniciar(fonte);
      });
    });
  },
  
  desmontar: function() {
    // Não faz nada
  },
  
  iniciar: function(modo) {
    const status = document.getElementById('cameraStatus');
    if (status) {
      if (modo === 'celular') {
        status.textContent = '📱 Câmera do celular selecionada. Funcionalidade em desenvolvimento.';
      } else {
        status.textContent = '🚌 Câmera do ônibus selecionada. Funcionalidade em desenvolvimento.';
      }
    }
    
    if (typeof avisar === 'function') {
      avisar('Câmera de assentos em desenvolvimento. Em breve estará disponível.');
    }
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
  
  parar: function() {
    // Não faz nada
  }
};
