import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export const generateOSReportSummary = async (
  description: string,
  anomaly: string,
  notes: string,
  parts: string[],
  duration: string
): Promise<string> => {
  try {
    /* The API key must be obtained exclusively from process.env.API_KEY and used directly in the named parameter. */
    if (!process.env.API_KEY || process.env.API_KEY === 'undefined') {
      throw new Error("API_KEY_MISSING");
    }

    /* Instantiate right before making an API call to ensure it uses the most up-to-date API key. */
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Atua como um assistente administrativo técnico sénior.
      Gera um resumo profissional e conciso (em Português de Portugal) para um Relatório de Ordem de Serviço com base nos seguintes dados:
      
      Problema Inicial (Cliente): ${description}
      Anomalia Detetada pelo Técnico: ${anomaly || 'Não especificada'}
      Trabalho Efetuado / Resolução: ${notes}
      Peças Utilizadas: ${parts.join(', ') || 'Nenhuma'}
      Duração do Trabalho: ${duration}

      REGRAS CRÍTICAS:
      1. O resumo deve ser formal e focar na relação entre a anomalia encontrada e a solução aplicada.
      2. RETORNA APENAS O TEXTO DO RESUMO. 
      3. NÃO incluas introduções ou explicações periféricas.
      4. O resultado deve estar pronto a ser colado diretamente no relatório oficial.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    /* Directly access the .text property of GenerateContentResponse. Do not call .text() as it is a getter. */
    return response.text?.trim() || "Não foi possível gerar o resumo.";
  } catch (error: any) {
    console.error("Erro ao gerar resumo com Gemini:", error);
    if (error.message === "API_KEY_MISSING") {
      throw new Error("Chave de API não configurada no ambiente.");
    }
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("API_KEY_INVALID");
    }
    throw error;
  }
};