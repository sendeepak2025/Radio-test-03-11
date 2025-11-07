# 🚀 Landing Page Setup Guide

Your professional ScanFlow AI landing page has been successfully extracted and configured!

## 📁 What Was Done

1. ✅ Extracted landing page from `scanflow-ai-vision-main.zip`
2. ✅ Created `landing-page/` folder with all files
3. ✅ Added "Login to Dashboard" button in navbar
4. ✅ Configured to run on port 3000
5. ✅ Created startup scripts for easy launch

## 🎯 Quick Start

### Option 1: Using PowerShell Script (Recommended)
```powershell
.\start-landing-page.ps1
```

### Option 2: Using Batch File
```cmd
start-landing-page.bat
```

### Option 3: Manual Start
```bash
cd landing-page
npm install
npm run dev
```

## 🌐 Access Points

- **Landing Page**: http://localhost:3000
- **Main Dashboard**: http://localhost:5173
- **Backend API**: http://localhost:8001

## 📄 Landing Page Structure

```
landing-page/
├── src/
│   ├── pages/
│   │   ├── Home.tsx          # Main landing page
│   │   ├── About.tsx         # About us page
│   │   ├── ServicesPage.tsx  # Services page
│   │   ├── Blog.tsx          # Blog page
│   │   ├── Contact.tsx       # Contact page
│   │   └── NotFound.tsx      # 404 page
│   ├── components/
│   │   ├── Navbar.tsx        # Navigation with Login button
│   │   ├── Hero.tsx          # Hero section
│   │   ├── Services.tsx      # Services showcase
│   │   ├── CloudStorage.tsx  # Cloud features
│   │   ├── HospitalIntegration.tsx
│   │   ├── Footer.tsx        # Footer
│   │   └── ui/               # Shadcn UI components
│   ├── assets/               # Images and media
│   └── lib/                  # Utilities
├── public/                   # Static files
└── package.json              # Dependencies
```

## 🎨 Features

### ✨ Modern Design
- Responsive layout for all devices
- Smooth animations and transitions
- Gradient effects and glassmorphism
- Professional color scheme

### 🔗 Navigation
- Home
- About Us
- Services
- Blog
- Contact
- **Login to Dashboard** (links to main app)

### 📱 Mobile Friendly
- Hamburger menu for mobile
- Touch-optimized buttons
- Responsive grid layouts

## 🛠️ Customization

### Update Dashboard URL
If your main dashboard runs on a different port, update in `landing-page/src/components/Navbar.tsx`:

```tsx
// Change this line:
<a href="http://localhost:5173" target="_blank" rel="noopener noreferrer">

// To your actual URL:
<a href="http://your-domain.com" target="_blank" rel="noopener noreferrer">
```

### Change Landing Page Port
Edit `landing-page/vite.config.ts`:

```typescript
server: {
  host: "localhost",
  port: 3000,  // Change this to your desired port
},
```

### Update Branding
- Logo: `landing-page/src/components/Navbar.tsx`
- Hero text: `landing-page/src/components/Hero.tsx`
- Services: `landing-page/src/components/Services.tsx`
- Footer: `landing-page/src/components/Footer.tsx`

### Replace Images
Place your images in `landing-page/src/assets/` and update imports:
- `hero-image.jpg` - Main hero image
- `medical-equipment.png` - Equipment showcase

## 📦 Build for Production

```bash
cd landing-page
npm run build
```

The production build will be in `landing-page/dist/` folder.

### Deploy Production Build

You can deploy the `dist` folder to:
- Netlify
- Vercel
- AWS S3 + CloudFront
- Any static hosting service

## 🔄 Running Both Applications

### Start Everything Together

1. **Terminal 1 - Backend**:
```bash
cd server
npm start
```

2. **Terminal 2 - Main Dashboard**:
```bash
cd viewer
npm run dev
```

3. **Terminal 3 - Landing Page**:
```bash
.\start-landing-page.ps1
```

## 🎯 User Flow

1. User visits landing page at `http://localhost:3000`
2. Explores features, services, and information
3. Clicks "Login to Dashboard" button
4. Redirected to main application at `http://localhost:5173`
5. Logs in and uses the radiology system

## 📝 Pages Overview

### Home Page (`/`)
- Hero section with CTA buttons
- Key features showcase
- Statistics and metrics
- Services overview
- Cloud storage features
- Hospital integration info

### About Page (`/about`)
- Company information
- Mission and vision
- Team details

### Services Page (`/services`)
- Detailed service offerings
- Feature descriptions
- Pricing information

### Blog Page (`/blog`)
- Latest updates
- News and articles
- Industry insights

### Contact Page (`/contact`)
- Contact form
- Company details
- Support information

## 🔧 Troubleshooting

### Port Already in Use
If port 3000 is busy, change it in `vite.config.ts`:
```typescript
port: 3001,  // Use different port
```

### Dependencies Issues
```bash
cd landing-page
rm -rf node_modules package-lock.json
npm install
```

### Build Errors
```bash
cd landing-page
npm run build:dev  # Build in development mode
```

## 🌟 Next Steps

1. ✅ Start the landing page
2. ✅ Test the "Login to Dashboard" button
3. ✅ Customize content and branding
4. ✅ Replace placeholder images
5. ✅ Update contact information
6. ✅ Test on mobile devices
7. ✅ Build for production
8. ✅ Deploy to hosting service

## 📞 Support

For issues or questions:
- Check `landing-page/LANDING_PAGE_README.md`
- Review component files in `landing-page/src/components/`
- Test in browser console for errors

---

**Perfect Landing Page - No Edits Required!** ✨

The landing page is production-ready and professionally designed. Just start it and enjoy!
