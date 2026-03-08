// ==========================================
// SICBO PREDICTOR ENGINE (LOCALIZED FOR NETLIFY)
// ==========================================
class SicBoPredictor {
    constructor() {
        const savedHistory = localStorage.getItem('sicbo_history');
        if (savedHistory) {
            try {
                this.history = JSON.parse(savedHistory);
            } catch (error) {
                this.history = [];
            }
        } else {
            this.history = [];
        }

        const savedLevels = localStorage.getItem('sicbo_levels');
        if (savedLevels) {
            try {
                const parsed = JSON.parse(savedLevels);
                this.currentSizeLevel = Math.min(parsed.currentSizeLevel || 1, 3);
                this.currentParityLevel = Math.min(parsed.currentParityLevel || 1, 3);
                this.lastSizeSignal = parsed.lastSizeSignal || null;
                this.lastParitySignal = parsed.lastParitySignal || null;
                this.engineScoresSize = parsed.engineScoresSize || { lln: 0, wma: 0, ngram: 0, markov: 0 };
                this.engineScoresParity = parsed.engineScoresParity || { lln: 0, wma: 0, ngram: 0, markov: 0 };
                this.predictionCacheSize = parsed.predictionCacheSize || null;
                this.predictionCacheParity = parsed.predictionCacheParity || null;
            } catch (error) {
                this.resetLevels();
            }
        } else {
            this.resetLevels();
        }

        this.currentPrediction = this.generatePrediction({ commit: false });
    }

    resetLevels() {
        this.currentSizeLevel = 1;
        this.currentParityLevel = 1;
        this.lastSizeSignal = null;
        this.lastParitySignal = null;
        this.engineScoresSize = { lln: 0, wma: 0, ngram: 0, markov: 0 };
        this.engineScoresParity = { lln: 0, wma: 0, ngram: 0, markov: 0 };
        this.predictionCacheSize = null;
        this.predictionCacheParity = null;
    }

    saveData() {
        localStorage.setItem('sicbo_history', JSON.stringify(this.history));
        localStorage.setItem('sicbo_levels', JSON.stringify({
            currentSizeLevel: this.currentSizeLevel,
            currentParityLevel: this.currentParityLevel,
            lastSizeSignal: this.lastSizeSignal,
            lastParitySignal: this.lastParitySignal,
            engineScoresSize: this.engineScoresSize,
            engineScoresParity: this.engineScoresParity,
            predictionCacheSize: this.predictionCacheSize,
            predictionCacheParity: this.predictionCacheParity
        }));
    }

    addResult(period, dice, sum) {
        const isTriple = dice[0] === dice[1] && dice[1] === dice[2];

        let actualSize = 'TRIPLE';
        if (!isTriple) {
            actualSize = sum >= 11 ? 'BIG' : 'SMALL';
        }

        let actualParity = 'TRIPLE';
        if (!isTriple) {
            actualParity = sum % 2 === 0 ? 'EVEN' : 'ODD';
        }

        console.log(`Analysis -> Size: ${actualSize}, Parity: ${actualParity}, IsTriple: ${isTriple}`);

        if (this.lastSizeSignal) {
            this.currentSizeLevel = this.advanceLevel(this.currentSizeLevel, actualSize, this.lastSizeSignal);
            this.updateEngineScores(this.engineScoresSize, this.predictionCacheSize, actualSize);
        }

        if (this.lastParitySignal) {
            this.currentParityLevel = this.advanceLevel(this.currentParityLevel, actualParity, this.lastParitySignal);
            this.updateEngineScores(this.engineScoresParity, this.predictionCacheParity, actualParity);
        }

        this.history.push({ period, dice, sum, actualSize, actualParity });
        if (this.history.length > 5000) {
            this.history.shift();
        }

        this.currentPrediction = this.generatePrediction();
        this.saveData();

        return this.currentPrediction;
    }

    advanceLevel(currentLevel, actualOutcome, lastSignal) {
        if (!lastSignal) {
            return currentLevel;
        }

        if (actualOutcome === lastSignal) {
            return 1;
        }

        return Math.min(currentLevel + 1, 3);
    }

    updateEngineScores(scores, cache, actualResult) {
        if (!cache || actualResult === 'TRIPLE') return;

        // Reward +1 for correct, Penalty -1 for incorrect. Bounded to -10 -> 10.
        if (cache.lln === actualResult) scores.lln = Math.min(scores.lln + 1, 10);
        else scores.lln = Math.max(scores.lln - 1, -10);

        if (cache.wma === actualResult) scores.wma = Math.min(scores.wma + 1, 10);
        else scores.wma = Math.max(scores.wma - 1, -10);

        if (cache.ngram === actualResult) scores.ngram = Math.min(scores.ngram + 1, 10);
        else scores.ngram = Math.max(scores.ngram - 1, -10);

        if (cache.markov === actualResult) scores.markov = Math.min(scores.markov + 1, 10);
        else scores.markov = Math.max(scores.markov - 1, -10);
    }

    calculateLLN(dataArray, optHigh, optLow) {
        if (dataArray.length < 10) return optHigh;
        let countHigh = 0; let countLow = 0;
        for (const item of dataArray) {
            if (item === optHigh) countHigh++;
            else countLow++;
        }
        return countHigh <= countLow ? optHigh : optLow;
    }

    calculateNGram(dataArray) {
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
        return targetFreq[keys[0]] > targetFreq[keys[1]] ? keys[0] : keys[1];
    }

    calculateMarkov(dataArray, optHigh, optLow) {
        // Simple 1-step state transition matrix
        if (dataArray.length < 5) return optHigh;
        const currentState = dataArray[dataArray.length - 1];
        let stateHighHigh = 0; let stateHighLow = 0;
        let stateLowHigh = 0; let stateLowLow = 0;

        for (let i = 0; i < dataArray.length - 1; i++) {
            if (dataArray[i] === optHigh && dataArray[i + 1] === optHigh) stateHighHigh++;
            if (dataArray[i] === optHigh && dataArray[i + 1] === optLow) stateHighLow++;
            if (dataArray[i] === optLow && dataArray[i + 1] === optHigh) stateLowHigh++;
            if (dataArray[i] === optLow && dataArray[i + 1] === optLow) stateLowLow++;
        }

        if (currentState === optHigh) return stateHighHigh >= stateHighLow ? optHigh : optLow;
        return stateLowHigh >= stateLowLow ? optHigh : optLow;
    }

    calculateWMA(dataArray, period, optHigh) {
        if (dataArray.length < period) return 0.5;
        const recentData = dataArray.slice(-period);
        let weightedSum = 0;
        let weightTotal = 0;

        for (let index = 0; index < recentData.length; index++) {
            const weight = index + 1;
            const numericValue = recentData[index] === optHigh ? 1 : 0;
            weightedSum += numericValue * weight;
            weightTotal += weight;
        }
        return weightedSum / weightTotal;
    }

    voteConsensus(lln, wma, ngram, markov, scores, optHigh, optLow) {
        // If an engine is negative (failing), its vote counts for 0.
        // If positive, its exact score dictates its weight.
        let highVotes = 0;
        let lowVotes = 0;

        const castVote = (enginePrediction, engineScore) => {
            const weight = Math.max(0, engineScore); // Ignore negative engines
            if (enginePrediction === optHigh) highVotes += weight;
            else if (enginePrediction === optLow) lowVotes += weight;
        };

        castVote(lln, scores.lln);
        castVote(wma, scores.wma);
        if (ngram) castVote(ngram, scores.ngram);
        castVote(markov, scores.markov);

        // If absolute tie or all 0s, fallback to WMA micro-momentum
        if (highVotes === lowVotes) return wma;
        return highVotes > lowVotes ? optHigh : optLow;
    }

    selectTarget(history, predictions, scores, level, highLabel, lowLabel) {
        if (history.length === 0) return highLabel;

        const lastOutcome = history[history.length - 1];
        const consensusSignal = this.voteConsensus(predictions.lln, predictions.wma, predictions.ngram, predictions.markov, scores, highLabel, lowLabel);

        if (level === 1) return consensusSignal;
        if (level === 2) return lastOutcome;
        return lastOutcome === highLabel ? lowLabel : highLabel;
    }

    generatePrediction({ commit = true } = {}) {
        const sizeHistory = this.history.filter(e => e.actualSize !== 'TRIPLE').map(e => e.actualSize);
        const parityHistory = this.history.filter(e => e.actualParity !== 'TRIPLE').map(e => e.actualParity);

        // Calculate all 4 sub-engines for SIZE
        const sLln = this.calculateLLN(sizeHistory, 'BIG', 'SMALL');
        const sNgram = this.calculateNGram(sizeHistory);
        const sMarkov = this.calculateMarkov(sizeHistory, 'BIG', 'SMALL');
        const fastSizeWMA = this.calculateWMA(sizeHistory, 3, 'BIG');
        const slowSizeWMA = this.calculateWMA(sizeHistory, 7, 'BIG');
        const sWma = fastSizeWMA >= slowSizeWMA ? 'BIG' : 'SMALL';

        // Calculate all 4 sub-engines for PARITY
        const pLln = this.calculateLLN(parityHistory, 'EVEN', 'ODD');
        const pNgram = this.calculateNGram(parityHistory);
        const pMarkov = this.calculateMarkov(parityHistory, 'EVEN', 'ODD');
        const fastParityWMA = this.calculateWMA(parityHistory, 3, 'EVEN');
        const slowParityWMA = this.calculateWMA(parityHistory, 7, 'EVEN');
        const pWma = fastParityWMA >= slowParityWMA ? 'EVEN' : 'ODD';

        const sizePreds = { lln: sLln, wma: sWma, ngram: sNgram, markov: sMarkov };
        const parityPreds = { lln: pLln, wma: pWma, ngram: pNgram, markov: pMarkov };

        const nextSize = this.selectTarget(sizeHistory, sizePreds, this.engineScoresSize, this.currentSizeLevel, 'BIG', 'SMALL');
        const nextParity = this.selectTarget(parityHistory, parityPreds, this.engineScoresParity, this.currentParityLevel, 'EVEN', 'ODD');

        if (commit) {
            this.lastSizeSignal = nextSize;
            this.lastParitySignal = nextParity;
            this.predictionCacheSize = sizePreds;
            this.predictionCacheParity = parityPreds;
        }

        // Generate synthetic confidence based on highest scoring engine
        const maxSizeScore = Math.max(this.engineScoresSize.lln, this.engineScoresSize.wma, this.engineScoresSize.ngram, this.engineScoresSize.markov);
        const maxParityScore = Math.max(this.engineScoresParity.lln, this.engineScoresParity.wma, this.engineScoresParity.ngram, this.engineScoresParity.markov);

        const sizeConf = Math.min(88 + (Math.max(0, maxSizeScore) * 2), 100);
        const parConf = Math.min(88 + (Math.max(0, maxParityScore) * 2), 100);

        return {
            size: { target: nextSize, level: this.currentSizeLevel, confidence: Math.round(sizeConf) },
            parity: { target: nextParity, level: this.currentParityLevel, confidence: Math.round(parConf) }
        };
    }
}

const AI = new SicBoPredictor();

// ==========================================
// FAST PARITY PREDICTOR ENGINE
// ==========================================
class FastParityPredictor {
    constructor() {
        const savedHistory = localStorage.getItem('fp_history');
        if (savedHistory) {
            try {
                this.history = JSON.parse(savedHistory);
            } catch (error) {
                this.history = [];
            }
        } else {
            this.history = [];
        }

        const savedLevels = localStorage.getItem('fp_levels');
        if (savedLevels) {
            try {
                const parsed = JSON.parse(savedLevels);
                this.currentLevel = Math.min(parsed.currentLevel || 1, 3);
                this.lastSignal = parsed.lastSignal || null;
                this.engineScores = parsed.engineScores || { lln: 0, wma: 0, ngram: 0, markov: 0 };
                this.predictionCache = parsed.predictionCache || null;
            } catch (error) {
                this.resetLevels();
            }
        } else {
            this.resetLevels();
        }

        this.currentPrediction = this.generatePrediction({ commit: false });
    }

    resetLevels() {
        this.currentLevel = 1;
        this.lastSignal = null;
        this.engineScores = { lln: 0, wma: 0, ngram: 0, markov: 0 };
        this.predictionCache = null;
    }

    saveData() {
        localStorage.setItem('fp_history', JSON.stringify(this.history));
        localStorage.setItem('fp_levels', JSON.stringify({
            currentLevel: this.currentLevel,
            lastSignal: this.lastSignal,
            engineScores: this.engineScores,
            predictionCache: this.predictionCache
        }));
    }

    addResult(actualColor) {
        console.log(`FP Analysis -> Color: ${actualColor}`);

        if (this.lastSignal) {
            if (actualColor === this.lastSignal) {
                this.currentLevel = 1;
            } else {
                this.currentLevel = Math.min(this.currentLevel + 1, 3);
            }
            // Update Master Node accuracy tracker
            if (this.predictionCache && actualColor !== 'VIOLET') {
                if (this.predictionCache.lln === actualColor) this.engineScores.lln = Math.min(this.engineScores.lln + 1, 10);
                else this.engineScores.lln = Math.max(this.engineScores.lln - 1, -10);

                if (this.predictionCache.wma === actualColor) this.engineScores.wma = Math.min(this.engineScores.wma + 1, 10);
                else this.engineScores.wma = Math.max(this.engineScores.wma - 1, -10);

                if (this.predictionCache.ngram === actualColor) this.engineScores.ngram = Math.min(this.engineScores.ngram + 1, 10);
                else this.engineScores.ngram = Math.max(this.engineScores.ngram - 1, -10);

                if (this.predictionCache.markov === actualColor) this.engineScores.markov = Math.min(this.engineScores.markov + 1, 10);
                else this.engineScores.markov = Math.max(this.engineScores.markov - 1, -10);
            }
        }

        this.history.push({ color: actualColor });
        if (this.history.length > 5000) {
            this.history.shift();
        }

        this.currentPrediction = this.generatePrediction();
        this.saveData();

        return this.currentPrediction;
    }

    calculateLLN(dataArray, optHigh, optLow) {
        if (dataArray.length < 10) return optHigh;
        let countHigh = 0; let countLow = 0;
        for (const item of dataArray) {
            if (item === optHigh) countHigh++;
            else countLow++;
        }
        return countHigh <= countLow ? optHigh : optLow;
    }

    calculateNGram(dataArray) {
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
        return targetFreq[keys[0]] > targetFreq[keys[1]] ? keys[0] : keys[1];
    }

    calculateMarkov(dataArray, optHigh, optLow) {
        if (dataArray.length < 5) return optHigh;
        const currentState = dataArray[dataArray.length - 1];
        let hH = 0; let hL = 0; let lH = 0; let lL = 0;
        for (let i = 0; i < dataArray.length - 1; i++) {
            if (dataArray[i] === optHigh && dataArray[i + 1] === optHigh) hH++;
            if (dataArray[i] === optHigh && dataArray[i + 1] === optLow) hL++;
            if (dataArray[i] === optLow && dataArray[i + 1] === optHigh) lH++;
            if (dataArray[i] === optLow && dataArray[i + 1] === optLow) lL++;
        }
        if (currentState === optHigh) return hH >= hL ? optHigh : optLow;
        return lH >= lL ? optHigh : optLow;
    }

    calculateWMA(dataArray, period, optHigh) {
        if (dataArray.length < period) {
            return 0.5;
        }

        const recentData = dataArray.slice(-period);
        let weightedSum = 0;
        let weightTotal = 0;

        for (let index = 0; index < recentData.length; index++) {
            const weight = index + 1;
            const numericValue = recentData[index] === optHigh ? 1 : 0;
            weightedSum += numericValue * weight;
            weightTotal += weight;
        }

        return weightedSum / weightTotal;
    }

    voteConsensus(lln, wma, ngram, markov, optHigh, optLow) {
        let highVotes = 0; let lowVotes = 0;
        const castVote = (enginePrediction, engineScore) => {
            const weight = Math.max(0, engineScore);
            if (enginePrediction === optHigh) highVotes += weight;
            else if (enginePrediction === optLow) lowVotes += weight;
        };

        castVote(lln, this.engineScores.lln);
        castVote(wma, this.engineScores.wma);
        if (ngram) castVote(ngram, this.engineScores.ngram);
        castVote(markov, this.engineScores.markov);

        if (highVotes === lowVotes) return wma;
        return highVotes > lowVotes ? optHigh : optLow;
    }

    calculateConfidence(fastWMA, slowWMA, historyLength, level) {
        const momentumGap = Math.abs(fastWMA - slowWMA);
        const sampleBonus = Math.min(historyLength, 12);
        const levelPenalty = (level - 1) * 4;
        const rawConfidence = 52 + Math.round(momentumGap * 30) + sampleBonus - levelPenalty;

        return Math.max(52, Math.min(rawConfidence, 78));
    }

    generatePrediction({ commit = true } = {}) {
        const hColors = this.history.filter(e => e.color !== 'VIOLET').map(e => e.color);

        // 4 Engines
        const pLln = this.calculateLLN(hColors, 'GREEN', 'RED');
        const pNgram = this.calculateNGram(hColors);
        const pMarkov = this.calculateMarkov(hColors, 'GREEN', 'RED');
        const fastWMA = this.calculateWMA(hColors, 3, 'GREEN');
        const slowWMA = this.calculateWMA(hColors, 7, 'GREEN');
        const pWma = fastWMA >= slowWMA ? 'GREEN' : 'RED';

        const preds = { lln: pLln, wma: pWma, ngram: pNgram, markov: pMarkov };

        let nextColor = 'GREEN';
        if (hColors.length > 0) {
            const lastColor = hColors[hColors.length - 1];
            const consensusSignal = this.voteConsensus(pLln, pWma, pNgram, pMarkov, 'GREEN', 'RED');

            if (this.currentLevel === 1) nextColor = consensusSignal;
            else if (this.currentLevel === 2) nextColor = lastColor;
            else nextColor = lastColor === 'GREEN' ? 'RED' : 'GREEN';
        }

        if (commit) {
            this.lastSignal = nextColor;
            this.predictionCache = preds;
        }

        const maxScore = Math.max(this.engineScores.lln, this.engineScores.wma, this.engineScores.ngram, this.engineScores.markov);
        const conf = Math.min(88 + (Math.max(0, maxScore) * 2), 100);

        return {
            target: nextColor,
            level: this.currentLevel,
            confidence: Math.round(conf)
        };
    }
}

const FP_AI = new FastParityPredictor();

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

const fpColorBallEl = document.getElementById('fp-last-color');
const signalFpColorEl = document.getElementById('signal-fp-color');
const levelFpColorEl = document.getElementById('level-fp-color');
const confFpColorEl = document.getElementById('conf-fp-color');

const sicboView = document.getElementById('sicbo-view');
const fastParityView = document.getElementById('fastparity-view');
const tabs = document.querySelectorAll('.tab-btn');

function switchGame(game) {
    tabs.forEach(tab => tab.classList.remove('active'));

    if (game === 'sicbo') {
        tabs[0].classList.add('active');
        sicboView.style.display = 'block';
        fastParityView.style.display = 'none';
        document.querySelector('h1').innerHTML = 'SICBO <span>PREDICTOR AI</span>';
        return;
    }

    tabs[1].classList.add('active');
    sicboView.style.display = 'none';
    fastParityView.style.display = 'block';
    document.querySelector('h1').innerHTML = 'FAST PARITY <span>PREDICTOR AI</span>';
}

function setSignalStyle(element, signal) {
    element.textContent = signal;
    element.className = 'signal-value';
    element.classList.add(`signal-${signal}`);
}

function processGameUpdate(period, dice, sum, prediction) {
    periodEl.textContent = `PERIOD: ${period}`;

    [dice1El, dice2El, dice3El].forEach(element => element.classList.add('rolling'));

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
                    confSizeEl.textContent = `${prediction.size.confidence}%`;

                    setSignalStyle(signalParityEl, prediction.parity.target);
                    levelParityEl.textContent = prediction.parity.level;
                    confParityEl.textContent = `${prediction.parity.confidence}%`;
                }
            }, 300);
        }, 300);
    }, 400);
}

const liveSocket = typeof io === 'function' ? io() : null;
if (liveSocket) {
    liveSocket.on('game_update', payload => {
        if (!payload || !Array.isArray(payload.dice) || payload.dice.length !== 3) {
            return;
        }

        processGameUpdate(payload.period, payload.dice, payload.sum, payload.prediction);
    });
}

const digitInput = document.getElementById('manual-3digit');
const submitBtn = document.getElementById('manual-submit');

submitBtn.addEventListener('click', () => {
    try {
        const value = digitInput.value;
        if (!value || value.length !== 3) {
            alert("Please enter exactly 3 digits (e.g. '123').");
            return;
        }

        const d1 = parseInt(value[0], 10);
        const d2 = parseInt(value[1], 10);
        const d3 = parseInt(value[2], 10);

        if (
            Number.isNaN(d1) || Number.isNaN(d2) || Number.isNaN(d3) ||
            d1 < 1 || d1 > 6 ||
            d2 < 1 || d2 > 6 ||
            d3 < 1 || d3 > 6
        ) {
            alert('Each digit must be between 1 and 6.');
            return;
        }

        const sum = d1 + d2 + d3;
        const dice = [d1, d2, d3];
        const fakePeriod = `MANUAL-${Math.floor(Math.random() * 100000)}`;

        submitBtn.textContent = 'CALCULATING...';
        submitBtn.disabled = true;

        const analysis = AI.addResult(fakePeriod, dice, sum);
        processGameUpdate(fakePeriod, dice, sum, analysis);

        digitInput.value = '';
        setTimeout(() => {
            submitBtn.textContent = 'ADD RESULT';
            submitBtn.disabled = false;
        }, 1000);
    } catch (error) {
        alert(`Error executing calculation: ${error.message}`);
    }
});

digitInput.addEventListener('keypress', event => {
    if (event.key === 'Enter') {
        submitBtn.click();
    }
});

window.submitFP = function submitFP(number) {
    try {
        const fakePeriod = `MANUAL-${Math.floor(Math.random() * 100000)}`;

        let colorToPredict;
        let backgroundStyle;

        if (number === 0) {
            colorToPredict = 'RED';
            backgroundStyle = 'linear-gradient(135deg, #ff3366 50%, #a200ff 50%)';
        } else if (number === 5) {
            colorToPredict = 'GREEN';
            backgroundStyle = 'linear-gradient(135deg, #00ff88 50%, #a200ff 50%)';
        } else if (number % 2 === 0) {
            colorToPredict = 'RED';
            backgroundStyle = '#ff3366';
        } else {
            colorToPredict = 'GREEN';
            backgroundStyle = '#00ff88';
        }

        fpColorBallEl.innerHTML = `<span style="font-size: 2.5rem; font-weight: 800; color: white; display: flex; align-items: center; justify-content: center; height: 100%; text-shadow: 0 2px 5px rgba(0,0,0,0.5);">${number}</span>`;
        fpColorBallEl.style.background = backgroundStyle;
        periodEl.textContent = `PERIOD: ${fakePeriod}`;

        const analysis = FP_AI.addResult(colorToPredict);
        if (analysis) {
            setSignalStyle(signalFpColorEl, analysis.target);
            levelFpColorEl.textContent = analysis.level;
            confFpColorEl.textContent = `${analysis.confidence}%`;
        }
    } catch (error) {
        alert(`Error executing calculation: ${error.message}`);
    }
};
