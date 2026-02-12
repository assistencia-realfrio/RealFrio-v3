import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { mockData } from '../services/mockData';

type StoreType = 'Todas' | 'Caldas da Rainha' | 'Porto de Mós';

interface StoreContextType {
  currentStore: StoreType;
  setStore: (store: StoreType) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showSelectionModal: boolean;
  setShowSelectionModal: (show: boolean) => void;
  triggerSelectionModal: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentStore, setCurrentStore] = useState<StoreType>('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSelectionModal, setShowSelectionModal] = useState(false);

  useEffect(() => {
    const initializeStore = () => {
      const session = mockData.getSession();
      if (!session) return;

      // Verificar se já selecionou nesta sessão de browser
      const sessionSelected = sessionStorage.getItem('rf_store_selected_session');
      const savedStore = localStorage.getItem('app_selected_store');

      if (!sessionSelected) {
        setShowSelectionModal(true);
      }

      if (savedStore) {
        setCurrentStore(savedStore as StoreType);
      } else if (session?.store && session.store !== 'Todas') {
        setCurrentStore(session.store as StoreType);
      }
    };

    initializeStore();
  }, []);

  const setStore = (store: StoreType) => {
    setCurrentStore(store);
    localStorage.setItem('app_selected_store', store);
    sessionStorage.setItem('rf_store_selected_session', 'true');
    setShowSelectionModal(false);
  };

  const triggerSelectionModal = () => {
    setShowSelectionModal(true);
  };

  return (
    <StoreContext.Provider value={{ 
      currentStore, 
      setStore, 
      searchTerm, 
      setSearchTerm,
      showSelectionModal,
      setShowSelectionModal,
      triggerSelectionModal
    }}>
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