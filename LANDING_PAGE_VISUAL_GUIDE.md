# 🎨 Landing Page Visual Guide

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SCANFLOW AI SYSTEM                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  🌐 LANDING PAGE (Port 3000)                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Navbar: [Home] [About] [Services] [Blog]          │   │
│  │          [Login to Dashboard] [Contact Us]          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  HERO SECTION                                       │   │
│  │  "Transform Documents with AI Intelligence"        │   │
│  │  [Get a Demo] [Explore Services]                   │   │
│  │                                                      │   │
│  │  Stats: 99.9% Accuracy | 10M+ Docs | 500+ Clients │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SERVICES SHOWCASE                                  │   │
│  │  - AI-Powered Scanning                             │   │
│  │  - Intelligent Data Extraction                     │   │
│  │  - Workflow Automation                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  CLOUD STORAGE FEATURES                            │   │
│  │  - Secure Storage                                  │   │
│  │  - Easy Access                                     │   │
│  │  - Scalable Solutions                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  HOSPITAL INTEGRATION                              │   │
│  │  - PACS Integration                                │   │
│  │  - HL7 Support                                     │   │
│  │  - DICOM Compatibility                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  FOOTER                                            │   │
│  │  Links | Social Media | Copyright                 │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ Click "Login to Dashboard"
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  💻 MAIN DASHBOARD (Port 5173)                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LOGIN PAGE                                        │   │
│  │  Username: [___________]                           │   │
│  │  Password: [___________]                           │   │
│  │  [Login]                                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                       ↓                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  WORKLIST                                          │   │
│  │  - Patient List                                    │   │
│  │  - Study Management                                │   │
│  │  - Report Creation                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                       ↓                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  DICOM VIEWER                                      │   │
│  │  - Image Viewing                                   │   │
│  │  - Measurements                                    │   │
│  │  - Annotations                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                       ↓                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  REPORTING SYSTEM                                  │   │
│  │  - Template Selection                              │   │
│  │  - Report Editor                                   │   │
│  │  - PDF Generation                                  │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ API Calls
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  🔧 BACKEND API (Port 8001)                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Authentication Service                            │   │
│  │  - User Login                                      │   │
│  │  - Token Management                                │   │
│  │  - Session Handling                                │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Database Operations                               │   │
│  │  - MongoDB                                         │   │
│  │  - Patient Records                                 │   │
│  │  - Study Data                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  DICOM Processing                                  │   │
│  │  - Orthanc Integration                             │   │
│  │  - Image Processing                                │   │
│  │  - Metadata Extraction                             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 User Flow Diagram

```
┌──────────────┐
│   VISITOR    │
└──────┬───────┘
       │
       ↓
┌──────────────────────────────────────┐
│  Lands on Landing Page               │
│  http://localhost:3000               │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  Explores Features                   │
│  - Reads about services              │
│  - Views pricing                     │
│  - Checks testimonials               │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  Decides to Use System               │
│  Clicks "Login to Dashboard"         │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  Redirected to Main App              │
│  http://localhost:5173               │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  Enters Credentials                  │
│  Username: admin                     │
│  Password: admin123                  │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  Accesses Dashboard                  │
│  - Views worklist                    │
│  - Opens studies                     │
│  - Creates reports                   │
└──────────────────────────────────────┘
```

## 📱 Responsive Design

```
┌─────────────────────────────────────────────────────────┐
│  DESKTOP VIEW (> 768px)                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [Logo] [Home] [About] [Services] [Blog]       │   │
│  │         [Login to Dashboard] [Contact Us]      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌──────────────────────────────────┐
│  MOBILE VIEW (< 768px)           │
│  ┌──────────────────────────┐   │
│  │  [Logo]          [☰]     │   │
│  └──────────────────────────┘   │
│                                  │
│  When menu opened:               │
│  ┌──────────────────────────┐   │
│  │  Home                    │   │
│  │  About Us                │   │
│  │  Services                │   │
│  │  Blog                    │   │
│  │  [Login to Dashboard]    │   │
│  │  [Contact Us]            │   │
│  └──────────────────────────┘   │
└──────────────────────────────────┘
```

## 🎨 Color Scheme

```
Primary Colors:
┌────────┐ ┌────────┐ ┌────────┐
│ Blue   │ │ Purple │ │ Pink   │
│ #3B82F6│ │ #8B5CF6│ │ #EC4899│
└────────┘ └────────┘ └────────┘

Gradients:
┌─────────────────────────────────┐
│  Primary → Accent               │
│  Blue → Purple → Pink           │
└─────────────────────────────────┘

Background:
┌────────┐ ┌────────┐
│ Dark   │ │ Light  │
│ #0F172A│ │ #FFFFFF│
└────────┘ └────────┘
```

## 📂 File Organization

```
landing-page/
│
├── 📄 Configuration Files
│   ├── package.json          (Dependencies)
│   ├── vite.config.ts        (Port: 3000)
│   ├── tailwind.config.ts    (Styling)
│   └── tsconfig.json         (TypeScript)
│
├── 📁 src/
│   │
│   ├── 📁 pages/             (Routes)
│   │   ├── Home.tsx          (/)
│   │   ├── About.tsx         (/about)
│   │   ├── ServicesPage.tsx  (/services)
│   │   ├── Blog.tsx          (/blog)
│   │   ├── Contact.tsx       (/contact)
│   │   └── NotFound.tsx      (404)
│   │
│   ├── 📁 components/        (UI Components)
│   │   ├── Navbar.tsx        ← Login button here
│   │   ├── Hero.tsx
│   │   ├── Services.tsx
│   │   ├── CloudStorage.tsx
│   │   ├── HospitalIntegration.tsx
│   │   ├── Footer.tsx
│   │   └── ui/               (Shadcn components)
│   │
│   ├── 📁 assets/            (Images)
│   │   ├── hero-image.jpg
│   │   └── medical-equipment.png
│   │
│   └── 📁 lib/               (Utilities)
│       └── utils.ts
│
└── 📁 public/                (Static files)
    ├── favicon.ico
    └── robots.txt
```

## 🔗 Navigation Flow

```
Landing Page Navigation:
┌─────────────────────────────────────────┐
│  Navbar (Always Visible)                │
│  ┌───────────────────────────────────┐  │
│  │  Home → /                         │  │
│  │  About Us → /about                │  │
│  │  Services → /services             │  │
│  │  Blog → /blog                     │  │
│  │  Login to Dashboard → localhost:5173 │
│  │  Contact Us → /contact            │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## ⚡ Performance Metrics

```
Loading Speed:
┌────────────────────────────────┐
│  Initial Load:    < 1s         │
│  Page Transition: < 0.3s       │
│  Image Loading:   Lazy         │
│  Bundle Size:     Optimized    │
└────────────────────────────────┘

Optimization:
┌────────────────────────────────┐
│  ✅ Code Splitting             │
│  ✅ Tree Shaking               │
│  ✅ Minification               │
│  ✅ Compression                │
│  ✅ Lazy Loading               │
└────────────────────────────────┘
```

## 🎯 Key Features Visual

```
┌─────────────────────────────────────────┐
│  HERO SECTION                           │
│  ┌───────────────────────────────────┐  │
│  │  🎨 Animated Background           │  │
│  │  📝 Compelling Headline           │  │
│  │  🔘 CTA Buttons                   │  │
│  │  📊 Key Statistics                │  │
│  │  🖼️  Hero Image                   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  SERVICES SECTION                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ Service │ │ Service │ │ Service │  │
│  │    1    │ │    2    │ │    3    │  │
│  └─────────┘ └─────────┘ └─────────┘  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  INTEGRATION SECTION                    │
│  ┌───────────────────────────────────┐  │
│  │  🏥 Hospital Systems              │  │
│  │  📡 PACS Integration              │  │
│  │  🔗 API Connectivity              │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## 🚀 Deployment Options

```
Development:
┌────────────────────────────────┐
│  npm run dev                   │
│  → http://localhost:3000       │
└────────────────────────────────┘

Production Build:
┌────────────────────────────────┐
│  npm run build                 │
│  → dist/ folder                │
└────────────────────────────────┘

Deploy To:
┌────────────────────────────────┐
│  ☁️  Netlify                   │
│  ☁️  Vercel                    │
│  ☁️  AWS S3 + CloudFront       │
│  ☁️  GitHub Pages              │
└────────────────────────────────┘
```

---

## 🎉 Ready to Start!

Run this command:
```powershell
.\start-landing-page.ps1
```

Then visit: **http://localhost:3000**

Enjoy your beautiful landing page! ✨
