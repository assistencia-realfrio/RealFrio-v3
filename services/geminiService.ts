import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const callGeminiWithRetry = async (fn: () => Promise<any>, retries = MAX_RETRIES): Promise<any> => {
  try {
    return await fn();
  } catch (error: any) {
    const isRetryable = error?.message?.includes('503') || 
                        error?.message?.includes('high demand') || 
                        error?.message?.includes('UNAVAILABLE');
    
    if (isRetryable && retries > 0) {
      const delay = INITIAL_RETRY_DELAY * (MAX_RETRIES - retries + 1);
      console.warn(`Gemini API busy (503). Retrying in ${delay}ms... (${retries} attempts left)`);
      await sleep(delay);
      return callGeminiWithRetry(fn, retries - 1);
    }
    throw error;
  }
};

export const extractDeliveryDataFromPDF = async (pdfBase64: string): Promise<any> => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("A chave da API Gemini não está configurada.");
    }
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      Analisa o documento em anexo (uma guia de transporte ou documento de entrega) e extrai a seguinte informação em formato JSON.
      
      Instruções específicas de localização:
      1. DESTINATÁRIO: Procura pela secção "Destinatário" ou um bloco de texto no canto superior direito. 
      2. CLIENTE: O 'client_name' é o nome que aparece nesse bloco (ex: "NEOVALE...", "VASCO CARVALHO..."). NÃO uses "REALFRIO" ou "REAL FRIO", que é o remetente.
      3. NIF: Procura por "NIF" ou "Nº Contribuinte" dentro do bloco do destinatário.
      4. MORADA: A 'unloading_address' deve ser a morada que aparece no bloco do destinatário ou especificamente em "Local de Descarga".
      5. CÓDIGO AT: Procura por "Código AT" ou "Código de Identificação" (ex: 18669237178).
      6. ITENS: Extrai a lista de bens/serviços com nome e quantidade.

      Campos JSON esperados:
      - client_name: Nome do destinatário
      - client_nif: NIF do destinatário
      - loading_address: Morada de carga
      - unloading_address: Morada de descarga
      - at_code: Código AT
      - items: Array de { name: string, quantity: number }

      Retorna APENAS o JSON válido.
    `;

    const response = await callGeminiWithRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: pdfBase64,
              mimeType: 'application/pdf',
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
      }
    }));

    const text = response.text?.trim();
    if (!text) throw new Error("Resposta vazia da IA.");
    
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Erro Gemini PDF:", error);
    if (error?.message?.includes('503') || error?.message?.includes('high demand')) {
      throw new Error("O serviço de IA está temporariamente sobrecarregado. Por favor, tente novamente dentro de alguns segundos.");
    }
    throw new Error("Falha ao analisar o documento com IA. Verifique o ficheiro e tente novamente.");
  }
};

export const generateOSReportSummary = async (
  description: string,
  anomaly: string,
  notes: string,
  parts: string[],
  type: string
): Promise<string> => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("A chave da API Gemini não está configurada.");
    }
    const ai = new GoogleGenAI({ apiKey });
    
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

    const response: GenerateContentResponse = await callGeminiWithRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    }));

    return response.text?.trim() || "Não foi possível gerar um resumo automático.";
  } catch (error: any) {
    console.error("Erro Gemini:", error);
    if (error?.message?.includes('503') || error?.message?.includes('high demand')) {
      throw new Error("O serviço de IA está temporariamente sobrecarregado. Por favor, tente novamente mais tarde.");
    }
    throw new Error("Falha na comunicação com a IA. Tente novamente mais tarde.");
  }
};