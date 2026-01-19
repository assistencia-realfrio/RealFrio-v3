
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
    const saved = localStorage.getItem('app_selected_store');
    if (saved) {
      setCurrentStore(saved as StoreType);
    }
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
