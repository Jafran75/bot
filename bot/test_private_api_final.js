require('dotenv').config();
const https = require('https');

const TOKEN = process.env.USER_TOKEN;
const API_BASE = 'https://h5.ar-lottery06.com/api';
const TS = Date.now();

// Try strictly what the user browser might send
const ENDPOINTS = [
    // WinGo 1Min standard guess
    { method: 'POST', url: `${API_BASE}/Lottery/GetGameInfo`, body: { gameCode: '1', language: 'en' } },
    { method: 'POST', url: `${API_BASE}/Lottery/GetGameInfo`, body: { gameCode: '101', language: 'en' } },
    { method: 'POST', url: `${API_BASE}/Lottery/GetGameInfo`, body: { gameCode: 'WinGo_1Min', language: 'en' } },

    // GET with no content-type
    { method: 'GET', url: `${API_BASE}/Lottery/GetGameList?language=en&ts=${TS}` },

    // WebSocket URL - The Holy Grail
    { method: 'POST', url: `${API_BASE}/Lottery/GetWingoLiveUrl`, body: { gameCode: '1', language: 'en' } },
    { method: 'GET', url: `${API_BASE}/Lottery/GetWingoLiveUrl?gameCode=1&language=en&ts=${TS}` },
];

function makeRequest(endpoint) {
    return new Promise((resolve) => {
        const url = endpoint.url;
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            'Origin': 'https://h5.ar-lottery06.com',
            'Referer': 'https://h5.ar-lottery06.com/',
            'Authorization': `Bearer ${TOKEN}`
        };

        // Only add Content-Type for POST
        if (endpoint.method === 'POST') {
            headers['Content-Type'] = 'application/json;charset=UTF-8';
        }

        console.log(`\n🚀 Testing: ${endpoint.method} ${url}`);

        const req = https.request(url, { method: endpoint.method, headers }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`   [${res.statusCode}] Length: ${data.length}`);
                try {
                    const json = JSON.parse(data);
                    if (json.code === 0 || json.msg === 'Success') {
                        console.log(`   ✅ SUCCESS!`, JSON.stringify(json).slice(0, 200));
                    } else {
                        console.log(`   ❌ Error: ${json.msg} (Code: ${json.code})`);
                    }
                } catch (e) {
                    // console.log(`   Response: ${data}`);
                }
                resolve();
            });
        });

        req.on('error', e => resolve());

        if (endpoint.method === 'POST' && endpoint.body) {
            req.write(JSON.stringify(endpoint.body));
        }
        req.end();
    });
}

(async () => {
    for (const ep of ENDPOINTS) {
        await makeRequest(ep);
    }
})();
