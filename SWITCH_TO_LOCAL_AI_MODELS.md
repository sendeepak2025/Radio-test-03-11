# 🔄 Switch from Gemini to Local AI Models

## Current Situation
```
❌ Using: Google Gemini Vision API (gemini-2.0-flash)
✅ Available: MedSigLIP + MedGemma services (localhost:5001, localhost:5002)
```

## What Needs to Change

### Backend Changes
1. **Update AI Routes** - Switch from `geminiVisionService` to `medSigLIPService` + `medGemmaService`
2. **Start Local AI Services** - Run MedSigLIP and MedGemma on localhost
3. **Update Environment Variables** - Enable local AI services

### Frontend Changes
- No changes needed! Frontend already expects the same response format

---

## 🚀 Quick Start

### Step 1: Start Local AI Services

You need to run two separate AI services:

**Terminal 1 - MedSigLIP (Classification)**
```bash
cd ai-detection-node
python medsigclip_server.py
# Should start on http://localhost:5001
```

**Terminal 2 - MedGemma (Report Generation)**
```bash
cd ai-detection-node
python medgemma_server.py
# Should start on http://localhost:5002
```

### Step 2: Update Backend Routes

The backend routes need to be updated to use local services instead of Gemini.

**File: `server/src/routes/aiAnalysis.js`**
- Replace: `geminiVisionService`
- With: `medSigLIPService` + `medGemmaService`

### Step 3: Verify Configuration

Check `server/.env`:
```env
# Local AI Services
MEDSIGCLIP_API_URL=http://localhost:5001
MEDSIGCLIP_ENABLED=true
MEDGEMMA_4B_API_URL=http://localhost:5002
MEDGEMMA_4B_ENABLED=true

# AI Mode
AI_MODE=real
HUGGINGFACE_ENABLED=true
```

---

## 📋 Implementation Checklist

- [ ] Create AI service Python servers (if not exists)
- [ ] Update `server/src/routes/aiAnalysis.js` to use local services
- [ ] Start MedSigLIP server on port 5001
- [ ] Start MedGemma server on port 5002
- [ ] Test `/api/ai/test` endpoint
- [ ] Test complete analysis workflow
- [ ] Update health check to verify local services

---

## 🔧 Technical Details

### MedSigLIP Service (localhost:5001)
**Purpose:** Image classification and abnormality detection
**Input:** Medical image (JPEG/PNG)
**Output:** 
```json
{
  "detections": [
    {
      "label": "pneumonia",
      "confidence": 0.87,
      "location": "upper right lobe",
      "x": 100, "y": 150, "width": 200, "height": 180
    }
  ]
}
```

### MedGemma Service (localhost:5002)
**Purpose:** Medical report generation
**Input:** Image + detections + patient context
**Output:**
```json
{
  "report": {
    "findings": "...",
    "impression": "...",
    "recommendations": ["..."]
  }
}
```

---

## 🎯 Benefits of Local Models

✅ **No API Costs** - No Google AI API charges
✅ **Privacy** - Data stays on your server
✅ **Specialized** - Medical-specific models
✅ **Offline** - Works without internet
✅ **Faster** - No network latency

---

## 📊 Architecture Comparison

### Before (Current)
```
Frontend → Backend → Google Gemini API (Cloud)
                      └─ gemini-2.0-flash
```

### After (Target)
```
Frontend → Backend → Local AI Services
                      ├─ MedSigLIP (localhost:5001)
                      └─ MedGemma (localhost:5002)
```

---

## 🧪 Testing

After switching, test with:
```bash
# Test AI services
curl http://localhost:8001/api/ai/test

# Should return:
{
  "success": true,
  "services": {
    "medSigLIP": { "available": true },
    "medGemma": { "available": true }
  }
}
```

---

## ⚠️ Requirements

### Python Environment
```bash
pip install torch transformers pillow flask flask-cors
pip install google-generativeai  # For MedGemma
```

### Models to Download
- MedSigLIP: `flaviagiammarino/pubmed-clip-vit-base-patch32`
- MedGemma: Uses Google's Gemini API but runs locally

---

## 🔄 Next Steps

1. I'll create the Python server files for MedSigLIP and MedGemma
2. Update the backend routes to use local services
3. Create startup scripts
4. Test the complete workflow

Ready to proceed?
