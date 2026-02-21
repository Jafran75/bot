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

        // V13 Infinity Mode: Component Burn-in (Toxic Logic Detection)
        this.toxicLogic = {
            streak: { consecutiveLosses: 0, cooldown: 0, inverted: false },
            markov: { consecutiveLosses: 0, cooldown: 0, inverted: false },
            pattern: { consecutiveLosses: 0, cooldown: 0, inverted: false },
            periodicity: { consecutiveLosses: 0, cooldown: 0, inverted: false }
        };

        // V12 Momentum Engine
        this.momentum = {
            streak: { score: 100, weight: 30 },
            markov: { score: 100, weight: 25 },
            pattern: { score: 100, weight: 35 },
            periodicity: { score: 100, weight: 20 }
        };

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

        // Update Momentum Engine and Toxic Logic based on last prediction
        if (this.lastPrediction && this.lastPrediction.componentSignals) {
            const actualSize = size;

            for (const [key, signal] of Object.entries(this.lastPrediction.componentSignals)) {
                // Update Momentum
                if (signal === actualSize) {
                    this.momentum[key].score = Math.min(200, this.momentum[key].score + 5);
                } else {
                    this.momentum[key].score = Math.max(50, this.momentum[key].score - 10);
                }

                // Update Toxic Logic (Infinity Mode)
                if (this.toxicLogic[key].cooldown > 0) this.toxicLogic[key].cooldown--;

                const isWin = signal === actualSize;
                if (isWin) {
                    this.toxicLogic[key].consecutiveLosses = 0;
                    this.toxicLogic[key].inverted = false;
                } else {
                    this.toxicLogic[key].consecutiveLosses++;
                    if (this.toxicLogic[key].consecutiveLosses >= 3) {
                        this.toxicLogic[key].cooldown = 5;
                        this.toxicLogic[key].consecutiveLosses = 0;
                        this.toxicLogic[key].inverted = false;
                    } else if (this.toxicLogic[key].consecutiveLosses === 2) {
                        this.toxicLogic[key].inverted = true;
                    }
                }
            }
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

    // === PREDICTION LOGIC (V13 INFINITY MODE) ===
    predictNext(currentLevel = 1) {
        if (this.history.length < 10) {
            return {
                size: Math.random() > 0.5 ? 'Big' : 'Small',
                color: 'Red',
                reasoning: '🔄 Calibrating (V13 Init)',
                confidence: 'Medium',
                skipRecommended: false
            };
        }

        const lastEntry = this.history[this.history.length - 1];
        const lastSize = lastEntry.size;

        // --- 0. ANTI-DRAGON PROTECTOR (Infinity Mode) ---
        let streak = 0;
        for (let i = this.history.length - 1; i >= 0; i--) {
            if (this.history[i].size === lastSize) streak++;
            else break;
        }

        if (streak >= 10) {
            return {
                size: lastSize,
                color: lastSize === 'Big' ? 'Green' : 'Red',
                reasoning: `🐲DragonRide(${streak})`,
                confidence: 'Infinity',
                skipRecommended: false,
                componentSignals: { streak: lastSize }
            };
        }

        let scores = { Big: 0, Small: 0 };
        let components = [];
        let componentSignals = {};

        // Helper for Toxic Logic & Momentum
        const applyComponent = (tag, signal, baseWeight) => {
            const toxic = this.toxicLogic[tag];
            if (toxic.cooldown > 0) return; // Component is burnt out

            let weight = baseWeight * (this.momentum[tag].score / 100);
            let finalSignal = signal;

            if (currentLevel >= 4 && toxic.inverted) {
                finalSignal = signal === 'Big' ? 'Small' : 'Big';
                weight *= 1.2; // Increase weight of reversal
                components.push(`Invert(${tag})`);
            }

            scores[finalSignal] += weight;
            componentSignals[tag] = signal; // We store ORIGINAL signal for tracking
        };

        // --- 1. STREAK ENGINE ---
        let streakVote = lastSize;
        if (streak >= 6) streakVote = lastSize;
        else if (streak >= 4) streakVote = lastSize;
        else if (streak === 1 && this.isChoppy()) streakVote = lastSize === 'Big' ? 'Small' : 'Big';
        else streakVote = lastSize;

        applyComponent('streak', streakVote, this.momentum.streak.weight);
        if (streak >= 4) components.push(`🔥S(${streak})`);

        // --- 2. MARKOV ENGINE ---
        const toBig = this.markov[`${lastSize}->Big`] || 0;
        const toSmall = this.markov[`${lastSize}->Small`] || 0;
        const sum = toBig + toSmall;

        if (sum > 0) {
            const bigProb = toBig / sum;
            const smallProb = toSmall / sum;
            if (bigProb > 0.52) applyComponent('markov', 'Big', this.momentum.markov.weight);
            else if (smallProb > 0.52) applyComponent('markov', 'Small', this.momentum.markov.weight);
        }

        // --- 3. PATTERN ENGINE ---
        for (let len = 7; len >= 4; len--) {
            const key = this.history.slice(-len).map(r => r.size).join('-');
            const db = this[`patterns${len}`];
            if (db && db[key]) {
                const stats = db[key];
                const total = stats.Big + stats.Small;
                if (total >= 2) {
                    const signal = stats.Big > stats.Small ? 'Big' : 'Small';
                    applyComponent('pattern', signal, this.momentum.pattern.weight * (len / 4));
                    components.push(`P${len}`);
                    break;
                }
            }
        }

        // --- 4. PERIODICITY ENGINE ---
        const periodicity = this.detectPeriodicity();
        if (periodicity) {
            applyComponent('periodicity', periodicity.next, this.momentum.periodicity.weight);
            components.push(`🔁${periodicity.type}`);
        }

        // --- 5. INFINITY REVERSAL (The "Last Stand") ---
        let predictedSize = scores.Big >= scores.Small ? 'Big' : 'Small';

        if (currentLevel >= 6) {
            // Extreme Level Reversal: If streaks 6+ are common, we flip everything
            predictedSize = predictedSize === 'Big' ? 'Small' : 'Big';
            components.push('🚀InfinityFlip');
        }

        const result = {
            size: predictedSize,
            color: predictedSize === 'Big' ? 'Green' : 'Red',
            reasoning: components.slice(0, 3).join(' + '),
            confidence: 'Infinity',
            skipRecommended: false,
            componentSignals: componentSignals
        };

        this.lastPrediction = result;
        return result;
    }

    // New Helper: Detect Periodicity Patterns
    detectPeriodicity() {
        const recent = this.history.slice(-8).map(r => r.size);
        if (recent.length < 8) return null;

        // Check 1-1 Oscillation: B-S-B-S-B-S...
        const isOsc1 = recent.every((s, i) => i === 0 || s !== recent[i - 1]);
        if (isOsc1) return { type: 'Osc1', next: recent[7] === 'Big' ? 'Small' : 'Big' };

        // Check 2-2 Oscillation: B-B-S-S-B-B-S-S...
        const isOsc2 = (recent[0] === recent[1] && recent[2] === recent[3] &&
            recent[4] === recent[5] && recent[6] === recent[7] &&
            recent[0] !== recent[2] && recent[2] !== recent[4] && recent[4] !== recent[6]);
        if (isOsc2) return { type: 'Osc2', next: recent[7] }; // Stay for second of pair

        return null;
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
            // Extract seconds from timestamp (approximate)
            const seconds = Math.floor((time / 1000) % 60);
            seed = (seconds + lastNum) % 10;
        }

        // Map seed 0-9 to Big/Small
        return seed >= 5 ? 'Big' : 'Small';
    }

    // 2. Check which formula is currently correct
    calibratePrng() {
        if (this.history.length < 10) return null;

        const results = { 1: 0, 2: 0, 3: 0 };
        const testSet = this.history.slice(-10); // Check last 10 rounds

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
        }

        // Find Best Formula
        let bestId = null;
        let maxScore = 0;

        for (let id = 1; id <= 3; id++) {
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
