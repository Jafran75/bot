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

        // --- DYNAMIC COMPONENT TRACKING ---
        // We track how well each "predictor" is performing in the last 20 rounds.
        // Format: { wins: 0, total: 0 }
        this.componentStats = {
            'Streak': { wins: 0, total: 0 },
            'Pattern': { wins: 0, total: 0 },
            'Markov': { wins: 0, total: 0 },
            'ZigZag': { wins: 0, total: 0 },
            'NumberStat': { wins: 0, total: 0 },
            'PRNG': { wins: 0, total: 0 }
        };

        // Rolling buffer to re-verify past predictions for component scoring
        this.pastPredictions = [];
    }

    getSize(number) { return number >= 5 ? 'Big' : 'Small'; }
    getColor(number) { return number % 2 === 0 ? 'Red' : 'Green'; }

    addResult(period, number, serverTime = Date.now()) {
        if (this.history.find(r => r.period === period)) return false;

        const size = this.getSize(number);
        const color = this.getColor(number);

        // --- COMPONENT ACCURACY UPDATE ---
        // Check which components got it right for THIS round
        this.updateComponentStats(period, size);

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

    // New: Feedback Loop for Components
    updateComponentStats(currentPeriod, actualSize) {
        // Find if we had predictions for this period
        const pastPred = this.pastPredictions.find(p => p.period === currentPeriod);
        if (pastPred) {
            const winningSide = actualSize;

            // If component voted for the winner, increment wins
            // pastPred.votes = { 'Streak': 'Big', 'Markov': 'Small', ... }
            if (pastPred.votes) {
                for (const [component, vote] of Object.entries(pastPred.votes)) {
                    if (vote === winningSide) {
                        this.componentStats[component].wins++;
                    }
                    this.componentStats[component].total++;
                }
            }

            // Cleanup old stats (decay)
            // Ideally we'd keep a rolling window, but simple decay/reset works for now.
            // If total > 50, scale down to keep it responsive
            for (const key in this.componentStats) {
                if (this.componentStats[key].total > 50) {
                    this.componentStats[key].wins = Math.round(this.componentStats[key].wins / 2);
                    this.componentStats[key].total = Math.round(this.componentStats[key].total / 2);
                }
            }
        }

        // clean up
        this.pastPredictions = this.pastPredictions.filter(p => BigInt(p.period) > BigInt(currentPeriod));
    }

    getComponentWeight(name, defaultWeight = 20) {
        const stat = this.componentStats[name];
        if (!stat || stat.total < 5) return defaultWeight;

        const accuracy = stat.wins / stat.total;

        // Multiplier: 
        // > 70% acc -> 1.5x
        // < 40% acc -> 0.5x
        let multiplier = 1.0;
        if (accuracy > 0.7) multiplier = 1.5;
        else if (accuracy > 0.8) multiplier = 2.0;
        else if (accuracy < 0.4) multiplier = 0.5;

        return defaultWeight * multiplier;
    }

    updatePattern(length, resultSize) {
        if (this.history.length >= length) {
            const patternKey = this.history.slice(-length).map(r => r.size).join('-');
            const db = this[`patterns${length}`];
            if (db) {
                if (!db[patternKey]) db[patternKey] = { Big: 0, Small: 0 };
                db[patternKey][resultSize]++;
            }
        }
    }

    // Helper: Detect Choppy Market (High Flip Rate)
    isChoppy() {
        if (this.history.length < 10) return false;
        const recent = this.history.slice(-15);
        let flips = 0;
        for (let i = 0; i < recent.length - 1; i++) {
            if (recent[i].size !== recent[i + 1].size) flips++;
        }
        // If > 55% flips, it's Choppy.
        return (flips / (recent.length - 1)) > 0.55;
    }

    // === PREDICTION LOGIC ===
    predictNext(currentLevel = 1) {
        // Need next period ID for tracking
        let nextPeriod = '0000';
        if (this.history.length > 0) {
            const lastP = this.history[this.history.length - 1].period;
            nextPeriod = (BigInt(lastP) + 1n).toString();
        }

        if (this.history.length < 6) {
            return {
                size: Math.random() > 0.5 ? 'Big' : 'Small',
                color: 'Red',
                reasoning: '🔄 Calibrating',
                confidence: 'Medium',
                confidenceScore: 60,
                skipRecommended: false
            };
        }

        const lastEntry = this.history[this.history.length - 1];
        const lastSize = lastEntry.size;

        // Votes collector for component tracking
        // Format: { 'Streak': 'Big', 'Markov': 'Small' ... }
        let componentVotes = {};

        // === VOTING SYSTEM ===
        let scores = { Big: 0, Small: 0 };
        let reasonings = [];

        const isChoppy = this.isChoppy();
        if (isChoppy) reasonings.push('📉Chop');

        // --- 1. STREAK HANDLING ---
        let streak = 0;
        for (let i = this.history.length - 1; i >= 0; i--) {
            if (this.history[i].size === lastSize) streak++;
            else break;
        }

        const wStreak = this.getComponentWeight('Streak', 30);

        if (streak >= 5) {
            // Dragon/Streak Follow
            scores[lastSize] += wStreak;
            reasonings.push(`🐉Streak(${streak})`);
            componentVotes['Streak'] = lastSize;
        } else if (streak === 1 && isChoppy) {
            // Chop Pivot: If chop is high, 1->Break is likely
            const inverse = lastSize === 'Big' ? 'Small' : 'Big';
            scores[inverse] += wStreak;
            reasonings.push(`✂️ChopPingPong`);
            componentVotes['Streak'] = inverse;
        } else if (streak >= 3 && !isChoppy) {
            // Stable streak 3+
            scores[lastSize] += wStreak * 0.8;
            componentVotes['Streak'] = lastSize;
            reasonings.push(`🔥Streak(${streak})`);
        }

        // --- 2. ZIGZAG / AABB PATTERNS ---
        const recent6 = this.history.slice(-6).map(r => r.size);
        const wZigZag = this.getComponentWeight('ZigZag', 25);

        // ZigZag (B S B S B -> S?)
        // Check last 4 for strict alternation
        // e.g. B S B S -> expect B
        if (recent6.length >= 4) {
            const p1 = recent6[recent6.length - 1];
            const p2 = recent6[recent6.length - 2];
            const p3 = recent6[recent6.length - 3];
            const p4 = recent6[recent6.length - 4];

            if (p1 !== p2 && p2 !== p3 && p3 !== p4) {
                // Perfect ZigZag of 4
                const expected = p1 === 'Big' ? 'Small' : 'Big';
                scores[expected] += wZigZag;
                reasonings.push(`⚡ZigZag4`);
                componentVotes['ZigZag'] = expected;
            }
        }

        // AABB (AA BB -> A?)
        // e.g. B B S S -> expect B
        if (recent6.length >= 4) {
            const p1 = recent6[recent6.length - 1];
            const p2 = recent6[recent6.length - 2];
            const p3 = recent6[recent6.length - 3];
            const p4 = recent6[recent6.length - 4];

            // Check S S B B
            if (p1 === p2 && p3 === p4 && p1 !== p3) {
                // Double switch detected
                // Predict continuation of pattern? Or break? 
                // Usually AABB continues to AA.
                // So if we have BB SS, next is likely B (start of BB)
                const expected = p1 === 'Big' ? 'Small' : 'Big';
                scores[expected] += wZigZag; // Reuse ZigZag weight or make new
                reasonings.push(`📦AABB`);
                componentVotes['ZigZag'] = expected;
            }
        }

        // --- 3. PATTERN MATCHING (Historical) ---
        const wPattern = this.getComponentWeight('Pattern', 30);
        const p5 = this.history.slice(-5).map(r => r.size).join('-');

        if (this.patterns5[p5]) {
            const stats = this.patterns5[p5];
            const total = stats.Big + stats.Small;
            if (total > 2) {
                if (stats.Big > stats.Small * 1.5) {
                    scores.Big += wPattern;
                    reasonings.push('P5(B)');
                    componentVotes['Pattern'] = 'Big';
                } else if (stats.Small > stats.Big * 1.5) {
                    scores.Small += wPattern;
                    reasonings.push('P5(S)');
                    componentVotes['Pattern'] = 'Small';
                }
            }
        }

        // --- 4. MARKOV CHAIN ---
        const wMarkov = this.getComponentWeight('Markov', 25);
        if (this.history.length > 20) {
            const fromLast = lastSize;
            const toBig = this.markov[`${fromLast}->Big`] || 0;
            const toSmall = this.markov[`${fromLast}->Small`] || 0;
            const sum = toBig + toSmall;

            if (sum > 5) {
                const bigProb = toBig / sum;
                if (bigProb > 0.60) {
                    scores.Big += wMarkov;
                    reasonings.push(`MC(${Math.round(bigProb * 100)}%)`);
                    componentVotes['Markov'] = 'Big';
                } else if (bigProb < 0.40) {
                    scores.Small += wMarkov;
                    reasonings.push(`MC(${Math.round((1 - bigProb) * 100)}%)`);
                    componentVotes['Markov'] = 'Small';
                }
            }
        }

        // --- 5. PRNG (Nerfed) ---
        // Only use if accuracy is insanely high
        const bestPrng = this.calibratePrng();
        if (bestPrng && bestPrng.score >= 8) { // 80%+ Match
            const wPRNG = this.getComponentWeight('PRNG', 15); // Lower base weight
            const prngPrediction = this.calculatePrng(bestPrng.formulaId, Number(nextPeriod), lastEntry.number, Date.now());

            if (prngPrediction) {
                scores[prngPrediction] += wPRNG;
                reasonings.push(`🔮PRNG-F${bestPrng.formulaId}`);
                componentVotes['PRNG'] = prngPrediction;
            }
        }

        // --- FINAL DECISION ---
        let predictedSize = scores.Big >= scores.Small ? 'Big' : 'Small';
        let totalScore = scores.Big + scores.Small;
        let finalConfidence = totalScore > 0 ? (Math.max(scores.Big, scores.Small) / totalScore) * 100 : 50;

        // TIE BREAKER: If close, default to tie break logic
        if (Math.abs(scores.Big - scores.Small) < 5) {
            // Default to opposite of last if tied
            predictedSize = lastSize === 'Big' ? 'Small' : 'Big';
            reasonings.push('⚡TieBreak');
        }

        // Register the votes for future verification
        this.pastPredictions.push({
            period: nextPeriod,
            votes: componentVotes
        });

        // --- SAFETY CHECKS ---
        let skipRecommended = false;

        // 1. Confusion: Score is close
        if (Math.abs(scores.Big - scores.Small) < 15) {
            skipRecommended = true;
            reasonings.push('⚠️CloseCall');
            finalConfidence = 55;
        }

        // Adjust confidence label
        let confidenceLabel = 'Medium';
        if (finalConfidence >= 85) confidenceLabel = 'Ultra High';
        else if (finalConfidence >= 75) confidenceLabel = 'High';
        else if (finalConfidence < 60) {
            confidenceLabel = 'Low';
            skipRecommended = true;
        }

        return {
            size: predictedSize,
            color: predictedSize === 'Big' ? 'Green' : 'Red',
            reasoning: reasonings.slice(0, 3).join(' + ') || 'StatAnalysis',
            confidence: confidenceLabel,
            confidenceScore: Math.round(finalConfidence),
            skipRecommended: skipRecommended
        };
    }

    // --- PRNG ENGINE ---
    calculatePrng(formulaId, period, lastNum, time) {
        let seed = 0;
        const pLastdigit = period % 100;
        if (formulaId === 1) seed = (pLastdigit + lastNum) % 10;
        if (formulaId === 2) seed = (pLastdigit * (lastNum + 1)) % 10;
        if (formulaId === 3) {
            const seconds = Math.floor((time / 1000) % 60);
            seed = (seconds + lastNum) % 10;
        }
        return seed >= 5 ? 'Big' : 'Small';
    }

    calibratePrng() {
        if (this.history.length < 10) return null;
        const results = { 1: 0, 2: 0, 3: 0 };
        const testSet = this.history.slice(-10);
        for (let i = 1; i < testSet.length; i++) {
            const current = testSet[i];
            const prev = testSet[i - 1];
            const period = Number(current.period);
            const approxTime = prev.serverTime + 30000;

            const pred1 = this.calculatePrng(1, period, prev.number, approxTime);
            if (pred1 === current.size) results[1]++;

            const pred2 = this.calculatePrng(2, period, prev.number, approxTime);
            if (pred2 === current.size) results[2]++;

            // For formula 3 (Time), we can't easily backtest without exact previous timestamps
            // But we can try using the stored 'serverTime' if available
            // In the loop, 'prev' has a serverTime.
            const pred3 = this.calculatePrng(3, period, prev.number, approxTime);
            if (pred3 === current.size) results[3]++;
        }
        let bestId = null;
        let maxScore = 0;
        for (let id = 1; id <= 3; id++) {
            if (results[id] >= 7 && results[id] > maxScore) {
                maxScore = results[id];
                bestId = id;
            }
        }
        if (bestId) return { formulaId: bestId, score: maxScore };
        return null;
    }

    getHistory() { return this.history; }
    clearHistory() {
        this.history = [];
        this.patterns3 = {};
        this.patterns4 = {};
        this.patterns5 = {};
        this.patterns6 = {};
        this.patterns7 = {};
        this.pastPredictions = [];
        for (let i = 0; i <= 9; i++) this.numberStats[i] = { Big: 0, Small: 0 };
        this.markov = { 'Big->Big': 0, 'Big->Small': 0, 'Small->Big': 0, 'Small->Small': 0 };
        this.componentStats = {
            'Streak': { wins: 0, total: 0 },
            'Pattern': { wins: 0, total: 0 },
            'Markov': { wins: 0, total: 0 },
            'ZigZag': { wins: 0, total: 0 },
            'NumberStat': { wins: 0, total: 0 },
            'PRNG': { wins: 0, total: 0 }
        };
    }
}

module.exports = WingoPredictor;
