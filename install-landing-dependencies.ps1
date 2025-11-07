#!/usr/bin/env pwsh
# Install Landing Page Dependencies for Viewer

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Installing Landing Page Dependencies" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location viewer

Write-Host "Installing Radix UI components..." -ForegroundColor Yellow
npm install @radix-ui/react-accordion@^1.2.11 `
  @radix-ui/react-alert-dialog@^1.1.14 `
  @radix-ui/react-aspect-ratio@^1.1.7 `
  @radix-ui/react-avatar@^1.1.10 `
  @radix-ui/react-checkbox@^1.3.2 `
  @radix-ui/react-collapsible@^1.1.11 `
  @radix-ui/react-context-menu@^2.2.15 `
  @radix-ui/react-dialog@^1.1.14 `
  @radix-ui/react-dropdown-menu@^2.1.15 `
  @radix-ui/react-hover-card@^1.1.14 `
  @radix-ui/react-label@^2.1.7 `
  @radix-ui/react-menubar@^1.1.15 `
  @radix-ui/react-navigation-menu@^1.2.13 `
  @radix-ui/react-popover@^1.1.14 `
  @radix-ui/react-progress@^1.1.7 `
  @radix-ui/react-radio-group@^1.3.7 `
  @radix-ui/react-scroll-area@^1.2.9 `
  @radix-ui/react-select@^2.2.5 `
  @radix-ui/react-separator@^1.1.7 `
  @radix-ui/react-slider@^1.3.5 `
  @radix-ui/react-slot@^1.2.3 `
  @radix-ui/react-switch@^1.2.5 `
  @radix-ui/react-tabs@^1.1.12 `
  @radix-ui/react-toast@^1.2.14 `
  @radix-ui/react-toggle@^1.1.9 `
  @radix-ui/react-toggle-group@^1.1.10 `
  @radix-ui/react-tooltip@^1.2.7

Write-Host ""
Write-Host "Installing Tailwind CSS and utilities..." -ForegroundColor Yellow
npm install tailwindcss@^3.4.1 `
  postcss@^8.4.35 `
  autoprefixer@^10.4.17 `
  tailwindcss-animate@^1.0.7 `
  tailwind-merge@^2.2.0 `
  class-variance-authority@^0.7.0

Write-Host ""
Write-Host "Installing additional UI libraries..." -ForegroundColor Yellow
npm install lucide-react@^0.462.0 `
  clsx@^2.1.1 `
  cmdk@^1.1.1 `
  sonner@^1.7.4 `
  embla-carousel-react@^8.6.0 `
  input-otp@^1.4.2 `
  react-day-picker@^8.10.1 `
  react-hook-form@^7.61.1 `
  react-resizable-panels@^2.1.9 `
  next-themes@^0.3.0 `
  vaul@^0.9.9 `
  zod@^3.25.76 `
  @hookform/resolvers@^3.10.0

Write-Host ""
Write-Host "✅ All dependencies installed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: npm run dev" -ForegroundColor White
Write-Host "2. Visit: http://localhost:3010" -ForegroundColor White
Write-Host ""
Write-Host "Landing page routes:" -ForegroundColor Cyan
Write-Host "  / - Landing home" -ForegroundColor White
Write-Host "  /about - About page" -ForegroundColor White
Write-Host "  /services - Services page" -ForegroundColor White
Write-Host "  /blog - Blog page" -ForegroundColor White
Write-Host "  /contact - Contact page" -ForegroundColor White
Write-Host "  /login - Login to dashboard" -ForegroundColor White
Write-Host ""

Set-Location ..
