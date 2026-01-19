
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockData } from '../services/mockData';
import { Lock, Mail, Sparkles } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { user, error } = await mockData.signIn(email, password);

      if (error) throw new Error(error.message || 'Dados inválidos.');
      if (user) {
        onLogin();
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro de ligação ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('admin@realfrio.pt');
    setPassword('admin123');
    // Pequeno delay para feedback visual
    setTimeout(() => {
        const form = document.querySelector('form');
        form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 lowercase-container">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <BrandLogo variant="dark" size="xl" className="mb-6" />
        <h2 className="text-center text-sm font-medium text-gray-500 uppercase tracking-widest mt-2">Área Técnica</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-[2rem] sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email de Acesso</label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-300" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 block w-full pl-12 pr-4 py-4 sm:text-sm border-none bg-slate-50 rounded-xl outline-none font-bold text-slate-900 transition-all"
                  placeholder="tecnico@realfrio.pt"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Senha</label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-300" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 block w-full pl-12 pr-4 py-4 sm:text-sm border-none bg-slate-50 rounded-xl outline-none font-bold text-slate-900 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-[10px] text-center bg-red-50 p-4 rounded-xl border border-red-100 uppercase font-black tracking-tight animate-shake">
                {error}
                <p className="mt-1 text-[8px] text-red-400 font-bold">Verifique os dados ou use o modo demonstração abaixo.</p>
              </div>
            )}

            <div className="space-y-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-5 px-4 border border-transparent rounded-2xl shadow-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all active:scale-[0.98] uppercase tracking-[0.2em]"
              >
                {loading ? 'A VALIDAR ACESSO...' : 'ENTRAR NO SISTEMA'}
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-100"></div>
                </div>
                <div className="relative flex justify-center text-[8px] font-black uppercase tracking-[0.3em]">
                  <span className="bg-white px-4 text-gray-300">OU</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-2xl text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-all active:scale-[0.98] uppercase tracking-widest"
              >
                <Sparkles size={14} />
                Entrar em Modo Demonstração
              </button>
            </div>
            
            <div className="text-center text-[8px] text-gray-300 mt-6 uppercase tracking-[0.4em] leading-relaxed">
               Acesso restrito a técnicos autorizados<br/>
               Real Frio Tech v2.2
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
