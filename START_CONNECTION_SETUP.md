# 🚀 START HERE - Connection Setup

## Quick Start in 3 Steps

### Step 1: Choose Your Method

#### 🎯 Easiest (Recommended for Non-Technical Users)
```
Double-click: setup-connection-manager.bat
```
This will:
- Check if everything is installed
- Start required services
- Open the connection manager
- Guide you through setup

---

#### 🌐 Web Application (For Daily Use)
```
1. Open browser
2. Go to: http://localhost:5173/connection-manager
3. Login if needed
```
Best for integrated workflow

---

#### 📄 Standalone HTML (Works Anywhere)
```
Double-click: connection-manager-standalone.html
```
No installation needed, works offline

---

### Step 2: Enter Your PACS Details

You need these 4 pieces of information (ask your IT admin):

1. **PACS Server IP** (example: `192.168.1.50`)
2. **DICOM Port** (usually `4242`)
3. **PACS AE Title** (example: `MAIN_PACS`)
4. **Local AE Title** (choose any name like `WORKSTATION1`)

---

### Step 3: Test Connection

1. Click "Save Configuration"
2. Click "Run All Tests"
3. Wait for results
4. All green ✅ = Success!

---

## 📚 Need More Help?

### For Non-Technical Users:
📗 **EASY_CONNECTION_SETUP.md** - Simple 5-step guide

### For Visual Learners:
📕 **CONNECTION_VISUAL_GUIDE.md** - Screenshots and pictures

### For Quick Reference:
📙 **CONNECTION_QUICK_REFERENCE.md** - One-page cheat sheet

### For Technical Details:
📘 **LOCAL_MACHINE_CONNECTION_GUIDE.md** - Complete technical guide

### For Everything:
📓 **CONNECTION_MODULE_COMPLETE.md** - Full documentation

---

## 🆘 Troubleshooting

### Problem: Can't open connection manager
**Try:**
1. Run `setup-connection-manager.bat`
2. Or open `connection-manager-standalone.html`

### Problem: Tests are failing
**Try:**
1. Run `test-connection.bat` for detailed info
2. Check the troubleshooting section in guides
3. Contact IT support

### Problem: Don't know PACS details
**Solution:**
Ask your IT administrator for:
- PACS server IP address
- DICOM port number
- PACS AE Title

---

## ✅ Quick Test

Want to test if everything is working?

**Run this command:**
```cmd
test-connection.bat
```

It will test all 5 connection points and show results.

---

## 📞 Get Help

1. Take a screenshot of any errors
2. Note what you were trying to do
3. Contact IT support
4. Show them this guide

---

## 🎯 Success Checklist

- [ ] Opened connection manager
- [ ] Entered PACS details
- [ ] Saved configuration
- [ ] Ran all tests
- [ ] All tests passed (green checkmarks)
- [ ] Sent test image successfully

**All checked? You're ready to use the system!** 🎉

---

## 📱 Access from Anywhere

### Desktop/Laptop:
- Web app: `http://localhost:5173/connection-manager`
- Standalone: `connection-manager-standalone.html`

### Mobile/Tablet:
- Open: `mobile-connection-check.html`

### Command Line:
- Test: `test-connection.bat`
- Setup: `setup-connection-manager.bat`

---

## 💡 Pro Tips

1. **Save your settings** - Write down your PACS IP
2. **Test weekly** - Make sure connection still works
3. **Keep guides handy** - Print the quick reference
4. **Ask early** - Don't struggle alone
5. **Take screenshots** - Helps when asking for help

---

## 🎓 Training Available

We have guides for:
- Complete beginners
- Visual learners
- Technical users
- IT administrators

Pick the guide that matches your comfort level!

---

## 🔄 What's Next?

After successful connection:
1. Learn to send images to PACS
2. Learn to receive images from PACS
3. Learn to view studies
4. Learn to generate reports

---

**You've got this!** 💪

Need help? Start with **EASY_CONNECTION_SETUP.md** 📗

---

**Quick Links:**
- 📗 Easy Guide: `EASY_CONNECTION_SETUP.md`
- 📙 Quick Reference: `CONNECTION_QUICK_REFERENCE.md`
- 📕 Visual Guide: `CONNECTION_VISUAL_GUIDE.md`
- 📘 Technical Guide: `LOCAL_MACHINE_CONNECTION_GUIDE.md`
- 📓 Complete Docs: `CONNECTION_MODULE_COMPLETE.md`

---

**Version:** 1.0.0
**Last Updated:** October 27, 2025
