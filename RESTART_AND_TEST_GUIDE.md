# 🔄 Restart and Test Guide

## Why You Don't See Changes

The backend code has been updated, but **you need to restart the server** for the changes to take effect!

---

## 🚀 Quick Restart Steps

### Step 1: Stop the Server
```bash
# Press Ctrl+C in the terminal where server is running
# Or close the terminal
```

### Step 2: Restart the Server
```bash
cd server
npm start
# Or
node src/index.js
```

### Step 3: Restart the Frontend (if needed)
```bash
cd viewer
npm run dev
```

---

## ✅ Test the Fixes

### Test 1: Sign a Report

1. **Create a new report** or open an existing draft
2. Fill in all required sections:
   - Clinical History
   - Technique
   - Findings (at least 10 characters)
   - Impression (at least 5 characters)

3. **Click "Sign Report"** button
4. In the dialog:
   - Choose "Draw Signature" tab
   - Draw your signature
   - Enter your full name
   - Select signature meaning (e.g., "Authored")
   - Enter your password
   - Click "Sign Report"

5. **Check the response**:
   - Should show success message
   - Report status should change to "FINAL"
   - Report should be locked (no more edits)

### Test 2: Export PDF with Signature

1. **Open a signed report**
2. **Click "Export" → "PDF"**
3. **Download the PDF**
4. **Open and verify**:
   - ✅ Hospital logo in header (if configured)
   - ✅ Hospital name and address
   - ✅ All report sections present
   - ✅ Signature image visible
   - ✅ License number shown
   - ✅ Specialty displayed
   - ✅ Electronic signature footer

### Test 3: Verify Backend Logs

Check the server console for these logs:

```
📝 Sign request received: {
  reportId: 'SR-xxx',
  hasSignatureText: true,
  hasSignatureImage: true,
  hasFile: false,
  signatureMeaning: 'authored'
}

✅ Report signed successfully
```

---

## 🔍 Troubleshooting

### Issue: "Signature required" error

**Cause**: Signature data not being sent properly

**Solution**:
1. Make sure you drew a signature OR entered text
2. Check browser console for errors
3. Verify network tab shows `signatureData` in request body

### Issue: "Invalid password" error

**Cause**: Wrong password entered

**Solution**:
1. Enter the correct password for your account
2. Password is case-sensitive
3. Make sure there are no extra spaces

### Issue: "Validation failed" error

**Cause**: Report content incomplete

**Solution**:
Check the validation errors and fix:
- Add clinical history
- Add technique section
- Make findings longer (min 10 chars)
- Make impression longer (min 5 chars)

### Issue: Signature not showing in PDF

**Cause**: Server not restarted or signature not saved

**Solution**:
1. **Restart the server** (most common fix!)
2. Check if report is actually signed (status = "final")
3. Check server logs for errors
4. Try signing again

### Issue: No hospital info in PDF

**Cause**: Hospital not configured

**Solution**:
1. Add hospital information via API:
```bash
PUT /api/hospitals/:hospitalId
{
  "name": "City Medical Center",
  "logoUrl": "https://example.com/logo.png",
  "address": {
    "street": "123 Medical Drive",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001"
  },
  "contactPhone": "+1 (512) 668-9794",
  "contactEmail": "info@hospital.com"
}
```

---

## 📊 What Should Work Now

### ✅ Signature Handling
- Frontend sends signature data correctly
- Backend parses `signatureData` object
- Base64 images are stored
- Password is verified
- User info (license, specialty) is retrieved

### ✅ Report Export
- PDF includes hospital letterhead
- Signature image is displayed
- License and specialty shown
- Professional formatting
- All sections included

### ✅ Validation
- All required fields checked
- Minimum content length enforced
- Contrast documentation verified (CT)
- Signature required before finalizing

---

## 🧪 Complete Test Workflow

```bash
# 1. Restart server
cd server
npm start

# 2. In another terminal, restart frontend
cd viewer
npm run dev

# 3. Open browser
# Navigate to: http://localhost:5173

# 4. Login to the app

# 5. Go to Reporting page

# 6. Create a new report:
#    - Select a study
#    - Fill in all sections
#    - Add findings
#    - Write impression

# 7. Sign the report:
#    - Click "Sign Report"
#    - Draw signature
#    - Enter name and password
#    - Click "Sign Report"

# 8. Export PDF:
#    - Click "Export" → "PDF"
#    - Download and open PDF
#    - Verify signature and hospital info

# 9. Check server logs:
#    - Should see "Report signed successfully"
#    - Should see "PDF generated"
```

---

## 📝 Backend Changes Summary

### What Was Fixed:

1. **Signature Data Parsing**
```javascript
// Before: Only handled simple fields
const { signatureText, meaning } = req.body;

// After: Parses full signatureData object
let signatureData = {};
if (req.body.signatureData) {
  signatureData = typeof req.body.signatureData === 'string' 
    ? JSON.parse(req.body.signatureData) 
    : req.body.signatureData;
}

const { 
  signatureText,
  signatureImage,  // ✅ Base64 image
  signatureMeaning,
  password,        // ✅ Password verification
  reason
} = signatureData;
```

2. **Password Verification**
```javascript
if (password) {
  const user = await User.findById(userId);
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    return res.status(401).json({
      error: 'INVALID_PASSWORD',
      message: 'Invalid password'
    });
  }
}
```

3. **Signature Storage**
```javascript
// Store base64 image
if (signatureImage) {
  report.radiologistSignatureUrl = signatureImage;
  report.radiologistSignaturePublicId = 'base64-signature';
}

// Store full signature metadata
report.signature = {
  by: userId,
  displayName: fullName,
  licenseNumber: user.licenseNumber,
  specialty: user.specialty,
  at: new Date(),
  method: signatureImage ? 'image' : 'text',
  meaning: signatureMeaning,
  contentHash: hash
};
```

4. **PDF Generation**
```javascript
// Hospital letterhead
if (hospital) {
  doc.image(hospital.logoUrl, 50, 45, { width: 80 });
  doc.text(hospital.name, 140, 50);
  doc.text(hospital.address, 140, 70);
}

// Signature box
if (report.radiologistSignatureUrl) {
  if (report.radiologistSignatureUrl.startsWith('data:image')) {
    const base64Data = report.radiologistSignatureUrl.split(',')[1];
    const imgBuffer = Buffer.from(base64Data, 'base64');
    doc.image(imgBuffer, 60, sigBoxY + 10, { width: 150, height: 40 });
  }
}
```

---

## ⚠️ Important Notes

1. **Server Must Be Restarted**: Changes won't take effect until you restart the Node.js server

2. **Clear Browser Cache**: If you still don't see changes, clear browser cache (Ctrl+Shift+R)

3. **Check Console**: Always check both browser console and server console for errors

4. **Test with New Report**: Create a fresh report to test, don't use old cached data

5. **Hospital Setup**: Configure hospital information for full branding

---

## 🎯 Expected Results

After restarting and testing, you should see:

### In the App:
- ✅ Sign dialog with draw signature option
- ✅ Password verification prompt
- ✅ Success message after signing
- ✅ Report status changes to "FINAL"

### In the PDF:
- ✅ Hospital logo and name in header
- ✅ Complete address and contact info
- ✅ All report sections formatted nicely
- ✅ Signature image in signature box
- ✅ License number: MD12345
- ✅ Specialty: Diagnostic Radiology
- ✅ Electronic signature footer

### In Server Logs:
```
📝 Sign request received: { ... }
✅ Password verified
✅ Report validated
✅ Signature stored
✅ Report signed successfully
📤 PDF export request
✅ PDF generated with signature
```

---

## 🚀 Quick Commands

```bash
# Stop and restart server
cd server
# Press Ctrl+C
npm start

# In new terminal, restart frontend
cd viewer
npm run dev

# Check if server is running
curl http://localhost:8001/health

# Check if frontend is running
curl http://localhost:5173
```

---

## ✅ Checklist

Before testing, make sure:
- [ ] Server is restarted
- [ ] Frontend is restarted
- [ ] Browser cache is cleared
- [ ] You're logged in
- [ ] You have a study to report on
- [ ] You know your password

---

**🎉 After restarting, everything should work perfectly!**

If you still have issues after restarting, check the server logs and browser console for specific error messages.
