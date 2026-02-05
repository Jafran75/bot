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
        state = { currentPeriod: parseInt(period), currentLevel: 1, lastPrediction: null };
        chatStates[chatId] = state;
    }

    const prediction = predictor.predictNext();

    // Save prediction for validation
    state.lastPrediction = prediction;
    state.currentPeriod = parseInt(period);
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
/reset - Clear history & Reset Level
    `, { parse_mode: 'Markdown' });
});

bot.onText(/\/predict/, (msg) => {
    const chatId = msg.chat.id;

    // Initialize or Resume
    let history = predictor.getHistory();
    let nextPeriodKey = '1000';
    if (history.length > 0) {
        let lastP = history[history.length - 1].period;
        nextPeriodKey = (parseInt(lastP) + 1).toString();
    }

    // Reset level on manual command or keep? usually manual command implies start fresh or resume.
    // Let's assume resume if state exists, else fresh.
    if (!chatStates[chatId]) {
        chatStates[chatId] = { currentPeriod: parseInt(nextPeriodKey), currentLevel: 1, lastPrediction: null };
    } else {
        // Update period just in case
        chatStates[chatId].currentPeriod = parseInt(nextPeriodKey);
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
        if (!state) state = { currentPeriod: 1000, currentLevel: 1, lastPrediction: null };

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
        state.currentPeriod += 1;
        chatStates[chatId] = state;

        // Next Prediction
        sendPrediction(chatId, state.currentPeriod.toString());
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
