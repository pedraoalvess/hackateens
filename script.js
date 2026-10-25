const $ = s => document.querySelector(s);
const anim = (el, ms = 0) => { el.classList.remove("animate-rise"); void el.offsetWidth; el.style.animationDelay = ms + "ms"; el.classList.add("animate-rise", "motion-reduce:animate-none"); };
const norm = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
// Linhas de exemplo, não verificadas: confira com a prefeitura/operadora. Para novas atrações, basta uma linha aqui.
const L = [
  { n:"Cataratas do Iguaçu", l:"120", k:["catarata"] },
  { n:"Parque das Aves", l:"120", k:["aves"] },
  { n:"Itaipu Binacional", l:"101", k:["itaipu","usina"] },
  { n:"Marco das Três Fronteiras", l:"103", k:["marco","fronteira"] },
  { n:"Templo Budista Chen Tien", l:"103", k:["templo","budista"] }
];
const find = t => { t = norm(t); return L.find(x => x.k.some(k => t.includes(k))); };
console.assert(find("Quero ir às Cataratas")?.l === "120" && find("templo budista")?.n.startsWith("Templo") && !find("pizza"), "find() falhou");

/* Fala */
let welcomed = false;
function say(t, onstart){
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t); u.lang = "pt-BR"; u.onstart = onstart;
  speechSynthesis.speak(u);
}
const WELCOME = "Bem-vindo ao Foz Acessível. Toque no botão grande no centro da tela e diga o destino: Cataratas, Parque das Aves, Itaipu, Marco das Três Fronteiras ou Templo Budista. Para escolher na lista, toque em Atrações.";
const welcome = () => say(WELCOME, () => welcomed = true);
addEventListener("load", welcome); // o navegador pode bloquear até o primeiro toque
addEventListener("pointerdown", e => { if(!welcomed && !e.target.closest("#mic")) welcome(); }, true);

/* Telas */
function show(name){
  stop();
  for(const id of ["home","lista"]){
    const on = id === name; $("#"+id).hidden = !on; $("#"+id).setAttribute("aria-hidden", !on);
    const b = $("#n"+id[0].toUpperCase()+id.slice(1));
    b.setAttribute("aria-current", on ? "page" : "false"); b.className = "px-4 min-h-12 rounded-lg font-medium " + (on ? "bg-ink text-on-dark" : "bg-card");
  }
  anim($("#"+name)); $("#"+name+" h1").focus();
  if(name === "lista") [...$("#cards").children].forEach((c, i) => anim(c, 120 + i * 90));
  if(name === "lista") say("Lista de atrações. Escolha um destino.");
}
$("#nHome").onclick = () => show("home");
$("#nLista").onclick = () => show("lista");

/* Voz */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec, on = false, hit = false;
const setMsg = t => $("#state").textContent = t;
function stop(){
  if(on) rec.abort();
  on = false; $("#ring").classList.remove("listening"); $("#mic").setAttribute("aria-pressed", "false");
}
function go(p, said){
  hit = true; stop(); $("#heard").textContent = "“" + said.trim() + "”"; setMsg("Entendi: " + p.n + ".");
  setTimeout(() => { show("lista"); choose(L.indexOf(p)); }, 600);
}
$("#mic").onclick = () => {
  if(on) return stop(), setMsg("Microfone desligado");
  welcomed = true; speechSynthesis.cancel();
  if(!SR){ const m = "Este navegador não tem reconhecimento de voz. Digite o destino no campo abaixo."; setMsg(m); say(m); return $("#typed").focus(); }
  rec = new SR(); rec.lang = "pt-BR"; rec.interimResults = true; hit = false; $("#heard").textContent = "";
  rec.onstart = () => { on = true; $("#ring").classList.add("listening"); $("#mic").setAttribute("aria-pressed", "true"); setMsg("Ouvindo… fale o destino"); };
  rec.onresult = e => { const t = [...e.results].map(r => r[0].transcript).join(" "); $("#heard").textContent = t; const p = find(t); if(p && !hit) go(p, t); };
  rec.onerror = e => {
    const m = { "not-allowed":"Permissão do microfone negada. Libere nas configurações ou digite o destino.", "no-speech":"Não ouvi nada. Toque e fale de novo.", "audio-capture":"Nenhum microfone encontrado.", "network":"Sem conexão para o reconhecimento de voz." }[e.error];
    if(m){ hit = true; setMsg(m); say(m); }
  };
  rec.onend = () => { const was = on; stop(); if(was && !hit){ const m = "Não entendi o destino. Toque e diga, por exemplo, Cataratas."; setMsg(m); say(m); } };
  rec.start();
};
$("#form").onsubmit = e => {
  e.preventDefault(); const p = find($("#typed").value);
  if(p) go(p, $("#typed").value); else { const m = "Destino não encontrado. Tente Cataratas, Itaipu ou Templo Budista."; setMsg(m); say(m); }
};

/* Lista */
$("#cards").innerHTML = L.map((p, i) => `<li class="bg-card rounded-xl p-8 flex flex-col gap-4">
  <span class="self-start bg-ink text-on-dark rounded-full px-5 py-2 text-2xl font-semibold">Linha ${p.l}</span>
  <h2 class="text-2xl font-medium">${p.n}</h2>
  <button data-i="${i}" aria-label="Acompanhar a linha ${p.l} até ${p.n}" class="mt-auto px-5 min-h-12 rounded-lg text-lg font-medium bg-primary-active text-white">Acompanhar linha ${p.l}</button></li>`).join("");
$("#cards").onclick = e => { const b = e.target.closest("[data-i]"); if(b) choose(+b.dataset.i); };

/* Painel */
// shortcut: dados simulados a cada 15 s; trocar por fetch à API de frota e de visão computacional.
function getBusStatus(prev){
  const r = n => Math.floor(Math.random() * n);
  if(!prev) return { eta: 3 + r(4), free: 2 + r(8), pcdBusy: false };
  return { eta: Math.max(0, prev.eta - 1), free: Math.min(12, Math.max(0, prev.free + r(3) - 1)), pcdBusy: Math.random() < .3 ? !prev.pcdBusy : prev.pcdBusy };
}
let cur, s, tm;
const sentence = () => `Linha ${cur.l} ${s.eta ? `chegando em ${s.eta} ${s.eta > 1 ? "minutos" : "minuto"}` : "chegou ao ponto"} com assento PCD ${s.pcdBusy ? "ocupado" : "livre"}. ${s.free} assentos livres.`;
function announce(prefix = ""){
  const a = $("#alert"), t = (prefix + " " + sentence()).trim();
  const c = s.pcdBusy ? "bg-primary text-ink" : "bg-ok text-ink";
  a.className = "rounded-xl p-5 mt-5 font-display text-3xl md:text-4xl " + c;
  $("#pcd").className = "font-display text-5xl rounded-xl px-5 py-2 mt-3 inline-block " + c;
  $("#pcd").textContent = s.pcdBusy ? "✕ OCUPADA" : "✓ LIVRE";
  a.textContent = ""; setTimeout(() => a.textContent = (s.pcdBusy ? "✕ " : "✓ ") + t, 40);
  $("#eta").textContent = s.eta ? s.eta + " min" : "Chegou";
  $("#cam").textContent = `Ativa · ${s.free} de 12 assentos livres · ${new Date().toLocaleTimeString("pt-BR")}`;
  say(t);
}
function choose(i){
  clearInterval(tm); cur = L[i]; s = getBusStatus();
  $("#h-panel").textContent = `Linha ${cur.l} · ${cur.n}`;
  $("#panel").hidden = false; $("#panel").setAttribute("aria-hidden", "false"); anim($("#panel"));
  $("#panel").scrollIntoView({ behavior:"smooth" }); announce("Você escolheu " + cur.n + ".");
  tm = setInterval(() => { const was = s.pcdBusy; s = getBusStatus(s); announce(was !== s.pcdBusy ? "Atenção." : ""); if(!s.eta) clearInterval(tm); }, 15000);
}
$("#again").onclick = () => announce();

show("home");