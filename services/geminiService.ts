
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateOSReportSummary = async (
  description: string,
  anomaly: string,
  notes: string,
  parts: string[],
  duration: string
): Promise<string> => {
  try {
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

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text?.trim() || "Não foi possível gerar o resumo.";
  } catch (error) {
    console.error("Erro ao gerar resumo com Gemini:", error);
    return "Erro ao comunicar com o serviço de IA.";
  }
};
