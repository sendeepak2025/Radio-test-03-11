# AI Assistant Quick Reference Guide
**Google Gemini Pro Integration**

## 🚀 Quick Start

### 1. Setup API Key
```bash
# In server/.env file, add:
GEMINI_API_KEY=your_api_key_here
```

Get your key: https://makersuite.google.com/app/apikey

### 2. Check Service Status
```bash
curl http://localhost:8001/api/reports/ai/health
```

Expected response:
```json
{
  "success": true,
  "available": true,
  "service": "Google Gemini Pro",
  "features": {
    "findingsAnalysis": true,
    "impressionGeneration": true,
    "criticalFindingDetection": true,
    "templateFieldSuggestions": true
  },
  "message": "AI service is operational"
}
```

---

## 📡 API Endpoints

### 1. Full Report Analysis
**Endpoint:** `POST /api/reports/:reportId/ai-analyze`

**Request:**
```json
{
  "analysisType": "full"  // Options: "full", "impression", "critical"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "findingsAnalysis": {
      "suggestions": ["Use 'consolidation' instead of 'density'", ...],
      "improvements": ["Specify lobe location", ...],
      "detectedFindings": [
        {
          "name": "Consolidation",
          "location": "Right lower lobe",
          "severity": "moderate"
        }
      ],
      "confidence": 0.85
    },
    "impressionSuggestion": {
      "impression": "1. Right lower lobe consolidation...\n2. ...",
      "confidence": 0.85,
      "alternatives": []
    },
    "criticalFindings": {
      "criticalFindings": [
        {
          "finding": "Large pneumothorax",
          "severity": 5,
          "location": "Right hemithorax",
          "requiresImmediate": true
        }
      ],
      "hasCritical": true,
      "requiresNotification": true
    }
  }
}
```

### 2. Generate Impression Only
**Endpoint:** `POST /api/reports/:reportId/ai-impression`

**No request body needed**

**Response:**
```json
{
  "success": true,
  "data": {
    "impression": "1. Normal chest radiograph.\n2. No acute cardiopulmonary process.",
    "confidence": 0.85,
    "alternatives": [],
    "timestamp": "2025-11-18T..."
  }
}
```

### 3. Template Field Suggestions
**Endpoint:** `POST /api/reports/templates/:templateId/ai-suggest`

**Request:**
```json
{
  "studyMetadata": {
    "modality": "CT",
    "bodyPart": "CHEST",
    "studyDescription": "CT Chest with contrast"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": {
      "technique": "CT of the chest performed with intravenous contrast...",
      "findings": "LUNGS: ...\nHEART: ...",
      "impression": "To be completed after findings review."
    },
    "confidence": 0.75
  }
}
```

---

## 🎯 Use Cases

### Use Case 1: Improve Findings Text
**Scenario:** Radiologist wrote findings but wants suggestions

**Steps:**
1. User completes findings section
2. Click "Analyze Findings" button
3. Call `POST /api/reports/:reportId/ai-analyze` with `analysisType: "full"`
4. Display suggestions in sidebar
5. User can click to apply suggestions

**Example UI:**
```
┌─────────────────────────────────┐
│ AI Suggestions (85% confidence)│
├─────────────────────────────────┤
│ ✓ Use 'consolidation' instead   │
│   of 'density'                  │
│                                 │
│ ⚠ Specify lobe location         │
│                                 │
│ ℹ Consider describing size      │
│                                 │
│ [Apply All] [Dismiss]           │
└─────────────────────────────────┘
```

### Use Case 2: Auto-Generate Impression
**Scenario:** Findings complete, need impression

**Steps:**
1. User completes findings section
2. Click "Generate Impression" button
3. Call `POST /api/reports/:reportId/ai-impression`
4. Show generated impression in preview
5. User can edit or accept

**Example UI:**
```
┌─────────────────────────────────┐
│ AI Generated Impression         │
├─────────────────────────────────┤
│ 1. Right lower lobe pneumonia   │
│ 2. Small right pleural effusion │
│ 3. No pneumothorax              │
│                                 │
│ [Accept] [Edit] [Regenerate]    │
└─────────────────────────────────┘
```

### Use Case 3: Critical Finding Alert
**Scenario:** Report contains critical finding

**Steps:**
1. User saves report
2. Backend auto-runs critical finding detection
3. If critical finding detected, show alert
4. Prompt user to document communication

**Example UI:**
```
┌─────────────────────────────────┐
│ ⚠️ CRITICAL FINDING DETECTED     │
├─────────────────────────────────┤
│ Finding: Large pneumothorax     │
│ Location: Right hemithorax      │
│ Severity: 5/5                   │
│                                 │
│ ⚠️ IMMEDIATE NOTIFICATION        │
│    REQUIRED                     │
│                                 │
│ [Document Communication]        │
└─────────────────────────────────┘
```

### Use Case 4: Template Auto-Fill
**Scenario:** Starting new report from template

**Steps:**
1. User selects template
2. System calls `POST /api/reports/templates/:templateId/ai-suggest`
3. Pre-fill sections with boilerplate text
4. User edits as needed

---

## 🧪 Testing Examples

### Test 1: Normal Chest X-Ray
```bash
# Create report with findings
curl -X POST http://localhost:8001/api/reports/:reportId/ai-impression \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Should generate:
# 1. Normal chest radiograph.
# 2. No acute cardiopulmonary process.
```

### Test 2: Pneumothorax Detection
```bash
# Report with critical finding
curl -X POST http://localhost:8001/api/reports/:reportId/ai-analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"analysisType": "critical"}'

# Should detect:
# - Finding: Pneumothorax
# - Severity: 5
# - requiresImmediate: true
```

### Test 3: Template Suggestions
```bash
curl -X POST http://localhost:8001/api/reports/templates/TPL-CHEST-XRAY-001/ai-suggest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studyMetadata": {
      "modality": "CR",
      "bodyPart": "CHEST",
      "studyDescription": "PA and Lateral Chest"
    }
  }'
```

---

## 💡 Best Practices

### For Developers

1. **Always check service availability first**
   ```javascript
   const health = await fetch('/api/reports/ai/health');
   if (!health.available) {
     // Show manual entry only
   }
   ```

2. **Show loading states**
   - AI requests can take 2-5 seconds
   - Display spinner or "Analyzing..." message

3. **Handle errors gracefully**
   ```javascript
   try {
     const result = await aiAnalyze(reportId);
   } catch (error) {
     if (error.status === 503) {
       alert('AI service not available');
     }
   }
   ```

4. **Cache results**
   - Don't re-analyze same text repeatedly
   - Store results in component state

### For Users

1. **Review AI suggestions carefully**
   - AI is assistive, not authoritative
   - Always verify medical accuracy

2. **Use AI for efficiency, not replacement**
   - AI helps with formatting, terminology
   - Final diagnosis is radiologist's responsibility

3. **Document critical findings manually**
   - AI detection is a safety net
   - Don't rely solely on automated alerts

---

## 🔧 Troubleshooting

### Issue: "AI service not available"
**Cause:** GEMINI_API_KEY not set

**Fix:**
```bash
# Add to server/.env
GEMINI_API_KEY=your_key_here

# Restart server
cd server && npm run dev
```

### Issue: Slow response times
**Cause:** Network latency to Google AI

**Fix:**
- Add timeout handling (30 second max)
- Show progress indicator
- Consider caching for repeated requests

### Issue: Poor quality suggestions
**Cause:** Insufficient context in prompt

**Fix:**
- Improve prompt engineering in `ai-assistant-service.js`
- Add more context fields (clinical history, prior studies)
- Fine-tune confidence thresholds

### Issue: Critical findings missed
**Cause:** AI limitations

**Fix:**
- AI is not 100% accurate
- Use as safety net, not primary detection
- Always perform manual review

---

## 📊 Cost Estimation

**Google Gemini Pro Pricing:**
- Free tier: 60 requests/minute
- Paid tier: $0.00025 per 1K characters

**Typical Usage:**
- Report analysis: ~2K characters = $0.0005
- 100 reports/day = $0.05/day = $1.50/month
- 1000 reports/day = $0.50/day = $15/month

**Comparison:**
- OpenAI GPT-4: ~$75/month for similar usage
- Anthropic Claude: ~$150/month
- **Gemini Pro: ~$25/month** ✅ Most cost-effective

---

## 🎓 Advanced Usage

### Custom Prompts
Edit prompts in `server/src/services/ai-assistant-service.js`:

```javascript
function buildAnalysisPrompt(findingsText, context) {
  return `You are an expert radiologist...
  
  CUSTOM INSTRUCTION: Focus on cardiac findings
  
  Findings: ${findingsText}
  ...`;
}
```

### Batch Processing
```javascript
// Process multiple reports
const reportIds = ['SR-001', 'SR-002', 'SR-003'];
const results = await Promise.all(
  reportIds.map(id => 
    fetch(`/api/reports/${id}/ai-analyze`, {
      method: 'POST',
      body: JSON.stringify({ analysisType: 'critical' })
    })
  )
);
```

### Integration with Worklist
```javascript
// Auto-analyze all pending reports
const pending = await fetchPendingReports();
for (const report of pending) {
  const analysis = await aiAnalyze(report.id);
  if (analysis.criticalFindings.hasCritical) {
    await notifyPhysician(report.id, analysis.criticalFindings);
  }
}
```

---

## 📝 Prompt Engineering Tips

1. **Be specific about output format**
   - Request JSON for structured data
   - Specify numbered lists for impressions

2. **Provide context**
   - Modality, body part, clinical history
   - Previous studies for comparison

3. **Set expectations**
   - "Be concise" vs "Be detailed"
   - "Focus on abnormalities" vs "Systematic review"

4. **Use examples**
   - Include sample outputs in prompts
   - Show desired terminology

---

## 🔒 Security & Privacy

1. **PHI Handling**
   - Never send patient identifiers to Gemini
   - Use context (modality, body part) instead of patient names
   - Sanitize reports before AI processing

2. **API Key Security**
   - Store in environment variables only
   - Never commit to git
   - Rotate keys periodically

3. **Audit Trail**
   - Log all AI-assisted reports
   - Track which suggestions were accepted
   - Document AI version used

---

## 📚 References

- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Gemini Pro Model Card](https://ai.google.dev/models/gemini)
- [Best Practices for Medical AI](https://www.fda.gov/medical-devices/software-medical-device-samd/artificial-intelligence-and-machine-learning-software-medical-device)
