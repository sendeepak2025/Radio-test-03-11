# 🚀 Start Local AI Services

## ✅ Current Setup: Local Python Servers

Your system is configured to use **local MedSigLIP server** running on your machine.

```
Frontend → Backend (Node.js) → Local Python Servers
                                 ├─ MedSigLIP (localhost:5001)
                                 └─ MedGemma (Google Gemini API)
```

---

## 🎯 Quick Start

### Step 1: Start MedSigLIP Server (Required)

**Terminal 1:**
```bash
cd ai-detection-node
python medsigclip_server.py
```

**Expected Output:**
```
🚀 Starting MedSigLIP Server...
📍 Port: 5001
🔄 Loading MedSigLIP model...
✅ MedSigLIP model loaded successfully!
✅ Server ready!
 * Running on http://0.0.0.0:5001
```

### Step 2: Start Backend Server

**Terminal 2:**
```bash
cd server
npm start
```

**Expected Output:**
```
🔧 MedSigLIP Service initialized:
   Mode: Local Server
   URL: http://localhost:5001
Server running on port 8001
```

### Step 3: Start Frontend

**Terminal 3:**
```bash
cd viewer
npm run dev
```

### Step 4: Test Everything

**Terminal 4:**
```bash
cd server
node test-medsigclip-service.js
```

**Expected:**
```
✅ SUCCESS: MedSigLIP is working!
   Model: MedSigLIP (Local)
   Status: 200
   Model Loaded: true
```

---

## 🧪 Testing

### Test 1: Check if MedSigLIP Server is Running
```bash
curl http://localhost:5001/health
```

**Expected:**
```json
{
  "status": "healthy",
  "service": "MedSigLIP",
  "model_loaded": true,
  "version": "1.0.0"
}
```

### Test 2: Test Backend Integration
```bash
curl http://localhost:8001/api/ai/test
```

**Expected:**
```json
{
  "success": true,
  "services": {
    "medSigLIP": {
      "success": true,
      "model": "MedSigLIP (Local)",
      "modelLoaded": true
    },
    "medGemma": {
      "success": true,
      "model": "gemini-2.0-flash"
    }
  }
}
```

### Test 3: Check Service Status
```bash
curl http://localhost:8001/api/ai/status
```

---

## 📊 Architecture

### Data Flow
```
1. User uploads medical image
   ↓
2. Frontend → Backend (Node.js)
   ↓
3. Backend → Local MedSigLIP Server (Python)
   ├─ Divides image into 3x3 grid
   ├─ Classifies each region
   └─ Returns detections
   ↓
4. Backend → Google Gemini API
   ├─ Sends image + detections
   └─ Generates medical report
   ↓
5. Backend → Frontend
   └─ Display results with annotations
```

---

## ⚙️ Configuration

### Backend Configuration (`server/.env`)
```env
# MedSigLIP - Local Server
MEDSIGCLIP_ENABLED=true
MEDSIGCLIP_API_URL=http://localhost:5001
MEDSIGLIP_GRID_SIZE=3
MEDSIGLIP_CONFIDENCE_THRESHOLD=0.15

# MedGemma - Google Gemini API
GOOGLE_AI_API_KEY=AIzaSyAvSmHxm0cTzwp1FxrtJf4tAVHrP-Q3A5k
MEDGEMMA_MODEL=gemini-2.0-flash
MEDGEMMA_MAX_TOKENS=2048
```

### Python Server (`ai-detection-node/medsigclip_server.py`)
- **Port:** 5001
- **Model:** `flaviagiammarino/pubmed-clip-vit-base-patch32`
- **Endpoints:**
  - `GET /health` - Health check
  - `POST /classify` - Classify single image
  - `POST /detect` - Detect abnormalities (grid-based)
  - `GET /test` - Test endpoint

---

## 🔧 Troubleshooting

### MedSigLIP Server Won't Start

**Error: Model not found**
```bash
pip install torch transformers pillow flask flask-cors
```

**Error: Port 5001 already in use**
```bash
# Windows
netstat -ano | findstr :5001
taskkill /PID <PID> /F

# Or change port in medsigclip_server.py
app.run(host='0.0.0.0', port=5002)
```

### Backend Can't Connect to MedSigLIP

**Check if server is running:**
```bash
curl http://localhost:5001/health
```

**If not running:**
```bash
cd ai-detection-node
python medsigclip_server.py
```

### Slow Performance

**Reduce grid size** (faster but less thorough):
```env
MEDSIGLIP_GRID_SIZE=2  # 2x2 = 4 regions instead of 9
```

**Use GPU** (if available):
```python
# In medsigclip_server.py
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = model.to(device)
```

---

## 📈 Performance

### Expected Times
| Operation | Time | Details |
|-----------|------|---------|
| Model Loading | 10-30s | First time only |
| Single Classification | 1-2s | Per image |
| Grid Detection (3x3) | 10-15s | 9 regions |
| Grid Detection (2x2) | 5-8s | 4 regions |
| Report Generation | 5-10s | Gemini API |
| **Total Analysis** | **15-25s** | Complete workflow |

### Optimization Tips
1. **Reduce grid size** - 2x2 instead of 3x3
2. **Use GPU** - 5-10x faster
3. **Batch processing** - Process multiple images
4. **Cache results** - Store in database

---

## 🎯 Usage

### Via Frontend
1. Open http://localhost:5173
2. Navigate to a study
3. Click "Analyze with AI"
4. Wait 15-25 seconds
5. View results with annotations

### Via API
```bash
# Upload image for analysis
curl -X POST http://localhost:8001/api/ai/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "imageData": "data:image/jpeg;base64,...",
    "patientContext": {
      "age": 45,
      "gender": "M"
    }
  }'
```

---

## ✅ Checklist

Before using the system:

- [ ] Python dependencies installed
- [ ] MedSigLIP server running (port 5001)
- [ ] Backend server running (port 8001)
- [ ] Frontend running (port 5173)
- [ ] Test passed: `node server/test-medsigclip-service.js`
- [ ] Google Gemini API key configured

---

## 🎉 Ready!

Once all servers are running:
1. ✅ MedSigLIP (Local) - Classification
2. ✅ MedGemma (Gemini API) - Reports
3. ✅ Backend - Orchestration
4. ✅ Frontend - User Interface

**Start analyzing medical images!** 🚀

---

## 📞 Quick Commands

```bash
# Start MedSigLIP
cd ai-detection-node && python medsigclip_server.py

# Start Backend
cd server && npm start

# Start Frontend
cd viewer && npm run dev

# Test Services
cd server && node test-medsigclip-service.js

# Check Health
curl http://localhost:5001/health
curl http://localhost:8001/api/ai/test
```
