
export const normalizeString = (str: string): string => {
  if (!str) return '';
  return str
    .normalize('NFD') // Decompõe caracteres acentuados (ex: 'ú' -> 'u' + '´')
    .replace(/[\u0300-\u036f]/g, '') // Remove os acentos/diacríticos
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove toda a pontuação e caracteres especiais, mantendo apenas letras, números e espaços
    .replace(/\s+/g, ' ') // Normaliza múltiplos espaços para um único espaço
    .trim();
};
