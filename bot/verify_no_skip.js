const WingoPredictor = require('./prediction');
const fs = require('fs');

const predictor = new WingoPredictor();
const history = JSON.parse(fs.readFileSync('history.json', 'utf8'));

console.log(`Loaded ${history.length} items.`);

let skips = 0;
let lowConfidence = 0;

// Load all history first
history.forEach(h => predictor.addResult(h.period, h.number));

// Simulate predicting the LAST 50 rounds
const testSet = history.slice(-50);
console.log("\n--- Testing Last 50 Rounds ---");

testSet.forEach(h => {
    // We simulate the state BEFORE this result
    // Actually, predictNext uses current history state. 
    // So to test historically, we'd need to rebuild history incrementally.
    // simpler: just test current state prediction.
});

// Better test: Reset and rebuild incrementally
predictor.clearHistory();
console.log("Rebuilding history and checking skips...");

let processed = 0;
history.forEach((h, index) => {
    if (index > 10) { // Start checking after some data
        const pred = predictor.predictNext(1);
        if (pred.skipRecommended) {
            console.error(`❌ SKIP DETECTED at index ${index}!`);
            skips++;
        }
        if (pred.confidence === 'Low') {
            lowConfidence++;
        }
    }
    predictor.addResult(h.period, h.number);
    processed++;
});

console.log(`\nProcessed: ${processed}`);
console.log(`Total Skips: ${skips}`);
console.log(`Low Confidence Labels: ${lowConfidence}`);

if (skips === 0) {
    console.log("✅ SUCCESS: No skips detected.");
} else {
    console.error("❌ FAILURE: Skips still exist.");
    process.exit(1);
}
