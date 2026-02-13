const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

const zipPath = path.resolve(__dirname, 'full.apk'); // Try reading apk directly as zip
const outputDir = path.resolve(__dirname, 'temp_apk');

console.log(`📦 Extracting ${zipPath} to ${outputDir}...`);

try {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(outputDir, true);
    console.log("✅ Extraction complete!");
} catch (err) {
    console.error("❌ Extraction failed:", err);
}
