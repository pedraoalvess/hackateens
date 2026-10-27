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
function say(t, o = {}) {
  if (!o.queue) speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t); u.lang = "pt-BR"; u.onstart = o.onstart;
  speechSynthesis.speak(u);
}
const WELCOME = "Bem-vindo ao Foz Acessível, o aplicativo dos ônibus turísticos de Foz do Iguaçu. Toque em qualquer lugar da tela e diga o destino: Cataratas, Parque das Aves, Itaipu, Marco das Três Fronteiras ou Templo Budista. Depois você pode perguntar sobre o ônibus turístico, o assento, a rota e hotéis próximos.";
const welcome = () => say(WELCOME, { onstart: () => welcomed = true });
addEventListener("load", welcome); // o navegador pode bloquear até o primeiro toque
addEventListener("pointerdown", e => { if (!welcomed && !(anywhere && !$("#home").hidden) && !e.target.closest("#mic")) welcome(); }, true);

/* ---------- Telas ---------- */
function show(name) {
  stop();
  for (const id of ["home", "lista"]) {
    const on = id === name; $("#" + id).hidden = !on; $("#" + id).setAttribute("aria-hidden", !on);
    const b = $("#n" + id[0].toUpperCase() + id.slice(1));
    b.setAttribute("aria-current", on ? "page" : "false");
    b.className = "px-4 min-h-12 rounded-lg font-medium " + (on ? "bg-primary text-white border-2 border-accent" : "bg-card border-2 border-hairline");
  }
  anim($("#" + name)); $("#" + name + " h1").focus();
  if (name === "lista") { initMap();[...$("#cards").children].forEach((c, i) => anim(c, 120 + i * 90)); say("Mapa e lista de atrações. Escolha um destino."); }
}
$("#nHome").onclick = () => show("home");
$("#nLista").onclick = () => show("lista");

/* ---------- Mapa (Leaflet + OpenStreetMap) ---------- */
let map, layer, bus, me;
const tip = t => { const e = document.createElement("span"); e.textContent = t; return e; };
const icon = (t, bg, fg = "#fff", sz = 36) => L.divIcon({ className: "", iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2], html: `<div class="pin" style="width:${sz}px;height:${sz}px;background:${bg};color:${fg}">${t}</div>` });
const TILES = ["https://tile.openstreetmap.org/{z}/{x}/{y}.png", "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"];
let tilesOk = false;
function tiles(i) { // se o OpenStreetMap bloquear os quadros, tenta o provedor seguinte
  const t = L.tileLayer(TILES[i], { maxZoom: 19, subdomains: "abcd" }).addTo(map);
  t.on("tileload", () => { tilesOk = true; $("#mapMsg").textContent = ""; });
  t.on("tileerror", () => {
    if (tilesOk || t.failed) return;
    t.failed = true; map.removeLayer(t);
    if (i + 1 < TILES.length) tiles(i + 1); else $("#mapMsg").textContent = "Os quadros do mapa não carregaram. Verifique a internet ou desative bloqueadores.";
  });
}
function initMap() {
  if (!window.L) return $("#mapMsg").textContent = "O mapa não carregou: a biblioteca Leaflet foi bloqueada ou está sem internet.";
  if (map) return setTimeout(() => map.invalidateSize(), 60);
  map = L.map("map", { keyboard: false, zoomControl: false, attributionControl: false }).setView(BASE.c, 11); // o mapa é visual: tudo também está em texto
  $("#mapMsg").textContent = "Carregando o mapa…"; tiles(0);
  layer = L.layerGroup().addTo(map);
  L.marker(BASE.c, { icon: icon("E", "#f5eeef", "#141012"), keyboard: false }).bindTooltip(tip("Embarque: " + BASE.n)).addTo(map);
  P.forEach((p, i) => L.marker(p.c, { icon: icon(p.l, "#8b1f2f"), keyboard: false }).bindTooltip(tip(p.n)).on("click", () => choose(i)).addTo(map));
  setTimeout(() => map.invalidateSize(), 60);
}

/* ---------- Voz e assistente ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec, on = false, hit = false;
const setMsg = t => { $("#state").textContent = t; $("#ans").textContent = t; };
function reply(m) { setMsg(m); say(m); }
function stop() {
  if (on) rec.abort();
  on = false; $("#ring").classList.remove("listening");
  for (const b of [$("#mic"), $("#ask")]) b.setAttribute("aria-pressed", "false");
}
function go(p, said) {
  hit = true; anywhere = false; stop(); $("#heard").textContent = "“" + said.trim() + "”"; setMsg("Entendi: " + p.n + ".");
  setTimeout(() => { show("lista"); choose(P.indexOf(p)); }, 600);
}
function ask(text) {
  const p = find(text); if (p) return go(p, text);
  const t = norm(text);
  if (!cur) return reply("Primeiro diga um destino, por exemplo Cataratas.");
  if (/hotel|hospedagem|pousada|perto|proxim|referencia/.test(t)) return reply(hotelText());
  if (/assento|poltrona|lugar|vaga|livre|ocupad/.test(t)) return reply(seatText());
  if (/rota|caminho|linha|distancia|como/.test(t)) return reply(routeText());
  if (/onde|onibus|chega|minuto|tempo|demora|status/.test(t)) return reply(sentence());
  reply("Posso informar o ônibus, o assento PCD, a rota e hotéis próximos. Pergunte, por exemplo: tem assento livre?");
}
async function listen(b, local = false) {
  if (on) return stop(), setMsg("Microfone desligado");
  welcomed = true; speechSynthesis.cancel();
  if (!SR) return reply("Este navegador não tem reconhecimento de voz. Digite na tela inicial ou use Chrome, Edge ou Safari.");
  const canLocal = "processLocally" in SR.prototype;
  const r = rec = new SR(); rec.lang = "pt-BR"; rec.interimResults = true; hit = false; $("#heard").textContent = "";
  if (local) { // reconhecimento no próprio aparelho: não usa o servidor do Google
    try {
      const o = { langs: ["pt-BR"], processLocally: true };
      const st = SR.available ? await SR.available(o) : "available";
      if (st === "unavailable") return reply("Seu navegador não consegue reconhecer voz neste aparelho. Use o campo de texto ou outro navegador (Chrome ou Edge).");
      if (st !== "available") { setMsg("Baixando o pacote de voz em português… aguarde e toque de novo."); await SR.install(o); return setMsg("Pacote instalado. Toque no microfone e fale."); }
      rec.processLocally = true;
    } catch (err) { return reply("Não foi possível usar a voz no aparelho: " + err.message); }
  }
  rec.onstart = () => { on = true; $("#ring").classList.add("listening"); b.setAttribute("aria-pressed", "true"); setMsg(local ? "Ouvindo (no aparelho)… fale agora" : "Ouvindo… fale agora"); };
  rec.onresult = e => {
    const t = [...e.results].map(r => r[0].transcript).join(" "); $("#heard").textContent = t; if (hit) return;
    const p = find(t); if (p) return go(p, t);
    if (e.results[e.results.length - 1].isFinal) { hit = true; stop(); ask(t); }
  };
  rec.onerror = e => {
    console.error("Erro de voz:", e.error);
    if (e.error === "aborted") return;
    if (e.error === "network" && !local && canLocal) { hit = true; setMsg("Serviço de voz da nuvem indisponível. Tentando no aparelho…"); return void setTimeout(() => listen(b, true), 500); }
    const m = {
      "not-allowed": "Permissão do microfone negada. Toque no cadeado ao lado do endereço e permita o microfone.",
      "service-not-allowed": "O navegador bloqueou o serviço de voz. Use Chrome, Edge ou Safari e permita o microfone.",
      "no-speech": "Não ouvi nada. Toque e fale de novo.",
      "audio-capture": "Nenhum microfone encontrado.",
      "network": "Sem conexão com o serviço de voz do navegador. Verifique a internet, VPN ou antivírus. Use o Chrome ou Edge originais, ou digite no campo de texto.",
      "language-not-supported": "O idioma pt-BR não é suportado neste navegador."
    }[e.error];
    hit = true; reply((m || "Erro de voz.") + " (erro: " + e.error + ")");
  };
  rec.onend = () => { const was = on; stop(); if (was && !hit) reply("Não entendi. Toque e diga, por exemplo, Cataratas ou: tem assento livre?"); };
  setMsg("Iniciando microfone…");
  // pequena pausa: o microfone não consegue iniciar enquanto a voz sintetizada ainda está sendo cancelada
  setTimeout(() => {
    if (rec !== r) return; // outro toque já criou um novo reconhecedor
    try { rec.start(); } catch (err) { reply("Não consegui iniciar o microfone: " + err.message); }
  }, 300);
}
$("#mic").onclick = () => listen($("#mic"));
$("#ask").onclick = () => listen($("#ask"));
document.addEventListener("click", e => { if (anywhere && !$("#home").hidden && !e.target.closest("button, input, a")) listen($("#mic")); });
$("#form").onsubmit = e => { e.preventDefault(); const v = $("#typed").value, p = find(v); p ? go(p, v) : ask(v); };

/* ---------- Lista ---------- */
$("#cards").innerHTML = P.map((p, i) => `<li class="bg-card rounded-xl p-8 flex flex-col gap-4">
  <span class="self-start bg-ink text-canvas rounded-full px-5 py-2 text-2xl font-semibold">${p.s}</span>
  <h2 class="text-2xl font-medium">${p.n}</h2>
  <button data-i="${i}" aria-label="Acompanhar o ${p.s} até ${p.n}" class="mt-auto px-5 min-h-12 rounded-lg text-lg font-medium bg-primary text-white border-2 border-accent">Acompanhar o ônibus</button></li>`).join("");
$("#cards").onclick = e => { const b = e.target.closest("[data-i]"); if (b) choose(+b.dataset.i); };

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

async function route(a, b) {
  try {
    const j = (await (await fetch(`https://router.project-osrm.org/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`)).json()).routes[0];
    return { pts: j.geometry.coordinates.map(([x, y]) => [y, x]), dur: j.duration, dist: j.distance };
  } catch { const d = map.distance(a, b); return { pts: [a, b], dur: d / 8, dist: d }; } // sem internet: linha reta
}
function render() {
  const c = s.pcdBusy ? "bg-accent text-canvas" : "bg-ok text-canvas";
  $("#alert").className = "rounded-xl p-5 mt-5 font-display text-3xl md:text-4xl " + c;
  $("#pcd").className = "font-display text-5xl rounded-xl px-5 py-2 mt-3 inline-block " + c;
  $("#pcd").textContent = s.pcdBusy ? "✕ OCUPADA" : "✓ LIVRE";
  $("#eta").textContent = s.eta ? mins() + " min" : "Chegou";
  $("#cam").textContent = `Ativa · ${s.free} de 12 assentos livres · ${new Date().toLocaleTimeString("pt-BR")}`;
}
function announce(prefix = "") {
  render(); const a = $("#alert"), t = (prefix + " " + sentence()).trim();
  a.textContent = ""; setTimeout(() => a.textContent = (s.pcdBusy ? "✕ " : "✓ ") + t, 40);
  say(t);
}
async function choose(i) {
  if (!map) return;
  clearInterval(tm); clearInterval(tc); const my = ++tok; cur = P[i];
  $("#h-panel").textContent = `${cur.s} · ${cur.n}`; $("#route").textContent = "Calculando a rota…"; $("#hotels").replaceChildren();
  const pn = $("#panel"); pn.hidden = false; pn.setAttribute("aria-hidden", "false"); anim(pn); layer.clearLayers();
  const r = await route(BASE.c, cur.c); if (my !== tok) return;
  s = { ...r, pcdBusy: false, free: 2 + rand(8), hot: [], eta: Math.min(r.dur, 240 + rand(120)) }; lastMin = mins();
  L.polyline(s.pts, { color: "#e58a9f", weight: 6 }).addTo(layer);
  L.marker(cur.c, { icon: icon(cur.l, "#8b1f2f"), keyboard: false }).bindTooltip(tip(cur.n)).addTo(layer);
  bus = L.marker(busPos(), { icon: icon(cur.l, "#f5eeef", "#141012", 46), keyboard: false, zIndexOffset: 1000 }).addTo(layer);
  map.fitBounds(L.polyline(s.pts).getBounds(), { padding: [30, 30] });
  $("#route").textContent = routeText(); announce("Você escolheu " + cur.n + ".");
  $("#panel").scrollIntoView({ behavior: "smooth" });
  tm = setInterval(tick, 1000); tc = setInterval(camera, 12000); nearby(my);
}
function tick() {
  s.eta = Math.max(0, s.eta - SPEED); bus.setLatLng(busPos());
  if (!s.eta) { clearInterval(tm); announce(); } else if (mins() !== lastMin) { lastMin = mins(); announce(); } else render();
}
function camera() {
  const was = s.pcdBusy; if (Math.random() < .3) s.pcdBusy = !s.pcdBusy;
  s.free = Math.min(12, Math.max(0, s.free + rand(3) - 1));
  was !== s.pcdBusy ? announce("Atenção.") : render();
}
async function nearby(my) {
  const li = t => { const e = document.createElement("li"); e.textContent = t; return e; };
  try {
    const q = `[out:json][timeout:15];nwr["tourism"~"hotel|hostel|guest_house|motel|apartment"]["name"](around:5000,${cur.c});out center 40;`;
    const j = await (await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: new URLSearchParams({ data: q }) })).json();
    if (my !== tok) return;
    s.hot = j.elements.map(e => { const c = [e.lat ?? e.center?.lat, e.lon ?? e.center?.lon]; return { n: e.tags.name, c, d: map.distance(cur.c, c) }; })
      .filter(h => h.c[0]).sort((a, b) => a.d - b.d).slice(0, 4);
  } catch { if (my !== tok) return; s.hot = []; }
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