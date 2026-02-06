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

    // --- STRATEGIES ---

    // 1. Pattern Matcher (Looks for AABB, ABAB, etc.)
    analyzePattern(results) {
        if (results.length < 4) return null;
        const p = results.slice(-4).map(r => r.size); // [S, B, S, B]

        // AABB (S S B B -> Predict B)
        if (p[0] === p[1] && p[2] === p[3] && p[1] !== p[2]) return p[3]; // Continue pair

        // ABAB (S B S B -> Predict S)
        if (p[0] !== p[1] && p[1] !== p[2] && p[2] !== p[3]) return p[3] === 'Big' ? 'Small' : 'Big'; // Continue chop

        // AAAB (S S S B -> Predict B) - Break streak
        // or Dragon start? Context dependent. Let's assume Break for now.
        return null;
    }

    // 2. Dragon / Trend (Follow the winner)
    analyzeTrend(results) {
        if (results.length < 2) return null;
        const last = results[results.length - 1].size;

        let streak = 0;
        for (let i = results.length - 1; i >= 0; i--) {
            if (results[i].size === last) streak++;
            else break;
        }

        if (streak >= 3) return last; // Follow the Dragon
        if (streak === 1) { // Chop potential
            const prev = results[results.length - 2].size;
            if (prev !== last) return null;
        }
        return null;
    }

    // 3. Balance Theory (Regression to Mean)
    analyzeBalance(results) {
        if (results.length < 10) return null;
        const last10 = results.slice(-10);
        const bigs = last10.filter(r => r.size === 'Big').length;
        const smalls = 10 - bigs;

        // If heavily skewed, predict reversal
        if (bigs >= 7) return 'Small';
        if (smalls >= 7) return 'Big';
        return null;
    }

    predictNext() {
        // Fallback for empty history
        if (this.history.length < 5) {
            return {
                size: Math.random() > 0.5 ? 'Big' : 'Small',
                color: Math.random() > 0.5 ? 'Red' : 'Green',
                reasoning: 'Random (Collecting Data)',
                confidence: 'Low'
            };
        }

        const lastResults = this.history.slice(-20);

        // Voting System
        let votes = { 'Big': 0, 'Small': 0 };
        let methods = [];

        // 1. Pattern Vote
        const pattern = this.analyzePattern(lastResults);
        if (pattern) {
            votes[pattern] += 3; // Patterns are strong
            methods.push(`Pattern(${pattern})`);
        }

        // 2. Trend Vote
        const trend = this.analyzeTrend(lastResults);
        if (trend) {
            votes[trend] += 2; // Trends are medium
            methods.push(`Trend(${trend})`);
        }

        // 3. Balance Vote
        const balance = this.analyzeBalance(lastResults);
        if (balance) {
            votes[balance] += 1; // Weakest, but good tiebreaker
            methods.push(`Balance(${balance})`);
        }

        // 4. Inverse (Last Result Flip) - Default "Chaos" vote
        const lastSize = lastResults[lastResults.length - 1].size;
        const inverse = lastSize === 'Big' ? 'Small' : 'Big';
        votes[inverse] += 0.5; // Very weak tiebreaker

        // Determine Winner
        let predictedSize = votes['Big'] > votes['Small'] ? 'Big' : 'Small';

        // Calculate Confidence
        const totalVotes = votes['Big'] + votes['Small'];
        const winVotes = votes[predictedSize];
        const confidenceVal = (winVotes / totalVotes) * 100;

        let confidenceLvl = 'Low';
        if (confidenceVal > 65) confidenceLvl = 'Medium';
        if (confidenceVal > 85) confidenceLvl = 'High';

        // Color Logic (Simple Trend for now)
        // Can be upgraded similarly, but keeping it simple to save compute/complexity for now.
        const lastColor = lastResults[lastResults.length - 1].color;
        let predictedColor = Math.random() > 0.5 ? 'Red' : 'Green';
        if (lastColor === 'Red') predictedColor = 'Red'; // Simple stick

        return {
            size: predictedSize,
            color: predictedColor,
            reasoning: `${methods.join(', ') || 'Probabilistic'}`,
            confidence: confidenceLvl
        };
    }

    getHistory() { return this.history; }
    clearHistory() { this.history = []; }
}

module.exports = WingoPredictor;
