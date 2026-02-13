const https = require('https');

// Test Pagination: Page 1, Size 50
const URL = 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json';
// Try query params
const PARAMS = '?pageNo=1&pageSize=50&random=' + Date.now();

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0',
    'Origin': 'https://www.bdgwin888.com',
    'Referer': 'https://www.bdgwin888.com/'
};

https.get(`${URL}${PARAMS}`, { headers }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.data && json.data.list) {
                console.log(`📊 PAGINATION TEST (d.list.length: ${json.data.list.length})`);
                if (json.data.list.length > 0) {
                    console.log(`   First: ${json.data.list[0].issueNumber}`);
                    console.log(`   Last:  ${json.data.list[json.data.list.length - 1].issueNumber}`);
                }
            } else {
                console.log("❌ Pagination Response Invalid", JSON.stringify(json).slice(0, 100));
            }
        } catch (e) {
            console.error("Error:", e.message);
        }
    });
});
