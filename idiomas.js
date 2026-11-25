/* ==========================================================================
MOBINTEC - Sistema de Idiomas
Suporta: Português (padrão), Inglês e Espanhol.
Detecta automaticamente pelo que a pessoa fala ou muda por comando de voz.
========================================================================== */

let idiomaAtual = "pt"; // "pt", "en", "es"

const TRADUCOES = {
  pt: {
    boasVindas: "Bem-vindo ao Mobintec. Toque em qualquer lugar da tela e converse comigo.",
    ajuda: "Você pode conversar comigo normalmente. Por exemplo: quero ir para as Cataratas; onde eu embarco; qual o próximo ônibus; tem gratuidade para PCD.",
    ouvindo: "Ouvindo… fale agora.",
    naoEntendi: "Não entendi. Toque e diga, por exemplo, Cataratas.",
    microfoneDesligado: "Microfone desligado.",
    conversaEncerrada: "Conversa encerrada. Toque no microfone quando quiser falar de novo.",
    vozNavegadorIndisponivel: "A voz do navegador não está disponível. Usando a voz do próprio site.",
    permissaoNegada: "Permissão do microfone negada.",
    naoOuviNada: "Não ouvi nada. Toque e fale de novo.",
    nenhumMicrofone: "Nenhum microfone encontrado.",
    microfoneDemorou: "O microfone demorou para responder.",
    naoConseguiLigarMicrofone: "Não consegui ligar o microfone.",
    entendendoAudio: "Entendendo o que você disse…",
    naoConseguiEntenderAudio: "Não consegui entender o áudio.",
    baixandoVoz: "Baixando a voz do site",
    assistenteAberta: "Assistente aberta. Pode perguntar o que quiser.",
    assistenteFechada: "Assistente fechada.",
    voltandoPontosTuristicos: "Voltando aos pontos turísticos. Diga para onde quer ir.",
    onibusTuristicos: "Ônibus turísticos. Escolha um destino.",
    opcoes: "Opções.",
    conversa: "Conversa. Toque em qualquer lugar e fale.",
    mapaNaoCarregou: "O mapa não carregou. Tudo continua disponível em texto.",
    mapaReserva: "Usando o mapa reserva.",
    vozLigada: "Voz do site ligada.",
    vozDesligada: "Voz do site desligada. Os avisos continuam escritos na tela.",
    temaClaro: "Tema claro ativado.",
    temaEscuro: "Tema escuro ativado.",
    cameraIndisponivel: "A câmera de assentos não está disponível agora.",
    cameraParada: "Câmera parada. Sem leitura atual de assentos.",
    abrindoCameraCelular: "Abrindo a câmera do celular. Se o navegador perguntar, escolha permitir.",
    buscandoCameraOnibus: "Buscando a análise da câmera do ônibus.",
    certoOnibusPara: "Certo: ônibus para",
    paraIrA: "Para ir a",
    formasDeChegar: "formas de chegar lá. Vou explicar cada uma.",
    opcao: "Opção",
    digiteNumero: "Diga o número da opção que prefere",
    lembreteGratuidade: "Lembre-se: a opção",
    temGratuidade: "tem gratuidade para pessoas com deficiência.",
    opcaoInvalida: "Opção inválida. Escolha um número válido.",
    voceEscolheu: "Você escolheu",
    embarqueEm: "Embarque em",
    gratuidadePCD: "Gratuidade para pessoas com deficiência.",
    voceEstaA: "Você está a",
    doEmbarque: "do embarque.",
    sim: "Sim!",
    esteEmbarqueNaoTem: "Este embarque não tem gratuidade.",
    podeTrocar: "Mas você pode trocar para a Linha 120, que tem gratuidade. Diga: trocar embarque.",
    linha120TemGratuidade: "A Linha 120 do Terminal Urbano tem gratuidade para pessoas com deficiência.",
    escolhaDestinoPrimeiro: "Escolha um destino primeiro. Diga, por exemplo, quero ir para as Cataratas.",
    escolhaDestino: "Escolha um destino primeiro.",
    proximaPartida: "Próxima partida às",
    faltam: "faltam",
    minuto: "minuto",
    minutos: "minutos",
    hora: "hora",
    horas: "horas",
    e: "e",
    horariosDemonstracao: "Horário de demonstração, confirme com a operadora.",
    partidasHojePassaram: "As partidas de hoje já passaram. A primeira de amanhã é às",
    horariosConfirmar: "Horários a confirmar com a operadora.",
    voceAindaNaoEscolheu: "Você ainda não escolheu um destino.",
    percurso: "O percurso é:",
    paradasSao: "As paradas são:",
    deveDescer: "Você deve descer:",
    localizacaoDesligada: "Localização desligada.",
    pontoEmbarque: "O ponto de embarque é",
    ligandoLocalizacao: "Ligando a localização. Se o navegador perguntar, escolha permitir.",
    naoConseguiLocalizacao: "Não consegui sua localização. Libere a localização no navegador.",
    navegadorSemLocalizacao: "Este navegador não tem localização.",
    aindaBuscandoLocalizacao: "Ainda estou buscando sua localização. Aguarde um instante.",
    calculandoRota: "Calculando a rota…",
    aindaAConfirmar: "Ainda a confirmar:",
    de: "de",
    ate: "até",
    cercaDe: "cerca de",
    minutosDeViagem: "minutos de viagem.",
    naoEncontrei: "Não encontrei",
    pertoDe: "perto de",
    nosDadosMapa: "nos dados do mapa.",
    procurando: "Procurando",
    mostrando: "Mostrando",
    nenhumResultado: "Nenhum resultado nos dados do mapa.",
    primeiroDigaDestino: "Primeiro diga um destino, por exemplo Cataratas.",
    naoConseguiFalarAssistente: "Não consegui falar com a assistente agora.",
    demorouDemais: "Ela demorou demais para responder.",
    semInternet: "Sem internet ou o site não tem permissão para falar com ela.",
    tenteNovo: "Tente de novo ou diga ajuda para ouvir os comandos.",
    pensando: "Pensando…",
    velocidadeAlterada: "Velocidade da voz alterada.",
    mudarIdioma: "Idioma mudado para",
    portugues: "português",
    ingles: "inglês",
    espanhol: "espanhol",
    idiomaNaoSuportado: "Idioma não suportado. Use português, inglês ou espanhol."
  },
  en: {
    boasVindas: "Welcome to Mobintec. Touch anywhere on the screen and talk to me.",
    ajuda: "You can talk to me normally. For example: I want to go to the Waterfalls; where do I board; is there a free ride for PWD.",
    ouvindo: "Listening… speak now.",
    naoEntendi: "I didn't understand. Touch and say, for example, Waterfalls.",
    microfoneDesligado: "Microphone turned off.",
    conversaEncerrada: "Conversation ended. Touch the microphone when you want to talk again.",
    vozNavegadorIndisponivel: "Browser voice is not available. Using the site's own voice.",
    permissaoNegada: "Microphone permission denied.",
    naoOuviNada: "I didn't hear anything. Touch and speak again.",
    nenhumMicrofone: "No microphone found.",
    microfoneDemorou: "The microphone took too long to respond.",
    naoConseguiLigarMicrofone: "I couldn't turn on the microphone.",
    entendendoAudio: "Understanding what you said…",
    naoConseguiEntenderAudio: "I couldn't understand the audio.",
    baixandoVoz: "Downloading site voice",
    assistenteAberta: "Assistant opened. You can ask anything.",
    assistenteFechada: "Assistant closed.",
    voltandoPontosTuristicos: "Going back to tourist spots. Say where you want to go.",
    onibusTuristicos: "Tourist buses. Choose a destination.",
    opcoes: "Options.",
    conversa: "Conversation. Touch anywhere and speak.",
    mapaNaoCarregou: "The map didn't load. Everything is still available in text.",
    mapaReserva: "Using backup map.",
    vozLigada: "Site voice turned on.",
    vozDesligada: "Site voice turned off. Alerts continue to appear on screen.",
    temaClaro: "Light theme activated.",
    temaEscuro: "Dark theme activated.",
    cameraIndisponivel: "The seat camera is not available now.",
    cameraParada: "Camera stopped. No current seat reading.",
    abrindoCameraCelular: "Opening cell phone camera. If the browser asks, choose to allow.",
    buscandoCameraOnibus: "Looking for bus camera analysis.",
    certoOnibusPara: "Okay: bus to",
    paraIrA: "To go to",
    formasDeChegar: "ways to get there. I'll explain each one.",
    opcao: "Option",
    digiteNumero: "Say the number of the option you prefer",
    lembreteGratuidade: "Remember: the option",
    temGratuidade: "has a free ride for people with disabilities.",
    opcaoInvalida: "Invalid option. Choose a valid number.",
    voceEscolheu: "You chose",
    embarqueEm: "Board at",
    gratuidadePCD: "Free ride for people with disabilities.",
    voceEstaA: "You are",
    doEmbarque: "from the boarding point.",
    sim: "Yes!",
    esteEmbarqueNaoTem: "This boarding point doesn't have a free ride.",
    podeTrocar: "But you can switch to Line 120, which has a free ride. Say: change boarding.",
    linha120TemGratuidade: "Line 120 from the Urban Terminal has a free ride for people with disabilities.",
    escolhaDestinoPrimeiro: "Choose a destination first. Say, for example, I want to go to the Waterfalls.",
    escolhaDestino: "Choose a destination first.",
    proximaPartida: "Next departure at",
    faltam: "there are",
    minuto: "minute",
    minutos: "minutes",
    hora: "hour",
    horas: "hours",
    e: "and",
    horariosDemonstracao: "Demo schedule, confirm with the operator.",
    partidasHojePassaram: "Today's departures have passed. The first one tomorrow is at",
    horariosConfirmar: "Schedules to be confirmed with the operator.",
    voceAindaNaoEscolheu: "You haven't chosen a destination yet.",
    percurso: "The route is:",
    paradasSao: "The stops are:",
    deveDescer: "You should get off:",
    localizacaoDesligada: "Location turned off.",
    pontoEmbarque: "The boarding point is",
    ligandoLocalizacao: "Turning on location. If the browser asks, choose to allow.",
    naoConseguiLocalizacao: "I couldn't get your location. Enable location in the browser.",
    navegadorSemLocalizacao: "This browser doesn't have location.",
    aindaBuscandoLocalizacao: "Still looking for your location. Wait a moment.",
    calculandoRota: "Calculating route…",
    aindaAConfirmar: "Still to be confirmed:",
    de: "from",
    ate: "to",
    cercaDe: "about",
    minutosDeViagem: "minutes of travel.",
    naoEncontrei: "I didn't find",
    pertoDe: "near",
    nosDadosMapa: "in the map data.",
    procurando: "Looking for",
    mostrando: "Showing",
    nenhumResultado: "No results in the map data.",
    primeiroDigaDestino: "First say a destination, for example Waterfalls.",
    naoConseguiFalarAssistente: "I couldn't talk to the assistant now.",
    demorouDemais: "It took too long to respond.",
    semInternet: "No internet or the site doesn't have permission to talk to it.",
    tenteNovo: "Try again or say help to hear the commands.",
    pensando: "Thinking…",
    velocidadeAlterada: "Voice speed changed.",
    mudarIdioma: "Language changed to",
    portugues: "Portuguese",
    ingles: "English",
    espanhol: "Spanish",
    idiomaNaoSuportado: "Language not supported. Use Portuguese, English or Spanish."
  },
  es: {
    boasVindas: "Bienvenido a Mobintec. Toca en cualquier lugar de la pantalla y habla conmigo.",
    ajuda: "Puedes hablar conmigo normalmente. Por ejemplo: quiero ir a las Cataratas; dónde subo; hay gratuidad para PcD.",
    ouvindo: "Escuchando… habla ahora.",
    naoEntendi: "No entendí. Toca y di, por ejemplo, Cataratas.",
    microfoneDesligado: "Micrófono apagado.",
    conversaEncerrada: "Conversación terminada. Toca el micrófono cuando quieras hablar de nuevo.",
    vozNavegadorIndisponivel: "La voz del navegador no está disponible. Usando la voz del propio sitio.",
    permissaoNegada: "Permiso de micrófono negado.",
    naoOuviNada: "No escuché nada. Toca y habla de nuevo.",
    nenhumMicrofone: "No se encontró micrófono.",
    microfoneDemorou: "El micrófono tardó demasiado en responder.",
    naoConseguiLigarMicrofone: "No pude encender el micrófono.",
    entendendoAudio: "Entendiendo lo que dijiste…",
    naoConseguiEntenderAudio: "No pude entender el audio.",
    baixandoVoz: "Descargando la voz del sitio",
    assistenteAberta: "Asistente abierta. Puedes preguntar lo que quieras.",
    assistenteFechada: "Asistente cerrada.",
    voltandoPontosTuristicos: "Volviendo a los puntos turísticos. Di a dónde quieres ir.",
    onibusTuristicos: "Autobuses turísticos. Elige un destino.",
    opcoes: "Opciones.",
    conversa: "Conversación. Toca en cualquier lugar y habla.",
    mapaNaoCarregou: "El mapa no cargó. Todo sigue disponible en texto.",
    mapaReserva: "Usando el mapa de reserva.",
    vozLigada: "Voz del sitio encendida.",
    vozDesligada: "Voz del sitio apagada. Los avisos siguen apareciendo en la pantalla.",
    temaClaro: "Tema claro activado.",
    temaEscuro: "Tema oscuro activado.",
    cameraIndisponivel: "La cámara de asientos no está disponible ahora.",
    cameraParada: "Cámara parada. Sin lectura actual de asientos.",
    abrindoCameraCelular: "Abriendo la cámara del celular. Si el navegador pregunta, elige permitir.",
    buscandoCameraOnibus: "Buscando el análisis de la cámara del autobús.",
    certoOnibusPara: "Listo: autobús para",
    paraIrA: "Para ir a",
    formasDeChegar: "formas de llegar. Te explicaré cada una.",
    opcao: "Opción",
    digiteNumero: "Di el número de la opción que prefieres",
    lembreteGratuidade: "Recuerda: la opción",
    temGratuidade: "tiene gratuidad para personas con discapacidad.",
    opcaoInvalida: "Opción inválida. Elige un número válido.",
    voceEscolheu: "Elegiste",
    embarqueEm: "Embarque en",
    gratuidadePCD: "Gratuidad para personas con discapacidad.",
    voceEstaA: "Estás a",
    doEmbarque: "del punto de embarque.",
    sim: "¡Sí!",
    esteEmbarqueNaoTem: "Este embarque no tiene gratuidad.",
    podeTrocar: "Pero puedes cambiar a la Línea 120, que tiene gratuidad. Di: cambiar embarque.",
    linha120TemGratuidade: "La Línea 120 de la Terminal Urbana tiene gratuidad para personas con discapacidad.",
    escolhaDestinoPrimeiro: "Elige un destino primero. Di, por ejemplo, quiero ir a las Cataratas.",
    escolhaDestino: "Elige un destino primero.",
    proximaPartida: "Próxima salida a las",
    faltam: "faltan",
    minuto: "minuto",
    minutos: "minutos",
    hora: "hora",
    horas: "horas",
    e: "y",
    horariosDemonstracao: "Horario de demostración, confirma con el operador.",
    partidasHojePassaram: "Las salidas de hoy ya pasaron. La primera de mañana es a las",
    horariosConfirmar: "Horarios por confirmar con el operador.",
    voceAindaNaoEscolheu: "Aún no has elegido un destino.",
    percurso: "El recorrido es:",
    paradasSao: "Las paradas son:",
    deveDescer: "Debes bajar en:",
    localizacaoDesligada: "Ubicación apagada.",
    pontoEmbarque: "El punto de embarque es",
    ligandoLocalizacao: "Encendiendo la ubicación. Si el navegador pregunta, elige permitir.",
    naoConseguiLocalizacao: "No pude obtener tu ubicación. Habilita la ubicación en el navegador.",
    navegadorSemLocalizacao: "Este navegador no tiene ubicación.",
    aindaBuscandoLocalizacao: "Aún estoy buscando tu ubicación. Espera un momento.",
    calculandoRota: "Calculando la ruta…",
    aindaAConfirmar: "Aún por confirmar:",
    de: "de",
    ate: "hasta",
    cercaDe: "cerca de",
    minutosDeViagem: "minutos de viaje.",
    naoEncontrei: "No encontré",
    pertoDe: "cerca de",
    nosDadosMapa: "en los datos del mapa.",
    procurando: "Buscando",
    mostrando: "Mostrando",
    nenhumResultado: "Sin resultados en los datos del mapa.",
    primeiroDigaDestino: "Primero di un destino, por ejemplo Cataratas.",
    naoConseguiFalarAssistente: "No pude hablar con el asistente ahora.",
    demorouDemais: "Tardó demasiado en responder.",
    semInternet: "Sin internet o el sitio no tiene permiso para hablar con él.",
    tenteNovo: "Intenta de nuevo o di ayuda para escuchar los comandos.",
    pensando: "Pensando…",
    velocidadeAlterada: "Velocidad de voz cambiada.",
    mudarIdioma: "Idioma cambiado a",
    portugues: "portugués",
    ingles: "inglés",
    espanhol: "español",
    idiomaNaoSuportado: "Idioma no soportado. Usa portugués, inglés o español."
  }
};

// Retorna a tradução da chave no idioma atual
function t(chave) {
  const trad = TRADUCOES[idiomaAtual];
  if (trad && trad[chave]) {
    return trad[chave];
  }
  // Fallback para português se não achar
  return TRADUCOES.pt[chave] || chave;
}

// Detecta o idioma de um texto (simples, baseado em palavras-chave)
function detectarIdioma(texto) {
  const tTexto = texto.toLowerCase();
  
  // Palavras em inglês
  const palavrasIngles = ["waterfall", "waterfalls", "iguazu", "iguassu", "bird", "birds", "park", "hotel", "restaurant", "help", "where", "when", "how", "what", "which", "free", "seat", "seats", "bus", "map", "language", "english"];
  
  // Palavras em espanhol
  const palavrasEspanhol = ["catarata", "cataratas", "iguazu", "parque", "aves", "pajaros", "hotel", "restaurante", "ayuda", "donde", "cuando", "como", "que", "cual", "gratis", "gratuidad", "asiento", "asientos", "autobus", "mapa", "idioma", "español", "espanol"];
  
  let contadorIngles = 0;
  let contadorEspanhol = 0;
  
  palavrasIngles.forEach(function(palavra) {
    if (tTexto.includes(palavra)) contadorIngles++;
  });
  
  palavrasEspanhol.forEach(function(palavra) {
    if (tTexto.includes(palavra)) contadorEspanhol++;
  });
  
  // Se tem mais palavras em inglês que espanhol
  if (contadorIngles > contadorEspanhol && contadorIngles >= 2) {
    return "en";
  }
  
  // Se tem mais palavras em espanhol que inglês
  if (contadorEspanhol > contadorIngles && contadorEspanhol >= 2) {
    return "es";
  }
  
  // Padrão: português
  return "pt";
}

// Muda o idioma e atualiza a voz do sintetizador
function mudarIdioma(novoIdioma) {
  if (novoIdioma === "pt" || novoIdioma === "en" || novoIdioma === "es") {
    idiomaAtual = novoIdioma;
    
    // Teste de voz para confirmar a mudança
    if (window.speechSynthesis) {
      const fala = new SpeechSynthesisUtterance(t("mudarIdioma") + " " + t(novoIdioma === "pt" ? "portugues" : novoIdioma === "en" ? "ingles" : "espanhol"));
      fala.lang = novoIdioma === "pt" ? "pt-BR" : novoIdioma === "en" ? "en-US" : "es-ES";
      window.speechSynthesis.speak(fala);
    }
    
    try {
      localStorage.setItem("mobintecIdioma", novoIdioma);
    } catch (e) {}
    
    return true;
  }
  return false;
}

// Carrega o idioma salvo no navegador
function carregarIdiomaSalvo() {
  try {
    const idiomaSalvo = localStorage.getItem("mobintecIdioma");
    if (idiomaSalvo && (idiomaSalvo === "pt" || idiomaSalvo === "en" || idiomaSalvo === "es")) {
      idiomaAtual = idiomaSalvo;
    }
  } catch (e) {}
}

// Inicializa o idioma ao carregar a página
carregarIdiomaSalvo();
