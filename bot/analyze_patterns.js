const fs = require('fs');

const history = JSON.parse(fs.readFileSync('history.json', 'utf8'));

console.log(`\n🔍 Analyzing ${history.length} Rounds of History...\n`);

// 1. Streak Analysis
let streaks = [];
let currentStreak = 1;
let lastSize = history[0].size;

for (let i = 1; i < history.length; i++) {
    if (history[i].size === lastSize) {
        currentStreak++;
    } else {
        streaks.push({ size: lastSize, length: currentStreak, endPeriod: history[i - 1].period });
        currentStreak = 1;
        lastSize = history[i].size;
    }
}
streaks.push({ size: lastSize, length: currentStreak, endPeriod: history[history.length - 1].period });

console.log("📊 STREAK PATTERNS (Dragons):");
const dragons = streaks.filter(s => s.length >= 5);
if (dragons.length > 0) {
    dragons.forEach(d => console.log(`  - ${d.size} Dragon: Length ${d.length} (Ends: ${d.endPeriod})`));
} else {
    console.log("  - No Dragons (Streak >= 5) found.");
}

// 2. Zig-Zag (Chop) Analysis
let chops = 0;
for (let i = 0; i < streaks.length; i++) {
    if (streaks[i].length === 1) chops++;
}
console.log(`\n✂️ CHOP ANALYSIS:`);
console.log(`  - Single Flips (Size 1 streaks): ${chops}`);
console.log(`  - Chop Rate: ${((chops / streaks.length) * 100).toFixed(1)}% of all trend changes`);

// 3. Number Frequency
const numFreq = {};
history.forEach(h => {
    numFreq[h.number] = (numFreq[h.number] || 0) + 1;
});
console.log(`\n🔢 NUMBER FREQUENCY:`);
Object.keys(numFreq).sort().forEach(n => {
    console.log(`  - Num ${n}: ${numFreq[n]} times`);
});

// 4. Pattern Search (Length 3)
const patterns = {};
for (let i = 0; i < history.length - 2; i++) {
    const key = `${history[i].size}-${history[i + 1].size}-${history[i + 2].size}`;
    const next = history[i + 3] ? history[i + 3].size : 'END';
    if (!patterns[key]) patterns[key] = { Big: 0, Small: 0 };
    if (next !== 'END') patterns[key][next]++;
}

console.log(`\n🧠 PREDICTIVE PATTERNS (Last 3 -> Next):`);
Object.keys(patterns).forEach(p => {
    const stats = patterns[p];
    const total = stats.Big + stats.Small;
    if (total > 1) { // Only show if appeared more than once
        const probBig = (stats.Big / total * 100).toFixed(0);
        console.log(`  - [${p}] -> Big: ${probBig}% (${stats.Big}/${total})`);
    }
});
