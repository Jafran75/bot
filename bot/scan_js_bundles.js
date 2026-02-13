const fs = require('fs');
const path = require('path');

const FILES_TO_SCAN = [
    'temp_apk/assets/public/assets/js/page-saasLottery-WinGo-94418654.js',
    'temp_apk/assets/public/assets/js/common.modules-dc3ca4c4.js',
    'temp_apk/assets/public/assets/js/index-615d7b99.js'
];

console.log("🔍 Scanning JS Bundles for API Endpoints...");

FILES_TO_SCAN.forEach(file => {
    const fullPath = path.resolve(__dirname, file);
    if (!fs.existsSync(fullPath)) {
        console.log(`❌ File not found: ${file}`);
        return;
    }

    console.log(`\n📂 Reading ${path.basename(file)}...`);
    const content = fs.readFileSync(fullPath, 'utf8');

    // Regex for URLs and API paths
    const urlRegex = /(https?:\/\/[^\s"']+)|(wss?:\/\/[^\s"']+)/g;
    const apiPathRegex = /["']\/api\/[^"']+["']/g;
    const actionRegex = /["'][a-zA-Z0-9]*List["']/g; // Matches common 'GetXList' actions

    const matches = [...(content.match(urlRegex) || []), ...(content.match(apiPathRegex) || [])];
    const uniqueMatches = [...new Set(matches)];

    if (uniqueMatches.length > 0) {
        console.log(`   ✅ Found ${uniqueMatches.length} matches:`);
        uniqueMatches.forEach(m => {
            if (m.length < 100) console.log(`      ${m}`);
        });
    } else {
        console.log("   ⚠️ No obvious endpoints found.");
    }
});
