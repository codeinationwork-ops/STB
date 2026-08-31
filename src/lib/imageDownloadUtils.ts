/**
 * Utility to download any image (base64 data URL, blob URL, or remote URL) to the user's device.
 */
export async function downloadImageFile(imageUrl: string, suggestedFilename?: string): Promise<void> {
  if (!imageUrl || imageUrl.trim() === '') {
    console.warn('downloadImageFile: Empty image URL provided');
    return;
  }

  const cleanName = (suggestedFilename || `catalogue_image_${Date.now()}`)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
  const filename = cleanName.endsWith('.jpg') || cleanName.endsWith('.png') || cleanName.endsWith('.webp')
    ? cleanName
    : `${cleanName}.jpg`;

  // 1. If base64 data URL, trigger download immediately
  if (imageUrl.startsWith('data:')) {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // 2. If remote URL, attempt fetch to get Blob for cross-origin download
  try {
    const response = await fetch(imageUrl, { mode: 'cors' });
    if (response.ok) {
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
      return;
    }
  } catch (err) {
    console.warn('Cross-origin fetch failed, falling back to direct anchor/canvas fallback:', err);
  }

  // 3. Fallback: Draw to canvas or direct link
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return;
        }
      } catch (canvasErr) {
        console.warn('Canvas export failed:', canvasErr);
      }
      // Final fallback
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    img.onerror = () => {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    img.src = imageUrl;
  } catch {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
