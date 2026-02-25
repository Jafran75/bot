class SicBoPredictor {
    constructor() {
        this.history = [];
        this.currentSizeLevel = 1;
        this.currentParityLevel = 1;

        this.lastSizeSignal = null;
        this.lastParitySignal = null;

        // Current Active Predictions
        this.currentPrediction = this.generatePrediction();
    }

    addResult(period, dice, sum) {
        const isTriple = (dice[0] === dice[1] && dice[1] === dice[2]);

        // Standard Sicbo rules: 4-10 Small, 11-17 Big. Triples lose size bets.
        let actualSize = 'TRIPLE';
        if (!isTriple) {
            if (sum >= 4 && sum <= 10) actualSize = 'SMALL';
            else if (sum >= 11 && sum <= 17) actualSize = 'BIG';
        }

        let actualParity = 'TRIPLE';
        if (!isTriple) {
            actualParity = (sum % 2 === 0) ? 'EVEN' : 'ODD';
        }

        console.log(`📊 Analysis -> Size: ${actualSize}, Parity: ${actualParity}, IsTriple: ${isTriple}`);

        // Verify last signals if they existed
        if (this.lastSizeSignal) {
            if (actualSize === 'TRIPLE') {
                console.log(`⚠️ Size Bet Lost (Triple Rolled) -> Level Up`);
                this.currentSizeLevel = Math.min(this.currentSizeLevel + 1, 5);
            } else if (actualSize === this.lastSizeSignal) {
                console.log(`✅ Size Bet WON! Returning to Level 1`);
                this.currentSizeLevel = 1;
            } else {
                console.log(`❌ Size Bet LOST! Moving to Level ${this.currentSizeLevel + 1}`);
                this.currentSizeLevel = Math.min(this.currentSizeLevel + 1, 5);
            }
        }

        if (this.lastParitySignal) {
            if (actualParity === 'TRIPLE') {
                console.log(`⚠️ Parity Bet Lost (Triple Rolled) -> Level Up`);
                this.currentParityLevel = Math.min(this.currentParityLevel + 1, 5);
            } else if (actualParity === this.lastParitySignal) {
                console.log(`✅ Parity Bet WON! Returning to Level 1`);
                this.currentParityLevel = 1;
            } else {
                console.log(`❌ Parity Bet LOST! Moving to Level ${this.currentParityLevel + 1}`);
                this.currentParityLevel = Math.min(this.currentParityLevel + 1, 5);
            }
        }

        this.history.push({ period, dice, sum, actualSize, actualParity });
        if (this.history.length > 50) this.history.shift();

        this.currentPrediction = this.generatePrediction();
        return this.currentPrediction;
    }

    generatePrediction() {
        // Simple streak-breaking pseudo-logic for simulation:
        // In real life, SicBo throws are completely independent. We visualize a "strategy".
        const recentSize = this.history.filter(h => h.actualSize !== 'TRIPLE').slice(-3).map(h => h.actualSize);
        const recentParity = this.history.filter(h => h.actualParity !== 'TRIPLE').slice(-3).map(h => h.actualParity);

        // Pattern logic: If 3 of the same in a row, bet against it (mean reversion). Otherwise follow trend.
        let nextSize = Math.random() > 0.5 ? 'BIG' : 'SMALL';
        let nextParity = Math.random() > 0.5 ? 'EVEN' : 'ODD';

        if (recentSize.length === 3 && recentSize[0] === recentSize[1] && recentSize[1] === recentSize[2]) {
            nextSize = recentSize[0] === 'BIG' ? 'SMALL' : 'BIG'; // Reversal
        }

        if (recentParity.length === 3 && recentParity[0] === recentParity[1] && recentParity[1] === recentParity[2]) {
            nextParity = recentParity[0] === 'EVEN' ? 'ODD' : 'EVEN'; // Reversal
        }

        this.lastSizeSignal = nextSize;
        this.lastParitySignal = nextParity;

        return {
            size: {
                target: nextSize,
                level: this.currentSizeLevel,
                confidence: Math.floor(Math.random() * 15) + 85 // 85% to 99% Visual Confidence
            },
            parity: {
                target: nextParity,
                level: this.currentParityLevel,
                confidence: Math.floor(Math.random() * 15) + 85
            }
        };
    }
}

module.exports = new SicBoPredictor();
