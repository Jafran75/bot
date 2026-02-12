const WingoPredictor = require('./prediction');
const predictor = new WingoPredictor();

// Sequence: S, B, B, B, B, B
// 4 (S), 6 (B), 5 (B), 7 (B), 8 (B), 7 (B)
const sequence = [
    { p: '100', n: 4 }, // Small
    { p: '101', n: 6 }, // Big (Streak 1)
    { p: '102', n: 5 }, // Big (Streak 2)
    { p: '103', n: 7 }, // Big (Streak 3)
    { p: '104', n: 8 }, // Big (Streak 4)
    { p: '105', n: 7 }  // Big (Streak 5)
];

console.log("🐛 DEBUGGING PREDICTION 🐛");

let currentLevel = 1;

for (let i = 0; i < sequence.length; i++) {
    const item = sequence[i];
    predictor.addResult(item.p, item.n);
    console.log(`\nRound ${item.p}: Result ${item.n} (${item.n >= 5 ? 'Big' : 'Small'})`);

    // Predict for NEXT round
    const pred = predictor.predictNext(currentLevel);
    console.log(`PREDICTION for ${parseInt(item.p) + 1}: [L${currentLevel}] ${pred.size} (${pred.confidence})`);
    console.log(`   Reason: ${pred.reasoning}`);

    // Check outcome (using next item in sequence if exists)
    if (i < sequence.length - 1) {
        const nextResult = sequence[i + 1].n;
        const nextSize = nextResult >= 5 ? 'Big' : 'Small';

        let win = (pred.size === nextSize);
        if (win) {
            console.log(`   ✅ WIN -> Reset Level 1`);
            currentLevel = 1;
        } else {
            console.log(`   ❌ LOSS -> Increase Level`);
            currentLevel++;
            if (currentLevel > 2) currentLevel = 1; // Cap at 2
        }
    }
}
