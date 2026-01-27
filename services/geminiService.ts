import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export const generateOSReportSummary = async (
  description: string,
  anomaly: string,
  notes: string,
  parts: string[],
  type: string
): Promise<string> => {
  try {
    // Correctly initialize GoogleGenAI as per coding guidelines using the environment variable API_KEY
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Prompt otimizado para PT-PT e contexto técnico da Real Frio
    const prompt = `
      Atua como um técnico sénior de refrigeração e climatização da empresa Real Frio.
      Gera um resumo técnico, profissional e extremamente conciso para o relatório de uma Ordem de Serviço (OS).
      O texto deve be escrito obrigatoriamente em Português de Portugal (PT-PT).

      DADOS DA INTERVENÇÃO:
      - Tipo de Serviço: ${type}
      - Pedido Original: ${description}
      - Anomalia Detetada: ${anomaly || 'Não especificada'}
      - Notas de Resolução/Trabalho: ${notes}
      - Material Aplicado: ${parts.join(', ') || 'Nenhum material registado'}

      REGRAS DO RESUMO:
      1. Usa terminologia técnica correta (ex: fluido frigorigéneo, evaporador, condensadora, vácuo, carga, etc).
      2. Escreve na terceira pessoa ou infinitivo (ex: "Efetuada a substituição..." ou "Procedeu-se à limpeza...").
      3. Sê direto. Elimina "Olá", "Aqui está o resumo" ou qualquer introdução.
      4. Garante que o tom é formal e adequado para um relatório oficial que o cliente irá ler.
      5. RETORNA APENAS O TEXTO DO RESUMO.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text?.trim() || "Não foi possível gerar um resumo automático.";
  } catch (error: any) {
    console.error("Erro Gemini:", error);
    throw new Error("Falha na comunicação com a IA. Tente novamente mais tarde.");
  }
};