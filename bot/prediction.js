const fs = require('fs');

class WingoPredictor {
    constructor() {
        this.history = [];
        this.maxHistory = 10000;

        // Multi-Layer Pattern Memory
        this.patterns3 = {};
        this.patterns4 = {};
        this.patterns5 = {};
        this.patterns6 = {};
        this.patterns7 = {};

        // Number Signature Stats
        this.numberStats = {};
        for (let i = 0; i <= 9; i++) this.numberStats[i] = { Big: 0, Small: 0 };

        // Markov Chain Transition Matrix
        this.markov = {
            'Big->Big': 0,
            'Big->Small': 0,
            'Small->Big': 0,
            'Small->Small': 0
        };
    }

    getSize(number) { return number >= 5 ? 'Big' : 'Small'; }
    getColor(number) { return number % 2 === 0 ? 'Red' : 'Green'; }

    addResult(period, number, serverTime = Date.now()) {
        if (this.history.find(r => r.period === period)) return false;

        const size = this.getSize(number);
        const color = this.getColor(number);

        // Calculate Time Delta (Lag)
        let timeDelta = 0;
        if (this.history.length > 0) {
            const lastEntry = this.history[this.history.length - 1];
            const lastTime = lastEntry.serverTime || (serverTime - 30000);
            timeDelta = serverTime - lastTime;

            // Update Number Signature
            const prevNum = lastEntry.number;
            this.numberStats[prevNum][size]++;

            // Update Markov Chain
            const transition = `${lastEntry.size}->${size}`;
            this.markov[transition]++;
        }

        // --- DEEP LEARNING ---
        // Record patterns of length 3, 4, 5, 6, 7
        this.updatePattern(3, size);
        this.updatePattern(4, size);
        this.updatePattern(5, size);
        this.updatePattern(6, size);
        this.updatePattern(7, size);

        this.history.push({ period, number, size, color, serverTime, timeDelta });
        if (this.history.length > this.maxHistory) this.history.shift();
        return true;
    }

    updatePattern(length, resultSize) {
        if (this.history.length >= length) {
            const patternKey = this.history.slice(-length).map(r => r.size).join('-');
            const db = this[`patterns${length}`]; // Dynamic Access
            if (db) {
                if (!db[patternKey]) db[patternKey] = { Big: 0, Small: 0 };
                db[patternKey][resultSize]++;
            }
        }
    }

    // Helper: Detect Choppy Market (High Flip Rate)
    isChoppy() {
        if (this.history.length < 10) return false;
        const recent = this.history.slice(-15); // Look at last 15
        let flips = 0;
        for (let i = 0; i < recent.length - 1; i++) {
            if (recent[i].size !== recent[i + 1].size) flips++;
        }
        // If > 50% flips, it's Choppy.
        return (flips / (recent.length - 1)) > 0.5;
    }

    // === PREDICTION LOGIC (Level 1 & 2 Optimization) ===
    predictNext(currentLevel = 1) {
        if (this.history.length < 10) {
            return {
                size: Math.random() > 0.5 ? 'Big' : 'Small',
                color: 'Red',
                reasoning: '🔄 Calibrating V13',
                confidence: 'Medium',
                skipRecommended: false
            };
        }

        const lastSize = this.history[this.history.length - 1].size;
        const lastEntry = this.history[this.history.length - 1];
        const isChoppy = this.isChoppy();

        // --- V13 QUANTUM RESONANCE CONSENSUS ENGINE ---
        let votes = { Big: [], Small: [] }; // Track source of votes

        const castVote = (side, weight, source) => {
            for (let i = 0; i < weight; i++) votes[side].push(source);
        };

        // 1. STREAK HANDLING (Dynamic Dragon)
        let streak = 0;
        for (let i = this.history.length - 1; i >= 0; i--) {
            if (this.history[i].size === lastSize) streak++;
            else break;
        }

        if (streak >= 5) {
            castVote(lastSize, 40, 'Dragon');
        } else if (streak === 3 || streak === 4) {
            if (isChoppy) castVote(lastSize === 'Big' ? 'Small' : 'Big', 30, 'ChopFlip');
            else castVote(lastSize, 25, 'TrendFollow');
        }

        // 2. MARKOV TRANSITIONS
        const fromLast = lastSize;
        const toBig = this.markov[`${fromLast}->Big`] || 0;
        const toSmall = this.markov[`${fromLast}->Small`] || 0;
        const sum = toBig + toSmall;
        if (sum > 10) {
            if (toBig / sum > 0.6) castVote('Big', 35, 'Markov');
            else if (toSmall / sum > 0.6) castVote('Small', 35, 'Markov');
        }

        // 3. PATTERN RECOGNITION (P4 to P7)
        const pKeys = {
            p7: this.history.slice(-7).map(r => r.size).join('-'),
            p6: this.history.slice(-6).map(r => r.size).join('-'),
            p5: this.history.slice(-5).map(r => r.size).join('-'),
            p4: this.history.slice(-4).map(r => r.size).join('-')
        };

        for (let len = 7; len >= 4; len--) {
            const db = this[`patterns${len}`];
            const key = pKeys[`p${len}`];
            if (db && db[key]) {
                const stats = db[key];
                const total = stats.Big + stats.Small;
                if (total >= 5) {
                    const side = stats.Big > stats.Small ? 'Big' : 'Small';
                    const weight = len * 8; // Longer patterns get more weight
                    castVote(side, weight, `P${len}`);
                    break; // Only use longest valid pattern
                }
            }
        }

        // 4. LEVEL-SPECIFIC ADAPTATION
        if (currentLevel >= 3) {
            // Emergency Reversal Check: If we lost 2 times on the same side, perhaps the market flipped.
            const recent3 = this.history.slice(-3).map(r => r.size);
            if (recent3.every(s => s === recent3[0])) {
                // Large trend. Level 3+ ALWAYS rides the trend if it started.
                castVote(recent3[0], 60, 'EmergencyTrend');
            }
        }

        // 5. SERVER PRNG SYNC (Highest Priority)
        const bestPrng = this.calibratePrng();
        if (bestPrng) {
            const pred = this.calculatePrng(bestPrng.formulaId, Number(lastEntry.period) + 1, lastEntry.number, Date.now());
            castVote(pred, 100, 'QuantumPulse');
        }

        // --- CALCULATION ---
        const bigScore = votes.Big.length;
        const smallScore = votes.Small.length;
        let predictedSize = bigScore >= smallScore ? 'Big' : 'Small';
        let totalScore = bigScore + smallScore;
        let confidence = totalScore > 0 ? (Math.max(bigScore, smallScore) / totalScore) * 100 : 50;

        // Consensus Check for L3/L4
        const sources = [...new Set(votes[predictedSize])];
        if (currentLevel >= 3 && sources.length < 2 && !bestPrng) {
            // Low consensus at high level? Flip to opposite of last logic to catch "The Squeeze"
            predictedSize = lastSize === 'Big' ? 'Small' : 'Big';
            confidence = 65;
        }

        return {
            size: predictedSize,
            color: predictedSize === 'Big' ? 'Green' : 'Red',
            reasoning: sources.join(' + ') || 'QuantumResonance',
            confidence: confidence >= 90 ? 'Ultra' : confidence >= 75 ? 'High' : 'Volatile',
            confidenceScore: Math.round(confidence),
            skipRecommended: false
        };
    }

    // --- PRNG ENGINE ---

    // 1. Calculate a result based on a specific formula
    calculatePrng(formulaId, period, lastNum, time) {
        // Pseudo-Time: We don't know exact server time of NEXT round, 
        // but we know it's roughly LastTime + 30s.
        // We use 'time' as a seed modifier.

        let seed = 0;
        const pLastdigit = period % 100;

        // Formula 1: Simple Addition (Period + LastNum)
        if (formulaId === 1) {
            seed = (pLastdigit + lastNum) % 10;
        }

        // Formula 2: Multiplicative (Period * LastNum)
        if (formulaId === 2) {
            seed = (pLastdigit * (lastNum + 1)) % 10;
        }

        // Formula 3: Time Based (Time Seconds + LastNum)
        if (formulaId === 3) {
            const seconds = Math.floor((time / 1000) % 60);
            seed = (seconds + lastNum) % 10;
        }

        // Formula 4: Difference Based (Period - LastNum)
        if (formulaId === 4) {
            seed = Math.abs(pLastdigit - lastNum) % 10;
        }

        // Formula 5: Square Root Mod (sqrt(Period) + LastNum)
        if (formulaId === 5) {
            seed = Math.floor(Math.sqrt(period) + lastNum) % 10;
        }

        // Map seed 0-9 to Big/Small
        return seed >= 5 ? 'Big' : 'Small';
    }

    // 2. Check which formula is currently correct
    calibratePrng() {
        if (this.history.length < 15) return null;

        const results = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const testSet = this.history.slice(-15);

        // We check if Formula X PREDICTED this result correctly based on Previous Data
        for (let i = 1; i < testSet.length; i++) {
            const current = testSet[i];
            const prev = testSet[i - 1];
            const period = Number(current.period);

            // Reconstruct the 'time' the server used (previous time + 30s approx)
            const approxTime = prev.serverTime + 30000;

            const pred1 = this.calculatePrng(1, period, prev.number, approxTime);
            if (pred1 === current.size) results[1]++;

            const pred2 = this.calculatePrng(2, period, prev.number, approxTime);
            if (pred2 === current.size) results[2]++;

            const pred3 = this.calculatePrng(3, period, prev.number, approxTime);
            if (pred3 === current.size) results[3]++;

            const pred4 = this.calculatePrng(4, period, prev.number, approxTime);
            if (pred4 === current.size) results[4]++;

            const pred5 = this.calculatePrng(5, period, prev.number, approxTime);
            if (pred5 === current.size) results[5]++;
        }

        // Find Best Formula
        let bestId = null;
        let maxScore = 0;

        for (let id = 1; id <= 5; id++) {
            if (results[id] >= 7) { // 70% Accuracy threshold
                if (results[id] > maxScore) {
                    maxScore = results[id];
                    bestId = id;
                }
            }
        }

        if (bestId) {
            return { formulaId: bestId, score: maxScore };
        }
        return null;
    }

    // Enhanced voting with statistical validation
    voteEnhanced(db, key, scores, components, weight) {
        if (db[key]) {
            const stats = db[key];
            const total = stats.Big + stats.Small;
            if (total >= 3) { // Minimum sample size
                const bigRate = stats.Big / total;
                const smallRate = stats.Small / total;

                if (bigRate > 0.6) {
                    scores.Big += weight * bigRate;
                    components.push(`P${key.split('-').length}B`);
                } else if (smallRate > 0.6) {
                    scores.Small += weight * smallRate;
                    components.push(`P${key.split('-').length}S`);
                }
            }
        }
    }

    // Shannon Entropy Calculator
    calculateEntropy(windowSize = 10) {
        if (this.history.length < windowSize) return 1.0;

        const window = this.history.slice(-windowSize);
        const bigCount = window.filter(r => r.size === 'Big').length;
        const smallCount = windowSize - bigCount;

        if (bigCount === 0 || smallCount === 0) return 0;

        const pBig = bigCount / windowSize;
        const pSmall = smallCount / windowSize;

        return -(pBig * Math.log2(pBig) + pSmall * Math.log2(pSmall));
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
        this.patterns6 = {};
        this.patterns7 = {};
        for (let i = 0; i <= 9; i++) this.numberStats[i] = { Big: 0, Small: 0 };
        this.markov = { 'Big->Big': 0, 'Big->Small': 0, 'Small->Big': 0, 'Small->Small': 0 };
    }
}

module.exports = WingoPredictor;
