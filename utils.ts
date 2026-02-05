
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

/**
 * Comprime uma imagem reduzindo as dimensões e a qualidade para otimizar uploads.
 */
export const compressImage = (file: File, maxWidth = 1280, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Redimensionamento proporcional
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width *= maxWidth / height;
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Exportar como JPEG (mais leve que PNG para fotos)
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};
