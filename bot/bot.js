require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const WingoPredictor = require('./prediction');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });
const predictor = new WingoPredictor();

console.log('Bot is starting...');

// State management
const chatStates = {};
// chatId -> { 
//   currentPeriod: number, 
//   currentLevel: number (1-5), 
//   lastPrediction: { size: string, color: string } 
// }

// Helper Keyboards
const getResultKeyboard = () => {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '0', callback_data: 'RES_0' },
                    { text: '1', callback_data: 'RES_1' },
                    { text: '2', callback_data: 'RES_2' },
                    { text: '3', callback_data: 'RES_3' },
                    { text: '4', callback_data: 'RES_4' }
                ],
                [
                    { text: '5', callback_data: 'RES_5' },
                    { text: '6', callback_data: 'RES_6' },
                    { text: '7', callback_data: 'RES_7' },
                    { text: '8', callback_data: 'RES_8' },
                    { text: '9', callback_data: 'RES_9' }
                ],
                [
                    { text: '❌ Cancel', callback_data: 'CANCEL' },
                    { text: '♻️ Reset Level', callback_data: 'RESET_LEVEL' }
                ]
            ]
        }
    };
};

const sendPrediction = (chatId, period) => {
    // Get or Init State
    let state = chatStates[chatId];
    if (!state) {
        state = { currentPeriod: period.toString(), currentLevel: 1, lastPrediction: null };
        chatStates[chatId] = state;
    }

    const prediction = predictor.predictNext();

    // Save prediction for validation
    state.lastPrediction = prediction;
    state.currentPeriod = period.toString(); // Store as String to preserve precision
    chatStates[chatId] = state; // Update global store

    // Alert Logic
    let alertMsg = "";
    if (state.currentLevel === 4) alertMsg = "\n⚠️ *WARNING: HIGH LEVEL (4/5)* ⚠️";
    if (state.currentLevel >= 5) alertMsg = "\n🚨 *CRITICAL: DO OR DIE (5/5)* 🚨";

    // Formatting
    const msg = `
📢 *Signal for Period ${period}* 📢
🔥 *STAGE ${state.currentLevel}/5* ${alertMsg}

🔢 Prediction: *${prediction.size}* / *${prediction.color}*
📊 Confidence: ${prediction.confidence}
💡 Reason: ${prediction.reasoning}

👇 *Enter the RESULT when round ends:*
`;

    bot.sendMessage(chatId, msg, Object.assign({ parse_mode: 'Markdown' }, getResultKeyboard()));
};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `
🚀 *Wingo Prediction Bot* 🚀

Use /predict to start the signals loop.
Bot will track your 5-Stage strategy automatically.

Commands:
/predict - Start signals
/history - Show last 10 results
/reset - Clear history & Reset Level
    `, { parse_mode: 'Markdown' });
});

// NEW: History Command
bot.onText(/\/history/, (msg) => {
    const chatId = msg.chat.id;
    const history = predictor.getHistory().slice(-10).reverse(); // Last 10, newest first

    if (history.length === 0) {
        bot.sendMessage(chatId, "No history yet.");
        return;
    }

    let report = "📜 *Last 10 Results:*\n";
    history.forEach(h => {
        const size = predictor.getSize(h.number);
        report += `• ${h.period.slice(-4)}: *${h.number}* (${size})\n`;
    });

    bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
});

bot.onText(/\/predict/, (msg) => {
    const chatId = msg.chat.id;

    // Initialize or Resume
    let history = predictor.getHistory();
    let nextPeriodKey = '10250211100000000'; // Default start if empty
    if (history.length > 0) {
        let lastP = history[history.length - 1].period;
        nextPeriodKey = (BigInt(lastP) + 1n).toString();
    }

    // Reset level on manual command or keep? usually manual command implies start fresh or resume.
    // Let's assume resume if state exists, else fresh.
    if (!chatStates[chatId]) {
        chatStates[chatId] = { currentPeriod: nextPeriodKey, currentLevel: 1, lastPrediction: null };
    } else {
        // Update period just in case
        chatStates[chatId].currentPeriod = nextPeriodKey;
    }

    sendPrediction(chatId, nextPeriodKey);
});

bot.onText(/\/reset/, (msg) => {
    predictor.clearHistory();
    chatStates[msg.chat.id] = null;
    bot.sendMessage(msg.chat.id, "History & Levels cleared. Start fresh with /predict");
});

bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data === 'CANCEL') {
        bot.deleteMessage(chatId, query.message.message_id);
        bot.sendMessage(chatId, "Prediction stopped.");
        return;
    }

    if (data === 'RESET_LEVEL') {
        if (chatStates[chatId]) chatStates[chatId].currentLevel = 1;
        bot.sendMessage(chatId, "Level reset to 1.");
        return;
    }

    if (data.startsWith('RES_')) {
        const number = parseInt(data.split('_')[1]);

        let state = chatStates[chatId];
        if (!state) state = { currentPeriod: '1000', currentLevel: 1, lastPrediction: null };

        const periodStr = state.currentPeriod.toString();

        // Add to history
        predictor.addResult(periodStr, number);

        // Validation Logic
        const realSize = predictor.getSize(number);

        let resultParams = "";

        // Check Win/Loss based on SIZE (Primary)
        if (state.lastPrediction) {
            if (state.lastPrediction.size === realSize) {
                resultParams = "✅ WIN 🏆";
                state.currentLevel = 1; // Reset to 1
            } else {
                resultParams = "❌ LOSS";
                state.currentLevel += 1; // Increment
                if (state.currentLevel > 5) state.currentLevel = 1; // Cap at 5
            }
        } else {
            resultParams = "Data Added";
        }

        // Edit old message
        const size = predictor.getSize(number);
        const color = predictor.getColor(number);

        bot.editMessageText(`
📢 *Signal for Period ${periodStr}* 📢
Result: ${number} (${size})
${resultParams}
        `, {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'Markdown'
        });

        // Advance
        const nextPeriod = (BigInt(periodStr) + 1n).toString();
        state.currentPeriod = nextPeriod;
        chatStates[chatId] = state;

        // Next Prediction
        sendPrediction(chatId, nextPeriod);
    }

    // Answer callback
    bot.answerCallbackQuery(query.id);
});

// Error handling
bot.on('polling_error', (error) => {
    // Only log if not 401 spam
    if (!error.message.includes('401')) {
        console.error(`[Polling Error] ${error.code}: ${error.message}`);
    }
});

// --- RENDER DEPLOYMENT SUPPORT ---
const express = require('express');
const cors = require('cors'); // Import CORS
const app = express();
app.use(cors()); // Enable CORS for ALL routes (Allow bdgwin to talk to us)
app.use(express.json()); // Enable JSON parsing
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Wingo Bot is Running! 🚀');
});

// Payload: { period: "2024...", result: 5, chatId: "12345" }
app.post('/webhook/wingo', (req, res) => {
    console.log('[Webhook] Received Data:', req.body);
    const { period, result, chatId } = req.body;

    if (!period || result === undefined || !chatId) {
        return res.status(400).send('Missing args');
    }

    // Add to Logic
    const added = predictor.addResult(period.toString(), parseInt(result));

    // Trigger Next Prediction (Simulate callback)
    // We need to update state and send prediction
    let state = chatStates[chatId];
    if (!state) state = { currentPeriod: period.toString(), currentLevel: 1, lastPrediction: null };

    // Check Win/Loss Logic
    const number = parseInt(result);
    const realSize = predictor.getSize(number);
    let resultParams = "Data Added";

    if (state.lastPrediction) {
        if (state.lastPrediction.size === realSize) {
            resultParams = "✅ WIN 🏆";
            state.currentLevel = 1;
        } else {
            resultParams = "❌ LOSS";
            state.currentLevel += 1;
            if (state.currentLevel > 5) state.currentLevel = 1;
        }
    }

    // Update Period (BigInt Fix)
    const nextPeriod = (BigInt(period) + 1n).toString();
    state.currentPeriod = nextPeriod;
    chatStates[chatId] = state;

    // Send Next Prediction (Async)
    sendPrediction(chatId, nextPeriod);

    res.send({ status: 'ok', next: nextPeriod });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// Keep-Alive Mechanism
setInterval(() => {
    if (process.env.RENDER_EXTERNAL_URL) {
        console.log(`[Keep-Alive] Pinging ${process.env.RENDER_EXTERNAL_URL}`);
        https.get(process.env.RENDER_EXTERNAL_URL, (res) => {
            // ... (Simple ping logging)
        }).on('error', (err) => console.error(`[Keep-Alive] Error: ${err.message}`));
    }
}, 14 * 60 * 1000); // 14 Minutes

// --- SERVER-SIDE POLLING (24/7 AUTO-PLAY) ---
const GAME_API_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json";
let lastPolledPeriod = BigInt(0);

async function pollGameData() {
    try {
        // Add timestamp to prevent caching
        const url = `${GAME_API_URL}?random=${Date.now()}&language=en`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        // Structure: { data: { list: [ { issueNumber: "2026...", number: "5", ... } ] } }

        if (data && data.data && data.data.list && data.data.list.length > 0) {
            const latest = data.data.list[0];
            const periodStr = latest.issueNumber;
            const resultNum = parseInt(latest.number);

            // Convert to BigInt for comparison
            const currentPeriodBI = BigInt(periodStr);

            // New Data Detection
            if (currentPeriodBI > lastPolledPeriod) {
                if (lastPolledPeriod !== 0n) { // Skip first run (just sync)
                    console.log(`[Auto-Poll] 🆕 New Result: ${periodStr} -> ${resultNum}`);
                    processNewResult(periodStr, resultNum);
                    // Also trigger prediction for next round
                } else {
                    console.log(`[Auto-Poll] Subscribed to Stream. Latest: ${periodStr}`);
                }
                lastPolledPeriod = currentPeriodBI;
            }
        }
    } catch (error) {
        console.error(`[Auto-Poll] Error: ${error.message}`);
    }
}

// Logic to process result and notify users
function processNewResult(period, result) {
    // 1. Add to History
    predictor.addResult(period, result);

    // 2. Iterate through all active chats and update
    // Note: This iterates ALL chats that have interacted.
    // In a real DB we would query active subscriptions.
    const chatIds = Object.keys(chatStates);

    // Calculate Next Period
    const nextPeriod = (BigInt(period) + 1n).toString();

    chatIds.forEach(chatId => {
        let state = chatStates[chatId];
        if (!state) return; // Inactive

        // Update State
        const realSize = predictor.getSize(result);
        let resultParams = "Data Added";

        // Check Win/Loss
        if (state.lastPrediction) {
            // If the prediction was for THIS period
            if (state.currentPeriod.toString() === period) {
                if (state.lastPrediction.size === realSize) {
                    // Win
                    bot.sendMessage(chatId, `✅ *WIN* 🏆 Result: ${result} (${realSize})`, { parse_mode: 'Markdown' });
                    state.currentLevel = 1;
                } else {
                    // Loss
                    bot.sendMessage(chatId, `❌ *LOSS* Result: ${result} (${realSize})`, { parse_mode: 'Markdown' });
                    state.currentLevel += 1;
                    if (state.currentLevel > 5) state.currentLevel = 1;
                }
            } else {
                // Mismatch or catch-up
                // console.log(`[Debug] Prediction for ${state.currentPeriod} but result is ${period}`);
            }
        }

        // Prepare for Next Round
        state.currentPeriod = nextPeriod;
        state.lastPrediction = null; // Will be set by sendPrediction
        chatStates[chatId] = state;

        // Send Next Prediction
        sendPrediction(chatId, nextPeriod);
    });
}

// Start Polling Loop (Every 2 seconds)
setInterval(pollGameData, 2000);
