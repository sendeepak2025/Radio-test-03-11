# 🔧 Troubleshooting - Landing Page Blank/No Styles

## Issue: Landing page shows blank content and missing animations

### Quick Fixes to Try:

#### 1. Hard Refresh Browser
```
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

#### 2. Clear Browser Cache
- Open DevTools (F12)
- Right-click refresh button
- Select "Empty Cache and Hard Reload"

#### 3. Check Browser Console
- Open DevTools (F12)
- Go to Console tab
- Look for any errors (red text)
- Share the errors if you see any

#### 4. Verify Server is Running
The server should be at:
```
http://localhost:3011/
```

#### 5. Test Tailwind CSS
Visit this test page:
```
http://localhost:3011/test
```

If you see a blue background with a white card, Tailwind is working!

---

## Common Issues & Solutions:

### Issue 1: White/Blank Page
**Cause:** CSS not loading or JavaScript error

**Solution:**
1. Open browser console (F12)
2. Check for errors
3. Look for failed network requests in Network tab

### Issue 2: No Animations
**Cause:** Tailwind animations not configured

**Solution:**
Already fixed in the code. Try hard refresh.

### Issue 3: Dark Background
**Cause:** Medical app styles overriding landing page

**Solution:**
Already fixed with LandingLayout component. Try hard refresh.

### Issue 4: Images Not Loading
**Cause:** Image paths incorrect

**Check:**
- Images should be in `viewer/src/landing/assets/`
- hero-image.jpg
- medical-equipment.png

---

## Manual Verification Steps:

### Step 1: Check if Tailwind is in index.css
Open `viewer/src/index.css` and verify it starts with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Step 2: Check if CSS variables are defined
In `viewer/src/index.css`, look for:
```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    ...
  }
}
```

### Step 3: Verify imports in App.tsx
Check that these imports exist:
```tsx
import LandingLayout from './landing/LandingLayout'
import LandingHome from './landing/pages/LandingHome'
```

### Step 4: Check routes in App.tsx
Look for:
```tsx
<Route path="/" element={<LandingLayout />}>
  <Route index element={<LandingHome />} />
</Route>
```

---

## Debug Commands:

### Restart Dev Server
```powershell
cd viewer
npm run dev
```

### Check for TypeScript Errors
```powershell
cd viewer
npm run typecheck
```

### Rebuild Node Modules (if needed)
```powershell
cd viewer
Remove-Item -Recurse -Force node_modules
npm install
npm run dev
```

---

## What to Check in Browser DevTools:

### Console Tab:
Look for:
- ❌ Red errors
- ⚠️ Yellow warnings
- Failed imports
- 404 errors

### Network Tab:
Check if these load successfully:
- index.css (should be large, ~100KB+)
- hero-image.jpg
- All .tsx/.jsx files

### Elements Tab:
Inspect the page and check:
- Does `<div class="landing-wrapper">` exist?
- Are Tailwind classes applied (like `min-h-screen`, `bg-background`)?
- Do elements have computed styles?

---

## Expected Behavior:

### What You Should See:
1. **White background** (not dark)
2. **Navigation bar** at top with logo
3. **Hero section** with:
   - Large headline
   - Gradient text effect
   - Two buttons (Get Started, Explore Services)
   - Statistics (99.9%, 10M+, 500+)
   - Hero image on right
4. **Floating animations** on background elements
5. **Footer** at bottom

### What You Should NOT See:
- ❌ Dark background (#121212)
- ❌ Completely blank page
- ❌ Console errors
- ❌ 404 errors for assets

---

## If Still Not Working:

### Option 1: Check Specific Files

Run these commands to verify files exist:
```powershell
Test-Path viewer/src/landing/LandingLayout.tsx
Test-Path viewer/src/landing/pages/LandingHome.tsx
Test-Path viewer/src/landing/components/Hero.tsx
Test-Path viewer/src/landing/components/Navbar.tsx
Test-Path viewer/src/landing/assets/hero-image.jpg
```

All should return `True`.

### Option 2: Verify Tailwind Processing

Check if Tailwind is processing CSS:
1. Open browser DevTools
2. Go to Sources tab
3. Find `index.css`
4. Search for `.bg-background` or `.text-gradient`
5. If found, Tailwind is working

### Option 3: Test Individual Components

Create a minimal test:
```tsx
// In viewer/src/landing/pages/TestPage.tsx
const TestPage = () => {
  return (
    <div style={{ background: 'red', padding: '50px' }}>
      <h1 style={{ color: 'white', fontSize: '48px' }}>
        TEST PAGE - If you see this, React is working
      </h1>
      <div className="bg-blue-500 text-white p-4 mt-4">
        If this is blue, Tailwind is working
      </div>
    </div>
  );
};
```

Visit: `http://localhost:3011/test`

---

## Share This Information:

If still having issues, please share:

1. **Browser Console Output** (any errors)
2. **Network Tab** (any failed requests)
3. **Screenshot** of what you see
4. **URL** you're visiting
5. **Browser** and version

---

## Quick Test Checklist:

- [ ] Server running on port 3011
- [ ] Visited http://localhost:3011/
- [ ] Hard refreshed browser (Ctrl+Shift+R)
- [ ] Checked browser console for errors
- [ ] Tested http://localhost:3011/test
- [ ] Verified files exist in viewer/src/landing/
- [ ] Checked Network tab for failed requests
- [ ] Tried different browser

---

## Emergency Rollback:

If you want to revert changes:
```powershell
cd viewer
git checkout viewer/src/App.tsx
git checkout viewer/src/index.css
Remove-Item -Recurse -Force src/landing
Remove-Item tailwind.config.js
Remove-Item postcss.config.js
npm run dev
```

This will restore your app to before the landing page integration.

---

**Need more help? Share your browser console output and screenshots!**
