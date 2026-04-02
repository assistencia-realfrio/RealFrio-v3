
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis do ambiente atual (.env, variáveis do sistema/Vercel)
  // Casting process to any to fix "Property 'cwd' does not exist on type 'Process'" errors
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [
      react(),
      legacy({
        targets: ['ios >= 12', 'safari >= 12', 'chrome >= 60', 'firefox >= 60', 'edge >= 18'],
        polyfills: true
      })
    ],
    define: {
      // Mapeia as chaves para que process.env.API_KEY funcione no frontend
      // Prioriza a chave específica fornecida pelo utilizador (GEMINI_API_KEY)
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_API_KEY || env.API_KEY || ""),
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_API_KEY || env.API_KEY || ""),
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || ""),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || ""),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL || ""),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY || ""),
    }
  };
});
