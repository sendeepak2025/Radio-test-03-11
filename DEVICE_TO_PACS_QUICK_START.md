# 🚀 Device to PACS - Quick Start Guide

## Connect Your Medical Device in 4 Easy Steps

---

## Step 1: Open the Setup Tool

### Option A: Web Application (Recommended)
```
1. Open your browser
2. Go to: http://localhost:5173/connection-manager
3. Or use menu: System → Device to PACS Setup
```

### Option B: Standalone HTML
```
1. Find file: device-to-pacs-setup.html
2. Double-click to open
3. No login needed!
```

---

## Step 2: Enter Device Information

### Your Device (that SENDS images):
- **Device Type:** Select from dropdown (CT, MRI, X-Ray, etc.)
- **Device IP:** Example: `192.168.1.100`
- **Device AE Title:** Example: `CT_SCANNER_1`

### Your PACS (that RECEIVES images):
- **PACS IP:** Example: `192.168.1.50`
- **PACS Port:** Usually `4242`
- **PACS AE Title:** Usually `ORTHANC`

---

## Step 3: Run Connection Tests

1. Click **"Run All Tests"** button
2. Wait for all 6 tests to complete:
   - ✅ Internet Connectivity
   - ✅ Device Network
   - ✅ Gateway Reachable
   - ✅ PACS Server Reachable
   - ✅ DICOM Port Open
   - ✅ PACS Service Running

3. **All green checkmarks = Ready to configure device!**

---

## Step 4: Configure Your Device

### The tool will show you:
- Configuration string to enter in your device
- Device-specific instructions
- Commands to test manually

### Example Configuration:
```
Destination Name: MAIN_PACS
AE Title: ORTHANC
Host/IP: 192.168.1.50
Port: 4242
```

### Enter this in your device's DICOM settings menu

---

## 📋 Common Device Locations

### CT Scanner:
```
Service Mode → Configuration → Network → DICOM → Add Storage SCP
```

### MRI:
```
System Configuration → Network → DICOM Nodes → Add Remote Node
```

### X-Ray:
```
System Settings → Network → DICOM Configuration → Add PACS
```

### Ultrasound:
```
Setup → Connectivity → DICOM → Add Archive
```

---

## ✅ Verify It Works

1. **Run DICOM Echo** from your device (if available)
2. **Send a test image** to PACS
3. **Check PACS** to see if image arrived:
   - Open: http://[PACS-IP]:8042
   - Look for your test study

---

## 🆘 Troubleshooting

### If Tests Fail:

**Internet Test Failed:**
- Check network cable/WiFi
- Verify device has network access

**PACS Not Reachable:**
- Verify PACS IP address is correct
- Check if on same network
- Ping PACS: `ping 192.168.1.50`

**DICOM Port Blocked:**
- Check firewall on PACS server
- Verify port 4242 is open
- Contact IT administrator

**PACS Service Not Running:**
- Check if Orthanc is running
- Restart PACS service
- Contact system administrator

---

## 💡 Pro Tips

1. **Write down your settings** - Keep PACS IP and port handy
2. **Test before production** - Send test images first
3. **Check regularly** - Run tests weekly
4. **Document everything** - Take screenshots of configuration
5. **Ask for help early** - Contact IT if stuck

---

## 📞 Need Help?

### Information to Collect:
- Device type and model
- Device IP address
- PACS IP address
- Test results (take screenshot)
- Error messages

### Who to Contact:
- IT Administrator
- PACS Administrator
- Device Service Engineer
- Vendor Support

---

## 📚 More Resources

- **Full Guide:** CONNECT_DEVICE_TO_PACS.md
- **Standalone Tool:** device-to-pacs-setup.html
- **Web App:** http://localhost:5173/connection-manager

---

## ✨ Success Checklist

- [ ] Opened setup tool
- [ ] Entered device information
- [ ] Entered PACS information
- [ ] Ran all tests
- [ ] All tests passed (green)
- [ ] Configured device with PACS details
- [ ] Ran DICOM Echo (if available)
- [ ] Sent test image
- [ ] Verified image in PACS
- [ ] Documented configuration

**All checked? You're ready to send images!** 🎉

---

**Keep this guide at your device workstation!** 📋

**Version:** 1.0.0
**Last Updated:** October 27, 2025
