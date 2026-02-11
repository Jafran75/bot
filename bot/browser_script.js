/* WINGO 30S BRIDGE - SMART FINDER */
const CONFIG = {
    API_URL: 'https://boot-4xtj.onrender.com',
    CHAT_ID: '6856847067',
    RESULT_SELECTOR: '.record-body-num' // Proven to work (10 found)
};

let lastSent = '';
console.log("🚀 Bridge Started! Searching for Period...");

// Helper: Scan page for long number (Period)
function findPeriod() {
    // Strategy 1: Look for common classes (just in case)
    const candidates = document.querySelectorAll('div, span, p');
    for (let el of candidates) {
        const txt = el.innerText;
        // Check for 10+ digits without spaces in between (like '2026...')
        const match = txt.match(/\b\d{12,}\b/);
        if (match) {
            // Filter out super long text blocks, keep only short labels
            if (txt.length < 50) return match[0];
        }
    }
    return null;
}

setInterval(() => {
    try {
        // 1. Get Result (We know this selector works)
        const results = document.querySelectorAll(CONFIG.RESULT_SELECTOR);

        if (results.length > 0) {
            const rEl = results[0]; // Top Result
            const result = rEl.innerText.trim();

            // 2. Find Period (Smart Search)
            const period = findPeriod();

            if (period) {
                // Validation: Period changed? Result is 0-9?
                if (period !== lastSent && /^[0-9]$/.test(result)) {
                    console.log(`📡 Sending: ${period} -> ${result}`);

                    fetch(`${CONFIG.API_URL}/webhook/wingo`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ period, result, chatId: CONFIG.CHAT_ID })
                    })
                        .then(r => r.json())
                        .then(d => console.log(`✅ Success! Next: ${d.next}`))
                        .catch(e => console.error("❌ Send Failed:", e));

                    lastSent = period;
                }
            } else {
                // console.log("Waiting for Period number to appear...");
            }
        }
    } catch (e) {
        console.error("Bridge Error:", e);
    }
}, 1000);
