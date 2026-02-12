const https = require('https');

// Common white-label gambling sites that might share the engine
const targets = [
    { domain: '55club.game', name: '55Club' },
    { domain: 'in999.game', name: 'IN999' },
    { domain: 'bdgwin.com', name: 'BDGWin (Target)' }, // For Comparison
    { domain: 'damangames.com', name: 'Daman' },
    { domain: 'tcglottery.com', name: 'TCG' },
    { domain: 'api.55club.game', name: 'Api-55' },
    { domain: 'api.bdgwin.com', name: 'Api-BDG' },
    { domain: 'api.ar-lottery01.com', name: 'Api-AR (Known)' } // The one we use
];

const paths = [
    '/WinGo/WinGo_30S/GetHistoryIssuePage?pageNo=1&pageSize=1',
    '/api/WinGo/WinGo_30S/GetHistoryIssuePage?pageNo=1&pageSize=1',
    '/api/webapi/GetGameInfo'
];

function check(target) {
    paths.forEach(path => {
        const options = {
            hostname: target.domain,
            path: path,
            method: 'GET',
            timeout: 3000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(body);
                        const list = json.data?.list || [];
                        if (list.length > 0) {
                            const issue = list[0].issueNumber;
                            const time = json.serviceTime || 'N/A';
                            console.log(`[✅ HIT] ${target.name} (${target.domain})`);
                            console.log(`   Issue: ${issue}`);
                            console.log(`   Time:  ${time}`);
                            console.log(`   Diff:  ${Date.now() - parseInt(time)}ms lag`);
                        }
                    } catch (e) {
                        // Not JSON or diff format
                        // console.log(`[⚠️ Partial] ${target.name}: ${body.substring(0,50)}`);
                    }
                }
            });
        });

        req.on('error', (e) => { }); // Silent fail
        req.on('timeout', () => req.destroy());
        req.end();
    });
}

console.log("🔍 Scanning Gambling Network for Latency Arbitrage...");
targets.forEach(t => check(t));
