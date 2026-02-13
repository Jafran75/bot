const fs = require('fs');
const https = require('https');

const URL = 'https://www.bdgwin888.com/';

https.get(URL, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        console.log(`Length: ${data.length}`);
        fs.writeFileSync('site.html', data);

        // Extract JS
        const jsMatches = data.match(/src="([^"]+\.js)"/g);
        if (jsMatches) {
            console.log("JS Files Found:", jsMatches);
            jsMatches.forEach(match => {
                const jsUrl = match.match(/src="([^"]+)"/)[1];
                let fullUrl = jsUrl.startsWith('http') ? jsUrl : URL + jsUrl.replace(/^\//, '');
                // Download JS
                https.get(fullUrl, (jsRes) => {
                    let jsData = '';
                    jsRes.on('data', c => jsData += c);
                    jsRes.on('end', () => {
                        const filename = jsUrl.split('/').pop().split('?')[0];
                        fs.writeFileSync(filename, jsData);
                        console.log(`Saved ${filename}`);

                        // Scan for API
                        if (jsData.includes('/api/')) {
                            console.log(`API Usage in ${filename}:`);
                            const apis = jsData.match(/\/api\/[a-zA-Z0-9_/]+/g);
                            if (apis) console.log([...new Set(apis)].join('\n'));
                        }
                    });
                });
            });
        }
    });
});
