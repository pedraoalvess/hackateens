/* ==========================================================================
MOBINTEC - BANCO DE DADOS
Cada destino tem MÚLTIPLOS pontos de embarque.
Inclui propriedade "sustentabilidade" para destacar o impacto ambiental.
Horários são SIMULADOS (padrão de turismo), não oficiais.
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
        paradas: ["Terminal Urbano (TUP) - ponto inicial", "Avenida Brasil - centro", "Entrada da Rodovia das Cataratas", "Parque das Aves (parada opcional)", "Centro de Visitantes do Parque Nacional - ponto final"],
        ondeDescer: "Desça no ponto final: Centro de Visitantes do Parque Nacional do Iguaçu. É o último ponto da linha.",
        gratuidade: true,
        sustentabilidade: "Parabéns pela escolha sustentável! Ao usar o transporte público, você reduz em até 70% a emissão de CO2 comparado a um carro particular.",
        horarios: [{ hora: "06:30" }, { hora: "07:30" }, { hora: "08:30" }, { hora: "09:30" }, { hora: "10:30" }, { hora: "11:30" }, { hora: "12:30" }, { hora: "13:30" }, { hora: "14:30" }, { hora: "15:30" }, { hora: "16:30" }, { hora: "17:30" }],
        horariosSimulados: true,
        preco: "Gratuito para pessoas com deficiência (apresentar cartão BPC/LOAS). Tarifa normal cerca de R$ 4,50.",
        operadora: "Transportes Foz do Iguaçu (Reunidas)",
        contato: "(45) 3521-5000",
        acessibilidade: "Ônibus adaptado com plataforma elevatória, espaço para cadeira de rodas, aviso sonoro de parada."
      },
      {
        id: "transfer",
        nome: "Transfer turístico (busca no hotel)",
        tipo: "Transfer privado",
        posicao: [-25.5163, -54.5854],
        instrucao: "O transfer busca você na porta do seu hotel no centro.",
        rota: "Sai do hotel, vai direto pela Rodovia das Cataratas até o Parque Nacional, sem paradas intermediárias.",
        paradas: ["Hotel (embarque)", "Parque Nacional (desembarque)"],
        ondeDescer: "Na entrada do Parque Nacional do Iguaçu, junto com os outros turistas do transfer.",
        gratuidade: false,
        horarios: [{ hora: "07:00" }, { hora: "08:00" }, { hora: "09:00" }, { hora: "13:00" }, { hora: "14:00" }, { hora: "15:00" }],
        horariosSimulados: true,
        preco: "A confirmar (transfer turístico)",
        operadora: "A confirmar",
        contato: "A confirmar",
        acessibilidade: "A confirmar: se o veículo é adaptado para PCD."
      }
    ],
    aConfirmar: ["Coordenadas exatas dos pontos de embarque", "Horários oficiais da Linha 120", "Condições de acessibilidade nas passarelas do parque"],
    fontes: ["Linha 120: site da prefeitura de Foz e Transportes Foz do Iguaçu"],
    contato: "A confirmar"
  },
  {
    nome: "Parque das Aves",
    foto: "img/aves.jpg",
    servico: "Transporte para o Parque das Aves",
    sigla: "TA",
    posicao: [-25.6140, -54.4826],
    palavras: ["aves", "passaros"],
    descricao: "Parque com aves da Mata Atlântica, ao lado do Parque Nacional do Iguaçu.",
    embarques: [
      {
        id: "linha120",
        nome: "Linha 120 - Terminal Urbano (TUP)",
        tipo: "Ônibus urbano municipal",
        posicao: [-25.5445, -54.5845],
        instrucao: "No Terminal Urbano (TUP), pegue a Linha 120. O Parque das Aves fica na Rodovia das Cataratas, antes do Parque Nacional.",
        rota: "Sai do TUP, segue pela Avenida Brasil e entra na Rodovia das Cataratas.",
        paradas: ["Terminal Urbano (TUP) - ponto inicial", "Avenida Brasil - centro", "Parque das Aves - sua parada"],
        ondeDescer: "Desça na parada do Parque das Aves, na Rodovia das Cataratas. A entrada do parque fica na frente.",
        gratuidade: true,
        sustentabilidade: "Parabéns pela escolha sustentável! Transporte coletivo reduz drasticamente a pegada de carbono do seu passeio.",
        horarios: [{ hora: "06:30" }, { hora: "07:30" }, { hora: "08:30" }, { hora: "09:30" }, { hora: "10:30" }, { hora: "11:30" }, { hora: "12:30" }, { hora: "13:30" }, { hora: "14:30" }, { hora: "15:30" }, { hora: "16:30" }],
        horariosSimulados: true,
        preco: "Gratuito para pessoas com deficiência (apresentar cartão BPC/LOAS).",
        operadora: "Transportes Foz do Iguaçu (Reunidas)",
        contato: "(45) 3521-5000",
        acessibilidade: "Ônibus adaptado com plataforma elevatória."
      },
      {
        id: "transfer",
        nome: "Transfer turístico (busca no hotel)",
        tipo: "Transfer privado",
        posicao: [-25.5163, -54.5854],
        instrucao: "O transfer busca você na porta do hotel.",
        rota: "Sai do hotel e vai direto ao Parque das Aves pela Rodovia das Cataratas.",
        paradas: ["Hotel (embarque)", "Parque das Aves (desembarque)"],
        ondeDescer: "Na entrada principal do Parque das Aves.",
        gratuidade: false,
        horarios: [{ hora: "08:00" }, { hora: "09:00" }, { hora: "10:00" }, { hora: "13:00" }, { hora: "14:00" }, { hora: "15:00" }],
        horariosSimulados: true,
        preco: "A confirmar",
        operadora: "A confirmar",
        contato: "A confirmar",
        acessibilidade: "A confirmar."
      }
    ],
    aConfirmar: ["Qual transporte turístico atende o parque", "Condições de acessibilidade das trilhas"],
    fontes: ["Coordenadas: Wikipédia"],
    contato: "A confirmar"
  },
  {
    nome: "Marco das Três Fronteiras",
    foto: "img/marco.jpg",
    servico: "Transporte para o Marco",
    sigla: "MF",
    posicao: [-25.5974, -54.5912],
    palavras: ["marco", "fronteira"],
    descricao: "Ponto onde se encontram os rios Iguaçu e Paraná, com vista para a Argentina e o Paraguai.",
    embarques: [
      {
        id: "linha121",
        nome: "Linha 121 - Três Fronteiras",
        tipo: "Ônibus urbano municipal",
        posicao: [-25.5445, -54.5845],
        instrucao: "No Terminal Urbano (TUP), procure a plataforma da Linha 121 Três Fronteiras.",
        rota: "Sai do TUP, segue pela Avenida República Argentina até o Marco das Três Fronteiras.",
        paradas: ["Terminal Urbano (TUP) - ponto inicial", "Avenida República Argentina", "Marco das Três Fronteiras - ponto final"],
        ondeDescer: "No ponto final da linha, em frente ao Marco das Três Fronteiras.",
        gratuidade: true,
        sustentabilidade: "Escolha sustentável: o transporte público é a forma mais ecológica de explorar a tríplice fronteira.",
        horarios: [{ hora: "07:00" }, { hora: "09:00" }, { hora: "11:00" }, { hora: "14:00" }, { hora: "16:00" }, { hora: "19:00" }],
        horariosSimulados: true,
        preco: "Gratuito para pessoas com deficiência (apresentar cartão BPC/LOAS).",
        operadora: "Transportes Foz do Iguaçu (Reunidas)",
        contato: "(45) 3521-5000",
        acessibilidade: "Ônibus adaptado. Peça ao motorista para avisar no ponto final."
      },
      {
        id: "transfer",
        nome: "Transfer turístico (busca no hotel)",
        tipo: "Transfer privado",
        posicao: [-25.5163, -54.5854],
        instrucao: "O transfer busca você na porta do hotel.",
        rota: "Sai do hotel e vai direto ao Marco das Três Fronteiras.",
        paradas: ["Hotel (embarque)", "Marco das Três Fronteiras (desembarque)"],
        ondeDescer: "Na entrada do complexo do Marco das Três Fronteiras.",
        gratuidade: false,
        horarios: [{ hora: "09:30" }, { hora: "14:30" }, { hora: "19:00" }],
        horariosSimulados: true,
        preco: "A confirmar",
        operadora: "A confirmar",
        contato: "A confirmar",
        acessibilidade: "A confirmar."
      }
    ],
    aConfirmar: ["Qual empresa de city tour atende o local", "Condições de acessibilidade"],
    fontes: ["A preencher"],
    contato: "A confirmar"
  },
  {
    nome: "Itaipu Binacional",
    foto: "img/itaipu.jpg",
    servico: "Transporte para Itaipu",
    sigla: "IT",
    posicao: [-25.4380, -54.5880],
    palavras: ["itaipu", "usina"],
    descricao: "Usina hidrelétrica do Brasil e do Paraguai.",
    embarques: [
      {
        id: "transfer_itaipu",
        nome: "Transfer turístico para Itaipu",
        tipo: "Transfer privado",
        posicao: [-25.5163, -54.5854],
        instrucao: "O transfer busca você na porta do hotel. Não há ônibus urbano direto até Itaipu.",
        rota: "Sai do hotel e vai até o Centro de Visitantes de Itaipu pela BR-277.",
        paradas: ["Hotel (embarque)", "Centro de Visitantes de Itaipu (desembarque)"],
        ondeDescer: "No Centro de Visitantes de Itaipu, onde começa o passeio panorâmico.",
        gratuidade: false,
        horarios: [{ hora: "08:00" }, { hora: "09:00" }, { hora: "10:00" }, { hora: "13:00" }, { hora: "14:00" }, { hora: "15:00" }],
        horariosSimulados: true,
        preco: "A confirmar",
        operadora: "Itaipu Binacional / operadora de turismo",
        contato: "(45) 3576-7000",
        acessibilidade: "Ônibus panorâmico com espaço para PCD, audioguia disponível (a confirmar)."
      }
    ],
    aConfirmar: ["Ponto de embarque exato", "Condições de acessibilidade do passeio"],
    fontes: ["A preencher: turismoitaipu.com.br"],
    contato: "A confirmar"
  },
  {
    nome: "Templo Budista Chen Tien",
    foto: "img/templo.jpg",
    servico: "City Tour para o Templo",
    sigla: "TB",
    posicao: [-25.5330, -54.5620],
    palavras: ["templo", "budista"],
    descricao: "Templo budista de arquitetura chinesa em Foz do Iguaçu.",
    embarques: [
      {
        id: "city_tour",
        nome: "City Tour panorâmico",
        tipo: "City Tour (múltiplas paradas)",
        posicao: [-25.5163, -54.5854],
        instrucao: "O city tour busca você na porta do hotel. Inclui o Templo Budista entre outras paradas.",
        rota: "Sai do hotel, passa pelo Templo Budista, Marco das Três Fronteiras e outros pontos.",
        paradas: ["Hotel (embarque)", "Templo Budista", "Outros pontos turísticos", "Retorno ao hotel"],
        ondeDescer: "Na parada do Templo Budista. Avise o guia com antecedência.",
        gratuidade: false,
        horarios: [{ hora: "09:00" }, { hora: "14:00" }],
        horariosSimulados: true,
        preco: "A confirmar",
        operadora: "A confirmar",
        contato: "A confirmar",
        acessibilidade: "A confirmar."
      }
    ],
    aConfirmar: ["Localização exata", "Qual empresa atende o local", "Condições de acessibilidade"],
    fontes: ["A preencher"],
    contato: "A confirmar"
  }
];
