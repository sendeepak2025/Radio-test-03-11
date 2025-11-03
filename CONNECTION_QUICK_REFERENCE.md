# 🚀 Connection Quick Reference Card

## 📱 Access Methods

### Method 1: Web App (Recommended)
```
http://localhost:5173/connection-manager
```

### Method 2: Standalone HTML
```
Open: connection-manager-standalone.html
```

### Method 3: Mobile
```
Open: mobile-connection-check.html on phone
```

---

## ⚡ Quick Commands

### Check Internet
```cmd
ping google.com
```

### Check PACS Server
```cmd
ping 192.168.1.50
```
*(Replace with your PACS IP)*

### Check Orthanc
```cmd
curl http://localhost:8042/system
```

### Test DICOM Connection
```cmd
curl -X POST http://localhost:8042/modalities/MAIN_PACS/echo
```

### Restart Orthanc
```cmd
net stop orthanc
net start orthanc
```

---

## 🔧 Configuration Values

| Setting | Example Value | Where to Get |
|---------|--------------|--------------|
| PACS IP | 192.168.1.50 | IT Admin |
| DICOM Port | 4242 | IT Admin |
| PACS AE Title | MAIN_PACS | IT Admin |
| Local AE Title | LOCAL_WORKSTATION | Choose any |

---

## ✅ Success Checklist

- [ ] ✅ Internet Connectivity
- [ ] ✅ PACS Server Reachable
- [ ] ✅ DICOM Port Open
- [ ] ✅ Orthanc Running
- [ ] ✅ DICOM Echo Success

**All green = Ready to send images!**

---

## 🆘 Common Problems

### Problem: No Internet
**Fix:** Check WiFi/cable, restart router

### Problem: Can't Reach PACS
**Fix:** Verify IP address, check firewall

### Problem: Port Blocked
**Fix:** Open port 4242 in firewall

### Problem: Orthanc Not Running
**Fix:** Run `net start orthanc`

---

## 📞 Get Help

1. Run connection tests
2. Take screenshot of results
3. Contact IT with screenshot
4. Provide Activity Log

---

## 🎯 One-Line Test

```cmd
curl -X POST http://localhost:8042/modalities/MAIN_PACS/echo && echo SUCCESS || echo FAILED
```

**If you see "SUCCESS" - you're connected!**

---

## 📖 Full Guides

- **Detailed Setup:** `LOCAL_MACHINE_CONNECTION_GUIDE.md`
- **Easy Steps:** `EASY_CONNECTION_SETUP.md`
- **Troubleshooting:** See guides above

---

## 💡 Pro Tips

1. **Save your settings** - Write down PACS IP
2. **Test weekly** - Run tests regularly
3. **Keep Orthanc running** - Don't close it
4. **Check firewall** - Most common issue
5. **Ask IT early** - Don't struggle alone

---

## 🎨 Visual Status

```
🟢 Green = Working
🔴 Red = Problem
🟡 Yellow = Testing
⚪ Gray = Not tested
```

---

## 📱 Mobile Quick Check

1. Open mobile HTML file
2. Tap "Check Connection"
3. See instant status
4. Share screenshot with IT

---

## 🔄 Regular Maintenance

**Weekly:**
- Run all tests
- Verify all green
- Report any red to IT

**Monthly:**
- Update Orthanc if needed
- Review firewall rules
- Test with real images

---

## 🎓 Training Resources

- Video tutorial (coming soon)
- Step-by-step guide
- Interactive web interface
- Command reference

---

## ✨ Quick Start (30 seconds)

1. Open `connection-manager-standalone.html`
2. Enter PACS IP
3. Click "Save Configuration"
4. Click "Run All Tests"
5. Done! ✅

---

**Keep this card handy for quick reference!** 📌
