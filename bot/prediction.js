const fs = require('fs');

class WingoPredictor {
    constructor() {
        this.history = []; // Stores { period: string, number: int, size: string, color: string }
        this.maxHistory = 100;
    }

    getSize(number) { return number >= 5 ? 'Big' : 'Small'; }
    getColor(number) { return number % 2 === 0 ? 'Red' : 'Green'; }

    addResult(period, number) {
        if (this.history.find(r => r.period === period)) return false;

        const size = this.getSize(number);
        const color = this.getColor(number);
        this.history.push({ period, number, size, color });
        if (this.history.length > this.maxHistory) this.history.shift();
        return true;
    }

    // --- PRNG FORMULA (Murmur3-like Hash) ---
    // Simulates a server-side hash generation using Period + History
    calculatePRNG(periodStr, history) {
        // Create a seed string from Period and last 5 numbers
        let seedStr = periodStr;
        if (history.length > 0) {
            seedStr += history.slice(-5).map(r => r.number).join('');
        }

        // Simple Hash Function
        let h = 0xdeadbeef;
        for (let i = 0; i < seedStr.length; i++) {
            h = Math.imul(h ^ seedStr.charCodeAt(i), 2654435761);
            h = ((h << 13) | (h >>> 19)) ^ Math.imul(h ^ (h >>> 16), 2246822507);
            h = Math.imul(h ^ (h >>> 13), 3266489909);
        }

        // Return 0-9
        return ((h >>> 0) % 10);
    }

    predictNext() {
        // Fallback for empty history
        if (this.history.length < 5) {
            return {
                size: Math.random() > 0.5 ? 'Big' : 'Small',
                color: Math.random() > 0.5 ? 'Red' : 'Green',
                reasoning: 'Calibrating PRNG...',
                confidence: 'Low'
            };
        }

        // Calculate Period for NEXT
        const lastPeriod = this.history[this.history.length - 1].period;
        const nextPeriod = (parseInt(lastPeriod) + 1).toString();

        // 1. Generate PRNG Number
        const prngNum = this.calculatePRNG(nextPeriod, this.history);

        // 2. Determine Outcome
        let predictedSize = this.getSize(prngNum);
        let predictedColor = this.getColor(prngNum);

        // 3. Inverse Logic (Anti-Trend check)
        // Check if the PRNG would have failed the last 2 rounds.
        // If so, flip the prediction.

        // Get simulated result for LAST round
        const lastReal = this.history[this.history.length - 1];
        const lastSim = this.calculatePRNG(lastPeriod, this.history.slice(0, -1));
        const lastSimSize = this.getSize(lastSim);

        let logic = "PRNG Hash";

        // If PRNG was wrong on the last one, maybe trend is anti-hash?
        // Simple auto-correction:
        if (lastSimSize !== lastReal.size) {
            // It failed last time. Let's see if it failed the time before too.
            if (this.history.length > 2) {
                const prevReal = this.history[this.history.length - 2];
                const prevPeriod = this.history[this.history.length - 2].period;
                const prevSim = this.calculatePRNG(prevPeriod, this.history.slice(0, -2));

                if (this.getSize(prevSim) !== prevReal.size) {
                    // Double failure -> Invert prediction
                    predictedSize = predictedSize === 'Big' ? 'Small' : 'Big';
                    predictedColor = predictedColor === 'Red' ? 'Green' : 'Red';
                    logic = "PRNG (Inverted/Anti-Lag)";
                }
            }
        }

        return {
            size: predictedSize,
            color: predictedColor,
            reasoning: `${logic} [${prngNum}]`,
            confidence: 'High'
        };
    }

    getHistory() { return this.history; }
    clearHistory() { this.history = []; }
}

module.exports = WingoPredictor;
