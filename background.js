/**
 * RSS Live Links - an RSS "live bookmark" extension for Google Chrome
 * 
 * Copyright 2010 Martin Bartlett
 *
 *    This file is part of RSS Live Links.
 *
 *    RSS Live Links is free software: you can redistribute it and/or modify
 *    it under the terms of the GNU Lesser General Public License as published by
 *    the Free Software Foundation, either version 3 of the License, or
 *    (at your option) any later version.
 *
 *    RSS Live Links is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU Lesser General Public License for more details.
 *
 *    You should have received a copy of the GNU Lesser General Public License
 *    along with RSS Live Links.  If not, see <http://www.gnu.org/licenses/>.
 *
 * @version 1.0.0
 * @license GNU Lesser General Public License, http://www.gnu.org/copyleft/lesser.html
 * @author  Martin Bartlett
 */
window.addEventListener("load", init, false);

var manifest = {version: "unknown"};
var versionChanged = false;

var noAutoUpdates = false;

var inWorker = false;

var options = {
	subscriptions: [],
	groups: {},
	maxItems: 10,
	defaultTtl: 5,
	defaultTimeout: 45,
	unlimitedItems: false,
	sortItemsByDate: false,
	showUnseenFirst: false,
	hideOthersOnOpen: false,
	animateButton: true,
	playSound: true,
	singleItem: false,
	focusFirstTab: false,
	useAvailableIcon: false,
	soundFile: "sounds/boing.mp3",
	popupWidth: 360,
	popupHeight: 504,
	maxConcurrentRequests: 4,
	unlimitedRequests: false,
	showAvailable: true,
	useGroups: false,
	maintainBadge: true,
	storageSizeWarningMade: false,
	sortItems: 0,
	fixPopupClosesBug: false,
	popupDensity: 0,
	styleOptions: {}
};

var fontStrings = {
	sans_serif: "Sans-serif",
	serif: "Serif",
	arial: "Arial, Helvetica, sans-serif",
	arial_black: "'Arial Black', Gadget, sans-serif",
	bookman_old_style: "'Bookman Old Style', serif",
	comic_sans_ms: "'Comic Sans MS', cursive",
	garamond: "Garamond, serif",
	geneva: "Geneva, sans-serif",
	georgia: "Georgia, serif",
	impact: "Impact, Charcoal, sans-serif",
	lucida_sans_unicode: "'Lucida Sans Unicode', 'Lucida Grande', sans-serif",
	ms_sans_serif: "'MS Sans Serif', Geneva, sans-serif",
	ms_serif: "'MS Serif', 'New York', sans-serif",
	palatino_linotype: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
	tahoma: "Tahoma, Geneva, sans-serif",
	times_new_roman: "'Times New Roman', Times, serif",
	trebuchet_ms: "'Trebuchet MS', Helvetica, sans-serif",
	verdana: "Verdana, Geneva, sans-serif"
};

var currentTimer;

var feedInfo = {feeds: [], feedsByURL: {}};

var lastPopupTab;

var loaded = false;

var updatingCount = 0;

var updating = false;

var seenStates = {}; 

var lastOpenedFeed;

var delayedTabs = [];

var popupStateInfo = {};

var unseenFeedCount = 0;
var errorFeedCount = 0;
var storageSizeWarningMade = false;

var extensionFS;

var xmlHttpRequestManager;
var rssllWebWorker;

function init() {
	initExtensionFS();
	initGraphics();
	getManifest();
	earlyInitBookmarks();
	loadSavedState();
	initContextMenus();
	setWorkerStrategy();
	changeMaxConcurrentRequests();

	autoUpdateFeeds();
	chrome.tabs.getAllInWindow(null, addAllTabs);
	console.log("RSS Live Links loaded");
	try {
		initBookmarks();
	} catch(e) { console.error("Error in 'initBookmarks': " + e); }
	saveOptions();
	loaded = true;
}

function initExtensionFS() {
	window.webkitRequestFileSystem(window.TEMPORARY, 1024 *1024, 
		function (fs) {
			console.log('Opened file system: ' + fs.name);
			extensionFS = fs;
		},

		function failFS(e) {
			console.error('Failed to open file system: ' + e);
		}
	);
}

function popupClosed() {

	popupStateInfo.inPopUp = false;

	openDelayedTabs();

	if (popupStateInfo.firstTab != undefined) {
		chrome.tabs.update(popupStateInfo.firstTab, {selected: true});
	}
	popupStateInfo.firstTab = undefined;
	
	feedInfo.feeds.forEach(function(feed){delete feed.popupUpdateCallback});

	if (lastOpenedFeed) {
		lastOpenedFeed.getItems().forEach(function(item) {
			if (item.displayed) {
				lastOpenedFeed.setSeen(item.guid);
				delete item.displayed;
			}
		});
		lastOpenedFeed = undefined;
	}
	updateSeenStates();
	setButtonTitle(unseenFeedCount, errorFeedCount);
}

function openDelayedTabs() {
	
	var lim = delayedTabs.length;

	var unfixedTabs = [];

	for (var i = 0; i < lim; ++i) {
		var newTab = delayedTabs[i];
		if (i == 0) {
			newTab.selected = true;
			chrome.tabs.create(newTab, function(tab) {
				popupStateInfo.firstTab = tab.id;
			});
		} else {
			chrome.tabs.create(newTab);
		}
	}
	delayedTabs = [];
}

function updateSeenStates() {
	seenStates = {};
	feedInfo.feeds.forEach(function(feed) {
		seenStates[feed.url] = feed.getSeenStates();
	});
	saveSeenStates();
}

/*
 * This function is a work-around for the "disappearing feeds" issue
 * in Chrome versions where extension storage is deleted when browser
 * history is deleted.
 */
function checkLocalStorageIntegrity() {
	var lastVersion = localStorage["version"];
	if (!lastVersion) {
		console.warn("Extension local storage has been deleted. Rebuilding");
		cleanLocalStorage();
	}
}

function saveToLocalStorage(key, data) {
	try {
		localStorage[key] = data;
	} catch(e) { 
		console.error("Local storage update failed for \"" + key + "\": " + e); 
	}
}

function saveSeenStates() {
	saveToLocalStorage("seenStates", JSON.stringify(seenStates));
}

function fixGroupIndexing() {
	//HACKING
	//
	//There appears to be a problem with group indexing - we TRY to fix
	//it here while we cannot find the root cause.
	
	var groupArray = [];
	var newGroups = {};
	for (var groupName in options.groups)
	{
		var idx = options.groups[groupName];
		groupArray[idx] = groupName;
	}

	var nextIdx = 0;
	var warned = false;
	for (var i = 0; i < groupArray.length; ++i) {
		if (!groupArray[i]) {
			if (!warned) {
				console.warn("Group indexes have been corrupted - recalculating");
				warned = true;
			}
		} else {
			newGroups[groupArray[i]] = nextIdx++;
		}
	}

	if (warned) {
		options.groups = newGroups;
	}

	//END HACK
}

function saveBookmarkFolderIds() {
	for (var i = 0; i < options.subscriptions.length; ++i) {
		var sub = options.subscriptions[i];
		if (feedInfo.feedsByURL[sub.url] != undefined) {
			var feed = feedInfo.feeds[feedInfo.feedsByURL[sub.url]];
			if (feed) {
				sub.useBookmarkFolder = feed.useBookmarkFolder;
			}
		}
	}
}

function saveOptions() {
	fixGroupIndexing();
	saveBookmarkFolderIds();
	saveToLocalStorage("options", JSON.stringify(options));
}

function getManifest() {
	if (chrome.runtime.getManifest) {
		/*
		 * do it the clean way!
		 */
		manifest = chrome.runtime.getManifest();
		checkVersion();
	} else {
		/*
		 * do it the yucky way!
		 */
		var request = new XMLHttpRequest();
		/*
		 * Deliberately sync since it is local
		 */
		request.open("GET", chrome.extension.getURL("manifest.json"), false);
		request.onload = function() {
			manifest = JSON.parse(this.responseText);
			checkVersion();
		};
		request.send();
	}
}

function checkVersion() {
	var lastVersion = localStorage["version"];
	if (lastVersion != manifest.version) {
		saveToLocalStorage("version", manifest.version);
		versionChanged = true;
		chrome.browserAction.setPopup({"popup": "updated.html"});
	}
}

function loadOptions() {
	var optionsJSON = localStorage["options"];
	if (optionsJSON) {
		var saveXMLFound = false;
		var storedOptions = JSON.parse(optionsJSON);
		for (var key in storedOptions) {
			if (key == "longFormat") { //replace longFormat option
				options["popupHeight"] = 560;
			} else if (key != "delayTabOpen") {
				options[key] = storedOptions[key];
			}
			if (key == "saveFeedXML") {
				saveXMLFound = true;
			}
		}
		if (options.popupHeight > 560) {
			options.popupHeight = 560;
		}
		if (options.popupWidth > 750) {
			options.popupWidth = 750;
		}
		if (!saveXMLFound) {
			delete storedOptions.saveFeedXML;
		}
		document.getElementById('audioNotify').src = options.soundFile;
	}
}

function loadAndSetSeenStates() {
	var mySeenStatesJSON = localStorage["seenStates"];

	if (mySeenStatesJSON) {
		seenStates = JSON.parse(mySeenStatesJSON);
	}

	feedInfo.feeds.forEach(initializeFeed);

	saveSeenStates();

	setButtonTitle(unseenFeedCount, errorFeedCount);
}

function initializeFeed(feed) {
	var oldFeedTxt = localStorage["feed:" + feed.url];
	if (oldFeedTxt) {
		var parser=new DOMParser();
		var xmlDoc=parser.parseFromString(oldFeedTxt,"text/xml");
		feed.populate(xmlDoc, oldFeedTxt, true);
	}
	var feedSeenStates = seenStates[feed.url];
	if (feedSeenStates) {
		for (var guid in feedSeenStates) {
			feed.setSeenStateByGuid(guid, feedSeenStates[guid]);
		}
	}
	if (feed.hasUnseen()) {
		unseenFeedCount++;
	}
	feed.unseenStateCallback = feedUnseenStateCallback;
	feed.errorStateCallback = feedErrorStateCallback;
	feed.updateCallback = feedUpdateCallback;
	seenStates[feed.url] = feed.getSeenStates();
}

function loadSavedState() {
	loadOptions();
	buildFeedInfo();
	loadAndSetSeenStates();
	//if (versionChanged) {
		cleanLocalStorage();
	//}
}

function changeMaxConcurrentRequests(num) {
	if (num == undefined) {
		if (options.unlimitedRequests) {
			num = feedInfo.feeds.length;
		} else {
			num = options.maxConcurrentRequests;
		}
	}
	if (rssllWebWorker) {
		rssllWebWorker.runRequest("set_max_cncrnt_rqsts", num);
	} else {
		xmlHttpRequestManager.setMaxRunning(num);
	}
}

function cleanLocalStorage() {
	try {
		localStorage.clear();
		saveAllLocalStorage();
	} catch(e) { console.error("Local storage clean failed: " + e); }
}

function saveAllLocalStorage() {
	saveToLocalStorage("version", manifest.version);
	saveOptions();
	saveSeenStates();
	saveFolderIds();
	//feedInfo.feeds.forEach(saveFeedText);
}

function getConfigJSON() {
	var config = {};
	config.id = "RSS Live Links";
	config.version = manifest.version;
	config.options = options;
	config.seenStates = seenStates;
	return JSON.stringify(config);
}

function replaceConfig(configJSON) {
	var myOptions = {};
	myOptions.subscriptions = [];
	myOptions.groups = {};
	var newConfig = JSON.parse(configJSON);
	var id = newConfig.id
	if (id != "RSS Live Links") {
		throw new Error(chrome.i18n.getMessage("import_error"));
	}
	if (newConfig.options) {
		for (var key in newConfig.options) {
			myOptions[key] = newConfig.options[key];
		}
	} 
	saveOptions();

	seenStates = newConfig.seenStates;
	if (seenStates) {
		saveSeenStates()
	} else {
		seenStates = {};
		try {
			delete localStorage["seenStates"];
		} catch(e) { console.error("Local storage seenState deletion failed: " + e); }
	}
	updateOptions(myOptions);
}

function mergeConfig(configJSON) {
	var newConfig = JSON.parse(configJSON);
	var id = newConfig.id
	if (id != "RSS Live Links") {
		throw new Error(chrome.i18n.getMessage("import_error"));
	}
	var mods = false
	var myOptions = {};
	myOptions.subscriptions = [];
	myOptions.groups = {};
	options.subscriptions.forEach( function(feed) {
		myOptions.subscriptions.push(feed);
	});
	if (newConfig.options && newConfig.options.subscriptions) {
		newConfig.options.subscriptions.forEach( function(feed) {
			if (feedInfo.feedsByURL[feed.url] == undefined) {
				myOptions.subscriptions.push(feed);
				mods = true;
			}
		});
	}

	if (newConfig.seenStates) {
		for (var url in newConfig.seenStates) {
			if (seenStates[url] == undefined) {
				seenStates[url] =  newConfig.seenStates[url];
			}
		}
		saveSeenStates();
	}
	if (mods) {
		updateOptions(myOptions);
	}
}

function updateOptions(newOptions) {
	checkLocalStorageIntegrity();
	var mods = false;
	var doClean = false;
	var doBuildFeeds = false;
	var subMods = {additions: false, deletions: false};

	for(var key in newOptions) {
		if (key == "maxItems" || key == "unlimitedItems" || key == "defaultTtl") {
			if (options[key] != newOptions[key]) {
				options[key] = newOptions[key];
				mods = true;
			}
		} else if (key == "useAvailableIcon" || key == "maintainBadge") {
			if (options[key] != newOptions[key]) {
				options[key] = newOptions[key];
				checkBrowserIcon((key == "maintainBadge"));
			}
		} else if (key == "saveFeedXML") {
		} else if (key == "subscriptions") {
			options.subscriptions = newOptions.subscriptions;
			doBuildFeeds = true;
		} else { 
			options[key] = newOptions[key];
			if (key == "soundFile") {
				document.getElementById('audioNotify').src = options.soundFile;
			}
		}
	}

/*	if (doClean) {
		cleanLocalStorage();
	} */

	if (mods) {
		feedInfo.feeds.forEach(function(feed) {
			feed.setDefaultTtl(options.defaultTtl);
			feed.setMaxItems(options.unlimitedItems ? -1 : options.maxItems);
		});
	}

	if (doBuildFeeds) {
		subMods = buildFeedInfo();
		checkBrowserIcon();
	}

	if (mods || subMods.additions || subMods.deletions) {
		if (subMods.additions) {
			updateFeeds();
		} else {
			saveSeenStates();
		}
	}
	saveOptions();
	changeMaxConcurrentRequests();
}

function createNewFeed(data) {
	var newFeed = new Feed(data.name, 
			               data.url, 
						   (options.unlimitedItems ? -1 : options.maxItems),
						   (data.refreshTime ? data.refreshTime :"TTL"),
						   options.defaultTTL, data.faviconURL);
	newFeed.group = data.group;
	newFeed.autoopenNew = data.autoopenNew;
	newFeed.sortItems = data.sortItems ? data.sortItems : 0;
	newFeed.changesUnseen = (data.changesUnseen == true);
	newFeed.networkTimeout = (data.networkTimeout ? data.networkTimeout : 0);
	var flag = (data.useBookmarkFolder == undefined ? (hasBookmarkFolder(data) ? true : false ) : data.useBookmarkFolder);
	newFeed.useBookmarkFolder = flag;
	var feedSeenStates = seenStates[newFeed.url];
	if (feedSeenStates) {
		for (var guid in feedSeenStates) {
			newFeed.setSeenStateByGuid(guid, feedSeenStates[guid]);
		}
	}
	if (loaded) {	
		newFeed.unseenStateCallback = feedUnseenStateCallback;
		newFeed.errorStateCallback = feedErrorStateCallback;
		newFeed.updateCallback = feedUpdateCallback;
		seenStates[newFeed.url] = newFeed.getSeenStates();
	}
	return newFeed;
}

function addSubscriptionFromPopup(subscriptionData, doLoad) {
	if (feedInfo.feedsByURL[subscriptionData.url]) {
		return;
	}
	options.subscriptions.push(subscriptionData);
	var newFeed = createNewFeed(subscriptionData);
	feedInfo.feedsByURL[newFeed.url] = feedInfo.feeds.length;
	feedInfo.feeds.push(newFeed);
	if (loaded) {
		changeMaxConcurrentRequests();
		if (subscriptionData.useBookmarkFolder) {

			var func = (doLoad ? 
				function (feed, folder) {
					saveOptions();
					feed.loadFeed(options.defaultTimeout);
				} : function (feed, folder) {saveOptions();});

			createBookmarkFolder(newFeed, func);
		} else {
			saveOptions();
		   	if (doLoad) {
				newFeed.loadFeed(options.defaultTimeout);
			}
		}
	}
	checkBrowserIcon();
	return newFeed;
}

function sortFeedItems(feedObject, itemArray) {
	var algorithm = (feedObject.sortItems ? (feedObject.sortItems - 1) : options.sortItems);
	if (!algorithm)
		return;

	if (algorithm == 1) {
		itemArray.sort(
			function(item1, item2) {
				var title1 = getItemTitle(item1)
				var title2 = getItemTitle(item2);
				return (title1 ? (title2 ? title1.localeCompare(title2) : 1) : (title2 ? -1 : 0));
			}
		);
	} else if (algorithm < 4) {
		itemArray.sort(
			function(item1, item2) {
				var date1 = item1.pubDate;
				var date2 = item2.pubdate;
				var val = (date1 ? (date2 ? date1.getTime() - date2.getTime() : 1) : (date2 ? -1 : 0));
				return (algorithm == 2 ? val : (0-val));
			}
		);
	}
}


function feedUpdateCallback(feed, isUpdated) {
	if (feed.autoopenNew && feed.hasUnseen()) {
		console.log("Auto opening " + feed.name);
		feed.getItems().forEach(function(item) {
			var guid = item.guid;
			if (!feed.isSeen(guid)) {
				console.log("Auto opening " + item.url);
				openInTab(item.url, false, true);
				feed.setSeen(guid);
			}
		});
	}

	if (feed.popupUpdateCallback) {
		feed.popupUpdateCallback(feed, isUpdated);
	}
	if (feed.error) {
		console.error(feed.name + " has an error: " + feed.error);
	} else if (isUpdated) {
		//saveFeedText(feed);
		if (feed.hasUnseen()) {
			console.log(feed.name + " has unseen updates");
		}
		if (hasBookmarkFolder(feed)) {
			updateBookmarkFolder(feed);
		}
	}
}

function feedUnseenStateCallback(feed) {
	if (feed.hasUnseen()) {
		unseenFeedCount++;
	} else {
		unseenFeedCount--;
	}
	setButtonTitle(unseenFeedCount, errorFeedCount);
}

function feedErrorStateCallback(feed) {
	if (feed.error) {
		errorFeedCount++;
	} else {
		errorFeedCount--;
	}
	setButtonTitle(unseenFeedCount, errorFeedCount);
}

function buildFeedInfo() {
	var myFeeds = [];
	var myFeedsByURL = {};

	options.subscriptions.forEach(function(myFeed) {
		if (myFeed.url && myFeed.name) {
			myFeedsByURL[myFeed.url] = myFeeds.length;
			myFeeds.push(myFeed);
		}
	});

	/*
	 * Now see if we already have some of these feeds, and if so
	 * replace the new info with that info at the new position.
	 */
	var adds = false;
	for(var url in myFeedsByURL) {
		var myFeedIndex = myFeedsByURL[url];
		var myFeed = myFeeds[myFeedIndex];

		if (feedInfo.feedsByURL[url] != undefined) {
			var feedIndex = feedInfo.feedsByURL[url];
			var oldFeed = feedInfo.feeds[feedIndex];
			if (myFeed.refreshTime && oldFeed.refreshTime != myFeed.refreshTime) {
				oldFeed.setRefreshTime(myFeed.refreshTime);
			}
			if (myFeed.networkTimeout && oldFeed.networkTimeout != myFeed.networkTimeout) {
				oldFeed.networkTimeout = myFeed.networkTimeout;
			}
			if (oldFeed.name != myFeed.name) {
				renameBookmarkFolder(oldFeed, myFeed.name);
				oldFeed.name = myFeed.name; 
			}
			oldFeed.group = myFeed.group;
			oldFeed.sortItems = myFeed.sortItems ? myFeed.sortItems : 0;
			var flag = (myFeed.useBookmarkFolder == undefined ? (hasBookmarkFolder(myFeed) ? true : false ) : myFeed.useBookmarkFolder);
			oldFeed.useBookmarkFolder = flag;

			myFeeds[myFeedIndex] = oldFeed;
			delete feedInfo.feedsByURL[url];
		} else {
			adds = true;
			myFeeds[myFeedIndex] = createNewFeed(myFeed);
		}
	}

	var dels = false;
	for (var url in feedInfo.feedsByURL) {
		var deletedFeed = feedInfo.feeds[feedInfo.feedsByURL[url]];
		deletedFeed.unseenStateCallback = undefined;
		deletedFeed.errorStateCallback = undefined;
		deletedFeed.updateCallback = undefined;
		if (deletedFeed.hasUnseen()) {
			unseenFeedCount--;
		}
		if (deletedFeed.error) {
			errorFeedCount--;
		}
		try {
			delete seenStates[url];
		} catch(e) { console.error("Local storage seenState deletion failed: " + e); }
		try {
			delete localStorage["feed:" + url];
		} catch(e) { console.error("Local storage feed URL deletion failed for feed:" + url + ": " + e); }
		deleteBookmarkFolder(deletedFeed);
		dels = true;
	}

	if (loaded && (adds || dels)) {
		changeMaxConcurrentRequests();
		saveSeenStates();
		setButtonTitle(unseenFeedCount, errorFeedCount);
	}

	if (loaded) {
		applyBookmarkFolderChanges(myFeeds);
	}

	feedInfo.feeds = myFeeds;
	feedInfo.feedsByURL = myFeedsByURL;
	return {additions: adds, deletions: dels};
}

function applyBookmarkFolderChanges(myFeeds) {
	var count = myFeeds.length;
	var doneFunction = function (feed, folder) {
		if (feed && feed.useBookmarkFolder && folder) {
			loadBookmarkFolder(feed, folder);
		}
		if (--count <= 0) {
			saveOptions();
		}
	};

	var savedCount = count;
	for (var i = 0; i < savedCount; ++i) {
		var feed = myFeeds[i];
		if (feed.useBookmarkFolder && !hasBookmarkFolder(feed)) {
			createBookmarkFolder(feed, doneFunction);
		} else if (hasBookmarkFolder(feed) && !feed.useBookmarkFolder) { 
			deleteBookmarkFolder(feed, doneFunction);
		} else {
			if (--count <= 0) {
				saveOptions();
			}
		}
	}
}

function autoUpdateFeeds() {
	checkLocalStorageIntegrity();
	if (!noAutoUpdates) {
		updateFeeds();
		window.setTimeout(autoUpdateFeeds, 30000);
	}
}

function updateFeeds() {
	var feeds = feedInfo.feeds;
	var now = new Date();
	for (var i = 0; i < feeds.length; ++i) {
		var feed = feeds[i];
		if (!feed.updating && (!feed.expire || feed.expire.getTime() < now.getTime())) {
			console.warn("Fetching feed \"" + feed.name + "\"");
			feed.loadFeed(options.defaultTimeout);
		}
	}
}

function openExtensionPage(page, focus, win) {
	if (focus == undefined)
	{
		focus = true;
	}
	var URL = chrome.extension.getURL(page);
	if (win) {
		win.location = URL;
	} else {
		openInTab(URL, focus);
	}
}

function applyStyleOptions(styleSheets) {
	for (var styleClass in options.styleOptions) {
		var styles = options.styleOptions[styleClass];
		var declaration = "";
		for (var property in styles) {
			var propertyValue = styles[property];
			if (property == "font-family" && fontStrings[propertyValue]) {
				propertyValue = fontStrings[propertyValue];
			}
			declaration += property +":"+propertyValue+";";
		}

		styleSheets[styleSheets.length-1].addRule("." + styleClass, declaration);
	}
}

function openInTab(url, focus, reuseTab, delay, callback) {
	chrome.tabs.getAllInWindow(null, 
		function(views) {
			var i;
			for (i = 0; i < views.length && views[i].url != url; ++i);
			if (i < views.length) {
				chrome.tabs.update(views[i].id, {selected: focus}, callback);
			} else if (!(delay && options.fixPopupClosesBug)) {
				chrome.tabs.create({url: url, selected: focus, index: 5000}, callback);
			} else {
				delayedTabs.push({url: url, selected: focus, index: 5000});
			}
		}
	);
}

function updateButtonTitle() {
	var errors = 0;
	var updates = 0;
	feedInfo.feeds.forEach(function(feed) {
		if (feed.error) {
			errors++;
		} else if (feed.hasUnseen()) {
			updates++
		}
	});
	if (errors != badgeErrors || updates != badgeCount) {
		setButtonTitle(updates, errors);
	}
}

var badgeCount = 0;
var badgeErrors = 0;
var badgeText = "";
var animatedIconPath = "img/rssll_19x19.png";

function setButtonTitle(upds, errors) {
	if (upds < 0)
		upds = 0;
	if (errors < 0)
		errors = 0;
	var doBoing = (badgeCount < upds);
	var goingToNonZero =(badgeCount <= 0 && upds != 0);
	var goingToZero =(badgeCount > 0 && upds == 0);
	badgeCount = upds;
	badgeErrors = errors;
	if (!options.maintainBadge) {
		badgeText = "";
	} else if (goingToZero) {
		badgeText = (errors > 0 ? "!" : "");
		stopAnimateLoop();
	} else if (upds > 0) {
		badgeText = ""+upds;
		if (doBoing) {
			playBoing();
		}
	} else if (errors > 0) {
		badgeText = "!";
	} else {
		badgeText = "";
	}
	if (goingToNonZero || animatedIconPath != gfx.src) {
		animatedIconPath = gfx.src;
		if (badgeCount > 0)
			startAnimate();
		else
			stopAnimate();
	}

	if (options.maintainBadge) {
		var backGndClr = (errors > 0 ? [255, 165, 0, 255] : [255, 0, 0, 255]);
		chrome.browserAction.setBadgeBackgroundColor({color: backGndClr});
	}
	chrome.browserAction.setBadgeText({text: badgeText});

	var title = "";
	if (upds == 1) {
		title += chrome.i18n.getMessage("icon_1_feed_updated");
	} else {
		title += chrome.i18n.getMessage("icon_n_feeds_updated", [""+upds]);
	}
	if (errors == 1) {
		title += "\n" + chrome.i18n.getMessage("icon_1_feed_error");
	} else if (errors > 0 ){
		title += "\n" + chrome.i18n.getMessage("icon_n_feeds_error", [""+errors]);
	}

	chrome.browserAction.setTitle({title: title});
}

/*
 * Another rip-off alert - this is ALL from GMail Checker Plus!
 */

var canvasContext;
var rotation = 1;
var factor = 1;
var animTimer;
var loopTimer;
var animDelay = 10;

function initGraphics() {
	canvasContext = canvas.getContext('2d');
}

function startAnimate() {
  stopAnimateLoop();
    
  if(options.animateButton) {
    animTimer = setInterval(doAnimate, animDelay);
    setTimeout(stopAnimate, 2000);
    loopTimer = setTimeout(startAnimate, 20000);
  } else {
	stopAnimate();
  }
}

function stopAnimate() {
  if(animTimer != null)
    clearTimeout(animTimer);       

  chrome.browserAction.setIcon({path:gfx.src});
    
  rotation = 1;
  factor = 1;
}

function stopAnimateLoop() {
  if(loopTimer != null)
    clearTimeout(loopTimer);
    
  stopAnimate();
}

function doAnimate() {
  canvasContext.save();
  canvasContext.clearRect(0, 0, canvas.width, canvas.height);
  canvasContext.translate(
   Math.ceil(canvas.width/2),
   Math.ceil(canvas.height/2));
  canvasContext.rotate(rotation*2*Math.PI);
  canvasContext.drawImage(gfx,
   -Math.ceil(canvas.width/2),
   -Math.ceil(canvas.height/2));
  canvasContext.restore();
  
  rotation += 0.01 * factor;
  
  if(rotation <= 0.9 && factor < 0)
    factor = 1;
  else if(rotation >= 1.1 && factor > 0)
    factor = -1;        
    
  chrome.browserAction.setIcon({imageData:canvasContext.getImageData(0, 0,
   canvas.width,canvas.height)});
}

var nextPlay = 0;

function setPopupMuteState(state, notifyingMenuItemInfo) {
	popupStateInfo.muteSound = state;
	if (window["soundMenuItems"]) {
		for (idx in window["soundMenuItems"]) {
			var id = window["soundMenuItems"][idx];
			if (id && ((!notifyingMenuItemInfo) || (id != notifyingMenuItemInfo.menuItemId))) {
				chrome.contextMenus.update(id, {"type": "checkbox", "checked": !state},reportCtxError);
			}
		}
	}
}

function playBoing() {
	if (options.playSound && !popupStateInfo.muteSound) {
		var now = (new Date()).getTime();
		
		if (now > nextPlay) {
			nextPlay = now + 3000;
			try {
				document.getElementById('audioNotify').load();
				document.getElementById('audioNotify').play();			
			}
			catch(e) { console.error(e); }
		} else {
		}
	}
}

function setWorkerStrategy() {

	if (options.useWebWorker) {
		if (!rssllWebWorker) {
			rssllWebWorker = new WebWorker();
		}
		xmlHttpRequestManager = undefined;
	} else {
		if (!xmlHttpRequestManager) {
			xmlHttpRequestManager = new XMLHttpRequestManager();
		}
		if (rssllWebWorker) {
			rssllWebWorker.terminate();
			rssllWebWorker = undefined;
		}
	}
}

function logMsg(msg) {
	console.log(msg);
}

function getContextMenuItem(type, item) {
	var ctxItem = null;
	var ctxType = contextMenus[type];
	if (ctxType) {
		ctxItem = ctxType[item];
	}
	return ctxItem;
}
