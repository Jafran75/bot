const https = require('https');

function getRequest(path, label) {
    const options = {
        hostname: 'draw.ar-lottery01.com',
        path: path,
        method: 'GET'
    };

    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log(`[${label}] ✅ HIT! Status: ${res.statusCode}`);
                console.log(`[${label}] Body:`, body.substring(0, 300));
            } else {
                console.log(`[${label}] ❌ Status: ${res.statusCode}`);
            }
        });
    });

    req.on('error', (e) => {
        // console.error(`[${label}] Error: ${e.message}`);
    });

    req.end();
}

// Probing for "Live" / "Current" data
const paths = [
    '/WinGo/WinGo_30S/GetGameInfo',
    '/WinGo/WinGo_30S/GetGameLive',
    '/WinGo/WinGo_30S/GetIssue',
    '/WinGo/WinGo_30S/GetCurrentIssue',
    '/WinGo/WinGo_30S/GetTime',
    '/WinGo/WinGo_30S/Time',
    '/WinGo/WinGo_30S/GameInfo',
    '/WinGo/WinGo_30S/GetPresaleIssue', // Common in these APIs
    '/WinGo/WinGo_30S/GetGameBS',
    '/api/WinGo/WinGo_30S/GetGameInfo'
];

paths.forEach((p, i) => getRequest(p, `Probe-${i}`));
