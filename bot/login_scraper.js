require('dotenv').config();
const fs = require('fs');

const HISTORY_URL = 'https://h5.ar-lottery06.com/api/Lottery/GetHistoryIssuePage';

const COMMON_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0',
    'Origin': 'https://h5.ar-lottery06.com',
    'Referer': 'https://h5.ar-lottery06.com/',
    'Content-Type': 'application/json;charset=UTF-8'
};

async function tryLogin(url, phone, password) {
    console.log(`\n🔑 Trying Login at ${url}...`);
    try {
        const payload = {
            phone: phone,
            password: password,
            language: 'en'
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: COMMON_HEADERS,
            body: JSON.stringify(payload)
        });

        console.log(`   Status: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log(`   Response Body: ${text.substring(0, 150)}...`);

        try {
            const data = JSON.parse(text);
            if (data.code === 0 || data.msg === 'Success' || (data.data && data.data.token)) {
                console.log("✅ Login Success!");
                const token = data.data.token || data.token;
                console.log("   Token Found!");
                return token;
            } else {
                console.error("❌ Login Failed (API Reason):", data.msg || data);
            }
        } catch (e) {
            console.error("❌ JSON Parse Error:", e.message);
        }
    } catch (e) {
        console.error("❌ Network Error:", e.message);
    }
    return null;
}

async function login() {
    const phone = process.env.USER_PHONE;
    const password = process.env.USER_PASS;

    if (!phone || !password) {
        console.log("❌ Missing USER_PHONE or USER_PASS in .env");
        return null;
    }

    // Try multiple endpoints known for Wingo apps
    const endpoints = [
        'https://h5.ar-lottery06.com/api/webapi/Account/Login',
        'https://h5.ar-lottery06.com/api/webapi/Login',
        'https://h5.ar-lottery06.com/api/Account/Login',
        'https://www.bdgwin888.com/api/webapi/Account/Login',
        'https://www.bdgwin888.com/api/webapi/Login',
        'https://api.bdgwin888.com/api/webapi/Account/Login',
        'https://www.bdgwin888.com/#/login'
    ];

    for (const url of endpoints) {
        const token = await tryLogin(url, phone, password);
        if (token) return token;
    }
    return null;
}

async function scrapeDeep(token, code) {
    console.log(`\n🌊 Deep Scraping Code ${code}...`);
    let allHistory = [];
    const headers = { ...COMMON_HEADERS, 'Authorization': `Bearer ${token}` };

    for (let page = 1; page <= 5; page++) {
        try {
            const payload = { gameCode: code, pageIndex: page, pageSize: 50, language: 'en' };
            const res = await fetch(HISTORY_URL, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                console.log(`   Scrape Error Page ${page}: ${res.status}`);
                break;
            }

            const data = await res.json();
            if (data.code === 0 && data.data && data.data.list) {
                allHistory = allHistory.concat(data.data.list);
                console.log(`      Page ${page}: Got ${data.data.list.length} items`);
            } else {
                console.log(`      End: ${data.msg}`);
                break;
            }
        } catch (e) { break; }
    }

    if (allHistory.length > 0) {
        const filename = `history_full_${code}.json`;
        fs.writeFileSync(filename, JSON.stringify(allHistory, null, 2));
        console.log(`   ✅ Saved ${filename}`);
    }
}

(async () => {
    const token = await login();
    if (token) {
        await scrapeDeep(token, 1);
        await scrapeDeep(token, 'WinGo_30S');
    } else {
        console.log("\n❌ All login attempts failed. Please check phone/password or verify if 'bdgwin888.com' is the correct site.");
    }
})();
