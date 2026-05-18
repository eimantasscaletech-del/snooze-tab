chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (!message || message.target !== 'offscreen' || message.type !== 'play-sound' || !message.src) return;
	var audio = new Audio(message.src);
	audio.volume = 1;
	audio.play().then(_ => sendResponse({ok: true})).catch(error => sendResponse({ok: false, error: error && error.message ? error.message : String(error)}));
	return true;
});
