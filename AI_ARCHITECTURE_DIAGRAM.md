# 🏗️ AI Architecture Diagram

## Current System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                            │
│                     http://localhost:5173                           │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  MedicalImageViewer.tsx                                      │ │
│  │  - Upload medical images                                     │ │
│  │  - Display with annotations                                  │ │
│  │  - Show AI analysis results                                  │ │
│  └────────────────────────┬─────────────────────────────────────┘ │
│                           │                                         │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
                            │ HTTP POST /api/ai/analyze
                            │ { imageData, patientContext }
                            │
┌───────────────────────────▼─────────────────────────────────────────┐
│                      BACKEND (Node.js)                              │
│                    http://localhost:8001                            │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  aiAnalysis.js (Routes)                                      │ │
│  │  - POST /api/ai/analyze                                      │ │
│  │  - POST /api/ai/detect                                       │ │
│  │  - POST /api/ai/report                                       │ │
│  │  - GET  /api/ai/test                                         │ │
│  │  - GET  /api/ai/status                                       │ │
│  └────────────┬──────────────────────────┬──────────────────────┘ │
│               │                          │                         │
│               │                          │                         │
│  ┌────────────▼──────────────┐  ┌───────▼──────────────────────┐ │
│  │  medSigLIPService.js      │  │  medGemmaService.js          │ │
│  │  - Grid-based analysis    │  │  - Report generation         │ │
│  │  - Abnormality detection  │  │  - Structured output         │ │
│  └────────────┬──────────────┘  └───────┬──────────────────────┘ │
│               │                          │                         │
└───────────────┼──────────────────────────┼─────────────────────────┘
                │                          │
                │ HTTPS API Call           │ HTTPS API Call
                │                          │
┌───────────────▼──────────────┐  ┌───────▼──────────────────────┐
│   HUGGING FACE API           │  │   GOOGLE GEMINI API          │
│   api-inference.huggingface  │  │   generativelanguage.google  │
│                              │  │                              │
│  ┌────────────────────────┐ │  │  ┌────────────────────────┐ │
│  │  MedSigLIP Model       │ │  │  │  gemini-2.0-flash      │ │
│  │  openai/clip-vit-base  │ │  │  │  Vision + Text         │ │
│  │  - Image classification│ │  │  │  - Report generation   │ │
│  │  - Medical conditions  │ │  │  │  - Context aware       │ │
│  └────────────────────────┘ │  │  └────────────────────────┘ │
│                              │  │                              │
│  Returns:                    │  │  Returns:                    │
│  {                           │  │  {                           │
│    detections: [             │  │    report: {                 │
│      {                       │  │      findings: "...",        │
│        label: "pneumonia",   │  │      impression: "...",      │
│        confidence: 0.87,     │  │      recommendations: []     │
│        x, y, width, height   │  │    }                         │
│      }                       │  │  }                           │
│    ]                         │  │                              │
│  }                           │  │                              │
└──────────────────────────────┘  └──────────────────────────────┘
```

---

## Data Flow

### 1. Image Upload
```
User → Frontend → Backend
```

### 2. MedSigLIP Classification
```
Backend → Hugging Face API
├─ Divide image into 3x3 grid (9 regions)
├─ Send each region for classification
├─ Detect medical conditions
└─ Return detections with confidence scores

Time: 10-15 seconds
```

### 3. MedGemma Report Generation
```
Backend → Google Gemini API
├─ Send image + detections
├─ Generate structured report
└─ Return: Findings, Impression, Recommendations

Time: 5-10 seconds
```

### 4. Results Display
```
Backend → Frontend → User
├─ Show detections as bounding boxes
├─ Display classification results
└─ Present medical report
```

---

## Component Breakdown

### Frontend Components
```
viewer/src/
├── components/
│   └── viewer/
│       └── MedicalImageViewer.tsx    ← Main viewer component
├── services/
│   ├── AutoAnalysisService.ts        ← Auto-analysis logic
│   └── ApiService.ts                 ← API calls
└── pages/
    └── orthanc/
        └── OrthancViewerPage.tsx     ← DICOM viewer page
```

### Backend Components
```
server/src/
├── routes/
│   └── aiAnalysis.js                 ← AI endpoints ✅ UPDATED
├── services/
│   ├── medSigLIPService.js           ← HF API integration ✅ USING
│   ├── medGemmaService.js            ← Gemini API integration ✅ USING
│   └── geminiVisionService.js        ← Old service ❌ NOT USING
└── models/
    └── Study.js                      ← Database model
```

---

## API Endpoints

### POST /api/ai/analyze
**Complete analysis (detection + report)**

Request:
```json
{
  "imageData": "data:image/jpeg;base64,...",
  "patientContext": {
    "age": 45,
    "gender": "M",
    "clinicalHistory": "Chest pain"
  },
  "studyInstanceUID": "1.2.3.4...",
  "frameIndex": 0
}
```

Response:
```json
{
  "success": true,
  "analysisId": "AI-1234567890-ABC123",
  "classification": {
    "label": "pneumonia",
    "confidence": 0.87,
    "model": "MedSigLIP (Hugging Face)"
  },
  "findings": [
    {
      "type": "pneumonia",
      "location": "Region (100, 150)",
      "confidence": 0.87,
      "boundingBox": { "x": 100, "y": 150, "width": 200, "height": 180 }
    }
  ],
  "report": {
    "findings": "Consolidation in right upper lobe...",
    "impression": "Findings consistent with pneumonia",
    "recommendations": [],
    "model": "MedGemma (Google Gemini)"
  },
  "servicesUsed": ["MedSigLIP (Hugging Face)", "MedGemma (Google Gemini)"]
}
```

### POST /api/ai/detect
**Classification only (MedSigLIP)**

Request: `multipart/form-data` with image file

Response:
```json
{
  "success": true,
  "detections": [...],
  "metadata": {
    "imageWidth": 512,
    "imageHeight": 512,
    "gridSize": 3,
    "regionsProcessed": 9,
    "model": "openai/clip-vit-base-patch32"
  }
}
```

### POST /api/ai/report
**Report generation only (MedGemma)**

Request: `multipart/form-data` with image + detections

Response:
```json
{
  "success": true,
  "report": "...",
  "detections": [...],
  "metadata": {
    "model": "gemini-2.0-flash",
    "timestamp": "2024-10-27T...",
    "detectionsCount": 2
  }
}
```

### GET /api/ai/test
**Test both services**

Response:
```json
{
  "success": true,
  "services": {
    "medSigLIP": { "success": true, "model": "...", "status": 200 },
    "medGemma": { "success": true, "model": "...", "status": 200 }
  }
}
```

### GET /api/ai/status
**Get service configuration**

Response:
```json
{
  "success": true,
  "enabled": true,
  "mode": "real",
  "services": {
    "medSigLIP": {
      "provider": "Hugging Face API",
      "model": "openai/clip-vit-base-patch32",
      "enabled": true
    },
    "medGemma": {
      "provider": "Google Gemini API",
      "model": "gemini-2.0-flash",
      "enabled": true
    }
  }
}
```

---

## Configuration

### Environment Variables (server/.env)
```env
# AI Mode
AI_MODE=real
HUGGINGFACE_ENABLED=true

# API Keys
HUGGINGFACE_API_KEY=hf_...
GOOGLE_AI_API_KEY=AIza...

# MedSigLIP (Hugging Face)
MEDSIGLIP_MODEL=openai/clip-vit-base-patch32
MEDSIGLIP_GRID_SIZE=3
MEDSIGLIP_CONFIDENCE_THRESHOLD=0.15

# MedGemma (Google Gemini)
MEDGEMMA_MODEL=gemini-2.0-flash
MEDGEMMA_MAX_TOKENS=2048

# Timeouts
AI_REQUEST_TIMEOUT=60000
AI_CLASSIFICATION_TIMEOUT=30000
AI_REPORT_TIMEOUT=60000
```

---

## Performance Metrics

| Stage | Time | Details |
|-------|------|---------|
| Image Upload | <1s | Frontend → Backend |
| Grid Creation | <1s | 3x3 = 9 regions |
| MedSigLIP API | 10-15s | 9 region classifications |
| MedGemma API | 5-10s | Report generation |
| Results Display | <1s | Backend → Frontend |
| **Total** | **15-25s** | Complete analysis |

---

## Security

### API Keys
- Stored in `server/.env` (not committed to git)
- Never exposed to frontend
- Backend acts as proxy

### Data Flow
- Images sent over HTTPS
- No data stored by AI services
- Results cached in backend database

### Authentication
- Backend requires JWT token
- Frontend includes token in requests
- Unauthorized requests rejected

---

## Scalability

### Current Setup
- Cloud-based APIs (auto-scaling)
- No local infrastructure needed
- Pay-per-use pricing

### Optimization Options
1. **Reduce Grid Size** - 2x2 instead of 3x3 (faster, less thorough)
2. **Cache Results** - Store analysis results in database
3. **Batch Processing** - Analyze multiple images in parallel
4. **CDN for Images** - Faster image delivery

---

## Monitoring

### Backend Logs
```
🔍 Step 1: Running MedSigLIP detection (Hugging Face)...
Starting MedSigLIP detection...
Image dimensions: 512x512
Created 9 regions (3x3 grid)
Processing region 1/9...
✓ Abnormality detected: pneumonia (87.3%)
Detection complete. Found 2 abnormalities.

📝 Step 2: Generating MedGemma report (Google Gemini)...
Generating medical report with MedGemma...
Report generated successfully
✅ Analysis complete
```

### Frontend Console
```
🚀 Auto-triggering analysis for 1 slice(s)
🔬 [BACKEND] Analyzing slice 0 via backend API
📊 [BACKEND] Calling backend AI analysis API...
✅ Analysis complete: 2 findings detected
```

---

## Testing

### Test Script
```bash
node test-huggingface-ai.js
```

### Manual Testing
```bash
# Test status
curl http://localhost:8001/api/ai/status

# Test connections
curl http://localhost:8001/api/ai/test

# Test with image
curl -X POST http://localhost:8001/api/ai/detect \
  -F "image=@test-image.jpg"
```

---

## 🎯 Summary

✅ **Frontend** - React viewer with AI integration
✅ **Backend** - Node.js API with AI services
✅ **MedSigLIP** - Hugging Face API for classification
✅ **MedGemma** - Google Gemini API for reports
✅ **No Local Setup** - All cloud-based
✅ **Fast & Reliable** - 15-25 seconds per analysis

**Status:** READY TO USE 🚀
