/* ==========================================================================
MOBINTEC - BANCO DE DADOS
Cada destino tem MÚLTIPLOS pontos de embarque.
Inclui propriedade "sustentabilidade" para destacar o impacto ambiental.
========================================================================== */

const DESTINOS = [
  {
    nome: "Cataratas do Iguaçu",
    foto: "img/cataratas.jpg",
    servico: "Ônibus para as Cataratas",
    sigla: "PN",
    posicao: [-25.6866, -54.4420],
    palavras: ["catarata"],
    descricao: "Quedas d'água do rio Iguaçu, dentro do Parque Nacional do Iguaçu.",
    embarques: [
      {
        id: "linha120",
        nome: "Linha 120 - Terminal Urbano (TUP)",
        tipo: "Ônibus urbano municipal",
        posicao: [-25.5445, -54.5845],
        instrucao: "No Terminal Urbano de Passageiros (TUP), no centro de Foz. Procure a plataforma da Linha 120 Cataratas.",
        rota: "Sai do TUP, segue pela Avenida Brasil, entra na Rodovia das Cataratas (BR-469) e vai até o Parque Nacional.",
        paradas: ["Terminal Urbano (TUP)", "Avenida Brasil", "Entrada da Rodovia das Cataratas", "Parque das Aves", "Centro de Visitantes do Parque Nacional"],
        ondeDescer: "Desça no ponto final: Centro de Visitantes do Parque Nacional do Iguaçu.",
        gratuidade: true,
        sustentabilidade: "Parabéns pela escolha sustentável! Ao usar o transporte público, você reduz em até 70% a emissão de CO2 comparado a um carro particular.",
        horarios: [{ hora: "06:30" }, { hora: "07:30" }, { hora: "08:30" }, { hora: "09:30" }, { hora: "10:30" }, { hora: "11:30" }, { hora: "12:30" }, { hora: "13:30" }, { hora: "14:30" }, { hora: "15:30" }, { hora: "16:30" }, { hora: "17:30" }],
        horariosSimulados: true,
        preco: "Gratuito para pessoas com deficiência (cartão BPC/LOAS). Tarifa normal: ~R$ 4,50.",
        operadora: "Transportes Foz do Iguaçu",
        contato: "(45) 3521-5000",
        acessibilidade: "Ônibus adaptado com plataforma elevatória, espaço para cadeira de rodas e aviso sonoro."
      },
      {
        id: "transfer",
        nome: "Transfer turístico (busca no hotel)",
        tipo: "Transfer privado",
        posicao: [-25.5163, -54.5854],
        instrucao: "O transfer busca você na porta do seu hotel no centro.",
        rota: "Sai do hotel, vai direto pela Rodovia das Cataratas até o Parque Nacional.",
        paradas: ["Hotel", "Parque Nacional"],
        ondeDescer: "Na entrada do Parque Nacional do Iguaçu.",
        gratuidade: false,
        horarios: [{ hora: "07:00" }, { hora: "08:00" }, { hora: "09:00" }, { hora: "13:00" }, { hora: "14:00" }, { hora: "15:00" }],
        horariosSimulados: true,
        preco: "A confirmar",
        operadora: "A confirmar",
        contato: "A confirmar",
        acessibilidade: "A confirmar: se o veículo é adaptado para PCD."
      }
    ],
    aConfirmar: ["Coordenadas exatas", "Horários oficiais", "Acessibilidade nas passarelas"],
    fontes: ["Site da prefeitura de Foz"],
    contato: "A confirmar"
  },
  {
    nome: "Parque das Aves",
    foto: "img/aves.jpg",
    servico: "Transporte para o Parque das Aves",
    sigla: "TA",
    posicao: [-25.6140, -54.4826],
    palavras: ["aves", "passaros"],
    descricao: "Parque com aves da Mata Atlântica, ao lado do Parque Nacional.",
    embarques: [
      {
        id: "linha120",
        nome: "Linha 120 - Terminal Urbano (TUP)",
        tipo: "Ônibus urbano municipal",
        posicao: [-25.5445, -54.5845],
        instrucao: "No TUP, pegue a Linha 120. O Parque das Aves fica na Rodovia das Cataratas.",
        rota: "Sai do TUP, segue pela Avenida Brasil e entra na Rodovia das Cataratas.",
        paradas: ["Terminal Urbano (TUP)", "Avenida Brasil", "Parque das Aves"],
        ondeDescer: "Desça na parada do Parque das Aves. A entrada fica na frente.",
        gratuidade: true,
        sustentabilidade: "Parabéns pela escolha sustentável! Transporte coletivo reduz drasticamente a pegada de carbono do seu passeio.",
        horarios: [{ hora: "06:30" }, { hora: "07:30" }, { hora: "08:30" }, { hora: "09:30" }, { hora: "10:30" }, { hora: "11:30" }, { hora: "12:30" }, { hora: "13:30" }, { hora: "14:30" }, { hora: "15:30" }, { hora: "16:30" }],
        horariosSimulados: true,
        preco: "Gratuito para PCD (cartão BPC/LOAS).",
        operadora: "Transportes Foz do Iguaçu",
        contato: "(45) 3521-5000",
        acessibilidade: "Ônibus adaptado com plataforma elevatória."
      }
    ],
    aConfirmar: ["Condições de acessibilidade das trilhas"],
    fontes: ["Wikipédia"],
    contato: "A confirmar"
  },
  {
    nome: "Marco das Três Fronteiras",
    foto: "img/marco.jpg",
    servico: "Transporte para o Marco",
    sigla: "MF",
    posicao: [-25.5974, -54.5912],
    palavras: ["marco", "fronteira"],
    descricao: "Ponto onde se encontram os rios Iguaçu e Paraná.",
    embarques: [
      {
        id: "linha121",
        nome: "Linha 121 - Três Fronteiras",
        tipo: "Ônibus urbano municipal",
        posicao: [-25.5445, -54.5845],
        instrucao: "No TUP, procure a plataforma da Linha 121 Três Fronteiras.",
        rota: "Sai do TUP, segue pela Avenida República Argentina até o Marco.",
        paradas: ["Terminal Urbano (TUP)", "Avenida República Argentina", "Marco das Três Fronteiras"],
        ondeDescer: "No ponto final da linha, em frente ao Marco.",
        gratuidade: true,
        sustentabilidade: "Escolha sustentável: o transporte público é a forma mais ecológica de explorar a tríplice fronteira.",
        horarios: [{ hora: "07:00" }, { hora: "09:00" }, { hora: "11:00" }, { hora: "14:00" }, { hora: "16:00" }, { hora: "19:00" }],
        horariosSimulados: true,
        preco: "Gratuito para PCD (cartão BPC/LOAS).",
        operadora: "Transportes Foz do Iguaçu",
        contato: "(45) 3521-5000",
        acessibilidade: "Ônibus adaptado. Peça ao motorista para avisar no ponto final."
      }
    ],
    aConfirmar: ["Condições de acessibilidade"],
    fontes: ["A preencher"],
    contato: "A confirmar"
  }
];
