/**
 * Utility to compress and resize uploaded team shields and league logos
 * to crisp, lightweight Data URLs (max ~300x300 WebP/PNG, ~20-40KB).
 * Prevents LocalStorage QuotaExceeded errors and maximizes OBS 60fps rendering performance.
 */
export function compressImageFile(file: File, maxDimension: number = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    // If it's an SVG, read directly as text or dataURL since SVGs are already tiny
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }

        // High quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export as PNG to preserve transparent crest backgrounds
        try {
          const compressedDataUrl = canvas.toDataURL('image/png', 0.9);
          resolve(compressedDataUrl);
        } catch (e) {
          resolve(readerEvent.target?.result as string);
        }
      };

      img.onerror = () => {
        resolve(readerEvent.target?.result as string);
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
