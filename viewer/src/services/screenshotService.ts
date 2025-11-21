/**
 * Screenshot Service
 * Captures canvas with AI overlays for report embedding
 */

export interface ScreenshotOptions {
  includeAIOverlay: boolean;
  includeAnnotations: boolean;
  includeMeasurements: boolean;
  quality: number; // 0-1
  format: 'png' | 'jpeg';
  maxWidth?: number;
  maxHeight?: number;
}

export interface CapturedImage {
  id: string;
  dataUrl: string; // Can be base64 or server URL
  serverUrl?: string; // URL from server after upload
  caption: string;
  timestamp: Date;
  metadata: {
    studyUID: string;
    seriesUID?: string;
    instanceUID?: string;
    frameIndex?: number;
    windowLevel?: { width: number; center: number };
    zoom?: number;
    hasAIOverlay: boolean;
    hasAnnotations: boolean;
  };
}

export class ScreenshotService {
  private capturedImages: CapturedImage[] = [];
  private static readonly SERVER_BASE_URL = '/uploads/snapshots/';

  /**
   * Get full URL from filename or return data URL as-is
   */
  public static getImageUrl(dataUrl: string): string {
    // If it's a base64 data URL, return as-is
    if (dataUrl.startsWith('data:')) {
      return dataUrl;
    }
    // If it's already a full URL, return as-is
    if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
      return dataUrl;
    }
    // If it starts with /, it's already a path
    if (dataUrl.startsWith('/')) {
      return dataUrl;
    }
    // Otherwise, it's a filename - construct relative URL (will be proxied)
    return `${ScreenshotService.SERVER_BASE_URL}${dataUrl}`;
  }

  /**
   * Capture canvas as image
   */
  captureCanvas(
    canvas: HTMLCanvasElement,
    options: Partial<ScreenshotOptions> = {}
  ): string {
    const opts: ScreenshotOptions = {
      includeAIOverlay: true,
      includeAnnotations: true,
      includeMeasurements: true,
      quality: 0.95,
      format: 'png',
      ...options
    };

    try {
      // Get data URL from canvas
      const mimeType = opts.format === 'png' ? 'image/png' : 'image/jpeg';
      let dataUrl = canvas.toDataURL(mimeType, opts.quality);

      // Resize if needed
      if (opts.maxWidth || opts.maxHeight) {
        dataUrl = this.resizeImage(dataUrl, opts.maxWidth, opts.maxHeight);
      }

      console.log('📸 Screenshot captured:', {
        format: opts.format,
        quality: opts.quality,
        size: dataUrl.length
      });

      return dataUrl;
    } catch (error) {
      console.error('❌ Screenshot capture failed:', error);
      throw error;
    }
  }

  /**
   * Resize image data URL
   */
  private resizeImage(dataUrl: string, maxWidth?: number, maxHeight?: number): string {
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (maxWidth && width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (maxHeight && height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Create temporary canvas for resizing
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        
        if (tempCtx) {
          tempCtx.drawImage(img, 0, 0, width, height);
          resolve(tempCanvas.toDataURL('image/png', 0.95));
        } else {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    }) as any;
  }

  /**
   * Convert data URL to blob
   */
  private dataURLtoBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  /**
   * Upload image to server and return filename only
   */
  private async uploadImageToServer(dataUrl: string, filename: string): Promise<string | null> {
    try {
      // Convert data URL to blob without using fetch (CSP compliant)
      const blob = this.dataURLtoBlob(dataUrl);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', blob, filename);
      
      // Upload to server (using relative URL for proxy)
      const uploadResponse = await fetch('/upload/', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }
      
      const result = await uploadResponse.json();
      console.log('✅ Image uploaded to server:', result.filename);
      // Return only the filename, not the full URL
      return result.filename;
    } catch (error) {
      console.error('❌ Failed to upload image to server:', error);
      return null;
    }
  }

  /**
   * Save captured image with metadata
   */
  async saveCapturedImage(
    dataUrl: string,
    caption: string,
    metadata: CapturedImage['metadata']
  ): Promise<CapturedImage> {
    // Compress image if it's too large (reduce quality for storage)
    let finalDataUrl = dataUrl;
    const sizeInKB = Math.round(dataUrl.length / 1024);
    
    if (sizeInKB > 200) {
      console.log(`⚠️ Image is large (${sizeInKB}KB), compressing...`);
      try {
        // Re-compress with lower quality
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => { img.onload = resolve; });
        
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          finalDataUrl = canvas.toDataURL('image/jpeg', 0.7); // Use JPEG with 70% quality
          const newSizeInKB = Math.round(finalDataUrl.length / 1024);
          console.log(`✅ Compressed: ${sizeInKB}KB → ${newSizeInKB}KB`);
        }
      } catch (err) {
        console.warn('Failed to compress image, using original:', err);
      }
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const filename = `snapshot-${timestamp}-${randomId}.png`;
    
    // Upload to server and get filename
    const serverFilename = await this.uploadImageToServer(finalDataUrl, filename);
    
    const image: CapturedImage = {
      id: `img-${timestamp}-${randomId}`,
      dataUrl: serverFilename || finalDataUrl, // Store filename if upload succeeded, otherwise fallback to base64
      serverUrl: serverFilename || undefined,
      caption,
      timestamp: new Date(),
      metadata
    };

    this.capturedImages.push(image);
    console.log('💾 Image saved:', image.id, caption, serverFilename ? `(Server: ${serverFilename})` : `(${Math.round(finalDataUrl.length / 1024)}KB)`);

    return image;
  }

  /**
   * Get all captured images
   */
  getCapturedImages(): CapturedImage[] {
    return this.capturedImages;
  }

  /**
   * Get image by ID
   */
  getImageById(id: string): CapturedImage | undefined {
    return this.capturedImages.find(img => img.id === id);
  }

  /**
   * Remove image
   */
  removeImage(id: string): void {
    this.capturedImages = this.capturedImages.filter(img => img.id !== id);
    console.log('🗑️ Image removed:', id);
  }

  /**
   * Clear all images
   */
  clearAllImages(): void {
    this.capturedImages = [];
    console.log('🗑️ All images cleared');
  }

  /**
   * Update image caption
   */
  updateCaption(id: string, caption: string): void {
    const image = this.getImageById(id);
    if (image) {
      image.caption = caption;
      console.log('✏️ Caption updated:', id, caption);
    }
  }

  /**
   * Export images for report
   */
  exportForReport(): Array<{ id: string; dataUrl: string; caption: string }> {
    return this.capturedImages.map(img => ({
      id: img.id,
      dataUrl: img.dataUrl,
      caption: img.caption
    }));
  }

  /**
   * Download image
   */
  downloadImage(id: string, filename?: string): void {
    const image = this.getImageById(id);
    if (!image) {
      console.error('❌ Image not found:', id);
      return;
    }

    const link = document.createElement('a');
    link.href = image.dataUrl;
    link.download = filename || `medical-image-${id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('⬇️ Image downloaded:', filename);
  }

  /**
   * Get image count
   */
  getImageCount(): number {
    return this.capturedImages.length;
  }

  /**
   * Create thumbnail
   */
  createThumbnail(dataUrl: string, size: number = 150): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        // Calculate thumbnail dimensions (maintain aspect ratio)
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > size) {
            height = (height * size) / width;
            width = size;
          }
        } else {
          if (height > size) {
            width = (width * size) / height;
            height = size;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL('image/png', 0.8));
      };
      img.src = dataUrl;
    });
  }
}

// Singleton instance
export const screenshotService = new ScreenshotService();
