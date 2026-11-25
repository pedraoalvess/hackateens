window.CameraMobintec = {
  montarEm: function(seletor) {
    const lugar = document.querySelector(seletor);
    if (!lugar) return;
    lugar.innerHTML = '<div style="padding:1rem;background:#2a1a20;border-radius:8px;margin-top:1rem;"><h3 style="color:#fff;margin:0 0 0.5rem 0;">📷 Leitura de Assentos</h3><p style="color:#ebd0d6;margin:0 0 1rem 0;">Câmera em configuração. Em breve estará disponível.</p><button class="botao botao-forte" style="width:100%;" onclick="alert(\'Câmera será implementada em breve!\')">Começar leitura</button></div>';
  },
  desmontar: function() {},
  iniciar: function(modo) {
    if (typeof avisar === 'function') avisar('Câmera de assentos em desenvolvimento.');
  },
  textoAssentos: function() {
    return 'Leitura da câmera em desenvolvimento. A disponibilidade do assento PCD não foi verificada.';
  },
  ouvir: function() {},
  ehMensagemDaCamera: function() { return false; },
  parar: function() {}
};
