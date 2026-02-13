require('dotenv').config();
const fs = require('fs');

const TOKEN = process.env.USER_TOKEN;
const BASE_URL = 'https://h5.ar-lottery06.com/api/Lottery/GetHistoryIssuePage';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0',
    'Origin': 'https://h5.ar-lottery06.com',
    'Referer': 'https://h5.ar-lottery06.com/',
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
};

async function scrape(code) {
    console.log(`\n🚀 Scraping Code ${code} (GET)...`);
    const params = `?gameCode=${code}&pageIndex=1&pageSize=20&language=en&random=${Date.now()}`;
    const url = `${BASE_URL}${params}`;

    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: HEADERS
        });

        if (res.ok) {
            const data = await res.json();
            if (data.code === 0) {
                console.log(`✅ SUCCESS (Code ${code}): Found ${data.data.list.length} items`);
                console.log(`   Latest: ${data.data.list[0].issueNumber}`);

                // Deep Scrape
                await scrapeDeep(code);
            } else {
                console.log(`❌ Failed (Code ${code}): ${data.msg} (Code: ${data.code})`);
            }
        } else {
            console.log(`❌ HTTP Error (Code ${code}): ${res.status}`);
        }
    } catch (e) {
        console.log(`❌ Error: ${e.message}`);
    }
}

async function scrapeDeep(code) {
    console.log(`   🌊 Deep Scraping...`);
    let allHistory = [];
    // Try 5 pages
    for (let i = 1; i <= 5; i++) {
        const params = `?gameCode=${code}&pageIndex=${i}&pageSize=50&language=en`;
        const res = await fetch(`${BASE_URL}${params}`, { headers: HEADERS });
        const json = await res.json();
        if (json.data && json.data.list) {
            allHistory = allHistory.concat(json.data.list);
            console.log(`      Page ${i}: Got ${json.data.list.length}`);
        }
    }
    fs.writeFileSync(`history_deep_${code}.json`, JSON.stringify(allHistory, null, 2));
    console.log(`   ✅ Saved ${allHistory.length} items.`);
}

(async () => {
    // Try code 1 and 101 and WinGo_1Min
    const CODES = [1, 101, 'WinGo_1Min', 'WinGo_30S'];
    for (const c of CODES) {
        await scrape(c);
        await new Promise(r => setTimeout(r, 1000));
    }
})();
