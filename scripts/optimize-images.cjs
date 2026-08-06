const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

async function optimizeImages() {
  const files = fs.readdirSync(publicDir);
  for (const file of files) {
    if (file.toLowerCase().endsWith('.png')) {
      const filePath = path.join(publicDir, file);
      const stat = fs.statSync(filePath);
      console.log(`Processing ${file} (original size: ${(stat.size / 1024).toFixed(1)} KB)...`);
      
      const tempOut = path.join(publicDir, 'temp_' + file);
      try {
        await sharp(filePath)
          .resize({ width: 700, height: 700, fit: 'inside', withoutEnlargement: true })
          .png({ quality: 80, compressionLevel: 8 })
          .toFile(tempOut);

        fs.renameSync(tempOut, filePath);
        const newStat = fs.statSync(filePath);
        console.log(`Optimized ${file}: ${(newStat.size / 1024).toFixed(1)} KB (Saved ${(((stat.size - newStat.size)/stat.size)*100).toFixed(1)}%)`);
      } catch (e) {
        console.error(`Failed to process ${file}:`, e.message);
        if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
      }
    }
  }
}

optimizeImages().catch(console.error);
