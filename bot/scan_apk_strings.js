const fs = require('fs');

const FILE_PATH = './full.apk';
const MIN_LENGTH = 10; // Minimum string length

console.log(`🔍 Scanning ${FILE_PATH} for strings...`);

try {
    const buffer = fs.readFileSync(FILE_PATH);
    const content = buffer.toString('binary'); // fast crude conversion

    // We are looking for ASCII strings
    let currentString = "";
    let stringsFound = [];

    // Optimization: Regex on large string might crash, so let's chunk it or use a simple loop
    // Actually, Regex on 60MB string in Node might be fine, let's try a specific regex for URLs

    const urlRegex = /(https?:\/\/[^\s\x00"'<>]+)|(wss?:\/\/[^\s\x00"'<>]+)/g;
    const apiRegex = /api\.[a-zA-Z0-9.-]+\.[a-z]{2,}/g;

    const matches = content.match(urlRegex) || [];
    const apiMatches = content.match(apiRegex) || [];

    const uniqueMatches = [...new Set([...matches, ...apiMatches])];

    console.log(`✅ Found ${uniqueMatches.length} potential URLs/APIs:`);
    console.log('---------------------------------------------------');
    uniqueMatches.forEach(url => {
        // Filter out common junk
        if (url.includes('android.com') || url.includes('w3.org') || url.includes('schema.org')) return;
        console.log(url);
    });
    console.log('---------------------------------------------------');

} catch (err) {
    console.error("Error reading file:", err);
}
