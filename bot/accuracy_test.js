const WingoPredictor = require('./prediction');

const predictor = new WingoPredictor();
const SIMULATION_ROUNDS = 10000;
let wins = 0;
let losses = 0;
let currentLevel = 1;
let maxLevelReached = 1;
let levelDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, '5+': 0 };

console.log(`Running Smart Pattern Simulation for ${SIMULATION_ROUNDS} rounds...`);

// Seed history
for (let i = 0; i < 50; i++) {
    const num = Math.floor(Math.random() * 10);
    predictor.addResult((1000 + i).toString(), num);
}

let historyStart = 1050;

for (let i = 0; i < SIMULATION_ROUNDS; i++) {
    // 1. Get Prediction
    const prediction = predictor.predictNext();

    // 2. Generate Result (50/50 Chance) - Real world might have slight bias but unknown
    const resultNum = Math.floor(Math.random() * 10);
    const resultSize = resultNum >= 5 ? 'Big' : 'Small';

    // 3. Check Win/Loss
    const isWin = prediction.size === resultSize;

    if (isWin) {
        wins++;
        levelDistribution[currentLevel]++;
        currentLevel = 1;
    } else {
        losses++;
        currentLevel++;
        if (currentLevel > 4) {
            levelDistribution['5+']++;
            currentLevel = 1; // BUST at Level 4 (User goal)
        }
        if (currentLevel > maxLevelReached) maxLevelReached = currentLevel;
    }

    // 4. LEARN & Add
    predictor.addResult((historyStart + i).toString(), resultNum);
}

// Logic for 4-Level Survival
const bustedTimes = levelDistribution['5+'];
const survivalRate = ((SIMULATION_ROUNDS - bustedTimes) / SIMULATION_ROUNDS) * 100;

console.log("\n--- 10k Round Results (3-4 Level Goal) ---");
console.log(`Total Rounds: ${SIMULATION_ROUNDS}`);
console.log(`Survival Rate (No Busts > Level 4): ${survivalRate.toFixed(2)}%`);
console.log(`Raw Accuracy: ${((wins / SIMULATION_ROUNDS) * 100).toFixed(2)}%`);

console.log("\nDistribution:");
console.log(`Stage 1 Win: ${levelDistribution[1]}`);
console.log(`Stage 2 Win: ${levelDistribution[2]}`);
console.log(`Stage 3 Win: ${levelDistribution[3]}`);
console.log(`Stage 4 Win: ${levelDistribution[4]}`);
console.log(`BUST (Loss 4x): ${bustedTimes}`);
