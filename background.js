const backendServer = "http://localhost:3000/getData";


/**
 * @type {Object} Tab
 * @property {boolean} active
 * @property {number} id
 * @property {string} url
 */

/**
 * @type {Object} ActiveInfo
 * @property {number} tabId
 * @property {number} windowId
 */

/**
 * Check the active tab
 * @param {ActiveInfo} activeInfo
 */
async function checkActiveTab(activeInfo) {
	// check the info of the active tab
	const tab = await chrome.tabs.get(activeInfo.tabId);

	// if the url ends with "nowcoder.com"
	const url = URL.parse(tab.url);
	if (url?.protocol !== "http:" && url?.protocol !== "https:") {
		return;
	}
	
	onAlarm();
}

// type define
/**
 * @typedef {Object} Alarm
 * @property {string} name
 * @property {number | null} periodInMinutes
 * @property {number} scheduledTime
 */

/**
 * @callback AlarmCallback
 * @param {Alarm} alarm
 */

/**
 * @param {Alarm} alarm
 */
async function onAlarm(alarm) {
	console.log("onAlarm", alarm);
	// get the active tab
	const tabs = await chrome.tabs.query({
		active: true,
		currentWindow: true
	});
	if (tabs.length === 0) {
		console.info("no active tab");
		return;
	}
	const tab = tabs[0];

	// check if the backend server is running and waiting for the data
	return checkAndSend(tab);
}

/**
 * 
 * @param {Tab} tab
 */
async function checkAndSend(tab) {
	const api = (await chrome.storage.local.get("serverUrl"))?.serverUrl || backendServer;
	try {
		let res = await fetch(api);
		if (res.status != 202) {
			return;
		}
	} catch (e) {
		console.error("fetch error", e);
		return;
	}
	
	// send the data to the backend server
	const arrayBuffer = await chrome.pageCapture.saveAsMHTML({
		tabId: tab.id
	});

	if (!arrayBuffer) {
		return;
	}

	try {
		const res = await fetch(api, {
			method: "PUT",
			body: arrayBuffer
		})
		if (!res.ok) {
			console.error("fetch error", res.status);
		} else {
			console.log("put file success", res.status);
		}
	} catch (e) {
		console.error("fetch error", e);
	}
}

async function getStatus() {
	const status = (await chrome.storage.local.get("status"))?.status ?? true;
	return status;
}

async function executeCommand(command, tab) {
	console.log("executeCommand", command, tab);
	checkActiveTab({
		tabId: tab.id,
		windowId: tab.windowId
	});
}

async function startUpHandler() {
	const status = await getStatus();
	const text = status ? "on" : "off";
	console.log("status:", text);
	chrome.action.setIcon({
		path: `images/download-${text}.png`
	})
	chrome.action.setTitle({
		title: `Page Saver is ${text}`
	})

	if (status) {
		chrome.commands.onCommand.addListener(executeCommand);
	} else {
		chrome.commands.onCommand.removeListener(executeCommand);
	}
}

// main
chrome.runtime.onStartup.addListener(startUpHandler);
chrome.runtime.onInstalled.addListener(startUpHandler);
chrome.action.onClicked.addListener(async () => {
	const status = await getStatus();
	await chrome.storage.local.set({
		status: !status
	});
	return startUpHandler();
})
