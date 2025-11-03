import React, { useState } from 'react';
import AIDetectionService, { Detection, PatientContext } from '../../services/AIDetectionService';
import './AIReportGenerator.css';

interface AIReportGeneratorProps {
  imageFile: File | null;
  detections: Detection[];
  patientContext?: PatientContext;
}

const AIReportGenerator: React.FC<AIReportGeneratorProps> = ({
  imageFile,
  detections,
  patientContext = {}
}) => {
  const [report, setReport] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useStreaming, setUseStreaming] = useState(true);

  const handleGenerateReport = async () => {
    if (!imageFile) {
      setError('No image file provided');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setReport('');

    try {
      if (useStreaming) {
        // Streaming mode - text appears in real-time
        await AIDetectionService.generateStreamingReport(
          imageFile,
          detections,
          patientContext,
          (chunk) => {
            setReport(prev => prev + chunk);
          }
        );
      } else {
        // Non-streaming mode - wait for complete report
        const result = await AIDetectionService.generateReport(
          imageFile,
          detections,
          patientContext
        );
        setReport(result.report);
      }

      console.log('Report generated successfully');
    } catch (err: any) {
      console.error('Report generation error:', err);
      setError(err.message || 'Report generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClear = () => {
    setReport('');
    setError(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(report);
  };

  const handleExport = () => {
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ai-report-generator">
      <div className="report-controls">
        <button
          onClick={handleGenerateReport}
          disabled={isGenerating || !imageFile}
          className="btn-generate"
        >
          {isGenerating ? 'Generating Report...' : 'Generate Medical Report'}
        </button>

        <label className="streaming-toggle">
          <input
            type="checkbox"
            checked={useStreaming}
            onChange={(e) => setUseStreaming(e.target.checked)}
            disabled={isGenerating}
          />
          <span>Real-time streaming</span>
        </label>

        {report && (
          <>
            <button onClick={handleCopy} className="btn-copy">
              Copy Report
            </button>
            <button onClick={handleExport} className="btn-export">
              Export Report
            </button>
            <button onClick={handleClear} className="btn-clear">
              Clear
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {detections.length > 0 && (
        <div className="detections-summary">
          <h4>Detections to include in report:</h4>
          <ul>
            {detections.map((det, index) => (
              <li key={index}>
                {det.label} ({(det.confidence * 100).toFixed(1)}%)
              </li>
            ))}
          </ul>
        </div>
      )}

      {(report || isGenerating) && (
        <div className="report-container">
          <h3>Medical Report</h3>
          <div className={`report-content ${isGenerating ? 'generating' : ''}`}>
            {report || 'Generating report...'}
            {isGenerating && <span className="cursor">|</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIReportGenerator;
