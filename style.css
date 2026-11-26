/* ==========================================================================
   MOBINTEC - estilos próprios (o resto vem do Tailwind)
   Dois temas, escolhidos pelo botão "Tema":
   - claro  = design system do projeto (DESIGN.md): creme, coral e superfícies escuras
   - escuro = preto e bordô do grupo
   ========================================================================== */

/* ---------- Tema escuro (preto e bordô) ---------- */
:root {
    --canvas: #0d0a0b;
    --card: #1f1519;
    --card-2: #2a1a20;
    --botao: #1f1519;
    --ink: #ffffff;
    --body: #efe4e6;
    --muted: #cdb8be;
    --line: #ffb3c4;
    --hair: #5c3340;
    --focus: #ffb3c4;
    --primary: #8b1f2f;
    --on-primary: #ffffff;
    --accent: #ffb3c4;
    --ring: rgba(255, 179, 196, .25);
    --glow: rgba(139, 31, 47, .55);
    --dark: #3b1522;
    --dark-2: #4e1f2e;
    --on-dark: #ffffff;
    --on-dark-soft: #ebd0d6;
    --ok: #5de08a;
    --warn: #ffb3c4;
    --veu-1: rgba(13, 10, 11, .3);
    --veu-2: rgba(13, 10, 11, .8);
    --bolha-texto: #ffffff;
    color-scheme: dark;
}

/* ---------- Tema claro ---------- */
body.claro {
    --canvas: #faf9f5;
    --card: #efe9de;
    --card-2: #f5f0e8;
    --botao: #faf9f5;
    --ink: #141413;
    --body: #3d3d3a;
    --muted: #6c6a64;
    --line: #6c6a64;
    --hair: #e6dfd8;
    --focus: #141413;
    --primary: #a9583e;
    --accent: #cc785c;
    --ring: rgba(204, 120, 92, .25);
    --glow: transparent;
    --dark: #181715;
    --dark-2: #252320;
    --on-dark: #faf9f5;
    --on-dark-soft: #a09d96;
    --ok: #5db872;
    --warn: #e8a55a;
    --veu-1: rgba(250, 249, 245, .35);
    --veu-2: rgba(250, 249, 245, .88);
    --bolha-texto: #141413;
    color-scheme: light;
}

/* ---------- Base ---------- */
[hidden] { display: none !important; }

html {
    font-size: 125%;
    scroll-behavior: smooth;
}

body {
    margin: 0;
    background: var(--canvas);
    color: var(--body);
    font-family: "StyreneB", Inter, system-ui, sans-serif;
    line-height: 1.55;
}

body::before {
    content: "";
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background: radial-gradient(60rem 26rem at 50% -8%, var(--glow), transparent 65%);
}

body h1, body h2, body .font-serif {
    font-family: "Copernicus", "Tiempos Headline", "EB Garamond", Georgia, serif;
    font-weight: 400;
    letter-spacing: -1px;
    line-height: 1.1;
    color: var(--ink);
}

:focus-visible {
    outline: 5px solid var(--focus);
    outline-offset: 3px;
    border-radius: 8px;
}

.painel :focus-visible, .rodape :focus-visible { outline-color: var(--on-dark); }

.pular { position: absolute; left: -999px; }
.pular:focus {
    left: 8px; top: 8px; background: var(--ink); color: var(--canvas);
    padding: 12px; z-index: 50;
}

/* ---------- Cabeçalho ---------- */
.topo {
    display: flex; align-items: center; gap: .85rem;
    max-width: 56rem; margin: 0 auto; padding: 1.25rem 1.25rem 0;
}
.logo {
    width: 2.8rem; height: 2.8rem; flex: none; border-radius: 12px;
    display: grid; place-items: center; background: var(--primary);
}
.marca {
    display: block; font-family: Georgia, serif;
    font-size: 1.5rem; letter-spacing: .14em; line-height: 1.1; color: var(--ink);
}
.lema { display: block; font-size: .9rem; color: var(--muted); }

/* ---------- Botões e campos ---------- */
.botao {
    min-height: 3.5rem; padding: .5rem 1.5rem; border-radius: 12px;
    border: 2px solid var(--line); background: var(--botao);
    color: var(--ink); font-size: 1.25rem; font-weight: 600; text-align: center;
    cursor: pointer; transition: transform .18s ease, background-color .2s ease, box-shadow .2s ease;
}
.botao:active { filter: brightness(.9); transform: translateY(1px) scale(.97); transition-duration: .08s; }
.botao:hover { transform: translateY(-2px); background: var(--dark); box-shadow: 0 6px 16px rgba(0,0,0,.3); }

.botao-forte {
    background: var(--primary); border-color: var(--primary);
    color: var(--on-primary); font-weight: 600;
}
.botao-forte:hover { background: #a52840; box-shadow: 0 8px 20px var(--glow); }

.campo {
    flex: 1; min-width: 0; min-height: 3.5rem; padding: 0 1rem;
    border-radius: 12px; border: 2px solid var(--line);
    background: var(--canvas); color: var(--ink); font-size: 1.25rem;
}
.campo:focus { border-color: var(--primary); box-shadow: 0 0 0 4px var(--ring); outline: none; }
.campo::placeholder { color: var(--muted); }

/* ---------- Caixas e cartões ---------- */
.caixa { background: var(--card); border: 1px solid var(--hair); border-radius: 12px; padding: 1rem; }
.cartao {
    background: var(--card); border: 1px solid var(--hair); border-radius: 12px;
    padding: 1.6rem; display: flex; flex-direction: column; gap: .9rem; align-items: flex-start;
}
.pilula {
    background: var(--card-2); color: var(--ink); border-radius: 9999px;
    padding: .2rem .9rem; font-size: .95rem; font-weight: 500;
}

/* ---------- Microfone com ondas ---------- */
.anel {
    position: relative; width: 14rem; height: 14rem;
    border: 4px solid var(--accent); border-radius: 9999px;
    display: flex; align-items: center; justify-content: center;
}
.microfone {
    position: relative; width: 10.5rem; height: 10.5rem; border-radius: 9999px;
    border: 0; background: var(--primary); color: var(--on-primary);
    display: flex; align-items: center; justify-content: center;
    transition: transform .4s; box-shadow: 0 0 0 6px var(--ring), 0 12px 32px var(--glow);
    cursor: pointer;
}
.onda {
    position: absolute; width: 10.5rem; height: 10.5rem; border-radius: 9999px;
    border: 4px solid var(--accent); opacity: 0;
}
.ouvindo .microfone { transform: scale(1.05); }
.ouvindo .onda { animation: pulsar 2.4s ease-out infinite; }
.ouvindo .onda:nth-child(2) { animation-delay: .8s; }
.ouvindo .onda:nth-child(3) { animation-delay: 1.6s; }

@keyframes pulsar {
    from { transform: scale(1); opacity: .8; }
    to { transform: scale(1.6); opacity: 0; }
}

/* ---------- Bolhas de destino ---------- */
.bolhas {
    display: grid; grid-template-columns: repeat(2, 1fr);
    gap: 1rem; width: 100%; align-items: center; justify-items: center;
}
.bolhas .anel { grid-column: 1 / -1; }
.bolha {
    position: relative; overflow: hidden; width: 100%; max-width: 10.5rem;
    aspect-ratio: 1 / 1; border-radius: 9999px; border: 3px solid var(--accent);
    background: var(--card); color: var(--bolha-texto); padding: .75rem;
    display: flex; align-items: center; justify-content: center;
    text-align: center; font-size: 1.05rem; font-weight: 700; line-height: 1.2;
    transition: transform .3s, opacity .3s; cursor: pointer;
}
.bolha .foto { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: .65; }
.bolha .foto::after {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(180deg, var(--veu-1), var(--veu-2));
}
.bolha .nome { position: relative; }
body:not(.claro) .bolha .nome { text-shadow: 0 1px 4px #000; }

.anel.ouvindo ~ .bolha { animation: respirar 2.4s ease-in-out infinite; }
.bolha.ativa { transform: scale(1.15); border-width: 6px; animation: pulsarBolha .9s ease-in-out infinite alternate; }
.bolha.ativa .foto { opacity: .95; }
.bolha.apagada { opacity: .35; animation: none; }

@keyframes respirar { 50% { transform: scale(1.04); } }
@keyframes pulsarBolha { to { box-shadow: 0 0 0 10px var(--ring); } }

@media (min-width: 768px) {
    .bolhas { grid-template-columns: repeat(3, 1fr); }
    .bolhas .anel { grid-column: 2; grid-row: 2; width: 16rem; height: 16rem; }
    .bolhas .microfone, .bolhas .onda { width: 12rem; height: 12rem; }
    .b1 { grid-area: 1 / 1; } .b2 { grid-area: 1 / 3; } .b3 { grid-area: 2 / 1; }
    .b4 { grid-area: 2 / 3; } .b5 { grid-area: 3 / 2; }
}

/* ---------- Painel do ônibus ---------- */
.painel {
    background: var(--dark); color: var(--on-dark); border-radius: 12px;
    padding: 1.6rem; display: flex; flex-direction: column; gap: 1.25rem;
}
.painel h2, .painel h3 { color: var(--on-dark); }
.subcaixa {
    background: var(--dark-2); border-radius: 8px; padding: 1.25rem;
    display: flex; flex-direction: column; gap: .75rem; align-items: flex-start; width: 100%;
}
.painel .botao { background: var(--dark-2); color: var(--on-dark); border-color: var(--on-dark-soft); }
.painel .botao-forte { background: var(--primary); border-color: var(--primary); color: var(--on-primary); }
.painel #listaHoteis, .painel #textoCamera, .painel #textoRota { color: var(--on-dark); }

.alerta, .selo {
    background: var(--ok); color: #141413; border-radius: 8px;
    font-family: Georgia, serif;
}
.alerta { padding: 1.25rem; font-size: 1.9rem; }
.selo { padding: .25rem 1.25rem; font-size: 2.5rem; }
.alerta.ocupado, .selo.ocupado { background: var(--warn); }

.progresso { width: 100%; height: .9rem; border-radius: 9999px; background: rgba(255, 255, 255, .2); overflow: hidden; }
.barra { height: 100%; width: 0; border-radius: 9999px; background: linear-gradient(90deg, var(--accent), var(--ok)); transition: width 1s linear; }

.aba { display: flex; flex-direction: column; gap: 1.25rem; }
.aba[hidden] { display: none; }
.painel .botao-aba[aria-current="true"], .botao-cat[aria-current="true"] {
    background: var(--primary); border-color: var(--primary); color: var(--on-primary);
}

/* ---------- Mapa e rodapé ---------- */
#mapa { height: 22rem; border: 2px solid var(--line); border-radius: 16px; isolation: isolate; }
.pino { display: flex; align-items: center; justify-content: center; border-radius: 9999px; border: 3px solid #fff; font: 600 14px/1 sans-serif; }
body.claro .pino { border-color: #141413; }

.rodape {
    background: var(--dark); color: var(--on-dark-soft); padding: 3rem 1.25rem;
    text-align: center; font-size: .95rem; margin-top: 3rem; padding-bottom: 6rem !important;
}

/* ---------- Acessibilidade extra ---------- */
@media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    .anel.ouvindo ~ .bolha, .bolha.ativa, .ouvindo .onda { animation: none; }
    .ouvindo .onda { opacity: .5; }
    .botao, .bolha, .barra, .microfone { transition: none; }
}
@media (forced-colors: active) {
    .bolha .foto { display: none; }
    .barra { forced-color-adjust: none; background: Highlight; }
    .botao, .bolha, .campo, .caixa, .cartao, .painel { border: 2px solid ButtonText; }
}

/* ---------- Conversa com a assistente ---------- */
.conversa { list-style: none; margin: .75rem 0 0; padding: 0; display: flex; flex-direction: column; gap: .5rem; text-align: left; }
.conversa li { padding: .6rem .9rem; border-radius: 12px; background: var(--card-2); color: var(--ink); }
.conversa .voce { background: var(--primary); color: var(--on-primary); align-self: flex-end; max-width: 90%; }
.conversa .assistente { align-self: flex-start; max-width: 95%; }

/* ---------- Painel da câmera de assentos ---------- */
.camera-painel {
    background: var(--dark); color: var(--on-dark); border-radius: 12px;
    padding: 1.25rem; display: flex; flex-direction: column; gap: .9rem; align-items: flex-start; width: 100%;
}
.painel .camera-painel { background: var(--dark-2); border-radius: 8px; }
.camera-painel h3 { color: var(--on-dark); }
.camera-fontes, .camera-acoes { display: flex; flex-wrap: wrap; gap: .6rem; width: 100%; }
.camera-painel .botao { background: var(--dark-2); color: var(--on-dark); border-color: var(--on-dark-soft); }
.painel .camera-painel .botao { background: var(--dark); }
.camera-painel .botao[aria-pressed="true"], .camera-painel .botao-forte,
.painel .camera-painel .botao[aria-pressed="true"], .painel .camera-painel .botao-forte {
    background: var(--primary); border-color: var(--primary); color: var(--on-primary);
}
.camera-painel :focus-visible { outline-color: var(--on-dark); }
.camera-video { width: 100%; max-height: 380px; object-fit: contain; background: #111; border-radius: 12px; }
.camera-estado { margin: 0; font-size: 1.1rem; font-weight: 600; color: var(--on-dark); }
.camera-aviso-fixa, .camera-nota { margin: 0; font-size: .9rem; color: var(--on-dark-soft); }

/* ---------- Assistente flutuante ---------- */
.chat-abrir {
    position: fixed; right: 1rem; bottom: 1rem; z-index: 1000;
    display: flex; align-items: center; gap: .5rem; min-height: 3.75rem;
    padding: .5rem 1.25rem; border-radius: 999px; border: 2px solid var(--primary);
    background: var(--primary); color: var(--on-primary); font-size: 1.15rem;
    font-weight: 700; box-shadow: 0 6px 20px rgba(0, 0, 0, .25); cursor: pointer;
    transition: transform .2s ease, box-shadow .2s ease, background-color .2s ease;
}
.chat-abrir:hover { transform: translateY(-3px); background: #a52840; box-shadow: 0 10px 28px rgba(139,31,47,.6); }
.chat-abrir:active { transform: translateY(1px) scale(.97); transition-duration: .08s; }
.chat-abrir:not([aria-expanded="true"]) { animation: pulse-sutil 3s ease-in-out infinite; }

@keyframes pulse-sutil {
    0%, 100% { box-shadow: 0 6px 20px rgba(0, 0, 0, .25); }
    50% { box-shadow: 0 6px 20px rgba(0, 0, 0, .25), 0 0 0 6px var(--ring); }
}
.chat-abrir[aria-expanded="true"] { background: #a52840; animation: none; }

.chat-flutuante {
    position: fixed; right: 1rem; bottom: 1rem; z-index: 1000;
    width: min(26rem, calc(100vw - 2rem)); height: min(34rem, calc(100vh - 2rem));
    display: flex; flex-direction: column; gap: .75rem; padding: 1rem;
    border-radius: 16px; border: 2px solid var(--line); background: var(--canvas);
    color: var(--ink); box-shadow: 0 10px 30px rgba(0, 0, 0, .3);
}
.chat-flutuante[hidden], .chat-abrir[hidden] { display: none; }
.chat-topo { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
.chat-fechar { min-height: 3rem; padding: .25rem 1rem; }
.chat-lista { flex: 1; overflow-y: auto; margin: 0; }
.chat-form { display: flex; gap: .5rem; }
.chat-form .botao { padding: .5rem .9rem; }
.chat-mic { display: flex; align-items: center; justify-content: center; }
.chat-mic[aria-pressed="true"] { background: var(--primary); border-color: var(--primary); color: var(--on-primary); }
#botaoPerguntar { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; }

.falar-sempre {
    position: fixed; left: 1rem; bottom: 1rem; z-index: 1000;
    width: 3.75rem; height: 3.75rem; display: flex; align-items: center;
    justify-content: center; border-radius: 999px; border: 2px solid var(--primary);
    background: var(--primary); color: var(--on-primary); cursor: pointer;
    transition: transform .2s ease, box-shadow .2s ease, background-color .2s ease;
}
.falar-sempre:focus-visible { outline: 4px solid var(--primary); outline-offset: 4px; }
.falar-sempre[aria-pressed="true"] { animation: pulsarMic 1.2s ease-in-out infinite; background: #5de08a; color: #0d0a0b; }
.falar-sempre:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(0,0,0,.4); }
.falar-sempre:active { transform: translateY(1px) scale(.97); transition-duration: .08s; }

@keyframes pulsarMic { 50% { transform: scale(1.12); } }
@media (prefers-reduced-motion: reduce) {
    .falar-sempre[aria-pressed="true"] { animation: none; outline: 4px solid var(--primary); }
}

/* ==========================================================================
   NOVAS ADIÇÕES: Tela de Escolha de Modo e Barra de Pergunta
   ========================================================================== */

.tela-escolha {
    display: flex; flex-direction: column; align-items: center;
    gap: 2rem; text-align: center; padding: 2rem 1rem;
}
.tela-escolha .texto-explicativo { font-size: 1.25rem; color: var(--body); }
.container-modos { display: flex; flex-direction: column; gap: 1.5rem; width: 100%; max-width: 48rem; }
@media (min-width: 768px) { .container-modos { flex-direction: row; } }

.botao-modo {
    flex: 1; background: var(--card); border: 3px solid var(--primary);
    border-radius: 16px; padding: 2rem; cursor: pointer; text-align: center;
    color: var(--ink); transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
}
.botao-modo:hover { transform: translateY(-4px); border-color: var(--accent); box-shadow: 0 10px 24px var(--glow); }
.botao-modo:active { transform: translateY(0) scale(.98); }
.botao-modo h2 { color: var(--ink); margin: 1rem 0 .5rem; font-size: 1.5rem; }
.botao-modo p { color: var(--body); font-size: 1.1rem; line-height: 1.5; }
.botao-modo .icone-modo { font-size: 4rem; display: inline-block; transition: transform .3s ease; }
.botao-modo:hover .icone-modo { transform: scale(1.15); }
.tela-escolha .texto-ajuda { font-size: 0.9rem; color: var(--muted); }

.microfone-grande { width: 14rem; height: 14rem; }
.microfone-grande:hover { transform: scale(1.05); }
.microfone-grande:active { transform: scale(.95); transition-duration: .08s; }

.barra-pergunta {
    display: flex; flex-wrap: wrap; gap: .6rem; align-items: center;
    padding: 1rem; border: 2px solid var(--line); border-radius: 12px;
    background: var(--dark-2); margin-bottom: 1rem;
}
.barra-pergunta form { display: flex; gap: .5rem; flex: 1; min-width: 240px; }
.barra-pergunta .campo { flex: 1; }
.barra-pergunta .eco { width: 100%; margin: 0; font-size: 1rem; color: var(--on-dark-soft); }
