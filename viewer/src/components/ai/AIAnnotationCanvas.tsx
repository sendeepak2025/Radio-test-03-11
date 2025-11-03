import React, { useEffect, useRef, useState } from 'react';
import AIDetectionService, { Detection } from '../../services/AIDetectionService';
import './AIAnnotationCanvas.css';

// Note: Fabric.js canvas functionality temporarily disabled
// Will be added back once fabric is properly configured

interface AIAnnotationCanvasProps {
  imageUrl: string;
  onDetectionsChange?: (detections: Detection[]) => void;
  autoDetect?: boolean;
}

const AIAnnotationCanvas: React.FC<AIAnnotationCanvasProps> = ({
  imageUrl,
  onDetectionsChange,
  autoDetect = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize canvas (simplified without fabric for now)
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 800, 600);
    }
  }, []);

  // Load image (simplified)
  useEffect(() => {
    if (!canvasRef.current || !imageUrl) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Scale image to fit canvas
      const scale = Math.min(800 / img.width, 600 / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const x = (800 - scaledWidth) / 2;
      const y = (600 - scaledHeight) / 2;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 800, 600);
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

      // Auto-detect if enabled
      if (autoDetect) {
        handleDetect();
      }
    };
    img.src = imageUrl;
  }, [imageUrl, autoDetect]);

  // Draw detections on canvas (simplified)
  const drawDetections = (dets: Detection[]) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Redraw image first
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scale = Math.min(800 / img.width, 600 / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const x = (800 - scaledWidth) / 2;
      const y = (600 - scaledHeight) / 2;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 800, 600);
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

      // Draw detection boxes
      dets.forEach((det) => {
        ctx.strokeStyle = getColorForConfidence(det.confidence);
        ctx.lineWidth = 3;
        ctx.strokeRect(det.x, det.y, det.width, det.height);

        // Draw label
        ctx.fillStyle = getColorForConfidence(det.confidence);
        ctx.fillRect(det.x, det.y - 30, 200, 30);
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.fillText(`${det.label} ${(det.confidence * 100).toFixed(1)}%`, det.x + 5, det.y - 10);
      });
    };
    img.src = imageUrl;
  };

  // Get color based on confidence
  const getColorForConfidence = (confidence: number): string => {
    if (confidence >= 0.8) return '#ff4444'; // High confidence - red
    if (confidence >= 0.6) return '#ffaa00'; // Medium confidence - orange
    return '#ffff00'; // Low confidence - yellow
  };

  // Handle detection
  const handleDetect = async () => {
    if (!canvasRef.current) return;

    setIsDetecting(true);
    setError(null);

    try {
      const canvas = canvasRef.current;
      
      // Convert canvas to file
      const imageFile = await AIDetectionService.canvasToFile(canvas, 'medical-image.jpg');

      console.log('Starting detection...');
      const result = await AIDetectionService.detectAbnormalities(imageFile);

      console.log('Detection complete:', result);
      setDetections(result.detections);
      drawDetections(result.detections);

      if (onDetectionsChange) {
        onDetectionsChange(result.detections);
      }

    } catch (err: any) {
      console.error('Detection error:', err);
      setError(err.message || 'Detection failed');
    } finally {
      setIsDetecting(false);
    }
  };

  // Clear detections
  const handleClear = () => {
    setDetections([]);
    drawDetections([]);
    if (onDetectionsChange) {
      onDetectionsChange([]);
    }
  };

  return (
    <div className="ai-annotation-canvas">
      <div className="canvas-controls">
        <button
          onClick={handleDetect}
          disabled={isDetecting}
          className="btn-detect"
        >
          {isDetecting ? 'Detecting...' : 'Detect Abnormalities'}
        </button>
        <button
          onClick={handleClear}
          disabled={isDetecting || detections.length === 0}
          className="btn-clear"
        >
          Clear Detections
        </button>
        {detections.length > 0 && (
          <span className="detection-count">
            {detections.length} abnormality(ies) detected
          </span>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="canvas-container">
        <canvas ref={canvasRef} />
      </div>

      {detections.length > 0 && (
        <div className="detections-list">
          <h3>Detected Abnormalities:</h3>
          <ul>
            {detections.map((det, index) => (
              <li key={index} className="detection-item">
                <span className="detection-label">{det.label}</span>
                <span className="detection-confidence">
                  {(det.confidence * 100).toFixed(1)}%
                </span>
                <span className="detection-location">
                  ({det.x}, {det.y})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AIAnnotationCanvas;
