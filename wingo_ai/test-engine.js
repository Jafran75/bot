const engine = require('./prediction');

function simulate() {
    console.log("🚀 Starting V7 Quantum Recovery Stress Test (Continuous Signal)...");

    // Seed with numbers
    let history = [1, 5, 2, 8, 3, 7, 0, 9, 4, 6, 8, 2, 1, 9, 0, 5, 3, 7, 4, 6];
    let userState = {
        streak: 0,
        engine_stats: {
            markov: { w: 0, l: 0 },
            dragon: { w: 0, l: 0 },
            zigzag: { w: 0, l: 0 },
            mirror: { w: 0, l: 0 },
            velocity: { w: 0, l: 0 },
            cluster: { w: 0, l: 0 }
        },
        active_factors: []
    };

    let totalSessions = 50;
    let successfulSessions = 0;
    let totalRounds = 0;
    let maxDrawdown = 0;

    for (let s = 0; s < totalSessions; s++) {
        let currentDrawdown = 0;
        let wonSession = false;

        for (let level = 1; level <= 3; level++) {
            totalRounds++;
            const pred = engine.predict(history, userState);

            // Check that we ALWAYS get a signal
            if (!pred.signal) {
                console.error("❌ ERROR: No signal generated!");
                return;
            }

            // Generate actual number (simulating some chaos)
            let actualNum;
            // Introduce 40% absolute chaos
            if (Math.random() < 0.4) {
                actualNum = Math.floor(Math.random() * 10);
            } else {
                // 60% bias towards "Anti-Trend" for stress testing
                if (pred.signal === 'big') actualNum = Math.floor(Math.random() * 5);
                else actualNum = 5 + Math.floor(Math.random() * 5);
            }

            const actualBS = actualNum >= 5 ? 'big' : 'small';

            // Simulate reporting
            const activeFactors = pred.factors_used || [];
            if (pred.signal === actualBS) {
                // WIN
                wonSession = true;
                break;
            } else {
                // LOSS
                currentDrawdown++;
                if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown;
            }
            history.push(actualNum);
            if (history.length > 200) history.shift();
        }

        if (wonSession) successfulSessions++;
    }

    const accuracy = (successfulSessions / totalSessions) * 100;
    console.log(`\nResults after ${totalSessions} sessions (${totalRounds} total rounds):`);
    console.log(`- 5-Level Win Rate: ${accuracy.toFixed(1)}%`);
    console.log(`- Max Drawdown (Levels lost in a row): ${maxDrawdown}`);

    if (accuracy >= 98) {
        console.log("\n✅ V7 SUCCESS: High accuracy maintained continuously.");
    } else {
        console.log(`\n⚠️ Accuracy ${accuracy.toFixed(1)}% needs fine-tuning.`);
    }
}

simulate();
