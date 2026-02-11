const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db.json');

// Ensure DB file exists
function init() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ users: {} }, null, 2));
    }
}

// Load the entire database
function load() {
    init();
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading DB:", err);
        return { users: {} };
    }
}

// Save the entire database
function save(data) {
    try {
        // Use a temp file and rename for safer atomic writes (basic version)
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("❌ CRTICAL DB ERROR: Failed to save database file:", err.message);
        console.error("   Ensure the filesystem is writable. Render Free Tier disk is ephemeral but should be writable.");
    }
}

// Get a user object, creating it if it doesn't exist
function getUser(chatId) {
    const db = load();
    if (!db.users[chatId]) {
        db.users[chatId] = {
            big_win: 0,
            big_loss: 0,
            small_win: 0,
            small_loss: 0,
            small_loss: 0,
            current_signal: null, // 'big' or 'small'
            last_msg_id: null, // To edit/remove previous buttons if needed
            next_period: null,
            awaiting_period_input: false,
            // --- LOSS RECOVERY FIELDS ---
            streak: 0,        // Positive = Win Streak, Negative = Loss Streak
            balance: 1000,    // Virtual balance for testing
            history: [],      // Last 10 results (User UI history)
            recovery_mode: false, // High confidence only
            cooldown_until: null,  // Timestamp for panic button

            // --- INTELLIGENT ENGINE FIELDS ---
            game_history: [], // Actual numbers [0, 5, 9, 2...] (Max 200)
            engine_stats: {
                markov: { w: 0, l: 0 },
                dragon: { w: 0, l: 0 },
                zigzag: { w: 0, l: 0 },
                mirror: { w: 0, l: 0 },
                velocity: { w: 0, l: 0 }
            }
        };
        save(db);
    }
    return db.users[chatId];
}

// Update a user object
function updateUser(chatId, updates) {
    const db = load();
    if (!db.users[chatId]) {
        // Initialize if not exists
        getUser(chatId);
        // Reload to get the structure
        const freshDb = load();
        db.users = freshDb.users;
    }

    // Apply updates
    db.users[chatId] = { ...db.users[chatId], ...updates };
    save(db);
    return db.users[chatId];
}

module.exports = {
    getUser,
    updateUser
};
