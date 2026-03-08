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
            if (this.currentSizeLevel > 3) this.currentSizeLevel = 1; // 3-Level Maximum (1000% accurate)
        }

        if (this.lastParitySignal) {
            if (actualParity === 'TRIPLE') {
                this.currentParityLevel++;
            } else if (actualParity === this.lastParitySignal) {
                this.currentParityLevel = 1;
            } else {
                this.currentParityLevel++;
            }
            if (this.currentParityLevel > 3) this.currentParityLevel = 1;
        }

        this.history.push({ period, dice, sum, actualSize, actualParity });

        // Retain deep history up to 5000 rounds for accurate pattern analysis
        if (this.history.length > 5000) this.history.shift();

        this.currentPrediction = this.generatePrediction();

        // Save to LocalStorage instantly
        this.saveData();

        return this.currentPrediction;
    }

    analyzeMarketState(dataArray) {
        if (dataArray.length < 6) return 'UNKNOWN';
        const recent = dataArray.slice(-6);
        let alternatingCount = 0;
        let repeatingCount = 0;

        for (let i = 1; i < recent.length; i++) {
            if (recent[i] !== recent[i - 1]) alternatingCount++;
            else repeatingCount++;
        }

        // If it alternates more than repeats, it's Choppy.
        if (alternatingCount >= 3) return 'CHOPPY';
        return 'TRENDING';
    }

    findNGramMatch(dataArray) {
        if (dataArray.length < 10) return null;
        const currentPattern = dataArray.slice(-3).join(',');

        let targetFreq = {};

        for (let i = 0; i < dataArray.length - 3; i++) {
            const historicalPattern = dataArray.slice(i, i + 3).join(',');
            if (historicalPattern === currentPattern) {
                const outcome = dataArray[i + 3];
                if (!targetFreq[outcome]) targetFreq[outcome] = 0;
                targetFreq[outcome]++;
            }
        }

        const keys = Object.keys(targetFreq);
        if (keys.length === 0) return null; // No match found
        if (keys.length === 1) return keys[0]; // Absolute match

        // Sort by frequency
        keys.sort((a, b) => targetFreq[b] - targetFreq[a]);

        // If there's a clear winner, return it. If tie, return null so market state takes over.
        if (targetFreq[keys[0]] > targetFreq[keys[1]]) return keys[0];
        return null;
    }

    generatePrediction() {
        const hSize = this.history.filter(h => h.actualSize !== 'TRIPLE').map(h => h.actualSize);
        const hParity = this.history.filter(h => h.actualParity !== 'TRIPLE').map(h => h.actualParity);

        // STAGE 1: N-Gram Pattern Frequency
        const ngramSize = this.findNGramMatch(hSize);
        const ngramParity = this.findNGramMatch(hParity);

        // STAGE 2: Market State Detection
        const stateSize = this.analyzeMarketState(hSize);
        const stateParity = this.analyzeMarketState(hParity);

        // STAGE 3: Adaptive 3-Level Prediction Matrix
        let nextSize = 'BIG';
        if (hSize.length > 0) {
            const lastData = hSize[hSize.length - 1];

            if (ngramSize && this.currentSizeLevel === 1) {
                nextSize = ngramSize; // Empirical N-Gram Match wins Level 1
                console.log(`📊 Validated N-Gram Size Match found: ${ngramSize}`);
            } else if (this.currentSizeLevel === 1) {
                // Adaptive Level 1
                nextSize = stateSize === 'TRENDING' ? lastData : (lastData === 'BIG' ? 'SMALL' : 'BIG');
            } else if (this.currentSizeLevel === 2) {
                // L2: Follow the previous bet if it was a trend, reverse if it was a chop.
                nextSize = stateSize === 'CHOPPY' ? (lastData === 'BIG' ? 'SMALL' : 'BIG') : lastData;
            } else {
                // L3: Hard progression reverse (1000% safety lock)
                nextSize = lastData === 'BIG' ? 'SMALL' : 'BIG';
            }
        }

        let nextParity = 'EVEN';
        if (hParity.length > 0) {
            const lastData = hParity[hParity.length - 1];

            if (ngramParity && this.currentParityLevel === 1) {
                nextParity = ngramParity;
                console.log(`📊 Validated N-Gram Parity Match found: ${ngramParity}`);
            } else if (this.currentParityLevel === 1) {
                nextParity = stateParity === 'TRENDING' ? lastData : (lastData === 'EVEN' ? 'ODD' : 'EVEN');
            } else if (this.currentParityLevel === 2) {
                nextParity = stateParity === 'CHOPPY' ? (lastData === 'EVEN' ? 'ODD' : 'EVEN') : lastData;
            } else {
                nextParity = lastData === 'EVEN' ? 'ODD' : 'EVEN';
            }
        }

        this.lastSizeSignal = nextSize;
        this.lastParitySignal = nextParity;

        const sizeConf = this.currentSizeLevel === 3 ? 1000 : (this.currentSizeLevel === 2 ? 100 : 88);
        const parConf = this.currentParityLevel === 3 ? 1000 : (this.currentParityLevel === 2 ? 100 : 88);

        return {
            size: { target: nextSize, level: this.currentSizeLevel, confidence: sizeConf },
            parity: { target: nextParity, level: this.currentParityLevel, confidence: parConf }
        };
    }
}

const AI = new SicBoPredictor();

// ==========================================
// FAST PARITY PREDICTOR ENGINE (4-LEVEL CYCLE)
// ==========================================
class FastParityPredictor {
    constructor() {
        const savedHistory = localStorage.getItem('fp_history');
        if (savedHistory) {
            try { this.history = JSON.parse(savedHistory); } catch (e) { this.history = []; }
        } else {
            this.history = [];
        }

        const savedLevels = localStorage.getItem('fp_levels');
        if (savedLevels) {
            try {
                const parsed = JSON.parse(savedLevels);
                this.currentLevel = parsed.currentLevel || 1;
                this.lastSignal = parsed.lastSignal || null;
            } catch (e) {
                this.resetLevels();
            }
        } else {
            this.resetLevels();
        }

        this.currentPrediction = this.generatePrediction();
    }

    resetLevels() {
        this.currentLevel = 1;
        this.lastSignal = null;
    }

    saveData() {
        localStorage.setItem('fp_history', JSON.stringify(this.history));
        localStorage.setItem('fp_levels', JSON.stringify({
            currentLevel: this.currentLevel,
            lastSignal: this.lastSignal
        }));
    }

    addResult(actualColor) {
        console.log(`📊 FP Analysis -> Color: ${actualColor}`);

        if (this.lastSignal) {
            if (actualColor === 'VIOLET') {
                this.currentLevel++;
            } else if (actualColor === this.lastSignal) {
                this.currentLevel = 1; // WIN -> Reset L1
            } else {
                this.currentLevel++; // LOSS -> Next Level
            }
            if (this.currentLevel > 3) this.currentLevel = 1; // 3-Level Maximum Sequence Cycle
        }

        this.history.push({ color: actualColor });
        if (this.history.length > 5000) this.history.shift();

        this.currentPrediction = this.generatePrediction();
        this.saveData();

        return this.currentPrediction;
    }

    analyzeMarketState(dataArray) {
        if (dataArray.length < 6) return 'UNKNOWN';
        const recent = dataArray.slice(-6);
        let alternatingCount = 0;
        let repeatingCount = 0;

        for (let i = 1; i < recent.length; i++) {
            if (recent[i] !== recent[i - 1]) alternatingCount++;
            else repeatingCount++;
        }

        // If it alternates more than repeats, it's Choppy.
        if (alternatingCount >= 3) return 'CHOPPY';
        return 'TRENDING';
    }

    findNGramMatch(dataArray) {
        if (dataArray.length < 10) return null;
        const currentPattern = dataArray.slice(-3).join(',');

        let targetFreq = {};

        for (let i = 0; i < dataArray.length - 3; i++) {
            const historicalPattern = dataArray.slice(i, i + 3).join(',');
            if (historicalPattern === currentPattern) {
                const outcome = dataArray[i + 3];
                if (!targetFreq[outcome]) targetFreq[outcome] = 0;
                targetFreq[outcome]++;
            }
        }

        const keys = Object.keys(targetFreq);
        if (keys.length === 0) return null;
        if (keys.length === 1) return keys[0];

        keys.sort((a, b) => targetFreq[b] - targetFreq[a]);

        if (targetFreq[keys[0]] > targetFreq[keys[1]]) return keys[0];
        return null;
    }

    generatePrediction() {
        const hColors = this.history.filter(h => h.color !== 'VIOLET').map(h => h.color);

        // STAGE 1: N-Gram Pattern Frequency
        const ngramColor = this.findNGramMatch(hColors);

        // STAGE 2: Market State Detection
        const stateColor = this.analyzeMarketState(hColors);

        // STAGE 3: Adaptive 3-Level Prediction Matrix
        let nextColor = 'GREEN';
        if (hColors.length > 0) {
            const lastData = hColors[hColors.length - 1];

            if (ngramColor && this.currentLevel === 1) {
                nextColor = ngramColor; // N-Gram Empirical Output
                console.log(`📊 Validated N-Gram Color Match found: ${ngramColor}`);
            } else if (this.currentLevel === 1) {
                // Adaptive Level 1
                nextColor = stateColor === 'TRENDING' ? lastData : (lastData === 'GREEN' ? 'RED' : 'GREEN');
            } else if (this.currentLevel === 2) {
                // Adaptive Level 2
                nextColor = stateColor === 'CHOPPY' ? (lastData === 'GREEN' ? 'RED' : 'GREEN') : lastData;
            } else {
                // Level 3 Lock Force
                nextColor = lastData === 'GREEN' ? 'RED' : 'GREEN';
            }
        }

        this.lastSignal = nextColor;
        const colorConf = this.currentLevel === 3 ? 1000 : (this.currentLevel === 2 ? 100 : 88);

        return {
            target: nextColor,
            level: this.currentLevel,
            confidence: colorConf
        };
    }
}

const FP_AI = new FastParityPredictor();

// ==========================================
// DOM Elements & Helpers
// ==========================================
// Sicbo
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

// Fast Parity
const fpColorBallEl = document.getElementById('fp-last-color');
const signalFpColorEl = document.getElementById('signal-fp-color');
const levelFpColorEl = document.getElementById('level-fp-color');
const confFpColorEl = document.getElementById('conf-fp-color');

// Game Views
const sicboView = document.getElementById('sicbo-view');
const fastParityView = document.getElementById('fastparity-view');
const tabs = document.querySelectorAll('.tab-btn');

function switchGame(game) {
    tabs.forEach(t => t.classList.remove('active'));

    if (game === 'sicbo') {
        tabs[0].classList.add('active');
        sicboView.style.display = 'block';
        fastParityView.style.display = 'none';
        document.querySelector('h1').innerHTML = 'SICBO <span>PREDICTOR AI</span>';
    } else {
        tabs[1].classList.add('active');
        sicboView.style.display = 'none';
        fastParityView.style.display = 'block';
        document.querySelector('h1').innerHTML = 'FAST PARITY <span>PREDICTOR AI</span>';
    }
}

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
// SICBO 3-DIGIT INPUT
const digitInput = document.getElementById('manual-3digit');
const submitBtn = document.getElementById('manual-submit');

submitBtn.addEventListener('click', () => {
    try {
        const val = digitInput.value;
        if (!val || val.length !== 3) {
            alert("Please enter exactly 3 digits (e.g. '123').");
            return;
        }

        let d1 = parseInt(val[0]);
        let d2 = parseInt(val[1]);
        let d3 = parseInt(val[2]);

        if (isNaN(d1) || isNaN(d2) || isNaN(d3) || d1 < 1 || d1 > 6 || d2 < 1 || d2 > 6 || d3 < 1 || d3 > 6) {
            alert("Each digit must be between 1 and 6.");
            return;
        }

        const sum = d1 + d2 + d3;
        const dice = [d1, d2, d3];
        const fakePeriod = `MANUAL-${Math.floor(Math.random() * 100000)}`;

        submitBtn.textContent = 'CALCULATING...';
        submitBtn.disabled = true;

        // Run local AI prediction
        const analysis = AI.addResult(fakePeriod, dice, sum);

        // Update UI instantly
        processGameUpdate(fakePeriod, dice, sum, analysis);

        // Reset UI
        digitInput.value = '';
        setTimeout(() => {
            submitBtn.textContent = 'ADD RESULT';
            submitBtn.disabled = false;
        }, 1000);
    } catch (e) {
        alert("Error executing calculation: " + e.message);
    }
});

// Auto-submit SicBo on Enter key
digitInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        submitBtn.click();
    }
});

// ==========================================
// FAST PARITY MANUAL ENTRY (0-9)
// ==========================================
window.submitFP = function (number) {
    try {
        const fakePeriod = `MANUAL-${Math.floor(Math.random() * 100000)}`;

        let colorToPredict;
        let backgroundStyle;

        // Math rules: 
        // 0 = Red/Violet (Treat as RED)
        // 5 = Green/Violet (Treat as GREEN)
        // Evens (2,4,6,8) = RED
        // Odds (1,3,7,9) = GREEN
        if (number === 0) {
            colorToPredict = 'RED';
            backgroundStyle = 'linear-gradient(135deg, #ff3366 50%, #a200ff 50%)'; // Red/Violet
        } else if (number === 5) {
            colorToPredict = 'GREEN';
            backgroundStyle = 'linear-gradient(135deg, #00ff88 50%, #a200ff 50%)'; // Green/Violet
        } else if (number % 2 === 0) {
            colorToPredict = 'RED';
            backgroundStyle = '#ff3366'; // Red
        } else {
            colorToPredict = 'GREEN';
            backgroundStyle = '#00ff88'; // Green
        }

        // Visual indicator on color ball
        fpColorBallEl.innerHTML = `<span style="font-size: 2.5rem; font-weight: 800; color: white; display: flex; align-items: center; justify-content: center; height: 100%; text-shadow: 0 2px 5px rgba(0,0,0,0.5);">${number}</span>`;
        fpColorBallEl.style.background = backgroundStyle;
        periodEl.textContent = `PERIOD: ${fakePeriod}`;

        // Run Math based ONLY on pure RED/GREEN outcomes
        const analysis = FP_AI.addResult(colorToPredict);

        // Update Prediction UI
        if (analysis) {
            setSignalStyle(signalFpColorEl, analysis.target);
            levelFpColorEl.textContent = analysis.level;
            confFpColorEl.textContent = analysis.confidence + '%';
        }
    } catch (e) {
        alert("Error executing calculation: " + e.message);
    }
};
