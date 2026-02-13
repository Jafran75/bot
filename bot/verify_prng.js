const WingoPredictor = require('./prediction');
const fs = require('fs');

const predictor = new WingoPredictor();
const history = JSON.parse(fs.readFileSync('history.json', 'utf8'));

// Load history
history.forEach(h => predictor.addResult(h.period, h.number, h.serverTime));

console.log(`\n🔮 Testing PRNG Calibration on ${history.length} rounds...`);

const calibration = predictor.calibratePrng();

if (calibration) {
    console.log(`\n✅ SUCCESS: PRNG Sync Found!`);
    console.log(`   - Best Formula ID: ${calibration.formulaId}`);
    console.log(`   - Accuracy (Last 10): ${calibration.score}/10`);
    console.log(`   - Engine will now LOCK onto this formula.`);
} else {
    console.log(`\n❌ No strong PRNG correlation found (Accuracy < 70%).`);
    console.log(`   - The server seed is likely complex or hashed.`);
    console.log(`   - Falling back to Pattern/Statistical logic.`);
}

// Test Prediction
const pred = predictor.predictNext(1);
console.log("\nNext Prediction (based on current state):");
console.log(pred);
