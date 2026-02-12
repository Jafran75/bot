const WingoPredictor = require('./prediction');
const fs = require('fs');

const predictor = new WingoPredictor();
// Load history
const fullHistory = JSON.parse(fs.readFileSync('history.json', 'utf8'));
const TRAIN_SIZE = 5;
const TEST_SIZE = fullHistory.length - TRAIN_SIZE;

if (TEST_SIZE <= 0) {
    console.error("Not enough history data.");
    process.exit(1);
}

console.log(`\n📂 Loaded ${fullHistory.length} rounds.`);
console.log(`🚂 Training on first ${TRAIN_SIZE}, Testing on next ${TEST_SIZE}...\n`);

// Train
for (let i = 0; i < TRAIN_SIZE; i++) {
    predictor.addResult(fullHistory[i].period, fullHistory[i].number);
}

// Test
let level1Wins = 0;
let level1Total = 0;
let totalWins = 0;
let busts = 0;
let currentLevel = 1;
let historyLog = [];

for (let i = TRAIN_SIZE; i < fullHistory.length; i++) {
    const target = fullHistory[i];

    // Predict
    const prediction = predictor.predictNext(currentLevel);

    // Check Result
    const actualSize = predictor.getSize(target.number);
    const isWin = prediction.size === actualSize;

    historyLog.push({
        period: target.period,
        pred: prediction.size,
        act: actualSize,
        res: isWin ? 'WIN' : 'LOSS',
        lvl: currentLevel,
        conf: prediction.confidence
    });

    if (currentLevel === 1) {
        level1Total++;
        if (isWin) level1Wins++;
    }

    if (isWin) {
        totalWins++;
        currentLevel = 1;
    } else {
        currentLevel++;
        if (currentLevel > 4) {
            busts++;
            currentLevel = 1; // Reset
        }
    }

    // Add actual result to predictor for next round
    predictor.addResult(target.period, target.number);
}

// Stats
const l1Accuracy = (level1Wins / level1Total * 100).toFixed(2);
const totalAccuracy = (totalWins / TEST_SIZE * 100).toFixed(2);
const survivalRate = ((TEST_SIZE - busts) / TEST_SIZE * 100).toFixed(2);

console.log("📊 RESULTS ON REAL DATA:");
console.log("-----------------------");
console.log(`Level 1 Accuracy: ${l1Accuracy}% (${level1Wins}/${level1Total})`);
console.log(`Overall Win Rate: ${totalAccuracy}%`);
console.log(`Busts (L4 Losses): ${busts}`);
console.log(`Survival Rate:    ${survivalRate}%`);
console.log("-----------------------");
console.log("\nLast 10 Rounds:");
console.table(historyLog.slice(-10));
