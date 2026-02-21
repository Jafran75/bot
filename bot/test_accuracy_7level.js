const WingoPredictor = require('./prediction');

const predictor = new WingoPredictor();
const TOTAL_ROUNDS = 200000;
const MAX_ALLOWED_LEVEL = 7;

console.log(`\n🚀 Simulating ${TOTAL_ROUNDS} Rounds with ${MAX_ALLOWED_LEVEL}-Level Recovery Strategy...`);

let wins = 0;
let losses = 0;
let busts = 0; // Failed Level 7
let maxLevelReached = 1;
let currentLevel = 1;
let history = [];
let skipCount = 0;

// Generate random data for simulation
// Using a simple PRNG to simulate the game flow
for (let i = 0; i < TOTAL_ROUNDS + 1000; i++) {
    const num = Math.floor(Math.random() * 10);
    const size = num >= 5 ? 'Big' : 'Small';
    history.push({ period: i.toString(), number: num, size: size });
}

// Seed first 100 rounds
for (let i = 0; i < 100; i++) {
    predictor.addResult(history[i].period, history[i].number);
}

// Run Simulation
for (let i = 100; i < TOTAL_ROUNDS + 100; i++) {
    const target = history[i + 1];

    // Make Prediction with Level Awareness
    // We assume the predictor has a predictNext(level) method
    const prediction = predictor.predictNext(currentLevel);

    // Track skip recommendations
    if (prediction.skipRecommended) {
        skipCount++;
        // On Level 1, we follow skip recommendations to avoid starting on bad patterns.
        if (currentLevel === 1) {
            predictor.addResult(target.period, target.number);
            continue;
        }
    }

    // Check Result
    const actualSize = target.size;
    const isWin = prediction.size === actualSize;

    if (isWin) {
        wins++;
        currentLevel = 1; // Reset to level 1 on win
    } else {
        losses++;
        currentLevel++;
        if (currentLevel > maxLevelReached) maxLevelReached = currentLevel;

        if (currentLevel > MAX_ALLOWED_LEVEL) {
            busts++;
            currentLevel = 1; // Reset after bust (recovery failed)
        }
    }

    // Feed result back for next prediction
    predictor.addResult(target.period, target.number);
}

const survivalRate = ((TOTAL_ROUNDS - busts) / TOTAL_ROUNDS * 100).toFixed(4);
const winRate = (wins / (wins + losses) * 100).toFixed(2);
const bustProbability = (busts / TOTAL_ROUNDS * 100).toFixed(4);

console.log(`\n📊 RESULTS:`);
console.log(`-----------------------------`);
console.log(`✅ Total Wins: ${wins}`);
console.log(`❌ Total Losses: ${losses}`);
console.log(`💀 BUSTS (Level ${MAX_ALLOWED_LEVEL} Loss): ${busts}`);
console.log(`🚫 Skip Recommended: ${skipCount}`);
console.log(`-----------------------------`);
console.log(`🛡️ Survival Rate: ${survivalRate}%`);
console.log(`📈 Win Rate (Calculated): ${winRate}%`);
console.log(`🔥 Max Level Reached: ${maxLevelReached}`);
console.log(`📉 Bust Probability: ${bustProbability}%`);
console.log(`-----------------------------`);

if (busts === 0) {
    console.log("🎉 PERFECT RUN! No Busts in 50,000 rounds!");
} else {
    console.log(`⚠️ Risk: ${bustProbability}% chance of hitting Level 8 (Bust)`);
}

// Target: 99.9% survival for 7-level
if (survivalRate >= 99.9) {
    console.log("✅ TARGET ACHIEVED: 99.9%+ Survival Rate!");
} else {
    console.log("❌ BELOW TARGET: Strategy refinement may be needed for 7-level stability.");
}
