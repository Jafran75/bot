const fs = require('fs');
const path = require('path');

const phone = process.argv[2];
const pass = process.argv[3];

if (!phone || !pass) {
    console.log("Usage: node manual_auth.js <PHONE_NUMBER> <PASSWORD>");
    process.exit(1);
}

const envPath = path.join(__dirname, '.env');
let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

// Remove existing keys
envContent = envContent.replace(/^USER_PHONE=.*$/gm, '');
envContent = envContent.replace(/^USER_PASS=.*$/gm, '');

// Append new
envContent += `\nUSER_PHONE=${phone}`;
envContent += `\nUSER_PASS=${pass}`;

// Clean up empty lines
envContent = envContent.replace(/^\s*[\r\n]/gm, '');

fs.writeFileSync(envPath, envContent);
console.log(`✅ Updated .env with Phone: ${phone} and Password: ${'*'.repeat(pass.length)}`);
console.log("👉 Now run: node login_scraper.js");
