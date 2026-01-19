import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { mockData } from '../services/mockData';

type StoreType = 'Todas' | 'Caldas da Rainha' | 'Porto de Mós';

interface StoreContextType {
  currentStore: StoreType;
  setStore: (store: StoreType) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentStore, setCurrentStore] = useState<StoreType>('Todas');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const initializeStore = () => {
      // 1. Verificar se há uma loja guardada manualmente na sessão do browser
      const saved = localStorage.getItem('app_selected_store');
      
      // 2. Verificar preferência do utilizador no perfil (prioridade se não houver seleção manual)
      const session = mockData.getSession();
      
      if (saved) {
        setCurrentStore(saved as StoreType);
      } else if (session?.store && session.store !== 'Todas') {
        setCurrentStore(session.store as StoreType);
      }
    };

    initializeStore();
  }, []);

  const setStore = (store: StoreType) => {
    setCurrentStore(store);
    localStorage.setItem('app_selected_store', store);
  };

  return (
    <StoreContext.Provider value={{ currentStore, setStore, searchTerm, setSearchTerm }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};