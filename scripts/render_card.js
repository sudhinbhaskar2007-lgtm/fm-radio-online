const { chromium } = require('playwright');
(async () => {
  const [src, out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto('file://' + src); await p.waitForTimeout(300);
  await p.screenshot({ path: out, type: 'jpeg', quality: 85 });
  await b.close();
})();
