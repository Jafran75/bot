const https = require('https');

const URL = 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json';

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0',
    'Origin': 'https://www.bdgwin888.com',
    'Referer': 'https://www.bdgwin888.com/'
};

https.get(`${URL}?ts=${Date.now()}`, { headers }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.data && json.data.list) {
                console.log("📊 HISTORY DUMP:");
                const list = json.data.list; // Newest first
                list.slice(0, 20).forEach((item, index) => {
                    const num = parseInt(item.number);
                    const size = num <= 4 ? 'SMALL' : 'BIG';
                    console.log(`#${index} [${item.issueNumber}] ${num} (${size})`);
                });

                // Quick streak check
                let streak = 1;
                let lastSize = parseInt(list[0].number) <= 4 ? 'SMALL' : 'BIG';
                for (let i = 1; i < list.length; i++) {
                    const s = parseInt(list[i].number) <= 4 ? 'SMALL' : 'BIG';
                    if (s === lastSize) streak++;
                    else break;
                }
                console.log(`\n🔥 Current Streak: ${streak} ${lastSize}`);
            }
        } catch (e) {
            console.error("Error:", e.message);
        }
    });
});
