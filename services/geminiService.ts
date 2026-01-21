import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export const generateOSReportSummary = async (
  description: string,
  anomaly: string,
  notes: string,
  parts: string[],
  duration: string
): Promise<string> => {
  try {
    // Verificação de segurança: se o process.env.API_KEY não foi substituído pelo Vite
    if (!process.env.API_KEY || process.env.API_KEY === "" || process.env.API_KEY === "undefined") {
      throw new Error("API_KEY_MISSING");
    }

    // Inicialização direta conforme as regras da SDK
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Atua como um assistente administrativo técnico sénior da Real Frio.
      Gera um resumo profissional, formal e extremamente conciso (em Português de Portugal) para um Relatório de Ordem de Serviço com base nos seguintes dados:
      
      PEDIDO/PROBLEMA: ${description}
      ANOMALIA DETETADA: ${anomaly || 'Não especificada'}
      TRABALHO/NOTAS: ${notes}
      MATERIAL: ${parts.join(', ') || 'Nenhum'}
      TIPO: ${duration}

      REGRAS:
      1. Linguagem técnica e formal.
      2. RETORNA APENAS O TEXTO DO RESUMO FINAL.
      3. Proibido introduções como "Aqui está o resumo" ou "Resumo:".
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // Acesso direto à propriedade .text (getter)
    return response.text?.trim() || "Erro: Resumo vazio.";
  } catch (error: any) {
    console.error("Erro Crítico Gemini:", error);
    if (error.message === "API_KEY_MISSING") {
      throw new Error("Chave de API não detetada. Configure GEMINI_API_KEY no painel da Vercel e faça redeploy.");
    }
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("Chave de API inválida ou sem permissão para este modelo.");
    }
    throw new Error("Falha na comunicação com o motor de IA.");
  }
};