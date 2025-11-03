# 🚀 Start AI Services - Quick Guide

## Current Setup: Hugging Face API (No Local Servers Needed!)

Good news! You're using **Hugging Face Inference API**, which means:
- ✅ No local Python servers to run
- ✅ No model downloads required
- ✅ No GPU needed
- ✅ Just API keys!

---

## ✅ What You Need

### 1. Hugging Face API Key
```env
HUGGINGFACE_API_KEY=your_token_here
```
Already set in `server/.env` ✅

### 2. Google AI API Key
```env
GOOGLE_AI_API_KEY=AIzaSyAvSmHxm0cTzwp1FxrtJf4tAVHrP-Q3A5k
```
Already set in `server/.env` ✅

---

## 🚀 Quick Start

### Step 1: Start Backend Server
```bash
cd server
npm start
```

### Step 2: Test AI Services
```bash
node test-huggingface-ai.js
```

### Step 3: Start Frontend
```bash
cd viewer
npm run dev
```

### Step 4: Use the App!
1. Open http://localhost:5173
2. Upload a medical image
3. Click "Analyze with AI"
4. Watch MedSigLIP + MedGemma work their magic! ✨

---

## 🔍 How It Works

```
┌─────────────────────────────────────────────────────┐
│  Your Computer                                      │
│                                                     │
│  ┌──────────┐         ┌──────────┐                │
│  │ Frontend │────────▶│ Backend  │                │
│  │ (React)  │         │ (Node.js)│                │
│  └──────────┘         └─────┬────┘                │
│                              │                      │
└──────────────────────────────┼──────────────────────┘
                               │
                               │ API Calls
                               │
        ┌──────────────────────┴──────────────────────┐
        │                                             │
        ▼                                             ▼
┌───────────────────┐                    ┌────────────────────┐
│ Hugging Face API  │                    │ Google Gemini API  │
│                   │                    │                    │
│ MedSigLIP Model   │                    │ gemini-2.0-flash   │
│ Classification    │                    │ Report Generation  │
└───────────────────┘                    └────────────────────┘
```

---

## 📊 What Each Service Does

### MedSigLIP (Hugging Face API)
**Purpose:** Classify medical images and detect abnormalities

**Process:**
1. Divides image into 3x3 grid (9 regions)
2. Classifies each region for medical conditions
3. Returns detections with confidence scores

**Example Output:**
```json
{
  "detections": [
    {
      "label": "pneumonia",
      "confidence": 0.87,
      "x": 100, "y": 150,
      "width": 200, "height": 180
    }
  ]
}
```

### MedGemma (Google Gemini API)
**Purpose:** Generate professional radiology reports

**Process:**
1. Takes image + MedSigLIP detections
2. Analyzes with Gemini Vision
3. Generates structured medical report

**Example Output:**
```json
{
  "report": {
    "findings": "Consolidation in right upper lobe...",
    "impression": "Findings consistent with pneumonia",
    "recommendations": ["Follow-up chest X-ray in 2 weeks"]
  }
}
```

---

## 🧪 Testing

### Test 1: Check Service Status
```bash
curl http://localhost:8001/api/ai/status
```

**Expected:**
```json
{
  "success": true,
  "services": {
    "medSigLIP": {
      "provider": "Hugging Face API",
      "enabled": true
    },
    "medGemma": {
      "provider": "Google Gemini API",
      "enabled": true
    }
  }
}
```

### Test 2: Test Connections
```bash
curl http://localhost:8001/api/ai/test
```

**Expected:**
```json
{
  "success": true,
  "services": {
    "medSigLIP": { "success": true },
    "medGemma": { "success": true }
  }
}
```

### Test 3: Run Test Script
```bash
node test-huggingface-ai.js
```

---

## ⚠️ Troubleshooting

### Backend Not Starting
```bash
cd server
npm install
npm start
```

### API Key Errors
Check `server/.env`:
```env
HUGGINGFACE_API_KEY=hf_...  # Must start with hf_
GOOGLE_AI_API_KEY=AIza...   # Must start with AIza
```

### 503 Model Loading (Hugging Face)
- First request may take 20-30 seconds
- Model is loading on Hugging Face servers
- Wait and retry

### 429 Rate Limit
- You've hit API rate limits
- Wait a few minutes
- Consider upgrading API plan

---

## 💰 Cost Considerations

### Hugging Face Inference API
- **Free Tier:** Limited requests per month
- **Pro:** $9/month for more requests
- **Enterprise:** Custom pricing

### Google Gemini API
- **Free Tier:** 60 requests per minute
- **Paid:** Pay per token
- Very affordable for medical imaging

---

## 🎯 Performance

### Analysis Time
- **MedSigLIP Classification:** 10-15 seconds (9 regions)
- **MedGemma Report:** 5-10 seconds (streaming)
- **Total:** 15-25 seconds per image

### Optimization Tips
- Reduce `MEDSIGLIP_GRID_SIZE` to 2 for faster analysis (4 regions)
- Use smaller images (resize to 512x512)
- Cache results for repeated analyses

---

## ✅ Checklist

- [x] Backend server running (port 8001)
- [x] Hugging Face API key configured
- [x] Google AI API key configured
- [x] Services tested and working
- [ ] Frontend running (port 5173)
- [ ] Test with medical image

---

## 🎉 You're Ready!

No local AI servers needed! Everything runs through cloud APIs.

Just start your backend and frontend, then upload a medical image to see the AI in action! 🚀
