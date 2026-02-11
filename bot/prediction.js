const fs = require('fs');

class WingoPredictor {
    constructor() {
        this.history = [];
        this.maxHistory = 1000; // Keep more history for learning
        // Pattern Memory Database
        // Key: "S-S-B" -> Value: { Big: 12, Small: 5 }
        this.patterns = {};
    }

    getSize(number) { return number >= 5 ? 'Big' : 'Small'; }
    getColor(number) { return number % 2 === 0 ? 'Red' : 'Green'; }

    addResult(period, number) {
        if (this.history.find(r => r.period === period)) return false;

        const size = this.getSize(number);
        const color = this.getColor(number);

        // --- LEARN FROM THIS RESULT ---
        // Before adding, look at the previous 3 results to form a pattern key
        if (this.history.length >= 3) {
            const last3 = this.history.slice(-3).map(r => r.size).join('-'); // e.g., "Small-Small-Big"

            if (!this.patterns[last3]) this.patterns[last3] = { Big: 0, Small: 0 };

            // Should increment what JUST happened (size)
            this.patterns[last3][size]++;
        }

        this.history.push({ period, number, size, color });
        if (this.history.length > this.maxHistory) this.history.shift();
        return true;
    }

    // --- PREDICTION LOGIC ---
    predictNext() {
        // Fallback for empty history
        if (this.history.length < 5) {
            return {
                size: Math.random() > 0.5 ? 'Big' : 'Small',
                color: Math.random() > 0.5 ? 'Red' : 'Green',
                reasoning: 'Calibrating Pattern Memory...',
                confidence: 'Low'
            };
        }

        const last3 = this.history.slice(-3).map(r => r.size).join('-');
        const stats = this.patterns[last3];

        let predictedSize = 'Big'; // Default
        let reasoning = 'Default (No Pattern Data)';
        let confidenceLvl = 'Low';

        if (stats) {
            const total = stats.Big + stats.Small;
            if (total > 0) {
                // Pick the one with higher frequency
                if (stats.Big > stats.Small) {
                    predictedSize = 'Big';
                    reasoning = `Pattern(${last3}) -> Big ${Math.round((stats.Big / total) * 100)}%`;
                } else if (stats.Small > stats.Big) {
                    predictedSize = 'Small';
                    reasoning = `Pattern(${last3}) -> Small ${Math.round((stats.Small / total) * 100)}%`;
                } else {
                    // Tie -> Follow last result (Trend)
                    predictedSize = this.history[this.history.length - 1].size;
                    reasoning = `Pattern Tie -> Follow Trend (${predictedSize})`;
                }

                if (total > 5) confidenceLvl = 'High';
                else confidenceLvl = 'Medium';
            }
        } else {
            // New Pattern -> Random or Follow Trend
            const lastSize = this.history[this.history.length - 1].size;
            predictedSize = lastSize;
            reasoning = 'New Pattern -> Trend Follow';
        }

        // Color Logic (Similar Pattern Memory could be used, keeping simple for now)
        const lastColor = this.history[this.history.length - 1].color;
        let predictedColor = lastColor; // Follow Trend

        return {
            size: predictedSize,
            color: predictedColor,
            reasoning: reasoning,
            confidence: confidenceLvl
        };
    }

    getHistory() { return this.history; }
    clearHistory() { this.history = []; this.patterns = {}; }
}

module.exports = WingoPredictor;
