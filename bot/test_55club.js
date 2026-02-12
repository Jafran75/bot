const https = require('https');

// 55club likely uses similar API structure if it's the same engine.
// Common variations for these white-label sites:
const domains = [
    '55club.game',
    'api.55club.game',
    'api.55club.com',
    '55club.com',
    'api.ar-lottery01.com' // Maybe they share the EXACT same API host?
];

const paths = [
    '/WinGo/WinGo_30S/GetHistoryIssuePage?pageNo=1&pageSize=1',
    '/api/WinGo/WinGo_30S/GetHistoryIssuePage?pageNo=1&pageSize=1',
    '/WinGo/GetGameInfo',
    '/api/webapi/GetGameInfo'
];

function probe(domain, path) {
    const options = {
        hostname: domain,
        path: path,
        method: 'GET',
        timeout: 5000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Content-Type': 'application/json'
        }
    };

    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (c) => body += c);
        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log(`[✅ HIT] ${domain}${path}`);
                console.log(`Response:`, body.substring(0, 300));
            } else {
                console.log(`[❌ ${res.statusCode}] ${domain}${path}`);
            }
        });
    });

    req.on('error', (e) => {
        // console.log(`[ERR] ${domain}: ${e.message}`);
    });
    req.on('timeout', () => req.destroy());
    req.end();
}

console.log("🚀 Probing 55club & Correlation Endpoints...");
domains.forEach(d => {
    paths.forEach(p => probe(d, p));
});
