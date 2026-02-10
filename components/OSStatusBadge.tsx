import React from 'react';
import { OSStatus } from '../types';

interface Props {
  status: OSStatus | string;
  className?: string;
}

const OSStatusBadge: React.FC<Props> = ({ status, className = '' }) => {
  const commonClasses = `px-2.5 py-0.5 rounded-full text-xs font-medium border inline-block whitespace-nowrap ${className}`;
  
  switch (status) {
    case OSStatus.POR_INICIAR:
      return <span className={`bg-gray-100 text-gray-700 border-gray-200 ${commonClasses}`}>Por Iniciar</span>;
    case OSStatus.INICIADA:
      return <span className={`bg-blue-50 text-blue-700 border-blue-200 ${commonClasses}`}>Iniciada</span>;
    case OSStatus.PARA_ORCAMENTO:
      return <span className={`bg-yellow-50 text-yellow-700 border-yellow-200 ${commonClasses}`}>Para Orçamento</span>;
    case OSStatus.ORCAMENTO_ENVIADO:
      return <span className={`bg-indigo-50 text-indigo-700 border-indigo-200 ${commonClasses}`}>Orç. Enviado</span>;
    case OSStatus.ORCAMENTO_ACEITE:
      return <span className={`bg-emerald-100 text-emerald-800 border-emerald-300 ${commonClasses}`}>Orç. Aceite</span>;
    case OSStatus.ORCAMENTO_REJEITADO:
      return <span className={`bg-red-50 text-red-700 border-red-200 ${commonClasses}`}>Orç. Rejeitado</span>;
    case OSStatus.AGUARDA_PECAS:
      return <span className={`bg-orange-50 text-orange-700 border-orange-200 ${commonClasses}`}>Aguarda Peças</span>;
    case OSStatus.PECAS_RECEBIDAS:
      return <span className={`bg-teal-50 text-teal-700 border-teal-200 ${commonClasses}`}>Peças Recebidas</span>;
    case OSStatus.CONCLUIDA:
      return <span className={`bg-green-50 text-green-700 border-green-200 ${commonClasses}`}>Concluída</span>;
    case OSStatus.CANCELADA:
      return <span className={`bg-red-50 text-red-700 border-red-200 ${commonClasses}`}>Cancelada</span>;
    default:
      return <span className={`bg-gray-100 text-gray-800 border-gray-200 ${commonClasses}`}>{status}</span>;
  }
};

export default OSStatusBadge;