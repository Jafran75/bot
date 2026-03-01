// ==========================================
// SICBO PREDICTOR ENGINE (LOCALIZED FOR NETLIFY)
// ==========================================
class SicBoPredictor {
    constructor() {
        // Load persistent deep history
        const savedHistory = localStorage.getItem('sicbo_history');
        if (savedHistory) {
            try { this.history = JSON.parse(savedHistory); } catch (e) { this.history = []; }
        } else {
            this.history = [];
        }

        const savedLevels = localStorage.getItem('sicbo_levels');
        if (savedLevels) {
            try {
                const parsed = JSON.parse(savedLevels);
                this.currentSizeLevel = parsed.currentSizeLevel || 1;
                this.currentParityLevel = parsed.currentParityLevel || 1;
                this.lastSizeSignal = parsed.lastSizeSignal || null;
                this.lastParitySignal = parsed.lastParitySignal || null;
            } catch (e) {
                this.resetLevels();
            }
        } else {
            this.resetLevels();
        }

        this.currentPrediction = this.generatePrediction();
    }

    resetLevels() {
        this.currentSizeLevel = 1;
        this.currentParityLevel = 1;
        this.lastSizeSignal = null;
        this.lastParitySignal = null;
    }

    saveData() {
        localStorage.setItem('sicbo_history', JSON.stringify(this.history));
        localStorage.setItem('sicbo_levels', JSON.stringify({
            currentSizeLevel: this.currentSizeLevel,
            currentParityLevel: this.currentParityLevel,
            lastSizeSignal: this.lastSizeSignal,
            lastParitySignal: this.lastParitySignal
        }));
    }

    addResult(period, dice, sum) {
        const isTriple = (dice[0] === dice[1] && dice[1] === dice[2]);

        let actualSize = 'TRIPLE';
        if (!isTriple) {
            if (sum >= 4 && sum <= 10) actualSize = 'SMALL';
            else if (sum >= 11 && sum <= 17) actualSize = 'BIG';
        }

        let actualParity = 'TRIPLE';
        if (!isTriple) {
            actualParity = (sum % 2 === 0) ? 'EVEN' : 'ODD';
        }

        console.log(`📊 Analysis -> Size: ${actualSize}, Parity: ${actualParity}, IsTriple: ${isTriple}`);

        if (this.lastSizeSignal) {
            if (actualSize === 'TRIPLE') {
                this.currentSizeLevel++;
            } else if (actualSize === this.lastSizeSignal) {
                this.currentSizeLevel = 1; // WIN -> Reset L1
            } else {
                this.currentSizeLevel++; // LOSS -> Next Level
            }
            if (this.currentSizeLevel > 4) this.currentSizeLevel = 1; // 4-Level Maximum
        }

        if (this.lastParitySignal) {
            if (actualParity === 'TRIPLE') {
                this.currentParityLevel++;
            } else if (actualParity === this.lastParitySignal) {
                this.currentParityLevel = 1;
            } else {
                this.currentParityLevel++;
            }
            if (this.currentParityLevel > 4) this.currentParityLevel = 1;
        }

        this.history.push({ period, dice, sum, actualSize, actualParity });

        // Retain deep history up to 5000 rounds for accurate pattern analysis
        if (this.history.length > 5000) this.history.shift();

        this.currentPrediction = this.generatePrediction();

        // Save to LocalStorage instantly
        this.saveData();

        return this.currentPrediction;
    }

    findDeepPattern(historyArray, type) {
        if (historyArray.length < 2) return null;

        const data = historyArray.map(h => h[type]);

        // Search deep history for the longest repeating sequence pattern (up to 12 long)
        const maxPatternLength = Math.min(12, data.length - 1);

        for (let patLen = maxPatternLength; patLen >= 1; patLen--) {
            const currentPattern = data.slice(-patLen).join(',');

            let counts = { BIG: 0, SMALL: 0, EVEN: 0, ODD: 0 };
            let matchFound = false;

            // Search backwards through deep history finding intersections
            for (let i = 0; i < data.length - patLen; i++) {
                const pastPattern = data.slice(i, i + patLen).join(',');
                if (pastPattern === currentPattern) {
                    const nextOutcome = data[i + patLen];
                    if (nextOutcome !== 'TRIPLE') {
                        matchFound = true;
                        counts[nextOutcome]++;
                    }
                }
            }

            if (matchFound) {
                if (type === 'actualSize') {
                    if (counts.BIG > counts.SMALL) return 'BIG';
                    if (counts.SMALL > counts.BIG) return 'SMALL';
                } else if (type === 'actualParity') {
                    if (counts.EVEN > counts.ODD) return 'EVEN';
                    if (counts.ODD > counts.EVEN) return 'ODD';
                }
            }
        }
        return null;
    }

    generatePrediction() {
        const hSize = this.history.filter(h => h.actualSize !== 'TRIPLE');
        const hParity = this.history.filter(h => h.actualParity !== 'TRIPLE');

        // Deep Analytical Pattern Match Search First
        let nextSize = this.findDeepPattern(hSize, 'actualSize');
        let nextParity = this.findDeepPattern(hParity, 'actualParity');

        // Fallback to 4-Level Reversal Strategy if Deep Analysis is inconclusive or tied
        if (!nextSize) {
            const lastData = hSize.length > 0 ? hSize[hSize.length - 1].actualSize : 'BIG';
            if (this.currentSizeLevel === 1) nextSize = lastData === 'BIG' ? 'SMALL' : 'BIG';
            else if (this.currentSizeLevel === 2) nextSize = lastData;
            else if (this.currentSizeLevel === 3) nextSize = lastData === 'BIG' ? 'SMALL' : 'BIG';
            else nextSize = lastData;
        }

        if (!nextParity) {
            const lastData = hParity.length > 0 ? hParity[hParity.length - 1].actualParity : 'EVEN';
            if (this.currentParityLevel === 1) nextParity = lastData === 'EVEN' ? 'ODD' : 'EVEN';
            else if (this.currentParityLevel === 2) nextParity = lastData;
            else if (this.currentParityLevel === 3) nextParity = lastData === 'EVEN' ? 'ODD' : 'EVEN';
            else nextParity = lastData;
        }

        this.lastSizeSignal = nextSize;
        this.lastParitySignal = nextParity;

        const sizeConf = this.currentSizeLevel === 4 ? 100 : (this.currentSizeLevel === 3 ? 99 : (this.currentSizeLevel === 2 ? 88 : 75));
        const parConf = this.currentParityLevel === 4 ? 100 : (this.currentParityLevel === 3 ? 99 : (this.currentParityLevel === 2 ? 88 : 75));

        return {
            size: { target: nextSize, level: this.currentSizeLevel, confidence: sizeConf },
            parity: { target: nextParity, level: this.currentParityLevel, confidence: parConf }
        };
    }
}

const AI = new SicBoPredictor();

// ==========================================
// DOM Elements & Helpers
// ==========================================
const periodEl = document.querySelector('.period-id');
const dice1El = document.getElementById('dice-1');
const dice2El = document.getElementById('dice-2');
const dice3El = document.getElementById('dice-3');
const diceSumEl = document.getElementById('dice-sum');

const signalSizeEl = document.getElementById('signal-size');
const levelSizeEl = document.getElementById('level-size');
const confSizeEl = document.getElementById('conf-size');

const signalParityEl = document.getElementById('signal-parity');
const levelParityEl = document.getElementById('level-parity');
const confParityEl = document.getElementById('conf-parity');

function setSignalStyle(element, signal) {
    element.textContent = signal;
    element.className = 'signal-value'; // Reset
    element.classList.add(`signal-${signal}`);
}

function processGameUpdate(period, dice, sum, prediction) {
    periodEl.textContent = `PERIOD: ${period}`;

    [dice1El, dice2El, dice3El].forEach(el => el.classList.add('rolling'));

    setTimeout(() => {
        dice1El.classList.remove('rolling');
        dice1El.textContent = dice[0];
        setTimeout(() => {
            dice2El.classList.remove('rolling');
            dice2El.textContent = dice[1];
            setTimeout(() => {
                dice3El.classList.remove('rolling');
                dice3El.textContent = dice[2];
                diceSumEl.textContent = sum;

                if (prediction) {
                    setSignalStyle(signalSizeEl, prediction.size.target);
                    levelSizeEl.textContent = prediction.size.level;
                    confSizeEl.textContent = prediction.size.confidence + '%';

                    setSignalStyle(signalParityEl, prediction.parity.target);
                    levelParityEl.textContent = prediction.parity.level;
                    confParityEl.textContent = prediction.parity.confidence + '%';
                }
            }, 300);
        }, 300);
    }, 400);
}

// ==========================================
// Fast Entry Logic (No Server Required)
// ==========================================
window.submitFastEntry = function (sizeLabel, parityLabel) {
    try {
        let fakeSum = 10; // Default fallback fallback
        let fakeDice = [3, 3, 4];

        // Generate a mathematically valid sum & dice combination to satisfy the UI animation
        if (sizeLabel === 'TRIPLE') {
            const t = Math.floor(Math.random() * 6) + 1;
            fakeSum = t * 3;
            fakeDice = [t, t, t];
        } else {
            let found = false;
            while (!found) {
                let d1 = Math.floor(Math.random() * 6) + 1;
                let d2 = Math.floor(Math.random() * 6) + 1;
                let d3 = Math.floor(Math.random() * 6) + 1;

                // Prevent accidental triples
                if (d1 === d2 && d2 === d3) continue;

                let s = d1 + d2 + d3;
                let sSize = (s >= 4 && s <= 10) ? 'SMALL' : ((s >= 11 && s <= 17) ? 'BIG' : 'TRIPLE');
                let sParity = (s % 2 === 0) ? 'EVEN' : 'ODD';

                if (sSize === sizeLabel && sParity === parityLabel) {
                    fakeSum = s;
                    fakeDice = [d1, d2, d3];
                    found = true;
                }
            }
        }

        const fakePeriod = `MANUAL-${Math.floor(Math.random() * 100000)}`;

        // We visually disable the container during processing to prevent double-taps
        const grid = document.querySelector('.fast-entry-grid');
        if (grid) grid.style.pointerEvents = 'none';
        if (grid) grid.style.opacity = '0.5';

        // Run local AI prediction natively (the math engine handles Triples/Size/Parity parsing itself based on Sum & Dice)
        const analysis = AI.addResult(fakePeriod, fakeDice, fakeSum);

        // Update UI instantly
        processGameUpdate(fakePeriod, fakeDice, fakeSum, analysis);

        // Re-enable UI
        setTimeout(() => {
            if (grid) grid.style.pointerEvents = 'auto';
            if (grid) grid.style.opacity = '1';
        }, 1000);

    } catch (e) {
        alert("Error executing calculation: " + e.message);
    }
};
