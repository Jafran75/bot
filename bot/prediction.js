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
        if (this.history.length < 15) {
            return {
                size: Math.random() > 0.5 ? 'Big' : 'Small',
                color: 'Red',
                reasoning: '🔄 Titan Calibration',
                confidence: 'Medium',
                skipRecommended: false
            };
        }

        const lastSize = this.history[this.history.length - 1].size;
        const lastEntry = this.history[this.history.length - 1];
        const isChoppy = this.isChoppy();

        // --- V14 TITAN CONSENSUS ENGINE ---
        let votes = { Big: [], Small: [] };

        const castVote = (side, weight, source) => {
            for (let i = 0; i < weight; i++) votes[side].push(source);
        };

        // 1. ADVANCED STREAK (Titan Trend)
        let streak = 0;
        for (let i = this.history.length - 1; i >= 0; i--) {
            if (this.history[i].size === lastSize) streak++;
            else break;
        }

        // Titan Rule: Rides trends harder, breaks traps faster
        if (streak >= 4) {
            castVote(lastSize, 50, 'TitanTrend');
        } else if (streak === 2 || streak === 3) {
            if (isChoppy) castVote(lastSize === 'Big' ? 'Small' : 'Big', 40, 'TitanChop');
            else castVote(lastSize, 30, 'Momentum');
        }

        // 2. DEEP MARKOV (Titan Transition)
        const fromLast = lastSize;
        const toBig = this.markov[`${fromLast}->Big`] || 0;
        const toSmall = this.markov[`${fromLast}->Small`] || 0;
        const sum = toBig + toSmall;
        if (sum > 10) {
            if (toBig / sum > 0.65) castVote('Big', 40, 'MarkovNext');
            else if (toSmall / sum > 0.65) castVote('Small', 40, 'MarkovNext');
        }

        // 3. MULTI-LAYER PATTERNS (P4 to P7)
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
                    const ratio = Math.max(stats.Big, stats.Small) / total;
                    if (ratio > 0.6) {
                        castVote(side, len * 10, `PatternV${len}`);
                        break;
                    }
                }
            }
        }

        // 4. LEVEL-SPECIFIC TIGHTENING (Titan Guard)
        if (currentLevel >= 2) {
            // If we are recovering, we MUST detect trend flips.
            const recent4 = this.history.slice(-4).map(r => r.size);
            const alternateSide = lastSize === 'Big' ? 'Small' : 'Big';

            // If it's zigzagging (B-S-B-S), follow the zigzag
            if (recent4[0] !== recent4[1] && recent4[1] !== recent4[2] && recent4[2] !== recent4[3]) {
                castVote(alternateSide, 60, 'ZigZagSync');
            }
        }

        // 5. QUANTUM PRNG PULSE
        const bestPrng = this.calibratePrng();
        if (bestPrng) {
            const pred = this.calculatePrng(bestPrng.formulaId, Number(lastEntry.period) + 1, lastEntry.number, Date.now());
            castVote(pred, 120, 'TitanPulse');
        }

        // --- FINAL TITAN DECISION ---
        const bigScore = votes.Big.length;
        const smallScore = votes.Small.length;
        let predictedSize = bigScore >= smallScore ? 'Big' : 'Small';
        let totalScore = bigScore + smallScore;
        let confidence = totalScore > 0 ? (Math.max(bigScore, smallScore) / totalScore) * 100 : 50;

        // --- TITAN CONSENSUS CHECK ---
        const sources = [...new Set(votes[predictedSize])];

        // Level 2: Requires 3+ Sources
        if (currentLevel === 2 && sources.length < 3 && !bestPrng) {
            predictedSize = lastSize === 'Big' ? 'Small' : 'Big'; // Pivot
            confidence = 70;
        }

        // Level 3: Requires 4+ Sources (Extreme Conservative)
        if (currentLevel >= 3 && sources.length < 4 && !bestPrng) {
            // If no 4-source consensus, default to PRNG or Reversal
            predictedSize = lastSize === 'Big' ? 'Small' : 'Big';
            confidence = 80;
        }

        return {
            size: predictedSize,
            color: predictedSize === 'Big' ? 'Green' : 'Red',
            reasoning: sources.join(' + ') || 'TitanCORE',
            confidence: confidence >= 95 ? 'GOD-MODE' : confidence >= 85 ? 'TITAN' : 'ELITE',
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
