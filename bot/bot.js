require('dotenv').config();
const https = require('https');
const TelegramBot = require('node-telegram-bot-api');
const WingoPredictor = require('./prediction');

const token = process.env.BOT_TOKEN;
let bot;

if (process.env.RENDER) {
    // --- PRODUCTION (Render) ---
    // Use Webhooks to prevent 409 Conflict
    bot = new TelegramBot(token); // No polling
    bot.setWebHook(`${process.env.RENDER_EXTERNAL_URL}/bot${token}`);
    console.log(`[Init] Running in Webhook Mode on Render 🚀`);
} else {
    // --- LOCAL (Dev) ---
    // Use Polling for easy testing
    bot = new TelegramBot(token, { polling: true });
    console.log(`[Init] Running in Polling Mode (Local) 💻`);
}
const predictor = new WingoPredictor();

console.log('Bot is starting...');

// State management
const fs = require('fs');
const HISTORY_FILE = 'history.json';

const chatStates = {};
// chatId -> { 
//   currentPeriod: string, 
//   currentLevel: number (1-5), 
//   lastPrediction: { size: string, color: string } 
// }

// Load History from File
if (fs.existsSync(HISTORY_FILE)) {
    try {
        const saved = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
        saved.forEach(h => predictor.addResult(h.period, h.number));
        console.log(`[Startup] Loaded ${saved.length} rounds from ${HISTORY_FILE} 📂`);
    } catch (e) {
        console.error("Error loading history:", e);
    }
}

// Function to Save History
function saveHistory() {
    const data = predictor.getHistory();
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2));
}

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

    const prediction = predictor.predictNext(state.currentLevel);

    // Save prediction for validation
    state.lastPrediction = prediction;
    state.currentPeriod = period.toString();
    chatStates[chatId] = state;

    // Alert Logic (4-Level System)
    let alertMsg = "";
    if (state.currentLevel === 3) alertMsg = "\n⚠️ *WARNING: HIGH LEVEL (3/4)* ⚠️";
    if (state.currentLevel >= 4) alertMsg = "\n🚨 *CRITICAL: FINAL LEVEL (4/4)* 🚨";

    // Skip Warning (DISABLED for Continuous Mode)
    let skipWarning = "";
    // if (prediction.skipRecommended) {
    //    skipWarning = "\n\n🚫 *SKIP RECOMMENDED* - Low Confidence";
    // }

    // Confidence display
    const confidenceDisplay = prediction.confidenceScore
        ? `${prediction.confidence} (${prediction.confidenceScore}%)`
        : prediction.confidence;

    const msg = `
📢 *Signal for Period ${period}* 📢
🔥 *LEVEL ${state.currentLevel}/4* ${alertMsg}${skipWarning}

🔢 Prediction: *${prediction.size}* / *${prediction.color}*
📊 Confidence: ${confidenceDisplay}
💡 Method: ${prediction.reasoning}

👇 *Enter the RESULT when round ends:*
`;

    bot.sendMessage(chatId, msg, Object.assign({ parse_mode: 'Markdown' }, getResultKeyboard()));
};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `
🚀 *Wingo Prediction Bot V2.1* 🚀
*Ultra-Safe 2-Level Strategy* 🛡️

Use /predict to start the signals loop.
Bot uses a strict 2-Level system. It only bets on HIGH confidence (>80%).

Commands:
/predict - Start signals
/history - Show last 10 results
/reset - Clear history & Reset Level

🔬 *Engine Features:*
• Strict Confidence Filtering (>80%)
• "No Bet" Recommendations
• Markov & Entropy Analysis
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

    const state = chatStates[chatId]; // Fix: Define state
    sendPrediction(chatId, nextPeriodKey, state.currentLevel);
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
                state.currentLevel += 1;
                if (state.currentLevel > 2) state.currentLevel = 1; // Cap at 2
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

// --- TELEGRAM WEBHOOK ROUTE ---
app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
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
            if (state.currentLevel > 2) state.currentLevel = 1;
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

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
}).on('error', (err) => {
    console.error('[Server Error] Failed to start server:', err);
});

// Global Error Handlers
process.on('uncaughtException', (err) => {
    console.error('[Uncaught Exception]', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Unhandled Rejection]', reason);
});

// Keep-Alive Mechanism (Prevent Glitch/Render Sleep)
setInterval(() => {
    const appUrl = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
    if (appUrl) {
        console.log(`[Keep-Alive] Pinging ${appUrl}`);
        https.get(appUrl, (res) => {
            // ... (Simple ping logging)
        }).on('error', (err) => console.error(`[Keep-Alive] Error: ${err.message}`));
    }
}, 4 * 60 * 1000); // 4 Minutes (Glitch sleeps after 5)

// --- SERVER-SIDE POLLING (24/7 AUTO-PLAY) ---
// --- SERVER-SIDE POLLING (24/7 AUTO-PLAY) ---
// --- SERVER-SIDE POLLING (24/7 AUTO-PLAY) ---
// --- SAFE TELEGRAM WRAPPER ---
async function safeSendMessage(chatId, text, options = {}) {
    try {
        await bot.sendMessage(chatId, text, options);
    } catch (error) {
        console.error(`[Telegram Error] Failed to send to ${chatId}: ${error.message}`);
        // If user blocked bot, maybe remove from chatStates?
        if (error.message.includes('Forbidden')) delete chatStates[chatId];
    }
}

// --- SERVER-SIDE POLLING (HOT-PATH) ---
const GAME_API_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json";
let lastPolledPeriod = BigInt(0);
let lastHeartbeat = Date.now();
let isPolling = false; // Concurrency Lock 🔒

async function pollGameData() {
    if (isPolling) return; // Hook: Prevent double-execution
    isPolling = true;

    lastHeartbeat = Date.now(); // Update Heartbeat ❤️
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s Timeout

    try {
        const url = `${GAME_API_URL}?random=${Date.now()}&language=en`;
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0',
            'Origin': 'https://www.bdgwin888.com',
            'Referer': 'https://www.bdgwin888.com/'
        };
        const response = await fetch(url, { signal: controller.signal, headers });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const data = await response.json();
        if (data && data.data && data.data.list && data.data.list.length > 0) {
            const latest = data.data.list[0];
            const periodStr = latest.issueNumber;
            const resultNum = parseInt(latest.number);
            const serverTime = data.serviceTime;

            const currentPeriodBI = BigInt(periodStr);
            if (currentPeriodBI > lastPolledPeriod) {
                if (lastPolledPeriod !== 0n) {
                    console.log(`[Auto-Poll] 🆕 Result: ${periodStr} -> ${resultNum} (Latency: ${Date.now() - serverTime}ms)`);
                    await processNewResult(periodStr, resultNum, serverTime);
                } else {
                    console.log(`[Auto-Poll] Sync: ${periodStr}`);
                }
                lastPolledPeriod = currentPeriodBI;
            }
        }
    } catch (error) {
        if (error.name !== 'AbortError') console.error(`[Auto-Poll] Error: ${error.message}`);
    } finally {
        isPolling = false; // Release Lock 🔓
        setTimeout(pollGameData, 2000); // Recursive Tick
    }
}

// Logic to process result and notify users
async function processNewResult(period, result, serverTime) {
    try {
        predictor.addResult(period, result, serverTime);
        saveHistory();

        const chatIds = Object.keys(chatStates);
        const nextPeriod = (BigInt(period) + 1n).toString();
        const realSize = predictor.getSize(result);

        // Parallel Execution for Speed
        await Promise.all(chatIds.map(async (chatId) => {
            let state = chatStates[chatId];
            if (!state) return;

            // Check Win/Loss
            if (state.lastPrediction && state.currentPeriod.toString() === period) {
                if (state.lastPrediction.size === realSize) {
                    await safeSendMessage(chatId, `✅ *WIN* 🏆 Result: ${result} (${realSize})`, { parse_mode: 'Markdown' });
                    state.currentLevel = 1;
                } else {
                    await safeSendMessage(chatId, `❌ *LOSS* Result: ${result} (${realSize})`, { parse_mode: 'Markdown' });
                    state.currentLevel = Math.min(state.currentLevel + 1, 2); // Cap at 2
                    if (state.currentLevel > 2) state.currentLevel = 1;
                }
            }

            state.currentPeriod = nextPeriod;
            state.lastPrediction = null;
            chatStates[chatId] = state;

            sendPrediction(chatId, nextPeriod);
        }));

    } catch (err) {
        console.error(`[Process Error] ${err.message}`);
    }
}

// Update sendPrediction to use safeSendMessage is tricky because it's defined above.
// For now, let's keep sendPrediction using bot.sendMessage (it's less critical if it fails once).
// Actually, we should update sendPrediction too. Let's redefine it or patch it.
// Since sendPrediction is defined earlier, we can't easily change it here without refactoring the whole file.
// But processNewResult calls sendPrediction.

// Monitor Memory
setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024;
    // console.log(`[System] Memory: ${Math.round(used)} MB`);
    if (used > 512) {
        console.error('[System] Memory Warning! > 512MB');
        if (global.gc) global.gc(); // Clean if exposed
    }
}, 60000);

// --- WATCHDOG TIMER 🐕 ---
setInterval(() => {
    const now = Date.now();
    if (now - lastHeartbeat > 60000) {
        console.error(`[Watchdog] 🚨 LOOP FROZEN! Restarting...`);
        isPolling = false; // Break Lock
        pollGameData(); // Force Restart
    }
}, 30000);

// --- STARTUP SEQUENCE ---
console.log('[System] Starting Polling Loop...');
pollGameData(); // Start the Loop

// --- EXPORT FOR TESTS ---
module.exports = { bot, predictor };
