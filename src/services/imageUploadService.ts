/**
 * Cloud Image Upload Service
 * Automatically uploads user product photos to permanent Cloud CDN (ImgBB / Cloudinary)
 * and returns high-resolution permanent public HTTPS URLs accessible from any phone or PC.
 */

const DEFAULT_IMGBB_KEY = '6d207e02198a847aa5a850a53ff70782'; // Free public API key for warehouse photos

export const uploadImageToCloud = async (
  fileOrBase64: File | string,
  onProgress?: (status: string) => void
): Promise<string> => {
  try {
    if (onProgress) onProgress('Subiendo imagen a la nube...');

    let base64Data = '';

    if (fileOrBase64 instanceof File) {
      base64Data = await fileToBase64Clean(fileOrBase64);
    } else {
      // Remove data:image/...;base64, prefix if present
      base64Data = fileOrBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    }

    const formData = new FormData();
    formData.append('image', base64Data);

    const apiKey = localStorage.getItem('app_imgbb_api_key') || DEFAULT_IMGBB_KEY;
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }

    const data = await response.json();
    if (data && data.success && data.data && (data.data.display_url || data.data.url)) {
      const cloudUrl = data.data.display_url || data.data.url;
      if (onProgress) onProgress('¡Imagen subida con éxito!');
      return cloudUrl;
    } else {
      throw new Error(data?.error?.message || 'Error al procesar imagen en la nube');
    }
  } catch (error) {
    console.warn('Cloud upload failed, falling back to compressed local data:', error);
    if (fileOrBase64 instanceof File) {
      return await fileToDataUrl(fileOrBase64);
    }
    return typeof fileOrBase64 === 'string' ? fileOrBase64 : '';
  }
};

const fileToBase64Clean = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.replace(/^data:image\/[a-z]+;base64,/, '');
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
