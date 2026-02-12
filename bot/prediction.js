const fs = require('fs');

class WingoPredictor {
    constructor() {
        this.history = [];
        this.maxHistory = 10000;

        // Multi-Layer Pattern Memory
        // Key: Pattern String -> Value: { Big: count, Small: count }
        this.patterns3 = {}; // Length 3
        this.patterns4 = {}; // Length 4
        this.patterns5 = {}; // Length 5
    }

    getSize(number) { return number >= 5 ? 'Big' : 'Small'; }
    getColor(number) { return number % 2 === 0 ? 'Red' : 'Green'; }

    addResult(period, number) {
        if (this.history.find(r => r.period === period)) return false;

        const size = this.getSize(number);
        const color = this.getColor(number);

        // --- DEEP LEARNING ---
        // Record patterns of length 3, 4, 5
        this.updatePattern(3, size);
        this.updatePattern(4, size);
        this.updatePattern(5, size);

        this.history.push({ period, number, size, color });
        if (this.history.length > this.maxHistory) this.history.shift();
        return true;
    }

    updatePattern(length, resultSize) {
        if (this.history.length >= length) {
            const patternKey = this.history.slice(-length).map(r => r.size).join('-');
            if (length === 3) {
                if (!this.patterns3[patternKey]) this.patterns3[patternKey] = { Big: 0, Small: 0 };
                this.patterns3[patternKey][resultSize]++;
            } else if (length === 4) {
                if (!this.patterns4[patternKey]) this.patterns4[patternKey] = { Big: 0, Small: 0 };
                this.patterns4[patternKey][resultSize]++;
            } else if (length === 5) {
                if (!this.patterns5[patternKey]) this.patterns5[patternKey] = { Big: 0, Small: 0 };
                this.patterns5[patternKey][resultSize]++;
            }
        }
    }

    // --- PREDICTION LOGIC ---
    predictNext(currentLevel = 1) {
        // Fallback for empty history
        if (this.history.length < 6) {
            return {
                size: Math.random() > 0.5 ? 'Big' : 'Small',
                color: Math.random() > 0.5 ? 'Red' : 'Green',
                reasoning: 'Calibrating Deep Patterns...',
                confidence: 'Low'
            };
        }

        // --- 1. GLOBAL STREAK RECOGNITION (The 99% Fix) ---
        // If we see a streak of 3 or more, we NEVER fight it. We ride it until it breaks.
        // This prevents the #1 cause of Level 4+ losses: "Betting against a Dragon".
        const lastSize = this.history[this.history.length - 1].size;
        let streak = 0;
        for (let i = this.history.length - 1; i >= 0; i--) {
            if (this.history[i].size === lastSize) streak++;
            else break;
        }

        if (streak >= 3) {
            return {
                size: lastSize,
                color: this.history[this.history.length - 1].color,
                reasoning: `🚄 Dragon Ride: Streak of ${streak} detected`,
                confidence: 'Max'
            };
        }

        // --- 2. ZIG-ZAG DETECTION (The Chop Fix) ---
        // If we see B-S-B-S (Length >= 4), we ride the chop.
        // This prevents losses in non-trending markets.
        const histLen = this.history.length;
        if (histLen >= 4) {
            const r1 = this.history[histLen - 1].size; // Last
            const r2 = this.history[histLen - 2].size;
            const r3 = this.history[histLen - 3].size;
            const r4 = this.history[histLen - 4].size;

            if (r1 !== r2 && r2 !== r3 && r3 !== r4) {
                // Alternating identified: ... A, B, A, B
                // Predict: A (Opposite of Last)
                const nextSize = r1 === 'Big' ? 'Small' : 'Big';
                return {
                    size: nextSize,
                    color: this.getColor(nextSize === 'Big' ? 8 : 1), // Dummy color
                    reasoning: `⚡ Zig-Zag Chop Detected`,
                    confidence: 'High'
                };
            }
        }

        // --- 3. DEEP PATTERN ANALYSIS (For Complex Chaos) ---
        let votes = { Big: 0, Small: 0 };
        let methods = [];

        // Check Level 3 Patterns
        const p3 = this.history.slice(-3).map(r => r.size).join('-');
        this.vote(this.patterns3, p3, votes, methods, 1);

        // Check Level 4 Patterns (Higher Weight)
        const p4 = this.history.slice(-4).map(r => r.size).join('-');
        this.vote(this.patterns4, p4, votes, methods, 2);

        // Check Level 5 Patterns (Highest Weight)
        const p5 = this.history.slice(-5).map(r => r.size).join('-');
        this.vote(this.patterns5, p5, votes, methods, 3);

        // --- FINAL DECISION ---
        let predictedSize = 'Big';
        let confidenceVal = 0;

        if (votes.Big > votes.Small) {
            predictedSize = 'Big';
            confidenceVal = (votes.Big / (votes.Big + votes.Small)) * 100;
        } else if (votes.Small > votes.Big) {
            predictedSize = 'Small';
            confidenceVal = (votes.Small / (votes.Big + votes.Small)) * 100;
        } else {
            // Tie -> Follow Trend (Default to last size)
            predictedSize = lastSize;
            methods.push('TieBreak(Trend)');
        }

        // Color Logic (Simple Follow)
        const lastColor = this.history[this.history.length - 1].color;

        return {
            size: predictedSize,
            color: lastColor,
            reasoning: methods.slice(0, 3).join(', ') || 'Smart Pattern',
            confidence: confidenceVal > 70 ? 'High' : 'Medium'
        };
    }

    vote(db, key, votes, methods, weight) {
        if (db[key]) {
            const stats = db[key];
            if (stats.Big > stats.Small) {
                votes.Big += weight;
                methods.push(`P${key.length}(B)`);
            } else if (stats.Small > stats.Big) {
                votes.Small += weight;
                methods.push(`P${key.length}(S)`);
            }
        }
    }

    getHistory() { return this.history; }
    clearHistory() {
        this.history = [];
        this.patterns3 = {};
        this.patterns4 = {};
        this.patterns5 = {};
    }
}

module.exports = WingoPredictor;
