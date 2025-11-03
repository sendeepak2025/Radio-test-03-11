# ⚡ Quick Start - Medical AI System

## 🚀 Start in 3 Steps

### 1️⃣ Start MedSigLIP Server
```bash
cd ai-detection-node
python medsigclip_server.py
```
Wait for: `✅ Server ready!`

### 2️⃣ Start Backend
```bash
cd server
npm start
```
Wait for: `Server running on port 8001`

### 3️⃣ Start Frontend
```bash
cd viewer
npm run dev
```
Open: http://localhost:5173

---

## ✅ Verify It Works

```bash
cd server
node test-medsigclip-service.js
```

**Expected:**
```
✅ SUCCESS: MedSigLIP is working!
🎉 Ready to classify medical images!
```

---

## 🎯 Use It

1. Open http://localhost:5173
2. Navigate to a study
3. Click **"Analyze with AI"**
4. Wait 15-25 seconds
5. View results! 🎉

---

## 📊 What You Get

### MedSigLIP (Local) - Classification
- ✅ Detects 9 medical conditions
- ✅ Grid-based analysis (3x3 = 9 regions)
- ✅ Confidence scores
- ✅ Bounding boxes
- ⏱️ Time: 10-15 seconds

### MedGemma (Gemini API) - Reports
- ✅ Professional radiology report
- ✅ Findings, Impression, Recommendations
- ✅ Context-aware
- ⏱️ Time: 5-10 seconds

**Total:** 15-25 seconds per image

---

## 🔧 Troubleshooting

### MedSigLIP Not Working?
```bash
# Check if server is running
curl http://localhost:5001/health

# If not, start it
cd ai-detection-node
python medsigclip_server.py
```

### Backend Not Connecting?
```bash
# Check backend status
curl http://localhost:8001/api/ai/test

# Restart backend
cd server
npm start
```

---

## 📚 Full Documentation

- `FINAL_AI_SETUP.md` - Complete setup guide
- `START_LOCAL_AI.md` - Detailed startup instructions
- `AI_INTEGRATION_STATUS.md` - Current status

---

## ✨ That's It!

Three commands, three terminals, ready to analyze medical images with AI! 🚀
