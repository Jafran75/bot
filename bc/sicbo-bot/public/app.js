const socket = io();

// DOM Elements
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

// Helpers
function setSignalStyle(element, signal) {
    element.textContent = signal;
    element.className = 'signal-value'; // Reset
    element.classList.add(`signal-${signal}`);
}

socket.on('game_update', (data) => {
    console.log("Received Game Update:", data);

    const { period, dice, sum, prediction } = data;

    // 1. Update Header
    periodEl.textContent = `PERIOD: ${period}`;

    // 2. Animate Dice
    [dice1El, dice2El, dice3El].forEach(el => el.classList.add('rolling'));

    // Simulate dice roll stop
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

                // 3. Update Predictions
                if (prediction) {
                    // Size
                    setSignalStyle(signalSizeEl, prediction.size.target);
                    levelSizeEl.textContent = prediction.size.level;
                    confSizeEl.textContent = prediction.size.confidence + '%';

                    // Parity
                    setSignalStyle(signalParityEl, prediction.parity.target);
                    levelParityEl.textContent = prediction.parity.level;
                    confParityEl.textContent = prediction.parity.confidence + '%';
                }

            }, 300);
        }, 300);
    }, 400);

});

// Manual Input Logic
const sumInput = document.getElementById('manual-sum');
const submitBtn = document.getElementById('manual-submit');

submitBtn.addEventListener('click', async () => {
    let sum = parseInt(sumInput.value);

    if (isNaN(sum) || sum < 3 || sum > 18) {
        alert("Please enter a valid total sum between 3 and 18.");
        return;
    }

    // Fake dice just for visual representation if user only provides sum
    // (e.g., if sum is 10, dice could be 3, 3, 4)
    let d1 = Math.floor(sum / 3);
    let d2 = Math.floor((sum - d1) / 2);
    let d3 = sum - d1 - d2;
    // ensure no die is > 6 or < 1
    if (d1 < 1) d1 = 1; if (d1 > 6) d1 = 6;
    if (d2 < 1) d2 = 1; if (d2 > 6) d2 = 6;
    if (d3 < 1) d3 = 1; if (d3 > 6) d3 = 6;

    // adjust back to sum
    const actualSum = d1 + d2 + d3;
    if (actualSum !== sum) {
        let diff = sum - actualSum;
        d3 += diff;
        // Edge cases for visual dice if sum is heavily skewed won't matter much 
        // because the backend predictor mostly cares about `sum` now.
    }

    const dice = [d1, d2, d3];
    const fakePeriod = `MANUAL-${Math.floor(Math.random() * 100000)}`;

    submitBtn.textContent = 'ADDING...';
    submitBtn.disabled = true;

    try {
        await fetch('/api/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'sicbo_result',
                data: { period: fakePeriod, dice, sum }
            })
        });

        // Clear Inputs
        sumInput.value = '';
    } catch (err) {
        console.error("Manual input failed", err);
        alert("Error sending to server - is it running?");
    } finally {
        submitBtn.textContent = 'ADD RESULT';
        submitBtn.disabled = false;
    }
});
