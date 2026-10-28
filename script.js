const $ = s => document.querySelector(s);
const anim = (el, ms = 0) => { el.classList.remove("animate-rise"); void el.offsetWidth; el.style.animationDelay = ms + "ms"; el.classList.add("animate-rise", "motion-reduce:animate-none"); };
const norm = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const rand = n => Math.floor(Math.random() * n);
const fmt = m => m < 1000 ? Math.round(m) + " metros" : (m / 1000).toFixed(1).replace(".", ",") + " km";
const SPEED = 5; // segundos simulados por segundo real (1 = tempo real)

// Foco: ônibus turísticos. Coordenadas APROXIMADAS (Parque das Aves vem da Wikipédia): confirme cada uma no Google Maps
// (clique direito no local > copiar coordenadas). s = nome do serviço, l = sigla no mapa. Serviço e operadora são EXEMPLOS
// a confirmar (Parque Nacional: Urbia Cataratas; Itaipu: Itaipu Binacional; City Tour: Iguassu City Tour; transfer: a definir).
const BASE = { n: "Centro de Foz (hotéis)", c: [-25.5163, -54.5854] };
const P = [
  { n: "Cataratas do Iguaçu", s: "Ônibus do Parque Nacional", l: "PN", c: [-25.6866, -54.4420], k: ["catarata"] },
  { n: "Parque das Aves", s: "Transfer turístico", l: "TT", c: [-25.6140, -54.4826], k: ["aves"] },
  { n: "Itaipu Binacional", s: "Ônibus panorâmico de Itaipu", l: "IT", c: [-25.4380, -54.5880], k: ["itaipu", "usina"] },
  { n: "Marco das Três Fronteiras", s: "City Tour panorâmico", l: "CT", c: [-25.5974, -54.5912], k: ["marco", "fronteira"] },
  { n: "Templo Budista Chen Tien", s: "City Tour panorâmico", l: "CT", c: [-25.5330, -54.5620], k: ["templo", "budista"] }
];
const find = t => { t = norm(t); return P.find(x => x.k.some(k => t.includes(k))); };
console.assert(find("Quero ir às Cataratas")?.l === "PN" && find("templo budista")?.n.startsWith("Templo") && !find("pizza"), "find() falhou");

/* ---------- Fala ---------- */
let welcomed = false, anywhere = true; // na tela inicial, tocar em qualquer lugar liga o microfone; desliga ao entender o primeiro destino
function say(t, o = {}){
  if(!o.queue) speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t); u.lang = "pt-BR"; u.onstart = o.onstart;
  speechSynthesis.speak(u);
}
const WELCOME = "Bem-vindo ao Mobintec, o aplicativo dos ônibus turísticos de Foz do Iguaçu. Toque em qualquer lugar da tela e diga o destino: Cataratas, Parque das Aves, Itaipu, Marco das Três Fronteiras ou Templo Budista. Depois você pode perguntar sobre o ônibus turístico, o assento, a rota e hotéis próximos.";
const welcome = () => say(WELCOME, { onstart: () => welcomed = true });
addEventListener("load", welcome); // o navegador pode bloquear até o primeiro toque
addEventListener("pointerdown", e => { if(!welcomed && !(anywhere && !$("#home").hidden) && !e.target.closest("#mic")) welcome(); }, true);

/* ---------- Telas ---------- */
function show(name){
  stop();
  for(const id of ["home", "lista"]){
    const on = id === name; $("#" + id).hidden = !on; $("#" + id).setAttribute("aria-hidden", !on);
    const b = $("#n" + id[0].toUpperCase() + id.slice(1));
    b.setAttribute("aria-current", on ? "page" : "false");
    b.className = "px-4 min-h-12 rounded-lg font-medium " + (on ? "bg-primary text-white border-2 border-accent" : "bg-card border-2 border-hairline");
  }
  anim($("#" + name)); $("#" + name + " h1").focus();
  if(name === "lista"){ initMap(); [...$("#cards").children].forEach((c, i) => anim(c, 120 + i * 90)); say("Mapa e lista de atrações. Escolha um destino."); }
}
$("#nHome").onclick = () => show("home");
$("#nLista").onclick = () => show("lista");

/* ---------- Mapa (Leaflet + OpenStreetMap) ---------- */
let map, layer, bus, me;
const tip = t => { const e = document.createElement("span"); e.textContent = t; return e; };
const icon = (t, bg, fg = "#fff", sz = 36) => L.divIcon({ className: "", iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2], html: `<div class="pin" style="width:${sz}px;height:${sz}px;background:${bg};color:${fg}">${t}</div>` });
const TILES = ["https://tile.openstreetmap.org/{z}/{x}/{y}.png", "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"];
let tilesOk = false;
function tiles(i){ // se o OpenStreetMap bloquear os quadros, tenta o provedor seguinte
  const t = L.tileLayer(TILES[i], { maxZoom: 19, subdomains: "abcd" }).addTo(map);
  t.on("tileload", () => { tilesOk = true; $("#mapMsg").textContent = ""; });
  t.on("tileerror", () => {
    if(tilesOk || t.failed) return;
    t.failed = true; map.removeLayer(t);
    if(i + 1 < TILES.length) tiles(i + 1); else $("#mapMsg").textContent = "Os quadros do mapa não carregaram. Verifique a internet ou desative bloqueadores.";
  });
}
function initMap(){
  if(!window.L) return $("#mapMsg").textContent = "O mapa não carregou: a biblioteca Leaflet foi bloqueada ou está sem internet.";
  if(map) return setTimeout(() => map.invalidateSize(), 60);
  map = L.map("map", { keyboard: false, zoomControl: false, attributionControl: false }).setView(BASE.c, 11); // o mapa é visual: tudo também está em texto
  $("#mapMsg").textContent = "Carregando o mapa…"; tiles(0);
  layer = L.layerGroup().addTo(map);
  L.marker(BASE.c, { icon: icon("E", "#f5eeef", "#141012"), keyboard: false }).bindTooltip(tip("Embarque: " + BASE.n)).addTo(map);
  P.forEach((p, i) => L.marker(p.c, { icon: icon(p.l, "#8b1f2f"), keyboard: false }).bindTooltip(tip(p.n)).on("click", () => choose(i)).addTo(map));
  setTimeout(() => map.invalidateSize(), 60);
}

/* ---------- Voz e assistente ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let useWhisper = !SR, recording = false, busy = false, mr, ms, asr;
let rec, on = false, hit = false, starting = false; // starting evita 2 toques seguidos criarem 2 reconhecimentos
const setMsg = t => { $("#state").textContent = t; $("#ans").textContent = t; };
function reply(m){ setMsg(m); say(m); }
function stop(){
  if(rec && (on || starting)) try{ rec.abort(); }catch{}
  if(recording){ mr.ondataavailable = null; mr.onstop = () => ms.getTracks().forEach(t => t.stop()); mr.stop(); recording = false; }
  on = starting = false; $("#ring").classList.remove("listening");
  for(const b of [$("#mic"), $("#ask")]) b.setAttribute("aria-pressed", "false");
}
function go(p, said){
  hit = true; anywhere = false; stop(); $("#heard").textContent = "“" + said.trim() + "”"; setMsg("Entendi: " + p.n + ".");
  setTimeout(() => { show("lista"); choose(P.indexOf(p)); }, 600);
}
function ask(text){
  const p = find(text); if(p) return go(p, text);
  const t = norm(text);
  if(!cur) return reply("Primeiro diga um destino, por exemplo Cataratas.");
  if(/hotel|hospedagem|pousada|perto|proxim|referencia/.test(t)) return reply(hotelText());
  if(/assento|poltrona|lugar|vaga|livre|ocupad/.test(t)) return reply(seatText());
  if(/rota|caminho|linha|distancia|como/.test(t)) return reply(routeText());
  if(/onde|onibus|chega|minuto|tempo|demora|status/.test(t)) return reply(sentence());
  reply("Posso informar o ônibus, o assento PCD, a rota e hotéis próximos. Pergunte, por exemplo: tem assento livre?");
}
/* Plano B: reconhecimento dentro do navegador (Whisper tiny via transformers.js). Serve onde a voz do navegador falha
   (Firefox, Brave, Safari sem ditado, rede bloqueando). Baixa cerca de 40 MB na primeira vez e fica em cache. */
const heard = t => { t = t.trim(); $("#heard").textContent = t; if(!t) return reply("Não ouvi nada. Toque e fale de novo."); const p = find(t); p ? go(p, t) : ask(t); };
const loadAsr = () => asr ??= import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.web.min.js")
  .then(m => m.pipeline("automatic-speech-recognition", "Xenova/whisper-tiny", { progress_callback: p => { if(p.status === "progress") setMsg(`Baixando o reconhecimento de voz: ${Math.round(p.progress)}% (só na primeira vez)`); } }))
  .catch(err => { asr = null; throw err; });
async function listenWhisper(b){
  if(recording) return mr.stop();
  if(busy) return;
  welcomed = true; speechSynthesis.cancel(); hit = false; $("#heard").textContent = "";
  try{ ms = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch{ return reply("Não consegui usar o microfone. Libere a permissão nas configurações do navegador ou escolha o destino abaixo."); }
  const chunks = []; mr = new MediaRecorder(ms); const m = mr;
  mr.ondataavailable = e => chunks.push(e.data);
  mr.onstop = async () => {
    recording = false; busy = true; ms.getTracks().forEach(t => t.stop()); $("#ring").classList.remove("listening"); b.setAttribute("aria-pressed", "false");
    try{
      setMsg("Entendendo o que você disse…");
      const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const audio = await ctx.decodeAudioData(await new Blob(chunks, { type: m.mimeType }).arrayBuffer()); ctx.close();
      if(!asr) say("Preparando o reconhecimento de voz do site. Pode levar um minuto na primeira vez.");
      heard((await (await loadAsr())(audio.getChannelData(0), { language: "portuguese", task: "transcribe" })).text);
    }catch{ reply("Não consegui entender o áudio. Verifique a internet ou escolha o destino abaixo."); }
    busy = false;
  };
  mr.start(); recording = true; $("#ring").classList.add("listening"); b.setAttribute("aria-pressed", "true");
  setMsg("Ouvindo… fale agora e toque de novo para terminar");
  setTimeout(() => m.state === "recording" && m.stop(), 6000);
}
function listen(b){
  if(starting) return;
  if(on) return stop(), setMsg("Microfone desligado");
  welcomed = true; speechSynthesis.cancel();
  if(useWhisper) return listenWhisper(b);
  if(rec){ rec.onstart = rec.onresult = rec.onerror = rec.onend = null; try{ rec.abort(); }catch{} } // ignora eventos de um reconhecimento antigo
  rec = new SR(); rec.lang = "pt-BR"; rec.interimResults = true; hit = false; $("#heard").textContent = "";
  rec.onstart = () => { starting = false; on = true; $("#ring").classList.add("listening"); b.setAttribute("aria-pressed", "true"); setMsg("Ouvindo… fale agora"); };
  rec.onresult = e => {
    const t = [...e.results].map(r => r[0].transcript).join(" "); $("#heard").textContent = t; if(hit) return;
    const p = find(t); if(p) return go(p, t);
    if(e.results[e.results.length - 1].isFinal){ hit = true; stop(); ask(t); }
  };
  rec.onerror = e => {
    starting = false;
    if(["network", "service-not-allowed", "language-not-supported"].includes(e.error)){ hit = true; useWhisper = true; setMsg("O serviço de voz do navegador não está disponível. Usando o reconhecimento do próprio site…"); return listenWhisper(b); }
    const m = { "not-allowed": "Permissão do microfone negada. Libere o microfone nas configurações do navegador ou escolha o destino abaixo.",
      "no-speech": "Não ouvi nada. Toque e fale de novo.", "audio-capture": "Nenhum microfone encontrado." }[e.error];
    if(m){ hit = true; setMsg(m + " (código: " + e.error + ")"); say(m); }
    else if(e.error !== "aborted"){ hit = true; setMsg("Erro de voz (código: " + e.error + ")."); }
  };
  rec.onend = () => { starting = false; const was = on; stop(); if(was && !hit) reply("Não entendi. Toque e diga, por exemplo, Cataratas ou: tem assento livre?"); };
  starting = true; setTimeout(() => { if(starting && !on){ starting = false; reply("O microfone demorou para responder. Toque de novo ou escolha o destino abaixo."); } }, 10000);
  try{ rec.start(); }catch{ starting = false; reply("Não consegui ligar o microfone. Escolha o destino abaixo."); }
}
$("#mic").onclick = () => listen($("#mic"));
$("#ask").onclick = () => listen($("#ask"));
document.addEventListener("click", e => { if(anywhere && !$("#home").hidden && !e.target.closest("button, input, a")) listen($("#mic")); });
// Plano B sem voz: botões de destino sempre visíveis + aviso quando o navegador não ajuda
$("#quick").innerHTML = P.map((p, i) => `<button data-q="${i}" aria-label="Escolher ${p.n}" class="px-4 min-h-12 rounded-lg font-medium bg-card border-2 border-hairline">${p.n}</button>`).join("");
$("#quick").onclick = e => { const b = e.target.closest("[data-q]"); if(b) go(P[+b.dataset.q], P[+b.dataset.q].n); };
if(/Instagram|FBAN|FBAV|FB_IAB|WhatsApp|TikTok|Line\/|; wv\)/i.test(navigator.userAgent)){
  $("#warn").hidden = false; $("#warn").textContent = "Você abriu o site dentro de outro aplicativo (como Instagram ou WhatsApp), onde a voz não funciona. Toque nos três pontinhos e escolha “Abrir no navegador” (Chrome ou Safari).";
} else if(!SR){
  $("#warn").hidden = false; $("#warn").textContent = "Este navegador não tem reconhecimento de voz próprio. O site vai usar o dele, que baixa cerca de 40 MB na primeira vez. Se preferir, escolha o destino abaixo.";
}
$("#form").onsubmit = e => { e.preventDefault(); const v = $("#typed").value, p = find(v); p ? go(p, v) : ask(v); };

/* ---------- Lista ---------- */
$("#cards").innerHTML = P.map((p, i) => `<li class="bg-card rounded-xl p-8 flex flex-col gap-4">
  <span class="self-start bg-ink text-canvas rounded-full px-5 py-2 text-2xl font-semibold">${p.s}</span>
  <h2 class="text-2xl font-medium">${p.n}</h2>
  <button data-i="${i}" aria-label="Acompanhar o ${p.s} até ${p.n}" class="mt-auto px-5 min-h-12 rounded-lg text-lg font-medium bg-primary text-white border-2 border-accent">Acompanhar o ônibus</button></li>`).join("");
$("#cards").onclick = e => { const b = e.target.closest("[data-i]"); if(b) choose(+b.dataset.i); };

/* ---------- Painel: ônibus, câmera, rota e hotéis ---------- */
// shortcut: posição e câmera são simuladas; a rota (OSRM) e os hotéis (OpenStreetMap) são reais.
// Trocar por fetch à API de frota/visão computacional. O ônibus vem do lado do destino rumo ao embarque.
let cur, s, tm, tc, tok = 0, lastMin;
const mins = () => Math.max(1, Math.ceil(s.eta / 60));
const seatText = () => `Poltrona PCD ${s.pcdBusy ? "ocupada" : "livre"}. ${s.free} de 12 assentos livres.`;
const routeText = () => `${cur.s}: de ${BASE.n} até ${cur.n}, ${fmt(s.dist)}, cerca de ${Math.round(s.dur / 60)} minutos de viagem.`;
const hotelText = () => s.hot.length ? "Perto de " + cur.n + ": " + s.hot.map(h => `${h.n}, a ${fmt(h.d)}`).join("; ") + "." : "Não encontrei hotéis próximos nos dados do mapa.";
const sentence = () => `${cur.s} ${s.eta ? `chegando em ${mins()} ${mins() > 1 ? "minutos" : "minuto"}` : "chegou ao ponto de embarque"} com assento PCD ${s.pcdBusy ? "ocupado" : "livre"}. ${s.free} assentos livres.`;
const busPos = () => s.pts[Math.round(s.eta / s.dur * (s.pts.length - 1))];

async function route(a, b){
  try{
    const j = (await (await fetch(`https://router.project-osrm.org/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`)).json()).routes[0];
    return { pts: j.geometry.coordinates.map(([x, y]) => [y, x]), dur: j.duration, dist: j.distance };
  }catch{ const d = map.distance(a, b); return { pts: [a, b], dur: d / 8, dist: d }; } // sem internet: linha reta
}
function render(){
  const c = s.pcdBusy ? "bg-accent text-canvas" : "bg-ok text-canvas";
  $("#alert").className = "rounded-xl p-5 mt-5 font-display text-3xl md:text-4xl " + c;
  $("#pcd").className = "font-display text-5xl rounded-xl px-5 py-2 mt-3 inline-block " + c;
  $("#pcd").textContent = s.pcdBusy ? "✕ OCUPADA" : "✓ LIVRE";
  $("#eta").textContent = s.eta ? mins() + " min" : "Chegou";
  $("#cam").textContent = `Ativa · ${s.free} de 12 assentos livres · ${new Date().toLocaleTimeString("pt-BR")}`;
}
function announce(prefix = ""){
  render(); const a = $("#alert"), t = (prefix + " " + sentence()).trim();
  a.textContent = ""; setTimeout(() => a.textContent = (s.pcdBusy ? "✕ " : "✓ ") + t, 40);
  say(t);
}
async function choose(i){
  if(!map) return;
  clearInterval(tm); clearInterval(tc); const my = ++tok; cur = P[i];
  $("#h-panel").textContent = `${cur.s} · ${cur.n}`; $("#route").textContent = "Calculando a rota…"; $("#hotels").replaceChildren();
  const pn = $("#panel"); pn.hidden = false; pn.setAttribute("aria-hidden", "false"); anim(pn); layer.clearLayers();
  const r = await route(BASE.c, cur.c); if(my !== tok) return;
  s = { ...r, pcdBusy: false, free: 2 + rand(8), hot: [], eta: Math.min(r.dur, 240 + rand(120)) }; lastMin = mins();
  L.polyline(s.pts, { color: "#e58a9f", weight: 6 }).addTo(layer);
  L.marker(cur.c, { icon: icon(cur.l, "#8b1f2f"), keyboard: false }).bindTooltip(tip(cur.n)).addTo(layer);
  bus = L.marker(busPos(), { icon: icon(cur.l, "#f5eeef", "#141012", 46), keyboard: false, zIndexOffset: 1000 }).addTo(layer);
  map.fitBounds(L.polyline(s.pts).getBounds(), { padding: [30, 30] });
  $("#route").textContent = routeText(); announce("Você escolheu " + cur.n + ".");
  $("#panel").scrollIntoView({ behavior: "smooth" });
  tm = setInterval(tick, 1000); tc = setInterval(camera, 12000); nearby(my);
}
function tick(){
  s.eta = Math.max(0, s.eta - SPEED); bus.setLatLng(busPos());
  if(!s.eta){ clearInterval(tm); announce(); } else if(mins() !== lastMin){ lastMin = mins(); announce(); } else render();
}
function camera(){
  const was = s.pcdBusy; if(Math.random() < .3) s.pcdBusy = !s.pcdBusy;
  s.free = Math.min(12, Math.max(0, s.free + rand(3) - 1));
  was !== s.pcdBusy ? announce("Atenção.") : render();
}
async function nearby(my){
  const li = t => { const e = document.createElement("li"); e.textContent = t; return e; };
  try{
    const q = `[out:json][timeout:15];nwr["tourism"~"hotel|hostel|guest_house|motel|apartment"]["name"](around:5000,${cur.c});out center 40;`;
    const j = await (await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: new URLSearchParams({ data: q }) })).json();
    if(my !== tok) return;
    s.hot = j.elements.map(e => { const c = [e.lat ?? e.center?.lat, e.lon ?? e.center?.lon]; return { n: e.tags.name, c, d: map.distance(cur.c, c) }; })
      .filter(h => h.c[0]).sort((a, b) => a.d - b.d).slice(0, 4);
  }catch{ if(my !== tok) return; s.hot = []; }
  $("#hotels").replaceChildren(...(s.hot.length ? s.hot.map(h => li(`${h.n} · ${fmt(h.d)}`)) : [li("Sem hotéis nos dados do mapa nesta região.")]));
  s.hot.forEach(h => L.marker(h.c, { icon: icon("H", "#f5eeef", "#141012", 30), keyboard: false }).bindTooltip(tip(h.n)).addTo(layer));
  say(hotelText(), { queue: true });
}
$("#again").onclick = () => cur && announce();
$("#hearHotels").onclick = () => cur && reply(hotelText());
$("#loc").onclick = () => navigator.geolocation ? navigator.geolocation.getCurrentPosition(pos => {
  const c = [pos.coords.latitude, pos.coords.longitude]; me?.remove();
  me = L.marker(c, { icon: icon("EU", "#5db872", "#141012", 40), keyboard: false }).addTo(map);
  reply(`Você está a ${fmt(map.distance(c, BASE.c))} do ponto de embarque, ${BASE.n}.`);
}, () => reply("Não consegui sua localização. Libere a localização no navegador.")) : reply("Este navegador não tem localização.");

show("home");