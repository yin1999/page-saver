const DEFAULT_SERVER_URL = "http://localhost:3000/getData";

chrome.storage.local.get("serverUrl", result => {
	const serverUrl = result?.serverUrl;
	if (serverUrl && serverUrl !== DEFAULT_SERVER_URL) {
		document.getElementById('server-url').value = serverUrl;
	}
})

document.getElementById('save').addEventListener('click', () => {
	const serverUrl = document.getElementById('server-url').value;
	if (!serverUrl || serverUrl === DEFAULT_SERVER_URL) {
		chrome.storage.local.remove("serverUrl");
		return;
	}
	const data = {
		serverUrl: serverUrl
	};
	chrome.storage.local.set(data)
})
