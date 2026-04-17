
import { createClient } from '@supabase/supabase-js';

// Função de validação robusta para evitar o erro "Invalid supabaseUrl"
const getValidSupabaseConfig = () => {
  const urlFallback = 'https://mkhsfegoslmkaaeerldl.supabase.co';
  const keyFallback = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1raHNmZWdvc2xta2FhZWVybGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjgyMDMsImV4cCI6MjA4Mzk0NDIwM30.iXdGXQaRt1Xf_TBjq5B02LrXcRimgmez3V5C1lObZEE';

  // Tenta obter de várias fontes possíveis em ordem de prioridade
  let url = process.env.SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL;
  let key = process.env.SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  // Limpeza e validação da URL
  if (!url || typeof url !== 'string' || url.trim() === "" || !url.startsWith('http') || url.includes('undefined') || url.includes('null')) {
    url = urlFallback;
  }

  // Limpeza da Chave
  if (!key || typeof key !== 'string' || key.trim() === "" || key.includes('undefined') || key.includes('null')) {
    key = keyFallback;
  }

  return { url: url.trim(), key: key.trim() };
};

const { url: supabaseUrl, key: supabaseAnonKey } = getValidSupabaseConfig();

if (!supabaseUrl || supabaseUrl === "") {
  console.error("ERRO: SUPABASE_URL não está configurada.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Teste de conectividade básico para diagnosticar "Failed to fetch"
export const testSupabaseConnection = async () => {
    try {
        const { error } = await supabase.from('profiles').select('id').limit(1);
        if (error) {
            console.error("[Supabase] Teste de conexão falhou:", error);
            return { ok: false, error };
        }
        return { ok: true };
    } catch (e: any) {
        console.error("[Supabase] Erro de rede fatal:", e);
        return { ok: false, error: e };
    }
}
