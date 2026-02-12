const WingoPredictor = require('./prediction');

const predictor = new WingoPredictor();
const TOTAL_ROUNDS = 10000;

console.log(`\n🚀 SImulating ${TOTAL_ROUNDS} Rounds with Dynamic Safety Protocol...`);

let wins = 0;
let losses = 0;
let busts = 0; // Failed Level 5
let maxLevel = 1;
let currentLevel = 1;
let history = [];

// Generate random data for simulation
for (let i = 0; i < TOTAL_ROUNDS + 1000; i++) {
    const num = Math.floor(Math.random() * 10);
    const size = num >= 5 ? 'Big' : 'Small';
    history.push({ period: i.toString(), number: num, size: size });
}

// Seed first 100
for (let i = 0; i < 100; i++) {
    predictor.addResult(history[i].period, history[i].number);
}

// Run Simulation
for (let i = 100; i < TOTAL_ROUNDS + 100; i++) {
    const target = history[i + 1]; // predicting next

    // Make Prediction with Level Awareness
    const prediction = predictor.predictNext(currentLevel);

    // Check Result
    const actualSize = target.size;
    const isWin = prediction.size === actualSize;

    if (isWin) {
        wins++;
        currentLevel = 1; // Reset
    } else {
        losses++;
        currentLevel++;
        if (currentLevel > maxLevel) maxLevel = currentLevel;

        if (currentLevel > 5) {
            busts++;
            currentLevel = 1; // You died. Reset.
        }
    }


    // Feed result back
    predictor.addResult(target.period, target.number);
}

const survivalRate = ((TOTAL_ROUNDS - busts) / TOTAL_ROUNDS * 100).toFixed(2);
const winRate = (wins / TOTAL_ROUNDS * 100).toFixed(2);

console.log(`\n📊 RESULTS:`);
console.log(`-----------------------------`);
console.log(`✅ Wins: ${wins}`);
console.log(`❌ Losses: ${losses}`);
console.log(`💀 BUSTS (Level 5 Loss): ${busts}`);
console.log(`-----------------------------`);
console.log(`🛡️ Survival Rate: ${survivalRate}%`);
console.log(`📈 Flat Win Rate: ${winRate}%`);
console.log(`🔥 Max Level Reached: ${maxLevel}`);
console.log(`-----------------------------`);

if (busts === 0) console.log("🎉 PERFECT RUN! No Busts!");
else console.log(`⚠️ Risk: ${(busts / TOTAL_ROUNDS * 100).toFixed(2)}% bust probability`);
