require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const http = require('http');
const db = require('./db');
const engine = require('./prediction');

// --- CONFIGURATION ---

// --- CONFIGURATION ---
const token = process.env.BOT_TOKEN;
const isPolling = process.env.POLLING !== 'false'; // Defaults to true
const webhookUrl = process.env.WEBHOOK_URL;

if (!token) {
    console.error("❌ ERROR: BOT_TOKEN is not set in environment variables.");
    process.exit(1);
}

// --- HEALTH CHECK SERVER (For Render) ---
// Must start FIRST to prevent "Application exited early" errors
const port = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const status = {
        status: 'running',
        service: 'wingo-bot',
        timestamp: new Date().toISOString(),
        mode: webhookUrl ? 'webhook' : (isPolling ? 'polling' : 'disabled'),
        bot_auth: bot ? (bot.options ? 'initialized' : 'unknown') : 'not_started'
    };
    res.end(JSON.stringify(status, null, 2));
});

server.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Health check server listening on port ${port} (0.0.0.0)`);
});

// --- SELF-PING (Keep Alive) ---
// Render spins down free tier apps after 15 minutes of inactivity.
// We ping ourselves every 14 minutes to stay awake.
const APP_URL = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL; // Auto-set by Render
if (APP_URL) {
    console.log(`⏰ Self-ping setup for: ${APP_URL}`);
    const https = require('https');
    setInterval(() => {
        https.get(APP_URL, (resp) => {
            if (resp.statusCode === 200) {
                console.log("⏰ Self-ping successful (Keep-Alive)");
            } else {
                console.error("⚠️ Self-ping failed:", resp.statusCode);
            }
        }).on("error", (err) => {
            console.error("❌ Self-ping error:", err.message);
        });
    }, 14 * 60 * 1000); // 14 minutes
} else {
    console.log("ℹ️ No APP_URL found. Self-ping is disabled.");
}

let bot;

if (webhookUrl) {
    console.log("🌐 Starting bot in WEBHOOK mode...");
    bot = new TelegramBot(token);
    bot.setWebHook(`${webhookUrl}/bot${token}`);

    bot.on('webhook_error', (error) => {
        console.error(`❌ Webhook Error: ${error.code}`, error);
    });
} else if (isPolling) {
    console.log("🔄 Starting bot in POLLING mode...");

    // Create bot instance
    bot = new TelegramBot(token, { polling: false }); // Start polling manually for better control

    // Explicitly clear any previous webhook to ensure polling works
    bot.deleteWebHook().then(() => {
        console.log("✅ Webhook deleted. Starting polling...");
        bot.startPolling();
    }).catch((err) => {
        console.error("⚠️ Failed to delete webhook (safe to ignore if none existed):", err.message);
        bot.startPolling();
    });

    bot.on('polling_error', (error) => {
        console.error(`❌ Polling Error: ${error.code}`, error.message);
    });
} else {
    console.log("⚠️ Bot logic is DISABLED (POLLING=false and no WEBHOOK_URL).");
    console.log("   The app will stay alive for the health check server.");
}

// Global debug logger
if (bot) {
    bot.getMe().then((me) => {
        console.log(`✅ Bot successfully authenticated as @${me.username}`);
    }).catch((err) => {
        console.error("❌ FAILED to authenticate bot token:", err.message);
        console.error("   Check your BOT_TOKEN in .env file.");
    });

    bot.on('message', (msg) => {
        console.log(`📩 Received message from ${msg.from.first_name} (${msg.chat.id}): ${msg.text}`);
    });
}



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

function getMartingaleMultiplier(streak) {
    if (streak >= 0) return 1;
    const losses = Math.abs(streak);
    // 3-Level Strategy: 1, 3, 9
    if (losses === 1) return 3;
    if (losses === 2) return 9;
    return 1; // Reset after Level 3 failure
}

function sendSignal(chatId, stats, period) {
    try {
        const user = db.getUser(chatId);

        // --- SCHEMA MIGRATION (SAFETY) ---
        if (!user.game_history) user.game_history = [];
        if (!user.learning_state) {
            user.learning_state = { weights: {}, global_error: 0, entropy_flux: 0 };
        }
        // ---------------------------------

        // 1. PANIC BUTTON CHECK
        if (user.cooldown_until && new Date() < new Date(user.cooldown_until)) {
            const remaining = Math.ceil((new Date(user.cooldown_until) - new Date()) / 60000);
            return bot.sendMessage(chatId, `🧊 <b>Cooldown Active</b>\nYou are in panic mode. Take a break.\nCome back in ${remaining} minutes.`);
        }

        // 2. INTELLIGENT PREDICTION ENGINE
        const prediction = engine.predict(user.game_history || [], user);

        // 3. SKIP SIGNAL HANDLING (REMOVED)
        // User requested removal. We now always provide a signal.
        if (prediction.signal === 'skip') {
            // Fallback just in case engine returns skip
            prediction.signal = Math.random() > 0.5 ? 'big' : 'small';
        }

        const signal = prediction.signal; // 'big' or 'small'

        // 4. RECOVERY MODE (Override)
        if (user.recovery_mode && (prediction.grade === 'B' || prediction.grade === 'F')) {
            return bot.sendMessage(chatId, `🛡️ <b>Recovery Mode Active</b>\nSkipping Grade ${prediction.grade} signal.\nWait for a stronger signal.`);
        }

        // 5. MARTINGALE SUGGESTION
        const losses = user.streak < 0 ? Math.abs(user.streak) : 0;
        const level = losses + 1;
        const multiplier = getMartingaleMultiplier(user.streak);

        let betText = `\n💰 Rec. Bet: <b>${multiplier}x</b>`;
        let levelText = ` (Level ${level}/3)`;
        if (level > 3) {
            levelText = ` (⚠️ CYCLE RESET)`;
            betText = `\n💰 Rec. Bet: <b>1x</b> (Reset)`;
        }

        // Persist prediction metadata for learning
        let updates = {
            current_signal: signal,
            active_factors: prediction.factors_used || []
        };
        if (period) {
            updates.next_period = (BigInt(period) + 1n).toString();
        }

        // Persist the migrated fields if they were missing
        if (!stats.game_history || !stats.learning_state) {
            updates.game_history = user.game_history;
            updates.learning_state = user.learning_state;
        }

        db.updateUser(chatId, updates);

        const periodText = period ? `\n📅 Period: <b>${period}</b>` : '';

        const gradeEmoji = prediction.grade === 'S' ? '💎' : (prediction.grade === 'A' ? '🟢' : '🟡');
        const reasonsText = prediction.reasons.length > 0 ? `\n🧠 <b>Analysis:</b> ${prediction.reasons.join(', ')}` : '';

        // Color Emoji
        let colorEmoji = '';
        if (prediction.recommended_color === 'green') colorEmoji = '🟢';
        else if (prediction.recommended_color === 'red') colorEmoji = '🔴';
        else if (prediction.recommended_color === 'violet') colorEmoji = '🟣';

        // V9: Special check for 0 and 5 Violet
        if (prediction.signal === 'small' && prediction.recommended_color === 'red') {
            // 0 is possible
            // colorEmoji += ' (🟣 risk)';
        }

        const text = `🎯 <b>PREDICTION GENERATED</b>${periodText}\n` +
            `📊 Grade: <b>${prediction.grade}</b> ${gradeEmoji} (Conf: ${Math.round(prediction.confidence * 100)}%)\n` +
            `${reasonsText}\n` +
            `🎨 Color: <b>${prediction.recommended_color.toUpperCase()}</b> ${colorEmoji}\n\n` +
            `Bet on: <b>${signal.toUpperCase()}</b> ${signal === 'big' ? '🔵' : '🔴'}` +
            `${betText}${levelText}\n\n` +
            `Please report result:`;

        const opts = {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "0", callback_data: "0" },
                        { text: "1", callback_data: "1" },
                        { text: "2", callback_data: "2" },
                        { text: "3", callback_data: "3" },
                        { text: "4", callback_data: "4" }
                    ],
                    [
                        { text: "5", callback_data: "5" },
                        { text: "6", callback_data: "6" },
                        { text: "7", callback_data: "7" },
                        { text: "8", callback_data: "8" },
                        { text: "9", callback_data: "9" }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, text, opts).catch(err => console.error("Send Error:", err));

    } catch (error) {
        console.error("CRITICAL SIGNAL ERROR:", error);
        bot.sendMessage(chatId, `❌ <b>System Error</b>\nFailed to generate signal.\nReason: ${error.message || 'Unknown'}`, { parse_mode: 'HTML' });
    }
}

// --- COMMAND HANDLERS ---
if (bot) {
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        const user = db.getUser(chatId); // Initialize

        const welcome =
            `👋 <b>Welcome to the Adaptive WinGo Bot!</b>\n\n` +
            `✅ <b>HONESTY POLICY:</b>\n` +
            `• This bot does NOT predict numbers.\n` +
            `• It manages your RISK and EMOTIONS.\n\n` +
            `<b>New Features:</b>\n` +
            `• 🛡️ /recovery - Toggle Safe Mode\n` +
            `• 🧊 /cooldown - Panic Button (1hr lock)\n` +
            `• 💰 /setbalance - Set virtual wallet`;

        bot.sendMessage(chatId, welcome, { parse_mode: 'HTML' });

        // IMMEDIATE PROMPT FOR PERIOD
        if (!user.next_period) {
            db.updateUser(chatId, { awaiting_period_input: true });
            setTimeout(() => {
                bot.sendMessage(chatId, `🔢 <b>Setup Required</b>\nPlease enter the current <b>Period Number</b> (e.g., 2024012601) to start.`);
            }, 1000);
        }
    });

    bot.onText(/\/recovery/, (msg) => {
        const chatId = msg.chat.id;
        const user = db.getUser(chatId);
        const newState = !user.recovery_mode;
        db.updateUser(chatId, { recovery_mode: newState });
        bot.sendMessage(chatId, `🛡️ <b>Recovery Mode: ${newState ? 'ON' : 'OFF'}</b>\n${newState ? 'I will only signal on high confidence.' : 'Standard signaling.'}`, { parse_mode: 'HTML' });
    });

    bot.onText(/\/cooldown/, (msg) => {
        const chatId = msg.chat.id;
        const until = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        db.updateUser(chatId, { cooldown_until: until.toISOString() });
        bot.sendMessage(chatId, `🧊 <b>Panic Mode Activated</b>\nBot is locked for 1 hour. Go take a walk.`, { parse_mode: 'HTML' });
    });

    bot.onText(/\/setbalance (.+)/, (msg, match) => {
        const chatId = msg.chat.id;
        const amount = parseFloat(match[1]);
        if (isNaN(amount)) return bot.sendMessage(chatId, "⚠️ Invalid amount.");
        db.updateUser(chatId, { balance: amount });
        bot.sendMessage(chatId, `💰 Balance set to <b>$${amount}</b>`, { parse_mode: 'HTML' });
    });

    // Handle generic text messages (for Period Number input)
    bot.on('message', (msg) => {
        // Ignore commands
        if (msg.text && msg.text.startsWith('/')) return;

        const chatId = msg.chat.id;
        const user = db.getUser(chatId);

        if (user.awaiting_period_input) {
            const input = msg.text.trim();
            // Basic validation: must be numeric
            if (!/^\d+$/.test(input)) {
                return bot.sendMessage(chatId, "⚠️ Invalid format. Please enter a valid number for the Period (e.g., 2024012601).");
            }

            // Save and Trigger Signal
            db.updateUser(chatId, {
                awaiting_period_input: false,
                // We don't save next_period here, we pass it to sendSignal which will increment it
            });

            bot.sendMessage(chatId, "✅ Period set! Generating signal...");
            sendSignal(chatId, user, input);
        }
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

        // Check if we know the period
        if (user.next_period) {
            sendSignal(chatId, user, user.next_period);
        } else {
            // Ask for it
            db.updateUser(chatId, { awaiting_period_input: true });
            bot.sendMessage(chatId,
                `🔢 <b>Enter Period Number</b>\n` +
                `Please reply with the current <b>Period Number</b>.`,
                { parse_mode: 'HTML' }
            );
        }
    });

    bot.onText(/\/stats/, (msg) => {
        const chatId = msg.chat.id;
        const s = db.getUser(chatId);

        const bTotal = s.big_win + s.big_loss;
        const bRate = bTotal ? Math.round((s.big_win / bTotal) * 100) : 0;

        const statsMsg =
            `📊 <b>Your Statistics</b>\n\n` +
            `💰 <b>Balance</b>: $${s.balance || 0}\n` +
            `🔥 <b>Streak</b>: ${s.streak > 0 ? '+' + s.streak + ' Wins' : s.streak + ' Losses'}\n\n` +
            `🔵 <b>BIG</b>: ${s.big_win} W - ${s.big_loss} L\n` +
            `🔴 <b>SMALL</b>: ${s.small_win} W - ${s.small_loss} L`;

        bot.sendMessage(chatId, statsMsg, { parse_mode: 'HTML' });
    });

    bot.onText(/\/reset/, (msg) => {
        const chatId = msg.chat.id;
        db.updateUser(chatId, {
            current_signal: null,
            awaiting_period_input: false,
            next_period: null,
            streak: 0,
            cooldown_until: null
        });
        bot.sendMessage(chatId, "✅ <b>Reset Complete!</b>", { parse_mode: 'HTML' });
    });
}


// --- ACTION HANDLERS ---

if (bot) {
    bot.on('callback_query', (query) => {
        const chatId = query.message.chat.id;
        const action = query.data; // 'win', 'loss', 'report_big', 'report_small'
        const user = db.getUser(chatId);

        if (!user.current_signal) {
            return bot.answerCallbackQuery(query.id, { text: "⚠️ No active signal found." });
        }

        // --- HANDLE REPORT (SKIP) ---
        if (action === 'report_big' || action === 'report_small') {
            if (user.current_signal !== 'skip') {
                return bot.answerCallbackQuery(query.id, { text: "⚠️ Invalid action for this signal." });
            }

            // Just update history, no stats/streak changes
            let actualResult = action === 'report_big' ? 'big' : 'small';
            let updates = { current_signal: null };

            let gameHistory = user.game_history || [];
            gameHistory.push(actualResult);
            if (gameHistory.length > engine.MAX_HISTORY) gameHistory.shift();
            updates.game_history = gameHistory;

            // Update history (UI) as "Skipped"
            let history = user.history || [];
            history.push({ result: 'skip', signal: actualResult });
            if (history.length > 10) history.shift();
            updates.history = history;

            const updatedUser = db.updateUser(chatId, updates);

            // Edit message
            const resultEmoji = actualResult === 'big' ? '🔵' : '🔴';
            const oldText = query.message.text;
            bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: query.message.message_id }).catch(() => { });
            bot.editMessageText(`${oldText}\n\n<b>Result Reported: ${actualResult.toUpperCase()} ${resultEmoji}</b>`, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: 'HTML'
            }).catch(() => { });

            // After reporting number for a skip, we can't easily auto-send next without a period.
            // But we can reset state.
            db.updateUser(chatId, { current_signal: null });
            bot.answerCallbackQuery(query.id, { text: `Recorded ${actualResult}!` });
            return;
        }

        // --- HANDLE NUMBER REPORTING ---
        if (!isNaN(parseInt(action)) && parseInt(action) >= 0 && parseInt(action) <= 9) {
            const num = parseInt(action);
            const actualBS = num >= 5 ? 'big' : 'small';
            const signal = user.current_signal;
            const isWin = (signal === actualBS);

            let updates = { current_signal: null };
            let currentStreak = user.streak || 0;
            let balance = user.balance || 1000;
            let betAmount = 10;

            if (currentStreak < 0) {
                betAmount = betAmount * getMartingaleMultiplier(currentStreak);
            }

            if (isWin) {
                if (signal === 'big') updates.big_win = (user.big_win || 0) + 1;
                else updates.small_win = (user.small_win || 0) + 1;
                updates.streak = currentStreak < 0 ? 1 : currentStreak + 1;
                updates.balance = balance + (betAmount * 0.92);
            } else {
                if (signal === 'big') updates.big_loss = (user.big_loss || 0) + 1;
                else updates.small_loss = (user.small_loss || 0) + 1;
                updates.streak = currentStreak > 0 ? -1 : currentStreak - 1;
                updates.balance = balance - betAmount;
            }

            // Update Game History with EXACT NUMBER
            let gameHistory = user.game_history || [];
            gameHistory.push(num);
            if (gameHistory.length > engine.MAX_HISTORY) gameHistory.shift();
            updates.game_history = gameHistory;

            // Updated History (UI)
            let history = user.history || [];
            history.push({ result: isWin ? 'win' : 'loss', signal: signal, num: num });
            if (history.length > 10) history.shift();
            updates.history = history;

            // SAW Learning
            const activeFactors = user.active_factors || [];
            const stats = user.engine_stats || {};
            activeFactors.forEach(f => {
                const lowF = (f || "").toLowerCase();
                const key = lowF.includes('mark') ? 'markov' :
                    (lowF.includes('drag') ? 'dragon' :
                        (lowF.includes('zig') ? 'zigzag' :
                            (lowF.includes('velo') ? 'velocity' :
                                (lowF.includes('clut') ? 'cluster' : 'mirror'))));
                if (!stats[key]) stats[key] = { w: 0, l: 0 };
                if (isWin) stats[key].w += 1;
                else stats[key].l += 1;
            });
            updates.engine_stats = stats;
            updates.active_factors = [];

            const updatedUser = db.updateUser(chatId, updates);

            // UI Edit
            const resultEmoji = isWin ? '✅' : '❌';
            const oldText = query.message.text;
            bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: query.message.message_id }).catch(() => { });
            bot.editMessageText(`${oldText}\n\n<b>Result: ${num} (${actualBS.toUpperCase()}) ${resultEmoji}</b>\n(Bal: $${Math.round(updatedUser.balance)})`, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: 'HTML'
            }).catch(() => { });

            bot.answerCallbackQuery(query.id, { text: `Recorded Number ${num}!` });

            setTimeout(() => {
                sendSignal(chatId, updatedUser, updatedUser.next_period);
            }, 1500);
            return;
        }

        // 4. STOP LOSS ALERT
        if (updatedUser.streak <= -3) {
            bot.sendMessage(chatId, `🛑 <b>STOP LOSS ALERT</b>\nYou have lost 3 times in a row.\n<b>Take a break or use /recovery mode.</b>`, { parse_mode: 'HTML' });
        }

        // AUTO-SEND NEXT SIGNAL
        setTimeout(() => {
            sendSignal(chatId, updatedUser, updatedUser.next_period);
        }, 1500);
    });
}

console.log("🤖 WinGo Bot is running...");

// --- GRACEFUL SHUTDOWN ---


async function shutdown(signal) {
    console.log(`\n🛑 Received ${signal}. Shutting down bot...`);

    try {
        if (bot && bot.isPolling()) {
            console.log("⏳ Stopping polling...");
            await bot.stopPolling();
        }

        if (webhookUrl && bot) {
            console.log("⏳ Deleting webhook...");
            await bot.deleteWebHook();
        }

        console.log("✅ Bot stopped gracefully.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error during shutdown:", err);
        process.exit(1);
    }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
