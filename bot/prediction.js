const fs = require('fs');

class WingoPredictor {
    constructor() {
        this.history = []; // Stores { period: string, number: int, size: string, color: string }
        this.maxHistory = 100;
    }

    // Helper: Number to Size
    getSize(number) {
        return number >= 5 ? 'Big' : 'Small';
    }

    // Helper: Number to Color
    // Rule: Even = Red, Odd = Green
    // (User specific rule. Standard is 0,5 violet mix, but user said Even=Red, Odd=Green)
    getColor(number) {
        return number % 2 === 0 ? 'Red' : 'Green'; // 0 is even -> Red
    }

    addResult(period, number) {
        const size = this.getSize(number);
        const color = this.getColor(number);

        // Avoid duplicate periods
        if (this.history.find(r => r.period === period)) {
            return false;
        }

        this.history.push({ period, number, size, color });
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        return true;
    }

    // Advanced Prediction Logic
    // We want accuracy within 5 levels.
    // We analyze the last few patterns.
    predictNext() {
        if (this.history.length < 5) {
            return {
                type: 'Random',
                size: Math.random() > 0.5 ? 'Big' : 'Small',
                color: Math.random() > 0.5 ? 'Red' : 'Green',
                reasoning: 'Random guess (insufficient history)',
                confidence: 'Low (Not enough data)'
            };
        }

        const lastResults = this.history.slice(-10);

        // Strategy 1: Trend Following (Dragon)
        // If last 4 are same, predict same.
        const lastSize = lastResults[lastResults.length - 1].size;
        let streak = 0;
        for (let i = lastResults.length - 1; i >= 0; i--) {
            if (lastResults[i].size === lastSize) streak++;
            else break;
        }

        let predictedSize = '';
        let reasoning = '';

        if (streak >= 3) {
            // Dragon Pattern - Follow it
            predictedSize = lastSize;
            reasoning = `Dragon trend detected (${streak} ${lastSize}s)`;
        } else {
            // Strategy 2: Pattern Breaking / ZigZag
            // Simple Pattern ABAB
            const patterns = lastResults.slice(-4).map(r => r.size); // [S, B, S, B]
            if (patterns[0] !== patterns[1] && patterns[1] !== patterns[2] && patterns[2] !== patterns[3]) {
                // S B S B -> Predict S (ZigZag)
                predictedSize = patterns[3] === 'Big' ? 'Small' : 'Big';
                reasoning = 'ZigZag pattern detected';
            } else {
                // Default: Reverse of last if streak is small (1 or 2), or just follow trend?
                // Let's use simple frequency of last 10.
                const bigCount = lastResults.filter(r => r.size === 'Big').length;
                if (bigCount > 5) predictedSize = 'Small'; // Reverse pressure
                else predictedSize = 'Big';
                reasoning = 'Probability Balance';
            }
        }

        // Color Prediction (Same logic)
        const lastColor = lastResults[lastResults.length - 1].color;
        let colorStreak = 0;
        for (let i = lastResults.length - 1; i >= 0; i--) {
            if (lastResults[i].color === lastColor) colorStreak++;
            else break;
        }

        let predictedColor = '';
        if (colorStreak >= 2) {
            predictedColor = lastColor === 'Red' ? 'Green' : 'Red'; // Break small streaks
            if (colorStreak > 4) predictedColor = lastColor; // Follow big streaks
        } else {
            predictedColor = lastColor === 'Red' ? 'Green' : 'Red';
        }

        return {
            size: predictedSize,
            color: predictedColor,
            reasoning: reasoning,
            confidence: streak > 3 ? 'High' : 'Medium'
        };
    }

    getHistory() {
        return this.history;
    }

    clearHistory() {
        this.history = [];
    }
}

module.exports = WingoPredictor;
