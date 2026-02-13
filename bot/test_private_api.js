require('dotenv').config();
const https = require('https');

const TOKEN = process.env.USER_TOKEN;

// Testing Draw Server (Static JSON?)
// Xo="https://draw.ar-lottery06.com"
// Endpoint: /<lotteryCode>/<gameCode>.json
const DRAW_BASE = 'https://draw.ar-lottery06.com';
const API_BASE = 'https://h5.ar-lottery06.com/api';
const TS = Date.now();

const ENDPOINTS = [
    { method: 'GET', url: `${DRAW_BASE}/WinGo_1Min/1.json?ts=${TS}`, label: 'Draw-WinGo-1' },
    { method: 'GET', url: `${DRAW_BASE}/WinGo_1min/1.json?ts=${TS}`, label: 'Draw-WinGo-1-lower' },
    { method: 'GET', url: `${DRAW_BASE}/1/1.json?ts=${TS}`, label: 'Draw-1-1' },
    { method: 'GET', url: `${API_BASE}/Lottery/GetGameList?language=en`, label: 'API-GameList' }
];

function makeRequest(endpoint) {
    return new Promise((resolve) => {
        const url = endpoint.url;
        const options = {
            method: endpoint.method,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
                'Origin': 'https://h5.ar-lottery06.com',
                'Referer': 'https://h5.ar-lottery06.com/',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            }
        };

        console.log(`\n🚀 Testing: ${endpoint.label} -> ${url}`);

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`   [${res.statusCode}] Length: ${data.length}`);
                try {
                    const json = JSON.parse(data);
                    if (json.code === 0 || json.msg === 'Success' || json.data) {
                        console.log(`   ✅ SUCCESS!`);
                        if (json.data && json.data.issueNumber) {
                            console.log(`   -> Issue: ${json.data.issueNumber}`);
                            console.log(`   -> Time: ${json.data.startTime} - ${json.data.endTime}`);
                        } else {
                            console.log(`   -> Data:`, JSON.stringify(json).slice(0, 100));
                        }
                    } else {
                        console.log(`   ❌ API Error:`, JSON.stringify(json));
                    }
                } catch (e) {
                    console.log(`   ⚠️ Response (Not JSON): ${data.slice(0, 300)}`);
                }
                resolve();
            });
        });

        req.on('error', e => {
            console.log(`   ❌ Network Error: ${e.message}`);
            resolve();
        });

        req.end();
    });
}

(async () => {
    if (!TOKEN) {
        console.error("❌ NO USER_TOKEN FOUND IN .env");
        process.exit(1);
    }
    console.log("🔒 Authenticated API Test Started...");
    console.log(`🔑 Token: ${TOKEN.slice(0, 10)}...`);

    for (const ep of ENDPOINTS) {
        await makeRequest(ep);
    }
})();
