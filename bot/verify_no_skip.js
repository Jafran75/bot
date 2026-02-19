const WingoPredictor = require('./prediction');
const predictor = new WingoPredictor();

console.log("🧪 Testing Force Prediction Mode...");

// Simulate 50 rounds of random data to trigger various confidence levels
for (let i = 0; i < 50; i++) {
    const period = (20240101000 + i).toString();
    const num = Math.floor(Math.random() * 10);
    predictor.addResult(period, num);
}

// Test next prediction
const pred = predictor.predictNext(1);

console.log("\n📊 Prediction Result:");
console.log(JSON.stringify(pred, null, 2));

if (pred.skipRecommended === false && pred.size) {
    console.log("\n✅ PASS: Bot provided a prediction (No Skip).");
} else {
    console.error("\n❌ FAIL: Bot recommended skipping or returned null.");
}

if (pred.confidence === 'Volatile' || pred.confidence === 'Low') {
    console.log("ℹ️ Note: Confidence was low, but prediction still generated.");
}
