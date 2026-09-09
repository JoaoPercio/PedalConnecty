import { USABILITY_TEST_COUNT } from "./config";

export interface UsabilityTestDefinition {
  id: number;
  title: string;
  description: string;
  objective: string;
}

export const usabilityTests: UsabilityTestDefinition[] = [
  {
    id: 1,
    title: "Cadastro e acesso ao sistema",
    description:
      "Crie uma nova conta no PedalConnect preenchendo os dados solicitados no formulário de cadastro. Após concluir o cadastro, realize o login utilizando as credenciais cadastradas.",
    objective:
      "Verificar se o usuário consegue realizar o cadastro e acessar o sistema de forma independente.",
  },
  {
    id: 2,
    title: "Criação de um pedal",
    description:
      "Acesse a funcionalidade de criação de pedais e cadastre um novo pedal, preenchendo as informações solicitadas pelo sistema, como nome, descrição, distância e nível de dificuldade. Após finalizar o cadastro, verifique se o pedal criado é apresentado corretamente no sistema.",
    objective:
      "Verificar se o usuário consegue criar e visualizar um novo pedal.",
  },
  {
    id: 3,
    title: "Encontrar um pedal utilizando filtros",
    description:
      "Acesse a listagem de pedais disponíveis e utilize os filtros fornecidos pelo sistema para encontrar um pedal de acordo com critérios específicos, como distância e nível de dificuldade.",
    objective:
      "Verificar se o usuário consegue localizar um pedal de seu interesse utilizando os recursos de filtragem disponíveis.",
  },
  {
    id: 4,
    title: "Participação em um pedal",
    description:
      "Escolha um pedal disponível que seja de seu interesse e solicite sua participação. Após realizar a ação, acesse novamente as informações do pedal e verifique se sua participação foi registrada corretamente. Se ainda não houver pedais próximos, um pedal de demonstração será exibido para este teste.",
    objective:
      "Verificar se o usuário consegue participar de um pedal e identificar corretamente sua participação.",
  },
  {
    id: 5,
    title: "Envio de mensagem no chat de um pedal",
    description:
      "Acesse um pedal do qual você participa e entre na área de chat. Envie uma mensagem para os demais participantes do pedal e verifique se a mensagem foi apresentada corretamente no chat.",
    objective:
      "Verificar se o usuário consegue utilizar o chat para se comunicar com os demais participantes de um pedal.",
  },
  {
    id: 6,
    title: "Consulta aos detalhes de um pedal",
    description:
      "Acesse um pedal de seu interesse e consulte as informações disponíveis sobre ele, incluindo sua descrição, distância, nível de dificuldade, participantes e demais informações apresentadas pelo sistema.",
    objective:
      "Verificar se o usuário consegue encontrar e compreender as principais informações relacionadas a um pedal.",
  },
  {
    id: 7,
    title: "Criação de uma rota",
    description:
      "Acesse a funcionalidade de rotas e crie uma nova rota preenchendo as informações solicitadas pelo sistema. Após concluir o cadastro, retorne à listagem de rotas e localize a rota criada.",
    objective:
      "Verificar se o usuário consegue criar e posteriormente localizar uma rota cadastrada no sistema.",
  },
  {
    id: 8,
    title: "Favoritar uma rota",
    description:
      "Acesse a listagem de rotas e escolha uma rota que seja de seu interesse. Adicione essa rota aos seus favoritos e, posteriormente, acesse a área de rotas favoritas para verificar se a rota foi adicionada corretamente.",
    objective:
      "Verificar se o usuário consegue favoritar uma rota e encontrá-la posteriormente na área de favoritos.",
  },
  {
    id: 9,
    title: "Localização de serviços para bicicletas no mapa",
    description:
      "Acesse a funcionalidade de mapa do PedalConnect e procure por um estabelecimento ou serviço relacionado ao ciclismo, como uma bicicletaria. Selecione um dos locais apresentados e consulte as informações disponíveis sobre ele.",
    objective:
      "Verificar se o usuário consegue utilizar o mapa para localizar serviços de interesse para ciclistas.",
  },
  {
    id: 10,
    title: "Visualização de uma notificação",
    description:
      "Acesse a área de notificações do PedalConnect (ícone do sino) e visualize a notificação disponível, verificando as informações apresentadas. Se ainda não houver notificações reais, uma notificação de demonstração será exibida para este teste.",
    objective:
      "Verificar se o usuário consegue acessar e visualizar corretamente as notificações recebidas pelo sistema.",
  },
];

export function getUsabilityTestById(
  id: number
): UsabilityTestDefinition | undefined {
  return usabilityTests.find((t) => t.id === id);
}

export function assertCatalogSize(): void {
  if (usabilityTests.length !== USABILITY_TEST_COUNT) {
    throw new Error(
      `usabilityTests must contain exactly ${USABILITY_TEST_COUNT} items`
    );
  }
}
