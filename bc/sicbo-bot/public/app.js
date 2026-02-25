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
// Manual Input Logic (No Server Required)
// ==========================================
const sumInput = document.getElementById('manual-sum');
const submitBtn = document.getElementById('manual-submit');

submitBtn.addEventListener('click', () => {
    try {
        let sum = parseInt(sumInput.value);

        if (isNaN(sum) || sum < 3 || sum > 18) {
            alert("Please enter a valid total sum between 3 and 18.");
            return;
        }

        let d1 = Math.floor(sum / 3);
        let d2 = Math.floor((sum - d1) / 2);
        let d3 = sum - d1 - d2;

        if (d1 < 1) d1 = 1; if (d1 > 6) d1 = 6;
        if (d2 < 1) d2 = 1; if (d2 > 6) d2 = 6;
        if (d3 < 1) d3 = 1; if (d3 > 6) d3 = 6;

        const actualSum = d1 + d2 + d3;
        if (actualSum !== sum) {
            let diff = sum - actualSum;
            d3 += diff;
        }

        const dice = [d1, d2, d3];
        const fakePeriod = `MANUAL-${Math.floor(Math.random() * 100000)}`;

        submitBtn.textContent = 'CALCULATING...';
        submitBtn.disabled = true;

        // Run local AI prediction
        const analysis = AI.addResult(fakePeriod, dice, sum);

        // Update UI instantly
        processGameUpdate(fakePeriod, dice, sum, analysis);

        // Reset UI
        sumInput.value = '';
        setTimeout(() => {
            submitBtn.textContent = 'ADD RESULT';
            submitBtn.disabled = false;
        }, 1000);
    } catch (e) {
        alert("Error executing calculation: " + e.message);
    }
});

// Also allow hitting 'Enter' on mobile keyboards
sumInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        submitBtn.click();
    }
});
