import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up E2E test environment...');
  
  // Start backend services if needed
  // You can add logic here to start your backend servers
  
  // Wait for services to be ready
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for the frontend to be ready
    await page.goto(config.projects[0].use.baseURL || 'http://localhost:5173', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    console.log('✅ Frontend is ready');
    
    // Check if backend is ready
    try {
      const response = await page.request.get('http://localhost:3001/api/health');
      if (response.ok()) {
        console.log('✅ Backend is ready');
      } else {
        console.log('⚠️ Backend health check failed, but continuing...');
      }
    } catch (error) {
      console.log('⚠️ Backend not available, but continuing...');
    }
    
  } catch (error) {
    console.error('❌ Failed to setup E2E environment:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;