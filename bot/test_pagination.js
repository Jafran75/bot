const https = require('https');

const URL = 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json';

// Fetch Page 1 and Page 2
const pages = [1, 2];
const results = {};

function fetchPage(page) {
    const params = `?pageNo=${page}&pageSize=10&random=${Date.now()}`;
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://www.bdgwin888.com/'
    };

    https.get(`${URL}${params}`, { headers }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.data && json.data.list) {
                    console.log(`PAGE ${page}: First Item = ${json.data.list[0].issueNumber}`);
                    results[page] = json.data.list[0].issueNumber;
                }
            } catch (e) { console.log(`Page ${page} Error`); }
        });
    });
}

fetchPage(1);
setTimeout(() => fetchPage(2), 1000);
