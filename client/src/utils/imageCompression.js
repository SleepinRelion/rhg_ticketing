export const compressImage = (file, maxWidth = 1280, quality = 0.5) => {
  return new Promise((resolve) => {
    // Only compress images. Ignore SVGs, PDFs, etc.
    if (!file || !file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas back to a Blob
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          
          // Ensure the new filename has a .jpg extension
          let originalName = file.name;
          const lastDot = originalName.lastIndexOf('.');
          if (lastDot !== -1) {
             originalName = originalName.substring(0, lastDot) + '.jpg';
          } else {
             originalName += '.jpg';
          }
          
          const newFile = new File([blob], originalName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          
          resolve(newFile);
        }, 'image/jpeg', quality);
      };
      
      img.onerror = () => {
        resolve(file); // Fallback to original if image decoding fails
      };
    };
    
    reader.onerror = () => {
       resolve(file); // Fallback to original if file reading fails
    };
  });
};
