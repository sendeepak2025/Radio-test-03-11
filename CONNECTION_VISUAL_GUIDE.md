# 🎨 Visual Connection Guide

## Step-by-Step with Pictures

This guide shows you exactly what you'll see when connecting your machine to PACS.

---

## 🚀 Getting Started

### Option 1: Double-Click Setup
```
📁 Your Project Folder
  └─ 📄 setup-connection-manager.bat  ← Double-click this!
```

**What happens:**
1. Window opens
2. Checks if Orthanc is installed
3. Starts Orthanc if needed
4. Opens connection manager
5. You're ready!

---

### Option 2: Open HTML File
```
📁 Your Project Folder
  └─ 📄 connection-manager-standalone.html  ← Double-click this!
```

**What you see:**
- Opens in your web browser
- No installation needed
- Works offline

---

### Option 3: Web Application
```
1. Open browser
2. Go to: http://localhost:5173/connection-manager
3. Login if needed
```

---

## 📝 Configuration Screen

### What You'll See:

```
┌─────────────────────────────────────────────────┐
│  🖥️ PACS Connection Manager                     │
│  Easy setup for connecting your machine         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  📝 Configuration                               │
│                                                 │
│  ℹ️ Need help? Ask your IT administrator       │
│                                                 │
│  PACS Server IP Address                         │
│  ┌─────────────────────────────────────────┐   │
│  │ 192.168.1.50                            │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  DICOM Port                                     │
│  ┌─────────────────────────────────────────┐   │
│  │ 4242                                    │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  PACS AE Title                                  │
│  ┌─────────────────────────────────────────┐   │
│  │ MAIN_PACS                               │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Local AE Title                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ LOCAL_WORKSTATION                       │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │      💾 Save Configuration              │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### How to Fill:

1. **PACS Server IP Address**
   - Example: `192.168.1.50`
   - Ask IT: "What is the PACS server IP?"
   - Usually starts with `192.168.` or `10.`

2. **DICOM Port**
   - Usually: `4242`
   - Sometimes: `104` or `11112`
   - Ask IT: "What is the DICOM port?"

3. **PACS AE Title**
   - Example: `MAIN_PACS` or `HOSPITAL_PACS`
   - Ask IT: "What is the PACS AE Title?"
   - Case-sensitive!

4. **Local AE Title**
   - Choose any name: `WORKSTATION1`, `DR_SMITH`, etc.
   - Must be unique
   - No spaces allowed

---

## 🔍 Testing Screen

### Before Testing:

```
┌─────────────────────────────────────────────────┐
│  🔍 Connection Tests                            │
│                                                 │
│  ┌──────────────────┐  ┌──────────────────┐    │
│  │ ▶️ Run All Tests │  │ 🗑️ Clear Results │    │
│  └──────────────────┘  └──────────────────┘    │
│                                                 │
│  ⏳ 🌐 Internet Connectivity                    │
│     Not tested yet                              │
│                                                 │
│  ⏳ 🖥️ PACS Server Reachability                 │
│     Not tested yet                              │
│                                                 │
│  ⏳ 🔌 DICOM Port                                │
│     Not tested yet                              │
│                                                 │
│  ⏳ ⚙️ Orthanc Service                           │
│     Not tested yet                              │
│                                                 │
│  ⏳ 📡 DICOM Echo                                │
│     Not tested yet                              │
└─────────────────────────────────────────────────┘
```

### During Testing:

```
┌─────────────────────────────────────────────────┐
│  🔍 Connection Tests                            │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ ⏳ Running Tests...                      │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  Progress: ████████████░░░░░░░░░░ 60%          │
│                                                 │
│  ✅ 🌐 Internet Connectivity                    │
│     Internet connection is working              │
│                                                 │
│  ✅ 🖥️ PACS Server Reachability                 │
│     Server at 192.168.1.50 is online           │
│                                                 │
│  🔄 🔌 DICOM Port                                │
│     Testing...                                  │
│                                                 │
│  ⏳ ⚙️ Orthanc Service                           │
│     Not tested yet                              │
│                                                 │
│  ⏳ 📡 DICOM Echo                                │
│     Not tested yet                              │
└─────────────────────────────────────────────────┘
```

### All Tests Passed:

```
┌─────────────────────────────────────────────────┐
│  🔍 Connection Tests                            │
│                                                 │
│  Progress: ████████████████████████ 100%       │
│                                                 │
│  ✅ 🌐 Internet Connectivity                    │
│     Internet connection is working              │
│                                                 │
│  ✅ 🖥️ PACS Server Reachability                 │
│     Server at 192.168.1.50 is online           │
│                                                 │
│  ✅ 🔌 DICOM Port                                │
│     Port 4242 is open and responding           │
│                                                 │
│  ✅ ⚙️ Orthanc Service                           │
│     Orthanc 1.12.0 is running                  │
│                                                 │
│  ✅ 📡 DICOM Echo                                │
│     Successfully connected to PACS              │
└─────────────────────────────────────────────────┘

🎉 All tests passed! You're ready to send images!
```

### Some Tests Failed:

```
┌─────────────────────────────────────────────────┐
│  🔍 Connection Tests                            │
│                                                 │
│  ✅ 🌐 Internet Connectivity                    │
│     Internet connection is working              │
│                                                 │
│  ✅ 🖥️ PACS Server Reachability                 │
│     Server at 192.168.1.50 is online           │
│                                                 │
│  ❌ 🔌 DICOM Port                                │
│     Port 4242 is blocked by firewall           │
│                                                 │
│  ✅ ⚙️ Orthanc Service                           │
│     Orthanc 1.12.0 is running                  │
│                                                 │
│  ❌ 📡 DICOM Echo                                │
│     Could not establish DICOM connection        │
└─────────────────────────────────────────────────┘

⚠️ Some tests failed. See troubleshooting below.
```

---

## 📋 Activity Log

### What You'll See:

```
┌─────────────────────────────────────────────────┐
│  📋 Activity Log                                │
│                                                 │
│  [14:23:45] Starting connection tests...        │
│  [14:23:46] Testing internet connectivity...    │
│  [14:23:47] ✓ Internet connectivity: OK        │
│  [14:23:48] Testing PACS server at 192.168...  │
│  [14:23:49] ✓ PACS server is reachable         │
│  [14:23:50] Testing DICOM port 4242...          │
│  [14:23:51] ✓ DICOM port is accessible         │
│  [14:23:52] Testing Orthanc service...          │
│  [14:23:53] ✓ Orthanc is running               │
│  [14:23:54] Sending DICOM Echo...               │
│  [14:23:55] ✓ DICOM Echo successful            │
│  [14:23:56] All tests completed                 │
└─────────────────────────────────────────────────┘
```

**Colors:**
- 🔵 Blue = Information
- 🟢 Green = Success
- 🔴 Red = Error

---

## ⚡ Quick Actions

```
┌─────────────────────────────────────────────────┐
│  ⚡ Quick Actions                                │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────┐│
│  │   🌐         │  │   📖         │  │  💻    ││
│  │ Open Orthanc │  │  View Guide  │  │Commands││
│  └──────────────┘  └──────────────┘  └────────┘│
└─────────────────────────────────────────────────┘
```

### What Each Button Does:

1. **🌐 Open Orthanc**
   - Opens Orthanc web interface
   - Upload and manage DICOM files
   - Send images to PACS

2. **📖 View Guide**
   - Opens detailed setup guide
   - Troubleshooting tips
   - Step-by-step instructions

3. **💻 Get Commands**
   - Downloads command reference
   - Copy-paste ready commands
   - For advanced users

---

## 🎯 Status Indicators

### Icon Meanings:

| Icon | Meaning | What to Do |
|------|---------|------------|
| ⏳ | Pending | Not tested yet |
| 🔄 | Running | Test in progress |
| ✅ | Success | Working correctly |
| ❌ | Failed | Needs attention |

### Color Meanings:

| Color | Status | Action |
|-------|--------|--------|
| 🟢 Green | Good | Nothing needed |
| 🔴 Red | Problem | Check troubleshooting |
| 🟡 Yellow | Warning | May need attention |
| ⚪ Gray | Unknown | Run tests |

---

## 📱 Mobile Version

### What You'll See on Phone:

```
┌─────────────────────┐
│  🖥️ PACS Connection │
│     Status          │
├─────────────────────┤
│                     │
│  ⏳ Tap "Check      │
│     Connection"     │
│     to start        │
│                     │
│  ┌───────────────┐  │
│  │ Check         │  │
│  │ Connection    │  │
│  └───────────────┘  │
│                     │
├─────────────────────┤
│  📋 Quick Info      │
│                     │
│  PACS IP:           │
│  Not configured     │
│                     │
│  Status:            │
│  Unknown            │
│                     │
│  Last Check:        │
│  Never              │
└─────────────────────┘
```

---

## 🔧 Troubleshooting Screens

### When Orthanc is Not Running:

```
┌─────────────────────────────────────────────────┐
│  ❌ ⚙️ Orthanc Service                           │
│     Orthanc is not accessible                   │
│                                                 │
│  💡 Quick Fix:                                  │
│  1. Open Command Prompt as Administrator        │
│  2. Type: net start orthanc                     │
│  3. Press Enter                                 │
│  4. Run tests again                             │
└─────────────────────────────────────────────────┘
```

### When Port is Blocked:

```
┌─────────────────────────────────────────────────┐
│  ❌ 🔌 DICOM Port                                │
│     Port 4242 is blocked by firewall           │
│                                                 │
│  💡 Quick Fix:                                  │
│  1. Open Windows Security                       │
│  2. Go to Firewall settings                     │
│  3. Allow port 4242                             │
│  4. Or ask IT administrator                     │
└─────────────────────────────────────────────────┘
```

### When PACS is Not Reachable:

```
┌─────────────────────────────────────────────────┐
│  ❌ 🖥️ PACS Server Reachability                 │
│     Cannot reach server at 192.168.1.50        │
│                                                 │
│  💡 Check:                                      │
│  ✓ Is the IP address correct?                  │
│  ✓ Is the PACS server turned on?               │
│  ✓ Are you on the same network?                │
│  ✓ Is firewall blocking connection?            │
└─────────────────────────────────────────────────┘
```

---

## ✅ Success Screen

### When Everything Works:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│              🎉 SUCCESS! 🎉                     │
│                                                 │
│     All connection tests passed!                │
│                                                 │
│  ✅ Internet: Connected                         │
│  ✅ PACS Server: Online                         │
│  ✅ DICOM Port: Open                            │
│  ✅ Orthanc: Running                            │
│  ✅ DICOM Echo: Success                         │
│                                                 │
│  You can now:                                   │
│  • Send images to PACS                          │
│  • Receive images from PACS                     │
│  • View studies in the system                   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │      🚀 Start Sending Images            │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📸 Screenshot Guide

### Where to Take Screenshots:

1. **Configuration Screen**
   - Shows your settings
   - Useful for IT support

2. **Test Results**
   - Shows what passed/failed
   - Essential for troubleshooting

3. **Activity Log**
   - Shows detailed errors
   - Helps diagnose problems

4. **Error Messages**
   - Any red error boxes
   - Important for support

### How to Share with IT:

1. Take screenshot (Press `Windows + Shift + S`)
2. Save the image
3. Email to IT support
4. Include:
   - What you were trying to do
   - What error you saw
   - Screenshot of the problem

---

## 🎓 Training Checklist

### For New Users:

- [ ] Open connection manager
- [ ] Understand each field
- [ ] Know where to get PACS info
- [ ] Can fill in configuration
- [ ] Can save settings
- [ ] Can run tests
- [ ] Understand test results
- [ ] Know what green checkmarks mean
- [ ] Know what red X's mean
- [ ] Can read activity log
- [ ] Know when to ask for help
- [ ] Can take screenshots
- [ ] Know who to contact for support

---

## 💡 Pro Tips

### Visual Cues to Remember:

1. **Green = Go** ✅
   - Everything working
   - Safe to proceed

2. **Red = Stop** ❌
   - Something wrong
   - Need to fix

3. **Yellow = Caution** ⚠️
   - May have issues
   - Check carefully

4. **Gray = Unknown** ⏳
   - Not tested
   - Run tests first

---

## 🎬 Video Tutorial (Coming Soon)

We're creating a video showing:
- Opening the connection manager
- Filling in each field
- Running the tests
- Understanding results
- Sending first image
- Troubleshooting common issues

**Stay tuned!** 📺

---

## 📞 Need Help?

If you're stuck:
1. Take screenshots of your screen
2. Note what you were trying to do
3. Contact IT support
4. Show them this guide

**Remember: There are no stupid questions!** 😊

---

**This guide is designed to be printed and kept at your workstation!** 📄
