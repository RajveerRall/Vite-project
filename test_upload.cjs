const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.log(`[BROWSER ERROR] ${error.message}`);
  });

  console.log('Navigating to app...');
  await page.goto('http://localhost:5174/');
  
  // Wait for React to mount
  await page.waitForTimeout(2000);
  
  // If there's a continue as guest button, click it
  const guestButton = await page.getByRole('button', { name: /continue as guest/i }).or(page.getByText(/continue as guest/i)).first();
  if (guestButton) {
    console.log('Clicking continue as guest...');
    await guestButton.click();
    await page.waitForTimeout(2000);
  }
  
  // Upload book
  console.log('Finding file input...');
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    console.log('Uploading file...');
    await fileInput.setInputFiles('the-adventures-of-huckleberry-finn.epub');
    // Wait for upload and save
    await page.waitForTimeout(5000);
  } else {
    console.log('Could not find file input');
  }
  
  console.log('Refreshing page...');
  await page.reload();
  await page.waitForTimeout(6000);
  
  await browser.close();
  console.log('Test complete');
})();
