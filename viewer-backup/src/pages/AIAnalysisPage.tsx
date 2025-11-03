import React, { useState } from 'react';
import AIAnnotationCanvas from '../components/ai/AIAnnotationCanvas';
import AIReportGenerator from '../components/ai/AIReportGenerator';
import { Detection, PatientContext } from '../services/AIDetectionService';
import './AIAnalysisPage.css';

const AIAnalysisPage: React.FC = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [patientContext, setPatientContext] = useState<PatientContext>({});

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setDetections([]);
    }
  };

  const handleDetectionsChange = (newDetections: Detection[]) => {
    setDetections(newDetections);
  };

  const handlePatientContextChange = (field: keyof PatientContext, value: string) => {
    setPatientContext(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="ai-analysis-page">
      <header className="page-header">
        <h1>AI Medical Image Analysis</h1>
        <p>MedSigLIP Detection + MedGemma Reporting</p>
      </header>

      <div className="upload-section">
        <label htmlFor="image-upload" className="upload-button">
          Upload Medical Image
        </label>
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
        {imageFile && (
          <span className="file-name">{imageFile.name}</span>
        )}
      </div>

      {imageUrl && (
        <>
          <div className="patient-context-section">
            <h2>Patient Context (Optional)</h2>
            <div className="context-inputs">
              <input
                type="text"
                placeholder="Age"
                value={patientContext.age || ''}
                onChange={(e) => handlePatientContextChange('age', e.target.value)}
              />
              <select
                value={patientContext.gender || ''}
                onChange={(e) => handlePatientContextChange('gender', e.target.value)}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <textarea
                placeholder="Clinical History"
                value={patientContext.clinicalHistory || ''}
                onChange={(e) => handlePatientContextChange('clinicalHistory', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="analysis-section">
            <div className="canvas-section">
              <h2>Step 1: Detection (MedSigLIP)</h2>
              <AIAnnotationCanvas
                imageUrl={imageUrl}
                onDetectionsChange={handleDetectionsChange}
                autoDetect={false}
              />
            </div>

            <div className="report-section">
              <h2>Step 2: Report Generation (MedGemma)</h2>
              <AIReportGenerator
                imageFile={imageFile}
                detections={detections}
                patientContext={patientContext}
              />
            </div>
          </div>
        </>
      )}

      {!imageUrl && (
        <div className="empty-state">
          <p>Upload a medical image to begin AI analysis</p>
        </div>
      )}
    </div>
  );
};

export default AIAnalysisPage;
