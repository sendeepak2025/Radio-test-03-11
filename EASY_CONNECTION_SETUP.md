# 🚀 Easy Connection Setup - Quick Start

## For Non-Technical Users

This guide helps you connect your computer to the PACS system in simple steps.

---

## 📱 Access the Connection Manager

### Option 1: Web Interface (Easiest)
1. Open your web browser
2. Go to: `http://localhost:5173/connection-manager`
3. Follow the on-screen instructions

### Option 2: Open HTML File
1. Find the file: `connection-manager.html` in your project folder
2. Double-click to open in your browser
3. No installation needed!

---

## ✅ Simple 5-Step Process

### Step 1: Check Internet 🌐
**What to do:**
- Click the "Run All Tests" button
- Wait for the green checkmarks

**What you'll see:**
- ✅ Green = Good
- ❌ Red = Problem (see troubleshooting below)

---

### Step 2: Enter PACS Information 📝
**You need these details from your IT admin:**
- PACS Server IP (example: `192.168.1.50`)
- Port Number (usually `4242`)
- PACS Name (example: `MAIN_PACS`)

**How to enter:**
1. Click "Settings" button (top right)
2. Fill in the boxes
3. Click "Save Configuration"

---

### Step 3: Test Connection 🔍
**What to do:**
- Click "Run All Tests" button
- Watch the progress bar

**What should happen:**
All 5 tests should show green checkmarks:
1. ✅ Internet Connectivity
2. ✅ PACS Server Reachability
3. ✅ DICOM Port
4. ✅ Orthanc Service
5. ✅ DICOM Echo

---

### Step 4: Send Test Image 📤
**What to do:**
1. Click "Open Orthanc" button
2. Upload a DICOM file
3. Right-click on the study
4. Select "Send to DICOM modality"
5. Choose your PACS name
6. Click "OK"

**Success:** You'll see "Transfer successful"

---

### Step 5: Verify ✔️
**Check if image arrived:**
1. Open your PACS viewer
2. Search for the patient
3. You should see the image!

---

## 🔧 Troubleshooting (Simple Fixes)

### Problem: No Internet Connection
**Fix:**
1. Check if WiFi/Ethernet cable is connected
2. Try opening Google.com in browser
3. Restart your router if needed

---

### Problem: Cannot Reach PACS Server
**Fix:**
1. Ask IT admin: "Is the PACS server running?"
2. Check if you entered the correct IP address
3. Try pinging: Open Command Prompt, type:
   ```
   ping 192.168.1.50
   ```
   (Replace with your PACS IP)

---

### Problem: DICOM Port Blocked
**Fix:**
1. Windows Firewall might be blocking
2. Ask IT admin to open port 4242
3. Or temporarily disable firewall (for testing only):
   - Open Windows Security
   - Go to Firewall & network protection
   - Turn off (remember to turn back on!)

---

### Problem: Orthanc Not Running
**Fix:**
1. Open Command Prompt as Administrator
2. Type: `net start orthanc`
3. Press Enter
4. Try the test again

---

## 📞 Quick Help Commands

### Check if Orthanc is Running
```cmd
curl http://localhost:8042/system
```
**Good response:** Shows version information
**Bad response:** Error message

---

### Restart Orthanc
```cmd
net stop orthanc
net start orthanc
```

---

### Test PACS Connection
```cmd
curl -X POST http://localhost:8042/modalities/MAIN_PACS/echo
```
**Good response:** `{"Success": true}`
**Bad response:** Error message

---

## 🎯 Visual Guide

### What the Interface Looks Like:

```
┌─────────────────────────────────────────┐
│  🖥️ PACS Connection Manager             │
│  Easy setup for connecting your machine │
├─────────────────────────────────────────┤
│                                         │
│  📝 Configuration                       │
│  ┌─────────────────────────────────┐   │
│  │ PACS IP: [192.168.1.50      ]  │   │
│  │ Port:    [4242              ]  │   │
│  │ Name:    [MAIN_PACS         ]  │   │
│  └─────────────────────────────────┘   │
│  [Save Configuration]                  │
│                                         │
│  🔍 Connection Tests                    │
│  [Run All Tests]  [Clear]              │
│                                         │
│  ✅ Internet Connectivity               │
│     Internet connection is working      │
│                                         │
│  ✅ PACS Server Reachability            │
│     Server at 192.168.1.50 is online   │
│                                         │
│  ✅ DICOM Port                          │
│     Port 4242 is open                  │
│                                         │
│  ✅ Orthanc Service                     │
│     Orthanc 1.12.0 is running          │
│                                         │
│  ✅ DICOM Echo                          │
│     Successfully connected to PACS      │
│                                         │
│  ⚡ Quick Actions                       │
│  [Open Orthanc] [View Guide] [Send]   │
└─────────────────────────────────────────┘
```

---

## 📋 Checklist for IT Admin

When setting up for a user, ensure:

- [ ] Orthanc is installed and running
- [ ] PACS server IP is accessible from user's network
- [ ] Firewall allows port 4242 (DICOM)
- [ ] Firewall allows port 8042 (Orthanc web)
- [ ] User has PACS AE Title information
- [ ] Test DICOM echo works
- [ ] User can access connection manager interface

---

## 🌟 Success Indicators

**You're ready when you see:**
- All 5 tests show green checkmarks ✅
- Activity log shows "All tests completed"
- You can send a test image successfully
- Image appears in PACS viewer

---

## 💡 Tips for Success

1. **Keep it simple:** Follow steps in order
2. **Don't skip tests:** Each test checks something important
3. **Save your settings:** Write down your PACS IP and port
4. **Ask for help:** Contact IT admin if stuck
5. **Test regularly:** Run tests before sending important images

---

## 📱 Mobile Access

You can also check connection from your phone:
1. Open `mobile-connection-check.html` in phone browser
2. Tap "Check Connection"
3. See status instantly

---

## 🎓 Training Video (Coming Soon)

We're creating a video tutorial showing:
- How to open the connection manager
- How to fill in settings
- How to run tests
- How to send your first image

---

## ✉️ Support

**Need help?**
- Email: support@yourpacs.com
- Phone: 1-800-PACS-HELP
- Or show this guide to your IT admin

---

## 🔄 Regular Maintenance

**Do this once a week:**
1. Open connection manager
2. Click "Run All Tests"
3. Make sure all are green ✅
4. If any are red ❌, contact IT

**This ensures your connection stays healthy!**

---

## 🎉 You're All Set!

Once all tests pass, you can:
- Send images to PACS
- Receive images from PACS
- View images in the system
- Generate reports

**Happy imaging!** 🏥✨
