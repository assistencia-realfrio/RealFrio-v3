import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export const generateOSReportSummary = async (
  description: string,
  anomaly: string,
  notes: string,
  parts: string[],
  duration: string
): Promise<string> => {
  try {
    // A chave vem do mapeamento definido no vite.config.ts
    const apiKey = process.env.API_KEY;

    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      console.error("DEBUG: API_KEY está vazia ou indefinida.");
      throw new Error("API_KEY_MISSING");
    }

    // Inicialização direta conforme regras Gemini SDK
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      Atua como um assistente administrativo técnico sénior da Real Frio.
      Gera um resumo profissional e conciso (em Português de Portugal) para um Relatório de Ordem de Serviço com base nos seguintes dados:
      
      Pedido do Cliente: ${description}
      Anomalia Detetada: ${anomaly || 'Não especificada'}
      Trabalho Efetuado: ${notes}
      Material: ${parts.join(', ') || 'Nenhum'}
      Tipo: ${duration}

      REGRAS:
      1. Linguagem técnica e formal do setor do frio.
      2. RETORNA APENAS O TEXTO DO RESUMO FINAL.
      3. Sem saudações ou introduções.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // Acesso direto à propriedade text (getter)
    return response.text?.trim() || "O motor de IA não conseguiu gerar um resumo válido.";
  } catch (error: any) {
    console.error("Erro Gemini:", error);
    if (error.message === "API_KEY_MISSING") {
      throw new Error("Chave de API não configurada. Defina GEMINI_API_KEY no painel da Vercel e faça Redeploy.");
    }
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("A chave de API fornecida é inválida ou o modelo não está disponível.");
    }
    throw new Error("Erro na comunicação com o serviço de Inteligência Artificial.");
  }
};