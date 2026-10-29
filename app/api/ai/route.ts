import { NextResponse } from "next/server";

interface AIRequest {
  action?:
    | "explain"
    | "summarize"
    | "questions"
    | "chat";

  content?: string;
  message?: string;
}

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as AIRequest;

    const {
      action,
      content,
      message,
    } = body;

    if (!action) {
      return NextResponse.json(
        {
          error:
            "Ação não informada.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      action !== "chat" &&
      !content?.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Conteúdo não informado.",
        },
        {
          status: 400,
        }
      );
    }

    let prompt = "";

    /*
     * CHAT
     */
    if (action === "chat") {
      if (!message?.trim()) {
        return NextResponse.json(
          {
            error:
              "Mensagem não informada.",
          },
          {
            status: 400,
          }
        );
      }

      prompt = `
Você é a IA do YourMind.

O YourMind é um espaço pessoal onde o usuário organiza estudos, ideias e projetos através de fluxogramas.

Sua função é compreender o conteúdo desses projetos e ajudar o usuário a entender, resumir e analisar o que foi organizado.

========================
CONTEXTO DO PROJETO
========================

${content || "Nenhum fluxograma foi selecionado."}

========================
PERGUNTA DO USUÁRIO
========================

${message}

========================
COMO RESPONDER
========================

Responda diretamente à pergunta.

Primeiro entenda o que o usuário está pedindo.

Se ele perguntar sobre o projeto:
explique o conteúdo principal usando somente as informações disponíveis.

Se ele pedir um resumo:
resuma as ideias principais sem apenas listar os nós.

Se ele pedir uma explicação:
explique de maneira simples e didática.

Se ele perguntar sobre um tópico ou anotação:
concentre-se nesse elemento e nas relações relacionadas a ele.

Se ele perguntar sobre código:
explique o código usando também as relações existentes no fluxograma.

Se ele perguntar sobre um problema:
analise o conteúdo disponível e diferencie problemas reais de possíveis melhorias.

========================
REGRAS
========================

- Use somente informações presentes no contexto.
- Não invente informações.
- Não crie sentimentos, intenções, motivos ou fatos que não estejam escritos.
- Não faça suposições sobre o usuário.
- Não transforme uma possibilidade em fato.
- Não use "parece", "talvez" ou "provavelmente" para inventar informações.
- As relações A → B representam conexões reais existentes no fluxograma.
- Imagens não devem ser analisadas como conteúdo textual.
- Não mencione imagens, IDs, coordenadas, posições, tamanhos ou cores.
- Se uma informação não estiver disponível, diga que ela não está disponível.
- Não repita informações desnecessariamente.
- Não faça uma análise completa quando a pergunta for específica.
- Não faça perguntas no final sem que o usuário tenha pedido.
- Não ofereça uma próxima ação sem que seja solicitado.
- Responda em português.
- Seja natural, clara e objetiva.

========================
RESPOSTA
========================
`;

    /*
     * EXPLICAR
     */
    } else if (
      action === "explain"
    ) {
      prompt = `
Você é a IA do YourMind.

Explique o conteúdo abaixo de maneira simples e didática.

Use somente as informações fornecidas.

Não invente informações.

Não faça suposições sobre o usuário.

Não mencione detalhes internos do editor.

CONTEÚDO:

${content}

RESPOSTA:
`;

    /*
     * RESUMIR
     */
    } else if (
      action === "summarize"
    ) {
      prompt = `
Você é a IA do YourMind.

O usuário pediu um resumo do conteúdo de um fluxograma.

CONTEÚDO DO FLUXOGRAMA:

${content}

TAREFA:

Faça um resumo curto e claro das ideias principais.

REGRAS:

- Use somente informações presentes no conteúdo.
- Não invente informações.
- Não faça suposições sobre a pessoa, projeto ou intenção do usuário.
- Não diga que o usuário é fã de alguém, a menos que isso esteja explicitamente escrito.
- Não crie motivos ou sentimentos que não estejam escritos.
- Não use "parece", "talvez", "provavelmente" ou "isso sugere" para adicionar informações.
- Não mencione imagens.
- Não mencione IDs, coordenadas, posições, tamanhos ou cores.
- Considere as relações entre os elementos quando forem relevantes.
- Não apenas liste os nós.
- Não faça perguntas.
- Não ofereça uma próxima ação.
- Não diga "você está perguntando".
- Comece diretamente pelo resumo.
- Responda em português.
- Seja objetivo.

RESUMO:
`;

    /*
     * PERGUNTAS
     */
    } else if (
      action === "questions"
    ) {
      prompt = `
Você é a IA do YourMind.

Crie 5 perguntas para estudar o conteúdo abaixo.

CONTEÚDO:

${content}

REGRAS:

- Use somente as informações fornecidas.
- Não invente informações.
- Misture perguntas fáceis, médias e difíceis.
- Não forneça as respostas.
- Responda em português.

PERGUNTAS:
`;

    /*
     * AÇÃO INVÁLIDA
     */
    } else {
      return NextResponse.json(
        {
          error:
            "Ação inválida.",
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      "Enviando pergunta para Ollama..."
    );

    const ollamaResponse =
      await fetch(
        "http://127.0.0.1:11434/api/generate",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            model: "llama3.2",

            prompt,

            stream: false,

            options: {
              temperature: 0.2,
              num_predict: 200,
            },
          }),
        }
      );

    console.log(
      "Status Ollama:",
      ollamaResponse.status
    );

    if (
      !ollamaResponse.ok
    ) {
      const errorText =
        await ollamaResponse.text();

      console.error(
        "Erro do Ollama:",
        errorText
      );

      return NextResponse.json(
        {
          error:
            "O Ollama retornou um erro.",
        },
        {
          status: 500,
        }
      );
    }

    const data =
      (await ollamaResponse.json()) as {
        response?: string;
      };

    console.log(
      "Resposta recebida do Ollama."
    );

    return NextResponse.json({
      result:
        data.response?.trim() ||
        "A IA não retornou uma resposta.",
    });
  } catch (error) {
    console.error(
      "Erro ao conectar com Ollama:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível conectar ao Ollama. Verifique se o Ollama está em execução.",
      },
      {
        status: 500,
      }
    );
  }
}