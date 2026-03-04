import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000; // Increased delay

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const callGeminiWithRetry = async (ai: any, params: any, retries = MAX_RETRIES): Promise<any> => {
  try {
    return await ai.models.generateContent(params);
  } catch (error: any) {
    const isRetryable = error?.message?.includes('503') || 
                        error?.message?.includes('high demand') || 
                        error?.message?.includes('UNAVAILABLE') ||
                        error?.message?.includes('429');
    
    if (isRetryable && retries > 0) {
      const delay = INITIAL_RETRY_DELAY * (MAX_RETRIES - retries + 1);
      console.warn(`Gemini API busy or rate limited. Retrying in ${delay}ms... (${retries} attempts left)`);
      
      // Fallback strategy: try different models
      if (params.model === 'gemini-1.5-flash') {
        params.model = 'gemini-1.5-pro';
      } else if (params.model === 'gemini-1.5-pro') {
        params.model = 'gemini-1.5-flash-8b';
      }

      await sleep(delay);
      return callGeminiWithRetry(ai, params, retries - 1);
    }
    throw error;
  }
};

const extractTextFromPDF = async (pdfBase64: string): Promise<string> => {
  try {
    const pdfData = atob(pdfBase64);
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  } catch (error) {
    console.error("Erro ao extrair texto do PDF localmente:", error);
    throw new Error("Falha ao ler o conteúdo do PDF. O ficheiro pode estar corrompido ou protegido.");
  }
};

export const extractDeliveryDataFromPDF = async (pdfBase64: string): Promise<any> => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("A chave da API Gemini não está configurada.");
    }
    const ai = new GoogleGenAI({ apiKey });

    // 1. Tentar extrair texto localmente (muito mais rápido e barato)
    let pdfText = '';
    try {
      pdfText = await extractTextFromPDF(pdfBase64);
    } catch (e) {
      console.warn("Falha na extração local de texto, tentando envio direto do PDF...", e);
    }

    const prompt = `
      Analisa o seguinte conteúdo de uma guia de transporte ou documento de entrega e extrai a informação em formato JSON.
      
      TEXTO DO DOCUMENTO:
      ${pdfText ? pdfText.substring(0, 30000) : '[O texto não pôde ser extraído localmente, analisa o anexo]'}

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

    // Se conseguimos extrair texto, enviamos apenas o texto (muito mais rápido)
    // Se não, enviamos o PDF completo como fallback
    const contents = pdfText ? {
      parts: [{ text: prompt }]
    } : {
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
      ]
    };

    const response = await callGeminiWithRetry(ai, {
      model: 'gemini-1.5-flash', // Usar versão estável de produção
      contents: contents,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Resposta vazia da IA.");
    
    // Limpar markdown se presente
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr);

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

    const response: GenerateContentResponse = await callGeminiWithRetry(ai, {
      model: 'gemini-1.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || "Não foi possível gerar um resumo automático.";
  } catch (error: any) {
    console.error("Erro Gemini:", error);
    if (error?.message?.includes('503') || error?.message?.includes('high demand')) {
      throw new Error("O serviço de IA está temporariamente sobrecarregado. Por favor, tente novamente mais tarde.");
    }
    throw new Error("Falha na comunicação com a IA. Tente novamente mais tarde.");
  }
};