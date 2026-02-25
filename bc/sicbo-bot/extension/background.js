const SERVER_URL = "http://localhost:4000/api/update";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // We received a payload (time or result) from the content script.
    // Since we are running in the background service worker, we can bypass
    // the webpage's CSP and Mixed Content restrictions!
    fetch(SERVER_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
    }).catch(e => {
        console.log("Fast Parity Extension Error: Local server is not running on port 3000.", e);
    });

    // Need to return false if we do not respond asynchronously
    return false;
});
