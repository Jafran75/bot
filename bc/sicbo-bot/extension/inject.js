(function () {
    console.log("%c🔥 SICBO CHROME EXTENSION LOADED V3 🔥", "color: green; font-weight: bold; font-size: 20px;");

    let lastReportedPeriod = null;
    let lastTimeRemaining = null;

    function processPayload(payload) {
        if (!payload || typeof payload !== 'string') return;

        try {
            const parsed = JSON.parse(payload);
            // Check if it's the history/results list payload
            if (parsed && parsed.data && parsed.data.list && Array.isArray(parsed.data.list)) {
                const latest = parsed.data.list[0];
                if (latest && latest.gameId && latest.gameDetail) {
                    const detail = JSON.parse(latest.gameDetail);
                    if (detail.diceResults && detail.diceResults.length === 3) {
                        const period = latest.gameId;
                        if (period !== lastReportedPeriod) {
                            lastReportedPeriod = period;

                            const dice = detail.diceResults;
                            const sum = dice[0] + dice[1] + dice[2];

                            console.log(`%c[SICBO EXTENSION] Period: ${period} | Dice: [${dice.join(', ')}] | Sum: ${sum}`, "color: #00FF00; background: #000; font-weight: bold; font-size: 16px; padding: 4px;");

                            // Send data to the background worker
                            window.postMessage({
                                source: 'SICBO_INJECTOR',
                                payload: { type: 'sicbo_result', data: { period, dice, sum } }
                            }, '*');
                        }
                    }
                }
            }
        } catch (e) {
            // Silently ignore non-JSON or other irrelevant payloads
        }
    }

    // METHOD A: Intercept window.WebSocket globally (catches standard implementation)
    const OriginalWebSocket = window.WebSocket;
    if (OriginalWebSocket) {
        window.WebSocket = function (url, protocols) {
            console.log("%c[WS HOOK] New WebSocket connection to: " + url, "color: orange");
            const ws = protocols ? new OriginalWebSocket(url, protocols) : new OriginalWebSocket(url);

            ws.addEventListener('message', (event) => {
                try { processPayload(event.data); } catch (e) { }
            });
            return ws;
        };
        window.WebSocket.prototype = OriginalWebSocket.prototype;
    }

    // METHOD B: Intercept addEventListener (In case they bypassed the global Window object)
    const originalAddEventListener = WebSocket.prototype.addEventListener;
    WebSocket.prototype.addEventListener = function (type, listener, options) {
        if (type === 'message') {
            const wrappedListener = function (event) {
                try { processPayload(event.data); } catch (e) { }
                if (typeof listener === 'function') return listener.apply(this, arguments);
                else if (listener && typeof listener.handleEvent === 'function') return listener.handleEvent(event);
            };
            return originalAddEventListener.call(this, type, wrappedListener, options);
        }
        return originalAddEventListener.call(this, type, listener, options);
    };

    // METHOD C: Intercept ws.onmessage assignment (Very common modern method)
    const originalOnMessage = Object.getOwnPropertyDescriptor(WebSocket.prototype, 'onmessage');
    if (originalOnMessage && originalOnMessage.configurable) {
        Object.defineProperty(WebSocket.prototype, 'onmessage', {
            get: function () { return originalOnMessage.get ? originalOnMessage.get.call(this) : this._onmessage; },
            set: function (val) {
                const wrappedVal = function (event) {
                    try { processPayload(event.data); } catch (e) { }
                    if (typeof val === 'function') return val.apply(this, arguments);
                };
                if (originalOnMessage.set) {
                    originalOnMessage.set.call(this, wrappedVal);
                } else {
                    this._onmessage = wrappedVal;
                }
            },
            configurable: true,
            enumerable: true
        });
    }

    // ==========================================
    // METHOD D: INTERCEPT XHR & FETCH (FOR POLLING)
    // ==========================================
    const originalXHRSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function () {
        this.addEventListener('load', function () {
            if (this.responseType === '' || this.responseType === 'text') {
                try {
                    const text = this.responseText;
                    if (text.includes('{') && text.length > 20 && !text.includes('ping') && !text.includes('deviceprofile')) {
                        console.log("%c[XHR INTERCEPT]:", "color: orange;", text.substring(0, 2000));
                        processPayload(text);
                    }
                } catch (e) { }
            }
        });
        originalXHRSend.apply(this, arguments);
    };

    const originalFetch = window.fetch;
    window.fetch = async function () {
        const response = await originalFetch.apply(this, arguments);
        const clone = response.clone();
        clone.text().then(text => {
            if (text.includes('{') && text.length > 20 && !text.includes('ping') && !text.includes('deviceprofile')) {
                console.log("%c[FETCH INTERCEPT]:", "color: yellow;", text.substring(0, 2000));
                processPayload(text);
            }
        }).catch(e => { });
        return response;
    };

    // DOM FALLBACK
    let domDebugCounter = 0;
    setInterval(() => {
        try {
            const elements = document.querySelectorAll('*');
            let currentPeriod = null;
            let currentTimer = null;

            for (const el of elements) {
                if (el.children.length === 0 && el.innerText) {
                    const text = el.innerText.trim();
                    if (/^\d{1,2}:\d{2}$/.test(text)) {
                        const parts = text.split(':');
                        currentTimer = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                    }
                    if (/^\d{12}$/.test(text) || (el.className && typeof el.className === 'string' && el.className.includes('text-primary') && /^\d{8,}$/.test(text))) {
                        currentPeriod = text;
                    }
                }
            }

            if (currentPeriod && currentTimer !== null && !isNaN(currentTimer)) {
                if (currentTimer !== lastTimeRemaining || currentPeriod !== lastReportedPeriod) {
                    console.log(`[DOM FALLBACK] Extracted Period ${currentPeriod} at Timer ${currentTimer}s`);
                    window.postMessage({
                        source: 'SICBO_INJECTOR',
                        payload: { type: 'time', data: { period: currentPeriod, timeRemaining: currentTimer } }
                    }, '*');
                    lastTimeRemaining = currentTimer;
                }
            } else {
                domDebugCounter++;
                if (domDebugCounter % 10 === 0) {
                    // Only print this every 10 seconds so we don't spam the console too much
                    console.log("[DOM Debug] Could not reliably detect Period/Timer on screen.");
                }
            }
        } catch (e) { }
    }, 1000);

})();
