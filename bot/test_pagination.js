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
            const preview = body.substring(0, 200);
            // Check if we got Page 1 data (starts with latest) or Page 2
            console.log(`[${label}] Status: ${res.statusCode} | Data: ${preview}`);
        });
    });

    req.on('error', (e) => {
        console.error(`[${label}] Error: ${e.message}`);
    });

    req.end();
}

// Baseline
getRequest('/WinGo/WinGo_30S/GetHistoryIssuePage.json', 'Baseline');

// Variations
getRequest('/WinGo/WinGo_30S/GetHistoryIssuePage.json?pageNo=2', 'pageNo=2');
getRequest('/WinGo/WinGo_30S/GetHistoryIssuePage.json?PageNo=2', 'PageNo=2');
getRequest('/WinGo/WinGo_30S/GetHistoryIssuePage.json?page=2', 'page=2');
getRequest('/WinGo/WinGo_30S/GetHistoryIssuePage.json?no=2', 'no=2');
getRequest('/WinGo/WinGo_30S/GetHistoryIssuePage.json?index=2', 'index=2');
getRequest('/WinGo/WinGo_30S/GetHistoryIssuePage.json?offset=10', 'offset=10');
getRequest('/WinGo/WinGo_30S/GetHistoryIssuePage.json?start=10', 'start=10');
getRequest('/WinGo/WinGo_30S/GetHistoryIssuePage.json?size=20', 'size=20');
