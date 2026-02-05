const TelegramBot = require('node-telegram-bot-api');
const db = require('./db');

// --- CONFIGURATION ---
// Replace 'YOUR_TELEGRAM_BOT_TOKEN' with your actual token from BotFather
// or use an environment variable.
const token = process.env.BOT_TOKEN || '8013077287:AAEwG6GUNVzrYwzZ0oTTc651f8XWx3PjsAg';

if (token === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
    console.warn("⚠️  WARNING: You haven't set a Bot Token. The bot will fail to start.");
    console.warn("   Please open bot.js and replace 'YOUR_TELEGRAM_BOT_TOKEN_HERE' with your token.");
}

const bot = new TelegramBot(token, { polling: true });


// --- GAME LOGIC & UTILS ---

/**
 * Calculates the probability of picking BIG based on stats.
 * Returns a number between 0 and 1.
 */
function calculateBias(stats) {
    const bigTotal = stats.big_win + stats.big_loss;
    const smallTotal = stats.small_win + stats.small_loss;

    // Default 50/50 if no sufficient data
    if (bigTotal === 0 && smallTotal === 0) return 0.5;

    // Calculate Win Rates (substitute 0.5 if no plays yet)
    // We treat "no plays" as neutral 50% win rate for comparison
    const bigWinRate = bigTotal > 0 ? (stats.big_win / bigTotal) : 0.5;
    const smallWinRate = smallTotal > 0 ? (stats.small_win / smallTotal) : 0.5;

    // If win rates are identical, stay neutral
    if (bigWinRate === smallWinRate) return 0.5;

    // Determine target direction (the one with higher win rate)
    const targetIsBig = bigWinRate > smallWinRate;

    // Calculate strength of bias
    // Max swing is 20% (from 50% to 70% or 30%)
    // Let's make it proportional to the difference in win rates.
    const diff = Math.abs(bigWinRate - smallWinRate);
    // Example: If Big=80%, Small=40%, Diff=0.4.
    // We want to map Diff to a shift. Max shift is 0.2.
    // Let's say we apply the full shift if Diff >= 0.5.

    let shift = Math.min(diff * 0.4, 0.2); // Cap shift at 0.2

    // Base probability
    let probBig = 0.5;

    if (targetIsBig) {
        probBig += shift;
    } else {
        probBig -= shift;
    }

    // Strict CLAMP [0.3, 0.7]
    return Math.max(0.3, Math.min(0.7, probBig));
}

function generateSignal(stats) {
    const probBig = calculateBias(stats);
    const rand = Math.random();

    const isBig = rand < probBig;

    // Logging for debug (optional)
    console.log(`Grid Gen: p(Big)=${probBig.toFixed(2)}, rand=${rand.toFixed(2)} -> ${isBig ? 'BIG' : 'SMALL'}`);

    return isBig ? 'big' : 'small';
}

function sendSignal(chatId, stats) {
    const signal = generateSignal(stats);

    // Update DB to say user has pending signal
    db.updateUser(chatId, { current_signal: signal });

    const text = `🎯 <b>NEW SIGNAL GENERATED</b>\n\n` +
        `Bet on: <b>${signal.toUpperCase()}</b> ${signal === 'big' ? '🔵' : '🔴'}\n` +
        `<i>(Bias: ${Math.round(calculateBias(stats) * 100)}% Big)</i>\n\n` +
        `Please report result:`;

    const opts = {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '✅ WIN', callback_data: 'win' },
                    { text: '❌ LOSS', callback_data: 'loss' }
                ]
            ]
        }
    };

    bot.sendMessage(chatId, text, opts).catch(err => console.error("Send Error:", err));
}

// --- COMMAND HANDLERS ---

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcome =
        `👋 <b>Welcome to the Adaptive WinGo Bot!</b>\n\n` +
        `✅ <b>HONESTY POLICY:</b>\n` +
        `• This bot does NOT predict numbers.\n` +
        `• It tracks your personal stats and adapts probability.\n` +
        `• If 'Big' is winning more for you, I suggest 'Big' more often.\n` +
        `• <b>Randomness is always preserved.</b>\n\n` +
        `Commands:\n` +
        `/signal - Get a value (Small/Big)\n` +
        `/stats - See your win rates\n\n` +
        `<i>Use responsibly. No guaranteed wins.</i>`;

    // Initialize user in DB
    db.getUser(chatId);

    bot.sendMessage(chatId, welcome, { parse_mode: 'HTML' });
});

bot.onText(/\/signal/, (msg) => {
    const chatId = msg.chat.id;
    const user = db.getUser(chatId);

    // Require completing previous signal FIRST
    if (user.current_signal) {
        return bot.sendMessage(chatId,
            `⚠️ <b>Wait!</b> You have an active signal: <b>${user.current_signal.toUpperCase()}</b>.\n` +
            `Please mark it as WIN or LOSS first.`,
            { parse_mode: 'HTML' }
        );
    }

    sendSignal(chatId, user);
});

bot.onText(/\/stats/, (msg) => {
    const chatId = msg.chat.id;
    const s = db.getUser(chatId);

    const bTotal = s.big_win + s.big_loss;
    const sTotal = s.small_win + s.small_loss;
    const bRate = bTotal ? Math.round((s.big_win / bTotal) * 100) : 0;
    const sRate = sTotal ? Math.round((s.small_win / sTotal) * 100) : 0;

    const statsMsg =
        `📊 <b>Your Statistics</b>\n\n` +
        `🔵 <b>BIG</b>: ${s.big_win} W - ${s.big_loss} L (${bRate}%)\n` +
        `🔴 <b>SMALL</b>: ${s.small_win} W - ${s.small_loss} L (${sRate}%)\n\n` +
        `<i>The bot uses these stats to adjust bias.</i>`;

    bot.sendMessage(chatId, statsMsg, { parse_mode: 'HTML' });
});


// --- ACTION HANDLERS ---

bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const action = query.data; // 'win' or 'loss'
    const user = db.getUser(chatId);

    if (!user.current_signal) {
        return bot.answerCallbackQuery(query.id, { text: "⚠️ No active signal found." });
    }

    const signal = user.current_signal; // 'big' or 'small'

    // Update Stats
    let updates = { current_signal: null };

    if (signal === 'big') {
        if (action === 'win') { updates.big_win = user.big_win + 1; }
        else { updates.big_loss = user.big_loss + 1; }
    } else {
        if (action === 'win') { updates.small_win = user.small_win + 1; }
        else { updates.small_loss = user.small_loss + 1; }
    }

    const updatedUser = db.updateUser(chatId, updates);

    // Edit the old message to remove buttons and show result
    const resultEmoji = action === 'win' ? '✅' : '❌';
    const oldText = query.message.text; // Text from message

    // We can't easily preserve formatting when editing logic-free text, 
    // so we just replace the text or just remove markup. 
    // Let's just remove the keyboard and append result.
    bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
        chat_id: chatId,
        message_id: query.message.message_id
    }).catch(() => { });

    bot.editMessageText(`${oldText}\n\n<b>Result: ${action.toUpperCase()} ${resultEmoji}</b>`, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'HTML'
    }).catch(err => {
        // sometimes oldText structure is weird if came from formatted message, ignore
    });

    bot.answerCallbackQuery(query.id, { text: `Recorded ${action.toUpperCase()}!` });

    // AUTO-SEND NEXT SIGNAL
    // Small delay for UX
    setTimeout(() => {
        sendSignal(chatId, updatedUser);
    }, 1000);
});

console.log("🤖 WinGo Bot is running...");
