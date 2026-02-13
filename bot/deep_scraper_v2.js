require('dotenv').config();
const fs = require('fs');

const TOKEN = process.env.USER_TOKEN;
const URL = 'https://h5.ar-lottery06.com/api/Lottery/GetHistoryIssuePage';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0',
    'Origin': 'https://h5.ar-lottery06.com',
    'Referer': 'https://h5.ar-lottery06.com/',
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json;charset=UTF-8'
};

async function scrape(code) {
    console.log(`\n🚀 Scraping Code ${code}...`);
    try {
        const payload = {
            gameCode: code,
            pageIndex: 1,
            pageSize: 20, // Try 20 first
            language: 'en'
        };

        const res = await fetch(URL, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            if (data.code === 0) {
                console.log(`✅ SUCCESS (Code ${code}): Found ${data.data.list.length} items`);
                if (data.data.list.length > 0) {
                    console.log(`   Latest: ${data.data.list[0].issueNumber}`);
                }

                // Save to file
                const filename = `history_${code}.json`;
                fs.writeFileSync(filename, JSON.stringify(data.data.list, null, 2));
                console.log(`   Saved to ${filename}`);
                // If successful, try deeper scrape
                if (data.data.list.length === 20) {
                    await scrapeDeep(code);
                }
            } else {
                console.log(`❌ Failed (Code ${code}): ${data.msg}`);
            }
        } else {
            console.log(`❌ HTTP Error (Code ${code}): ${res.status}`);
        }
    } catch (e) {
        console.log(`❌ Error (Code ${code}): ${e.message}`);
    }
}

async function scrapeDeep(code) {
    console.log(`   🌊 Deep Scraping 1000 items for Code ${code}...`);
    let allHistory = [];
    for (let page = 1; page <= 5; page++) { // Get 5 pages of 50 = 250 items for start
        try {
            const res = await fetch(URL, {
                method: 'POST',
                headers: HEADERS,
                body: JSON.stringify({ gameCode: code, pageIndex: page, pageSize: 50, language: 'en' })
            });
            const data = await res.json();
            if (data.code === 0 && data.data.list) {
                allHistory = allHistory.concat(data.data.list);
                console.log(`      Page ${page}: Got ${data.data.list.length} items`);
            } else {
                break;
            }
        } catch (e) { console.log("      Error in Deep Scrape"); break; }
    }
    const filename = `history_deep_${code}.json`;
    fs.writeFileSync(filename, JSON.stringify(allHistory, null, 2));
    console.log(`   ✅ Deep History Saved: ${allHistory.length} items to ${filename}`);
}

(async () => {
    // Try potential game codes
    const CODES = [1, 101, 'WinGo_1Min', 'WinGo_30S'];
    for (const c of CODES) {
        await scrape(c);
    }
})();
