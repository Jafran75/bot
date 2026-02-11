const https = require('https');

function postRequest(path, label) {
    const data = JSON.stringify({ pageNo: 2, pageSize: 10 });
    const options = {
        hostname: 'api.ar-lottery01.com',
        path: path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = https.request(options, (res) => {
        console.log(`[${label}] Path: ${path} | Status: ${res.statusCode}`);
    });

    req.on('error', (e) => {
        console.error(`[${label}] Error: ${e.message}`);
    });

    req.write(data);
    req.end();
}

const paths = [
    '/api/WinGo/WinGo_30S/GetHistoryIssuePage',
    '/api/WinGo/GetHistoryIssuePage',
    '/api/Lottery/GetWinGoHistory',
    '/api/WinGo/WinGo_30S/GetIssue',
    '/api/WinGo/GetIssue',
    '/api/Game/GetHistory',
    '/api/WinGo/WinGo_30S/history',
    '/WinGo/WinGo_30S/GetHistoryIssuePage' // Try on api domain too
];

paths.forEach((p, i) => postRequest(p, `Test-${i}`));
