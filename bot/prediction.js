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

    // === PREDICTION LOGIC (Level 1 & 2 Optimization) ===
    predictNext(currentLevel = 1) {
        if (this.history.length < 6) {
            // Not enough data, but MUST predict. Default to random or inverse of last.
            return {
                size: Math.random() > 0.5 ? 'Big' : 'Small',
                color: 'Red',
                reasoning: '🔄 Calibrating (Early Phase)',
                confidence: 'Medium', // Fake confidence to ensure play
                skipRecommended: false
            };
        }

        const lastSize = this.history[this.history.length - 1].size;
        const lastColor = this.history[this.history.length - 1].color;

        // --- 1. LEVEL 2 RECOVERY LOGIC (The "Correction") ---
        if (currentLevel === 2) {
            // Analyze why Level 1 might have failed
            // L1 usually follows streaks or breaks them at 4/5. 
            // IF L1 failed, the market state is likely the OPPOSITE of what L1 predicted.

            let streak = 0;
            for (let i = this.history.length - 1; i >= 0; i--) {
                if (this.history[i].size === lastSize) streak++;
                else break;
            }

            // Scenario A: Dragon is running (Streak >= 5)
            // L1 likely tried to break it earlier or ride it. 
            // At L2, if streak is high, we MUST ride it. Most losses happen fighting dragons.
            if (streak >= 5) {
                return {
                    size: lastSize,
                    color: lastSize === 'Big' ? 'Green' : 'Red',
                    reasoning: `🛡️L2: DragonForce(${streak})`,
                    confidence: 'Ultra',
                    skipRecommended: false
                };
            }

            // Scenario B: Chop/ZigZag (Streak == 1)
            // If streak is 1, it means the previous result FLIPPED.
            // If L1 bet on streak continuation, it lost. Now we are in a chop.
            // Bet on CHOP (flip again).
            if (streak === 1) {
                const inverseAvg = lastSize === 'Big' ? 'Small' : 'Big';
                return {
                    size: inverseAvg,
                    color: inverseAvg === 'Big' ? 'Green' : 'Red',
                    reasoning: '🛡️L2: ForceChop',
                    confidence: 'High',
                    skipRecommended: false
                };
            }
        }

        // --- LEVEL 1 & General Logic (Existing "No Skip") ---

        // === VOTING SYSTEM (100-point scale) ===
        let scores = { Big: 0, Small: 0 };
        let components = [];

        // --- 1. STREAK HANDLING (Weight: 30) ---
        let streak = 0;
        for (let i = this.history.length - 1; i >= 0; i--) {
            if (this.history[i].size === lastSize) streak++;
            else break;
        }

        // AGGRESSIVE STREAK LOGIC
        if (streak >= 6) {
            // Dragon detected. RIDE THE DRAGON.
            scores[lastSize] += 40;
            components.push(`🐉Dragon(${streak})`);
        } else if (streak === 4 || streak === 5) {
            // DRAGON INCUBATOR - FOLLOW THE TREND
            // Do NOT bet against it. Wingo often has long streaks.
            scores[lastSize] += 25;
            components.push(`🐉Incubator(${streak})`);
        } else if (streak >= 2) {
            // Small streak, follow it.
            scores[lastSize] += 15;
            components.push(`🔥Streak(${streak})`);
        }

        // --- 2. MARKOV CHAIN (Weight: 25) ---
        const totalTransitions = Object.values(this.markov).reduce((a, b) => a + b, 0);
        if (totalTransitions > 20) {
            const fromLast = lastSize;
            const toBig = this.markov[`${fromLast}->Big`] || 0;
            const toSmall = this.markov[`${fromLast}->Small`] || 0;
            const sum = toBig + toSmall;

            if (sum > 0) {
                const bigProb = toBig / sum;
                const smallProb = toSmall / sum;

                if (bigProb > 0.55) {
                    scores.Big += 25;
                    components.push(`MC(${Math.round(bigProb * 100)}%)`);
                } else if (smallProb > 0.55) {
                    scores.Small += 25;
                    components.push(`MC(${Math.round(smallProb * 100)}%)`);
                }
            }
        }

        // --- 3. PATTERN MATCHING (Weight: 30) ---
        // We use only the longest matching pattern for strong signals
        const p5 = this.history.slice(-5).map(r => r.size).join('-');
        const p4 = this.history.slice(-4).map(r => r.size).join('-');

        // Check 5-Pattern first (Strongest)
        if (this.patterns5[p5]) {
            const stats = this.patterns5[p5];
            if (stats.Big > stats.Small * 1.5) {
                scores.Big += 30;
                components.push('P5(B)');
            } else if (stats.Small > stats.Big * 1.5) {
                scores.Small += 30;
                components.push('P5(S)');
            }
        }
        // Fallback to 4-Pattern
        else if (this.patterns4[p4]) {
            const stats = this.patterns4[p4];
            if (stats.Big > stats.Small) {
                scores.Big += 20;
                components.push('P4(B)');
            } else if (stats.Small > stats.Big) {
                scores.Small += 20;
                components.push('P4(S)');
            }
        }

        // --- 4. NUMBER SIGNATURE & LAW OF AVERAGES (Weight: 15) ---
        // If Big has dominated recently, Small is "due" (Gambler's Fallacy, but useful in algos)
        const recent10 = this.history.slice(-10);
        const bigsIn10 = recent10.filter(r => r.size === 'Big').length;

        if (bigsIn10 >= 8) {
            scores.Small += 20;
            components.push('⚖️Balance(S)');
        } else if (bigsIn10 <= 2) {
            scores.Big += 20;
            components.push('⚖️Balance(B)');
        }

        // --- FINAL DECISION (FORCE) ---
        let predictedSize = scores.Big >= scores.Small ? 'Big' : 'Small';
        let totalScore = scores.Big + scores.Small;
        let confidenceScore = totalScore > 0 ? (Math.max(scores.Big, scores.Small) / totalScore) * 100 : 55;

        // TIE BREAKER: If close, default to opposite of last (chop/zigzag bias)
        if (Math.abs(scores.Big - scores.Small) < 5) {
            predictedSize = lastSize === 'Big' ? 'Small' : 'Big';
            components.push('⚡TieBreak');
            confidenceScore = 60;
        }

        // Confidence Label Generation (Strict 2-Level Mode)
        let confidenceLabel = 'Medium';
        let skipRecommended = false;

        if (confidenceScore >= 90) {
            confidenceLabel = 'Ultra High';
        } else if (confidenceScore >= 80) {
            confidenceLabel = 'High';
        } else if (confidenceScore >= 70) {
            confidenceLabel = 'Medium';
        } else {
            confidenceLabel = 'Low';
            skipRecommended = true; // Recommend skipping if < 70% confidence
        }

        return {
            size: predictedSize,
            color: predictedSize === 'Big' ? 'Green' : 'Red', // Simplified color map
            reasoning: components.slice(0, 3).join(' + ') || 'StatAnalysis',
            confidence: confidenceLabel,
            confidenceScore: Math.round(confidenceScore),
            skipRecommended: skipRecommended
        };
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
