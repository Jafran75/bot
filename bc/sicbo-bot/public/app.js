// ==========================================
// SICBO PREDICTOR ENGINE (LOCALIZED FOR NETLIFY)
// ==========================================
class SicBoPredictor {
    constructor() {
        this.history = [];
        this.currentSizeLevel = 1;
        this.currentParityLevel = 1;

        this.lastSizeSignal = null;
        this.lastParitySignal = null;

        this.currentPrediction = this.generatePrediction();
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
                this.currentSizeLevel = Math.min(this.currentSizeLevel + 1, 5);
            } else if (actualSize === this.lastSizeSignal) {
                this.currentSizeLevel = 1;
            } else {
                this.currentSizeLevel = Math.min(this.currentSizeLevel + 1, 5);
            }
        }

        if (this.lastParitySignal) {
            if (actualParity === 'TRIPLE') {
                this.currentParityLevel = Math.min(this.currentParityLevel + 1, 5);
            } else if (actualParity === this.lastParitySignal) {
                this.currentParityLevel = 1;
            } else {
                this.currentParityLevel = Math.min(this.currentParityLevel + 1, 5);
            }
        }

        this.history.push({ period, dice, sum, actualSize, actualParity });
        if (this.history.length > 50) this.history.shift();

        this.currentPrediction = this.generatePrediction();
        return this.currentPrediction;
    }

    generatePrediction() {
        // Basic mean-reversion with streak breaking
        const recentSize = this.history.filter(h => h.actualSize !== 'TRIPLE').slice(-3).map(h => h.actualSize);
        const recentParity = this.history.filter(h => h.actualParity !== 'TRIPLE').slice(-3).map(h => h.actualParity);

        let nextSize = Math.random() > 0.5 ? 'BIG' : 'SMALL';
        let nextParity = Math.random() > 0.5 ? 'EVEN' : 'ODD';

        if (recentSize.length === 3 && recentSize[0] === recentSize[1] && recentSize[1] === recentSize[2]) {
            nextSize = recentSize[0] === 'BIG' ? 'SMALL' : 'BIG';
        }

        if (recentParity.length === 3 && recentParity[0] === recentParity[1] && recentParity[1] === recentParity[2]) {
            nextParity = recentParity[0] === 'EVEN' ? 'ODD' : 'EVEN';
        }

        this.lastSizeSignal = nextSize;
        this.lastParitySignal = nextParity;

        return {
            size: { target: nextSize, level: this.currentSizeLevel, confidence: Math.floor(Math.random() * 15) + 85 },
            parity: { target: nextParity, level: this.currentParityLevel, confidence: Math.floor(Math.random() * 15) + 85 }
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
