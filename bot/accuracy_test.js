const WingoPredictor = require('./prediction');

const predictor = new WingoPredictor();
const SIMULATION_ROUNDS = 1000;
let wins = 0;
let losses = 0;
let currentLevel = 1;
let maxLevelReached = 1;
let levelDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, '6+': 0 };

console.log(`Running Simulation for ${SIMULATION_ROUNDS} rounds...`);

// Seed some history
for (let i = 0; i < 20; i++) {
    const num = Math.floor(Math.random() * 10);
    predictor.addResult((1000 + i).toString(), num);
}

let historyStart = 1020;

for (let i = 0; i < SIMULATION_ROUNDS; i++) {
    // 1. Get Prediction
    const prediction = predictor.predictNext();

    // 2. Generate Random Result (Fair 50/50 for Big/Small)
    // Note: Real Wingo might have 0/5 quirks, but we treat them as S/B per rules.
    const resultNum = Math.floor(Math.random() * 10);
    const resultSize = resultNum >= 5 ? 'Big' : 'Small';

    // 3. Check Win/Loss
    const isWin = prediction.size === resultSize;

    if (isWin) {
        wins++;
        levelDistribution[currentLevel]++; // Track where we won
        currentLevel = 1;
    } else {
        losses++;
        currentLevel++;
        if (currentLevel > 5) {
            levelDistribution['6+']++;
            currentLevel = 1; // Reset after Stage 5 loss (or continue if martingale logic differs)
            // For strict accuracy test, we say we "busted" at 5.
        }
        if (currentLevel > maxLevelReached) maxLevelReached = currentLevel;
    }

    // 4. Add result to history
    predictor.addResult((historyStart + i).toString(), resultNum);
}

// Results
const rawAccuracy = (wins / SIMULATION_ROUNDS) * 100;
const stage1Wins = levelDistribution[1];
const stage5Busts = levelDistribution['6+'];
const successRateWithin5 = ((wins - stage5Busts) / wins) * 100; // Not quite right math for "session survival".

console.log("\n--- Simulation Results ---");
console.log(`Total Rounds: ${SIMULATION_ROUNDS}`);
console.log(`Raw Accuracy (Win Rate): ${rawAccuracy.toFixed(2)}%`);
console.log(`Max Level Reached: ${maxLevelReached > 5 ? '6+ (Bust)' : maxLevelReached}`);
console.log("\nWin Distribution by Stage:");
console.log(`Stage 1: ${levelDistribution[1]} wins`);
console.log(`Stage 2: ${levelDistribution[2]} wins`);
console.log(`Stage 3: ${levelDistribution[3]} wins`);
console.log(`Stage 4: ${levelDistribution[4]} wins`);
console.log(`Stage 5: ${levelDistribution[5]} wins`);
console.log(`BUST (Stage 6+): ${levelDistribution['6+']} times`);

const strategySuccess = ((SIMULATION_ROUNDS - levelDistribution['6+']) / SIMULATION_ROUNDS) * 100;
console.log(`\nStrategy Survival Rate (No Busts): ${strategySuccess.toFixed(2)}%`);
