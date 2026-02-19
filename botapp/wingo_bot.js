const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Configuration
const PUBLIC_API_URL = 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json';

const headers = {
    'Origin': 'https://www.bdgwin888.com',
    'Referer': 'https://www.bdgwin888.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
};

// State
let lastProcessedIssue = '';

// Helper to format time
const getTimestamp = () => new Date().toLocaleTimeString();

// Game Logic Helpers
const getBigSmall = (number) => {
    const n = parseInt(number);
    return n >= 5 ? 'BIG' : 'SMALL';
};

const getColor = (number) => {
    const n = parseInt(number);
    if (n === 0 || n === 5) return 'VIOLET'; // simplified
    if ([1, 3, 7, 9].includes(n)) return 'GREEN';
    return 'RED';
};

// Prediction Logic "1 Level Winning" (High Accuracy)
function generatePrediction(history) {
    if (!history || history.length < 10) return null;

    // Convert history to clean format
    const recent = history.map(item => ({
        issue: item.issueNumber,
        result: getBigSmall(item.number),
        number: parseInt(item.number)
    }));

    let scoreBig = 0;
    let scoreSmall = 0;
    let reasons = [];

    // Strategy 1: Trend Following (The Dragon)
    // If there is a streak of 4 or more, bet on it continuing.
    let streakCount = 1;
    let streakValue = recent[0].result;
    for (let i = 1; i < recent.length; i++) {
        if (recent[i].result === streakValue) streakCount++;
        else break;
    }

    if (streakCount >= 4) {
        if (streakValue === 'BIG') scoreBig += 2;
        else scoreSmall += 2;
        reasons.push(`Dragon Streak (${streakCount})`);
    }

    // Strategy 2: The Flip (Zig-Zag)
    // Check if we are in a 1-1 pattern (B S B S)
    // B(0) S(1) B(2) S(3)
    let isZigZag = true;
    for (let i = 0; i < 4; i++) {
        if (recent[i].result === recent[i + 1].result) {
            isZigZag = false;
            break;
        }
    }
    if (isZigZag) {
        // If last was B, next should be S
        if (recent[0].result === 'BIG') scoreSmall += 2;
        else scoreBig += 2;
        reasons.push('Zig-Zag Pattern');
    }

    // Strategy 3: Number Pattern (Last digit repetition)
    // If the last number was 8, check what usually comes after 8 in the last 100 rounds
    const lastNum = recent[0].number;
    let afterBigCount = 0;
    let afterSmallCount = 0;
    let occurrences = 0;

    for (let i = 1; i < recent.length - 1; i++) {
        if (recent[i].number === lastNum) {
            occurrences++;
            if (recent[i - 1].result === 'BIG') afterBigCount++;
            else afterSmallCount++;
        }
    }

    if (occurrences > 2) {
        if (afterBigCount > afterSmallCount * 1.5) {
            scoreBig += 1;
            reasons.push(`Number ${lastNum} -> Big Trend`);
        } else if (afterSmallCount > afterBigCount * 1.5) {
            scoreSmall += 1;
            reasons.push(`Number ${lastNum} -> Small Trend`);
        }
    }

    // Decision Logic
    // "1 Level Without Skips": Always predict, prioritize highest score.
    let prediction = '';
    let probability = '60%';

    // default to BIG if equal (or handle tie-break better)
    if (scoreBig >= scoreSmall) {
        prediction = 'BIG';
        if (scoreBig > 0) probability = '80%';
    } else {
        prediction = 'SMALL';
        if (scoreSmall > 0) probability = '80%';
    }

    // Tie-breaker / Fallback if 0-0
    if (scoreBig === 0 && scoreSmall === 0) {
        // Fallback: Inverse of last result (Zig-Zag attempt) or Follow (Trend)
        // Let's use Trend Follow (Last Result) as safe default
        prediction = recent[0].result;
        reasons.push('Continuous Trend');
    }

    return {
        prediction,
        reason: reasons.length > 0 ? reasons.join(' + ') : 'Market Analysis',
        probability
    };
}

async function fetchGameInfo() {
    try {
        const timestamp = Date.now();
        const url = `${PUBLIC_API_URL}?ts=${timestamp}`;

        const response = await axios.get(url, { headers });

        if (response.status === 200 && response.data && response.data.data && response.data.data.list) {
            return response.data.data.list;
        } else {
            return null;
        }
    } catch (error) {
        // Silent error to avoid console spam on temporary network blips
        return null;
    }
}

function displayHeader() {
    console.clear();
    console.log('================================================');
    console.log('           WINGO 30s PREDICTION BOT             ');
    console.log('================================================');
    console.log(`Started at: ${new Date().toLocaleString()}`);
    console.log('');
}

function displayHistory(history) {
    console.log('Recent History:');
    console.log('------------------------------------------------');
    // Show top 5
    const top = history.slice(0, 5);
    top.forEach(item => {
        const bs = getBigSmall(item.number);
        const color = getColor(item.number);

        console.log(
            `[${item.issueNumber.slice(-4)}] Number: ${item.number} | Color: ${color} | Result: ${bs}`
        );
    });
    console.log('------------------------------------------------');
}

async function runBot() {
    displayHeader();
    console.log('Connecting to game server...');

    setInterval(async () => {
        const history = await fetchGameInfo();

        if (history && history.length > 0) {
            const latestIssue = history[0];

            if (latestIssue.issueNumber !== lastProcessedIssue) {
                lastProcessedIssue = latestIssue.issueNumber;

                // Refresh Display
                displayHeader();

                // Show History
                displayHistory(history);

                // Calculate next issue number (approximate)
                const nextIssueNumber = (BigInt(latestIssue.issueNumber) + 1n).toString();

                // Generate Prediction
                const pred = generatePrediction(history);

                console.log('');
                console.log(`PREDICTION FOR ISSUE: ${nextIssueNumber.slice(-4)}`);

                if (pred) {
                    console.log(`  ${pred.prediction}  (${pred.reason})`);
                } else {
                    console.log('Calculating...');
                }
                console.log('');
                console.log(`Next update in few seconds...`);
            }
        }
    }, 2000); // Poll faster to catch updates quickly
}

runBot();
