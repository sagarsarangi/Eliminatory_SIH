const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      headless: true
    });
    const page = await browser.newPage();
    
    await page.goto('http://localhost:3001/app/map', { waitUntil: 'networkidle0', timeout: 30000 });
    
    await new Promise(r => setTimeout(r, 2000));
    
    const mapDimensions = await page.evaluate(() => {
      const container = document.querySelector('.maplibregl-map');
      if (!container) return 'No map container found';
      const rect = container.getBoundingClientRect();
      
      const canvas = document.querySelector('.maplibregl-canvas');
      const canvasRect = canvas ? canvas.getBoundingClientRect() : null;
      
      return {
        container: { width: rect.width, height: rect.height },
        canvas: canvasRect ? { width: canvasRect.width, height: canvasRect.height } : 'No canvas found'
      };
    });
    
    console.log("Map Dimensions:", mapDimensions);
    
    await browser.close();
  } catch(e) {
    console.error("Script error:", e);
  }
})();
