const https = require('https');

const URL = 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?item=10';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': 'https://www.bdgwin888.com/'
};

https.get(URL, { headers }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.data && json.data.list) {
                const list = json.data.list.reverse(); // Oldest first
                console.log("📊 LAST 10 ROUNDS (Oldest -> Newest):");

                let lastSize = '';
                let streak = 0;

                list.forEach((item, index) => {
                    const num = parseInt(item.number);
                    const size = num <= 4 ? 'SMALL' : 'BIG';
                    const color = (num === 0 || num === 5) ? 'VIOLET' : (num % 2 === 0 ? 'RED' : 'GREEN'); // Rough approximation

                    if (size === lastSize) streak++;
                    else streak = 1;
                    lastSize = size;

                    console.log(`#${index + 1} [${item.issueNumber.slice(-4)}] Result: ${num} (${size}) - Streak: ${streak}`);
                });

                console.log(`\n🔥 Current Trend: ${lastSize} x ${streak}`);
            }
        } catch (e) { console.log("Error", e.message); }
    });
});
