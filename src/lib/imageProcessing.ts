interface OptimizeImageOptions {
  maxDimension?: number;
  quality?: number;
  outputType?: "image/jpeg" | "image/webp";
}

const DEFAULT_MAX_DIMENSION = 2000;
const DEFAULT_QUALITY = 0.86;

const getTargetSize = (width: number, height: number, maxDimension: number) => {
  const longestEdge = Math.max(width, height);

  if (longestEdge <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / longestEdge;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

export const optimizeImageForAnalysis = async (
  file: File,
  options: OptimizeImageOptions = {}
): Promise<string> => {
  const {
    maxDimension = DEFAULT_MAX_DIMENSION,
    quality = DEFAULT_QUALITY,
    outputType = "image/jpeg",
  } = options;

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };

    image.onload = () => {
      try {
        const sourceWidth = image.naturalWidth || image.width;
        const sourceHeight = image.naturalHeight || image.height;
        const { width, height } = getTargetSize(sourceWidth, sourceHeight, maxDimension);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d", { alpha: false });
        if (!context) {
          throw new Error("Canvas non disponibile");
        }

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(image, 0, 0, width, height);

        const optimizedImage = canvas.toDataURL(outputType, quality);
        cleanup();
        resolve(optimizedImage);
      } catch (error) {
        cleanup();
        reject(error instanceof Error ? error : new Error("Impossibile ottimizzare l'immagine"));
      }
    };

    image.onerror = () => {
      cleanup();
      reject(new Error("Formato immagine non supportato dal dispositivo"));
    };

    image.src = objectUrl;
  });
};
