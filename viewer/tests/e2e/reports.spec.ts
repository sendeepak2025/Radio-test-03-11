import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:5000';

// Test user credentials
const TEST_USER = {
  email: 'test@radiology.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'Radiologist'
};

test.describe('Authentication Flow', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
    
    // Should show user name
    await expect(page.locator('text=Test Radiologist')).toBeVisible();
  });

  test('should fail login with invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    await page.fill('input[name="email"]', 'wrong@email.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL(`${BASE_URL}/dashboard`);
    
    // Click user menu and logout
    await page.click('[aria-label="Account"]');
    await page.click('text=Logout');
    
    // Should redirect to login
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });
});

test.describe('Report Creation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);
  });

  test('should create a new report from template', async ({ page }) => {
    // Navigate to new report
    await page.click('text=New Report');
    
    // Select template
    await page.click('text=Chest X-Ray');
    await page.click('button:has-text("Use Template")');
    
    // Fill report sections
    await page.fill('[name="indication"]', 'Cough and fever');
    await page.fill('[name="findings"]', 'No acute cardiopulmonary process');
    await page.fill('[name="impression"]', 'Normal chest radiograph');
    
    // Save draft
    await page.click('button:has-text("Save Draft")');
    
    // Should show success message
    await expect(page.locator('text=Report saved')).toBeVisible();
  });

  test('should auto-save report while editing', async ({ page }) => {
    await page.click('text=New Report');
    await page.click('text=CT Chest');
    await page.click('button:has-text("Use Template")');
    
    // Type in findings
    await page.fill('[name="findings"]', 'Test findings content');
    
    // Wait for auto-save (30 seconds)
    await page.waitForTimeout(31000);
    
    // Should see auto-save indicator
    await expect(page.locator('text=Auto-saved')).toBeVisible();
  });

  test('should sign and finalize report', async ({ page }) => {
    // Create a report first
    await page.click('text=New Report');
    await page.click('text=Chest X-Ray');
    await page.click('button:has-text("Use Template")');
    
    await page.fill('[name="indication"]', 'Routine screening');
    await page.fill('[name="findings"]', 'Normal findings');
    await page.fill('[name="impression"]', 'No abnormality detected');
    
    // Sign report
    await page.click('button:has-text("Sign Report")');
    
    // Draw signature
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 50, box.y + 50);
      await page.mouse.down();
      await page.mouse.move(box.x + 150, box.y + 100);
      await page.mouse.up();
    }
    
    // Confirm signature
    await page.click('button:has-text("Confirm Signature")');
    
    // Should show success
    await expect(page.locator('text=Report signed successfully')).toBeVisible();
  });

  test('should export report as PDF', async ({ page }) => {
    // Go to reports list
    await page.click('text=Reports');
    
    // Click on first report
    await page.click('[data-testid="report-card"]:first-child');
    
    // Export as PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export PDF")');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toContain('.pdf');
  });
});

test.describe('Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);
  });

  test('should search reports with full-text search', async ({ page }) => {
    await page.goto(`${BASE_URL}/search`);
    
    // Enter search query
    await page.fill('input[placeholder*="Search"]', 'pneumonia');
    await page.click('button:has-text("Search")');
    
    // Should show results
    await expect(page.locator('[data-testid="search-result"]')).toBeVisible();
  });

  test('should filter search results', async ({ page }) => {
    await page.goto(`${BASE_URL}/search`);
    
    // Open filters
    await page.click('button:has-text("Filters")');
    
    // Select modality filter
    await page.click('text=Modality');
    await page.click('text=CT');
    
    // Apply filters
    await page.click('button:has-text("Apply Filters")');
    
    // Results should be filtered
    await expect(page.locator('text=CT')).toBeVisible();
  });

  test('should save a search', async ({ page }) => {
    await page.goto(`${BASE_URL}/search`);
    
    await page.fill('input[placeholder*="Search"]', 'urgent reports');
    await page.click('button:has-text("Search")');
    
    // Save search
    await page.click('[aria-label="Save Search"]');
    await page.fill('input[name="searchName"]', 'Urgent Reports');
    await page.click('button:has-text("Save")');
    
    // Should show success
    await expect(page.locator('text=Search saved')).toBeVisible();
  });
});

test.describe('Collaboration Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);
  });

  test('should request peer review', async ({ page }) => {
    // Open a report
    await page.click('text=Reports');
    await page.click('[data-testid="report-card"]:first-child');
    
    // Open collaboration hub
    await page.click('[aria-label="Collaboration"]');
    
    // Request peer review
    await page.click('button:has-text("Request Peer Review")');
    await page.selectOption('select[name="reviewer"]', { index: 1 });
    await page.selectOption('select[name="priority"]', 'high');
    await page.fill('textarea[name="notes"]', 'Please review findings section');
    await page.click('button:has-text("Send Request")');
    
    // Should show success
    await expect(page.locator('text=Review request sent')).toBeVisible();
  });

  test('should request consultation', async ({ page }) => {
    await page.click('text=Reports');
    await page.click('[data-testid="report-card"]:first-child');
    
    await page.click('[aria-label="Collaboration"]');
    await page.click('text=Consultations');
    
    await page.click('button:has-text("Request Consultation")');
    await page.selectOption('select[name="specialist"]', { index: 1 });
    await page.selectOption('select[name="department"]', 'Cardiology');
    await page.fill('textarea[name="clinicalQuestion"]', 'Is this finding significant?');
    await page.click('button:has-text("Send Request")');
    
    await expect(page.locator('text=Consultation request sent')).toBeVisible();
  });
});

test.describe('Voice Dictation', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant microphone permission
    await context.grantPermissions(['microphone']);
    
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);
  });

  test('should start and stop voice dictation', async ({ page }) => {
    await page.click('text=New Report');
    await page.click('text=Chest X-Ray');
    await page.click('button:has-text("Use Template")');
    
    // Start dictation
    await page.click('[aria-label*="Start Dictation"]');
    
    // Should show recording indicator
    await expect(page.locator('text=Recording')).toBeVisible();
    
    // Stop dictation
    await page.click('[aria-label*="Stop Dictation"]');
    
    // Recording should stop
    await expect(page.locator('text=Recording')).not.toBeVisible();
  });
});

test.describe('Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('should show mobile navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    // Should show bottom navigation
    await expect(page.locator('[role="navigation"]')).toBeVisible();
    await expect(page.locator('text=Home')).toBeVisible();
    await expect(page.locator('text=Reports')).toBeVisible();
  });

  test('should navigate using mobile menu', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    // Click search tab
    await page.locator('text=Search').click();
    await expect(page).toHaveURL(`${BASE_URL}/search`);
    
    // Click reports tab
    await page.locator('text=Reports').click();
    await expect(page).toHaveURL(`${BASE_URL}/reports`);
  });
});

test.describe('PWA & Offline Mode', () => {
  test('should register service worker', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Check if service worker is registered
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        return !!registration;
      }
      return false;
    });
    
    expect(swRegistered).toBeTruthy();
  });

  test('should work offline after caching', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    // Wait for assets to cache
    await page.waitForTimeout(2000);
    
    // Go offline
    await context.setOffline(true);
    
    // Navigate to cached page
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Should still load from cache
    await expect(page.locator('text=Dashboard')).toBeVisible();
    
    // Go back online
    await context.setOffline(false);
  });
});

test.describe('Performance', () => {
  test('should load dashboard in under 3 seconds', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    
    const startTime = Date.now();
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000);
  });

  test('should save report in under 500ms', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);
    
    await page.click('text=New Report');
    await page.click('text=Chest X-Ray');
    await page.click('button:has-text("Use Template")');
    
    await page.fill('[name="findings"]', 'Test findings');
    
    const startTime = Date.now();
    await page.click('button:has-text("Save Draft")');
    await page.waitForSelector('text=Report saved');
    const saveTime = Date.now() - startTime;
    
    expect(saveTime).toBeLessThan(500);
  });
});
