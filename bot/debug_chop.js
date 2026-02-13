const WingoPredictor = require('./prediction');

const predictor = new WingoPredictor();

// Sequence from Dump (Oldest to Newest)
const sequence = [
    { p: '1861', n: 9 }, // BIG
    { p: '1862', n: 4 }, // SMALL
    { p: '1863', n: 8 }, // BIG
    { p: '1864', n: 9 }, // BIG
    { p: '1865', n: 2 }, // SMALL // S, B, S, B, B, S  <-- CHOP + Mini Streak
    { p: '1866', n: 0 }, // SMALL
    { p: '1867', n: 4 }, // SMALL // Streak 3 Small
    { p: '1868', n: 5 }, // BIG   // Break
    { p: '1869', n: 1 }, // SMALL // Chop
    { p: '1870', n: 1 }  // SMALL // Streak 2
];

// Seed to ensure history > 6
const seed = [
    { p: '1856', n: 1 }, { p: '1857', n: 8 }, { p: '1858', n: 3 }, { p: '1859', n: 6 }, { p: '1860', n: 2 }
];

const full = [...seed, ...sequence];

console.log("🧩 Simulating CHOP Pattern...");

// 1. Feed Seed + First 5 of Sequence
// Total 10 items.
for (let i = 0; i < seed.length + 5; i++) {
    const item = full[i];
    const size = item.n <= 4 ? 'SMALL' : 'BIG';
    predictor.addResult(item.p, item.n, size, 'RED', Date.now(), 2000);
}

// 2. Predict remaining 5
let wins = 0;
let losses = 0;

// Start predicting from index 10 (Item #11)
for (let i = seed.length + 5; i < full.length; i++) {
    const target = full[i];
    const targetSize = target.n <= 4 ? 'SMALL' : 'BIG';

    // Predict
    const pred = predictor.predictNext(); // Uses history up to i-1

    console.log(`\nRound ${target.p} (Actual: ${targetSize})`);
    if (pred) {
        console.log(`   Bot Prediction: ${pred.size} (${pred.confidence})`);

        const botSize = pred.size.toUpperCase();
        if (botSize === targetSize) {
            console.log("   ✅ WIN");
            wins++;
        } else {
            console.log("   ❌ LOSS");
            losses++;
        }
    } else {
        console.log("   ⚠️ SKIP (No Prediction)");
    }

    // Add result
    predictor.addResult(target.p, target.n, targetSize, 'RED', Date.now(), 2000);
}

console.log(`\n📊 Final Score: ${wins} Wins / ${losses} Losses`);
