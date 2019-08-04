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

window.addEventListener("load", main, false);
//window.addEventListener("unload", cleanup, false);
function setStaticEventListeners() {
	document.body.addEventListener("keydown", keyDownHandler, false);
	document.body.addEventListener("contextmenu", function () {return false;}, false);
	soundToggle.addEventListener("click", toggleSound, false);
	allread.addEventListener("click", allFeedsRead, false);
	allmark.addEventListener("click", allFeedsMark, false);
	refresh.addEventListener("click", reloadAllFeeds, false);
	open_options.addEventListener("click", function () {backgroundPage.openExtensionPage('options.html');}, false);
	close_popup.addEventListener("click", function () {window.close()}, false);
	//backgroundPage.registerPopupContextCallback(contextMenuClicked);
	initContextMenuProcessors()
	chrome.contextMenus.onClicked.addListener(contextMenuClicked);
}


var backgroundPage = chrome.extension.getBackgroundPage();
var tabFeedsByURL;


var feedInfo;
var feeds;
var groups;
var feedItems = [];
var dummyFeeds = [];
dummyFeeds[0] = {name: chrome.i18n.getMessage("available_feeds_title"), url: "rssllAvaliableFeeds"};

var options = backgroundPage.options;
var stateInfo = backgroundPage.popupStateInfo;
var unseenCount = 0;
var loadingCount = 0;
var feedDataDivs = {};
var feedPositions = {};
var groupPositions = {};
var ctxURL2ItemDiv = {};
var ctxURL2FeedDiv = {};
var ctxURL2GroupDiv = {};
var openFeeds = [];
var currentItem;
var openFeedContainerClass = ((options.hideOthersOnOpen == true) ? "hidingFeedContainer" : "feedContainer");
var closedContainerClass = "feedContainer";
var openCount = 0;
var tabOpened = false;
var feedDataClass = "feedData";
var dataHeightAdjustment = options.hideOthersOnOpen ? 72 : 202;
var useGroups = false;
var tooltipShowing = false;

var densitySettings = [3, 4, 5];

function main() {

	try {
	stateInfo.inPopUp = true;

	console.log("Calling event listener setter");
	setStaticEventListeners();
	console.log("Back from event listener setter");
	feedContainer.className = closedContainerClass;

	document.body.onunload = backgroundPage.popupClosed;

	var styleSheets = document.styleSheets;
	backgroundPage.applyStyleOptions(styleSheets);
	var popupHeight = options.popupHeight ? options.popupHeight : 504;
	var popupWidth = options.popupWidth ? options.popupWidth : 600;
	styleSheets[styleSheets.length-1].addRule(".dataUnderline", "display: " + (options.hideOthersOnOpen ? "none;" : "block;"));
	styleSheets[styleSheets.length-1].addRule("#feedContainer", "width: " + popupWidth + "px;");
	styleSheets[styleSheets.length-1].addRule(".feedContainer", "max-height: " + popupHeight + "px;");
	styleSheets[styleSheets.length-1].addRule(".feedData", "max-height: " + (popupHeight-dataHeightAdjustment) + "px;");
	styleSheets[styleSheets.length-1].addRule(".item", "padding-bottom: " + densitySettings[options.popupDensity] + "px;");

	backgroundPage.checkLocalStorageIntegrity();
	feedInfo = backgroundPage.feedInfo;
	feeds = feedInfo.feeds;
	groups = options.groups;
	useGroups = (groups != undefined && options.useGroups);
	tabFeedsByURL = backgroundPage.tabFeedsByURL

	initToolbar();

	/*
	 * availableDiv is hard-coded in the HTML - but we need to "complete" it
	 * with certain hooks.
	 */
	if (options.showAvailable) {
		styleAvailable();
	}

	var len = feeds.length;

	if (len == 0) {
		feedsMessageDiv.innerText=chrome.i18n.getMessage("no_feeds");
		feedsMessageDiv.style.display = "block";
		return;
	}

	var groupTag = chrome.i18n.getMessage("group_name_tag");
	var ungroupedFeeds = [];
	var groupedFeeds =[];
	var nextFeedPos = 0;
	var fragment = document.createDocumentFragment();
	var groupFragment = undefined;
	for (var pos = 0; pos < len; ++pos) {
		var feedToAdd = feeds[pos];
		feedToAdd.popupUpdateCallback = feedUpdated;
		var feedGroup = feedToAdd.group;
		if (useGroups && feedGroup != undefined && groups[feedGroup] != undefined) {
			var groupIndex = groups[feedGroup] + 1;
			var groupFeed = dummyFeeds[groupIndex];
			if (!groupFeed) {
				groupFeed = {name: groupTag + ": " + feedGroup, url: "group:" + feedGroup, feeds: []};
				dummyFeeds[groupIndex] = groupFeed;
				groupPositions[groupFeed.url] = groupIndex-1;
				if (!groupFragment) {
					groupFragment = document.createDocumentFragment();
				}
			}
			feedToAdd.popupGroupIdx = groupIndex;
			groupFeed.feeds.push(feedToAdd);
		} else {
			ungroupedFeeds.push(feedToAdd);
		}
	};
	if (groupFragment) {
		for (var i = 1; i < dummyFeeds.length; ++i) {
			var groupFeed = dummyFeeds[i];
			if (groupFeed) {
				groupFragment.appendChild(createGroupDiv(groupFeed, i-1));
				setGroupTitleClass(groupFeed);
				var groupFeeds = groupFeed.feeds;
				for (var j = 0; j < groupFeeds.length; ++j) {
					var myFeed = groupFeeds[j];
					groupedFeeds[nextFeedPos] = myFeed;
					feedPositions[myFeed.url] = nextFeedPos++;
				}
			}
		}
		feedContainer.insertBefore(groupFragment, availableDiv);
	}

	feeds = groupedFeeds.concat(ungroupedFeeds);

	for (var j = nextFeedPos; j < feeds.length; ++j) {
		var feedToAdd = feeds[j];
		feedPositions[feedToAdd.url] = j;
		fragment.appendChild(createFeedDiv(feedToAdd, j));
	}
	feedContainer.insertBefore(fragment, availableDiv);

	var done = false;
	if (options.openFirst) {
	   if (len == 1) {
			openDiv(feeds[0], false, false);
	   } else if (len > 1) {
			showNext({shiftKey: false});
	   }
	}
	} catch (e) {
		var stack = e.stack.replace(/^[^\(]+?[\n$]/gm, '')
			.replace(/^\s+at\s+/gm, '')
			.replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
			.split('\n');
		backgroundPage.logMsg('Popup processing error. type: ' + e.type + ", message: " + e.message + "\r\n" + "Stack Trace: " +stack);
	}
}

function countUnseen() {
	unseenCount = 0;
	var len = feeds.length;
	for (var pos = 0; pos < len; ++pos) {
		if (feeds[pos].hasUnseen()) {
			unseenCount++;
		}
	};
}

function countUpdating() {
	loadingCount = 0;
	var len = feeds.length;
	for (var pos = 0; pos < len; ++pos) {
		if (feeds[pos].updating) {
			loadingCount++;
		}
	};
}

function styleAvailable() {
	availableDiv.className = "feedDiv";
	availableFeedsTitle.onclick = showData;
	availableFeedsTitle.feedIdx = -1;
	availableFeedsText.innerText = dummyFeeds[0].name;
	setAvailableTitle();
	availableDataContainer.feedTitle = availableFeedsTitle;
	availableDataContainer.openFunction = openAvailableDiv;
	availableDataContainer.closeFunction = closeAvailableDiv;
	availableDataContainer.empty = true;
	availableDataContainer.feedType = 1;
	feedDataDivs[dummyFeeds[0].url] = availableDataContainer;
}

function setAvailableTitle() {

	var className = "feedTitle readFeedTitle";

	var unsub = 0;
	var sub = 0;

	for (var tabFeedURL in tabFeedsByURL) {
		if (feedPositions[tabFeedURL] == undefined) {
			unsub++;
			className = "feedTitle unseenFeedTitle";
			break;
		} else {
			sub++;
			className = "feedTitle unreadFeedTitle";
		}
	}
	if (availableFeedsTitle.className != className)
		availableFeedsTitle.className = className;
	availableIconBox.title=chrome.i18n.getMessage("available_feeds_tooltip", [""+unsub, ""+sub]); 
}

function createGroupDiv(group, pos) {

	var groupDiv = document.createElement("div");
	groupDiv.className = "feedDiv";
	var groupTitleDiv = document.createElement("div");
	groupTitleDiv.className = "feedTitleDiv";
	var box = document.createElement("div");
	box.className = "feedIconBox";
	var	image = document.createElement("img");
	image.className = "feedImage";
	image.src = "img/rssll_16x16.png";
	box.appendChild(image);
	groupTitleDiv.appendChild(box);

	var groupLink = document.createElement("a");
	groupLink.feedIdx = ((-2)-pos);
	groupLink.iconBox = box;
	groupLink.addEventListener("click", showData);
	var groupText = document.createElement("a");
	groupText.href = "chrome://rssll/group/"+pos;
	ctxURL2GroupDiv[groupText.href] = groupLink;
	groupText.innerText = group.name;
	groupLink.appendChild(groupText);
	groupTitleDiv.appendChild(groupLink);
	groupDiv.appendChild(groupTitleDiv);

	var dataDiv = document.createElement("div");
	dataDiv.className = "groupDataContainer";
	dataDiv.openContainerClass = "feedContainer";
	dataDiv.groupTitle = groupLink;
	groupDiv.appendChild(dataDiv);
	dataDiv.openFunction = openGroupDiv;
	dataDiv.closeFunction = closeGroupDiv;
	dataDiv.feedType = 0;
	feedDataDivs[group.url] = dataDiv;
	dataDiv.empty = true;


	return groupDiv;
}

function buildGroupContent(group, div) {
	div.empty=false;
	var groupFeeds = group.feeds;
	var feedDiv;
	for (var i = 0; i < groupFeeds.length; ++i) {
		var groupFeed = groupFeeds[i];
		feedDiv = createFeedDiv(groupFeed, feedPositions[groupFeed.url], feedDiv, div);
		div.appendChild(feedDiv);
	}
}

function createFeedDiv(feed, pos, aboveDiv, container) {

	feed.popupIdx = pos;

	var feedDiv = document.createElement("div");
	if (useGroups) {
		if (aboveDiv) {
			aboveDiv.belowDiv = feedDiv;
		}
		feedDiv.container = container;
	}
	feedDiv.className = "feedDiv";
	var feedTitleDiv = document.createElement("div");
	feedTitleDiv.className = "feedTitleDiv";
	var box = document.createElement("div");
	box.className = "feedIconBox";
	var	image = document.createElement("img");
	image.className = "feedImage";
	if (feed.imageSrc) {
		image.src = feed.imageSrc;
	} else {
		feed.image = image;
		image.src = "img/rssll_16x16.png";
	}
	box.appendChild(image);
	feedTitleDiv.appendChild(box);

	var feedLink = document.createElement("a");
	feedLink.feedIdx = pos;
	feedLink.iconBox = box;
	feedLink.addEventListener("click", showData);
	var feedText = document.createElement("a");
	feedText.href = "chrome://rssll/feed/"+pos;
	ctxURL2FeedDiv[feedText.href] = feedLink;
	feedText.innerText = feed.name;
	feedLink.appendChild(feedText);
	feedTitleDiv.appendChild(feedLink);
	feedDiv.appendChild(feedTitleDiv);

	var dataDiv = document.createElement("div");
	dataDiv.className = "feedDataContainer";
	dataDiv.openContainerClass  = openFeedContainerClass;
	dataDiv.feedTitle = feedLink;
	dataDiv.feedDiv = feedDiv;
	feedDiv.appendChild(dataDiv);
	dataDiv.openFunction = openFeedDiv;
	dataDiv.closeFunction = closeFeedDiv;
	dataDiv.feedType = 1;
	feedDataDivs[feed.url] = dataDiv;
	dataDiv.empty = true;

	setFeedTitleClass(feedLink, feed, false);

	if (feed.hasUnseen()) {
		unseenCount++;
	}
	return feedDiv;
}

function setFeedTitleClass(feedLink, feed, setGroupTitle) {
	if (feedLink) {
		var feedTitleClass = "readFeedTitle";
		if (feed.error) {
			feedTitleClass = "errorFeedTitle"
		} else if (feed.hasUnseen()) {
			feedTitleClass = "unseenFeedTitle";
		} else if (feed.hasUnread()) {
			feedTitleClass = "unreadFeedTitle";
		}
		var unseenCount = feed.getUnseenCount();
		feedLink.firstChild.innerText =  feed.name + 
			(unseenCount == 0 ? "" : (" (" + unseenCount + ")"));
		feedTitleClass = "feedTitle " + feedTitleClass;
		if (feedLink.className != feedTitleClass)
			feedLink.className = feedTitleClass;
		feedLink.iconBox.title = getFeedToolTip(feed);
	}
	if (setGroupTitle && useGroups && feed.group != undefined && groups[feed.group] != undefined) {
		var group = dummyFeeds[groups[feed.group]+1];
		if (group) {
			setGroupTitleClass(group);
		}
	}
}

function setGroupTitleClass(group) {
	if (feedDataDivs[group.url]) {
		var groupLink = feedDataDivs[group.url].groupTitle;
		var groupFeeds = group.feeds;
		var len = groupFeeds.length
		var groupTitleClass = "readFeedTitle";
		var checkUnseen = true;
		var checkUnread = true;
		var unseenCount = 0;
		for (var i = 0; i < len; ++i) {
			var feed = groupFeeds[i];
			unseenCount += feed.getUnseenCount();
			if (feed.error) {
				groupTitleClass = "errorFeedTitle";
				checkUnseen = false;
			} else if (checkUnseen && feed.hasUnseen()) {
				groupTitleClass = "unseenFeedTitle";
				checkUnread = false;
			} else if (checkUnread && feed.hasUnread()) {
				groupTitleClass = "unreadFeedTitle";
			}
		}
		groupTitleClass = "feedTitle " + groupTitleClass;
		groupLink.firstChild.innerText = group.name +
			(unseenCount == 0 ? "" : (" (" + unseenCount +")"));
		if (groupLink.className != groupTitleClass)
			groupLink.className = groupTitleClass;
		groupLink.iconBox.title = getGroupToolTip(group);
	}
}

function feedUpdated(feed, modified) {
	var dataDiv = feedDataDivs[feed.url];

	if (dataDiv) {

		if (modified || (feed.error != dataDiv.errorMsg)) {
			var openFeed = openFeeds[1];
			var dataDivOpen = (openFeed && feed.url == openFeed.url);

			if (dataDivOpen && options.askOnUpdate) {
				dataDiv.feedMessage.style.display = "block";
			} else {
				if (!dataDiv.empty) {
					dataDiv.innerHTML = "";
					dataDiv.content = undefined;
					dataDiv.errorMsg = undefined;
					dataDiv.empty = true;
					if (dataDivOpen) {
						openFeedDiv(dataDiv, feed, false, false);
					}
				}
			}
		}
		setFeedTitleClass(dataDiv.feedTitle, feed, true);
	} else if (useGroups && feed.group != undefined && groups[feed.group] != undefined) {
		setGroupTitleClass(dummyFeeds[groups[feed.group]+1]);
	}
	setLoadingMsg();
	countUnseen();
}

function refreshContent(evt) {
	var openFeed = openFeeds[1];
	if (openFeed) {
		var dataDiv = feedDataDivs[openFeed.url];
		setFeedTitleClass(dataDiv.feedTitle, openFeed, true);
		dataDiv.innerHTML = "";
		dataDiv.empty = true;
		openFeedDiv(dataDiv, openFeed, false, false);
	}
}

function showPrev(evt) {

	var currentPos = (openFeeds[1] ? feedPositions[openFeeds[1].url] : (feeds.length > 1 ? 1 : 0));
	if (!evt.shiftKey) {
		for (var i = currentPos-1; i != currentPos; i--) {
			if (i < 0) {
				i = feeds.length;
			} else if (feeds[i].hasUnseen()) {
				openDiv(feeds[i], false, false);
				return;
			}
		}
		for (var i = currentPos-1; i != currentPos; i--) {
			if (i < 0) {
				i = feeds.length;
			} else if (feeds[i].hasUnread()) {
				openDiv(feeds[i], false, false);
				return;
			}
		}
	}
	var newPos = currentPos -1;
	if (newPos < 0) {
		newPos = feeds.length-1;
	}
	if (newPos != currentPos) {
		openDiv(feeds[newPos], false, false);
	}
}

function showNext(evt) {
	var currentPos = (openFeeds[1] ? feedPositions[openFeeds[1].url] : feeds.length-1);
	if (!evt.shiftKey) {
		for (var i = currentPos+1; i != currentPos; i++) {
			if (i >= feeds.length) {
				i = -1;
			} else if (feeds[i].hasUnseen()) {
				openDiv(feeds[i], false, false);
				return;
			}
		}
		for (var i = currentPos+1; i != currentPos; i++) {
			if (i >= feeds.length) {
				i = -1;
			} else if (feeds[i].hasUnread()) {
				openDiv(feeds[i], false, false);
				return;
			}
		}
	}
	var newPos = currentPos +1;
	if (newPos >= feeds.length) {
		newPos = 0;
	}
	if (newPos != currentPos) {
		openDiv(feeds[newPos], false, false);
	}
}

/*
 * Delayed until needed
 */
function buildFeedContent(feedObject, dataDiv) {

	dataDiv.empty=false;

	var addArrows = options.hideOthersOnOpen && feeds.length > 1;
	var moreClass = addArrows ? "more" : "smallMore";

	var moreData = document.createElement("div");
	moreData.className = "moreData";

	var moreLinks = document.createElement("div");
	moreLinks.className = "moreLinks";
	moreLinks.feedIdx = feedObject.popupIdx;

	var moreCell;
	if (addArrows) {
		moreCell = document.createElement("span");
		moreCell.id = "morePrev";
		var more = document.createElement("a");
		more.className = "moreAction";
		more.innerText = "<";
		more.title=chrome.i18n.getMessage("left_arrow_tooltip");
		more.addEventListener("click", showPrev);
		moreCell.appendChild(more);
		moreLinks.appendChild(moreCell);
	}

	moreCell = document.createElement("div");
	moreCell.className = moreClass + (addArrows ? " midCell" : "");
	var more = document.createElement("a");
	more.className = "moreAction";
	more.id = "markRead";
	more.innerText = chrome.i18n.getMessage("mark_read_name");
	more.title=chrome.i18n.getMessage("mark_read_tooltip");
	more.addEventListener("click", markRead);
	moreCell.appendChild(more);
	moreLinks.appendChild(moreCell);

	moreCell = document.createElement("span");
	moreCell.className = moreClass + " midCell";
	more = document.createElement("a");
	more.className = "moreAction";
	more.id = "openAll";
	more.innerText = chrome.i18n.getMessage("open_name");
	more.title=chrome.i18n.getMessage("open_tooltip");
	more.addEventListener("click", openAll);
	moreCell.appendChild(more);
	moreLinks.appendChild(moreCell);

	moreCell = document.createElement("span");
	moreCell.className = moreClass + " midCell";
	more = document.createElement("a");
	more.className = "moreAction";
	more.id = "reload";
	more.innerText = chrome.i18n.getMessage("reload_name");
	more.title=chrome.i18n.getMessage("reload_tooltip");
	more.addEventListener("click", reloadFeedEvent);
	moreCell.appendChild(more);
	moreLinks.appendChild(moreCell);

	var moreStoriesURI = feedObject.getMoreStories();
	if (moreStoriesURI) {
		moreCell = document.createElement("span");
		moreCell.className = moreClass + (addArrows ? " midCell" : " endCell");
		more = document.createElement("a");
		more.className = "moreAction";
		more.id = "moreStories"
		more.innerText = chrome.i18n.getMessage("feed_home_name");
		more.title=chrome.i18n.getMessage("feed_home_tooltip");
		more.addEventListener("click", moreStories);
		more.link = moreStoriesURI;
		moreCell.appendChild(more);
		moreLinks.appendChild(moreCell);
	}


	if (addArrows) {
		moreCell = document.createElement("div");
		moreCell.className = "endCell";
		moreCell.id = "moreNext";
		var more = document.createElement("a");
		more.className = "moreAction";
		more.innerText = ">";
		more.title=chrome.i18n.getMessage("right_arrow_tooltip");
		more.addEventListener("click", showNext);
		moreCell.appendChild(more);
		moreLinks.appendChild(moreCell);
	}


	moreData.appendChild(moreLinks);
	moreData.appendChild(document.createElement("hr"));
	if (options.askOnUpdate) {
		var feedMessage = document.createElement("a");
		feedMessage.className = "itemTitle feedMessage";
		feedMessage.innerText = chrome.i18n.getMessage("updates_pending_msg");
		feedMessage.onclick = refreshContent
		feedMessage.style.display = "none";
		moreData.appendChild(feedMessage);
		dataDiv.feedMessage = feedMessage;
	}
	
	var fragment = document.createDocumentFragment();
	fragment.appendChild(moreData);

	var content = getContentDetails(feedObject, dataDiv);
	fragment.appendChild(content);
	var dataUnderline = document.createElement("hr");
	dataUnderline.className = "dataUnderline";
	fragment.appendChild(dataUnderline);

	dataDiv.contentDiv = content;
	dataDiv.appendChild(fragment);

}

function buildAvailableFeeds(dataDiv) {
	dataDiv.empty=false;
	var content = document.createElement('div');
	content.className = feedDataClass;

	var tabFeedDivs = [];

	for (var tabFeedURL in tabFeedsByURL) {
		tabFeedDivs.push(createTabFeedDiv(tabFeedsByURL[tabFeedURL].feed));
	}

	if (tabFeedDivs.length <= 0) {
		var item = document.createElement("div");
		item.className = "message_item";
		item.textContent = chrome.i18n.getMessage("no_available_feeds");
		content.appendChild(item);
	} else {
		tabFeedDivs.sort(function(a, b) {return a.itemName.localeCompare(b.itemName);});
		var len = tabFeedDivs.length;
		for (var pos = 0; pos < len; ++pos) {
			content.appendChild(tabFeedDivs[pos])
		};
	}
	dataDiv.appendChild(content);
}

function getItem(idxs) {
	return (idxs[0] < 0 ? tabFeedsByURL[idxs[1]].feed : feedItems[idxs[0]][idxs[1]]);
}

function createTabFeedDiv(tabFeed) {

	var idxs = [-1, tabFeed.url];

	var itemDiv = document.createElement("div");
	itemDiv.className = "item";
	itemDiv.itemIdxs = idxs;
	itemDiv.itemName = tabFeed.name;
	var title = document.createElement("a");
	title.itemIdxs = idxs;
	
	var titleText = document.createElement("span");

	titleText.title = tabFeed.url;
	title.onclick = addTabFeed;
	if (feedPositions[tabFeed.url] == undefined) {
		title.className = "itemTitle unsubscribedTitle";
		title.subscribed = false;
	} else {
		title.className = "itemTitle subscribedTitle";
		titleText.title += "\n" + chrome.i18n.getMessage("subscribed_feed_tooltip");
		title.subscribed = true;
	}

	var feedName = tabFeed.name.replace(/[\f\n\t\v\0]/g, ' ');
	titleText.innerText = trim11(feedName);
	title.appendChild(titleText);
	itemDiv.appendChild(title);

	return itemDiv;
}

function addTabFeed(event) {
	var tabFeedTitle = event.currentTarget;
	var tabFeed = getItem(event.currentTarget.itemIdxs);
	if (event.shiftKey) {
		showUrl(tabFeed.url, false);
		return;
	} else if (!tabFeedTitle.subscribed) {
		var newFeed = backgroundPage.addSubscriptionFromPopup(tabFeed, false);
		if (newFeed) {
			feeds.push(newFeed);
			newFeed.popupUpdateCallback = feedUpdated;
			feedContainer.insertBefore(createFeedDiv(newFeed, feeds.length-1), availableDiv);
			tabFeedTitle.className = "itemTitle subscribedTitle";
			tabFeedTitle.title += "\n" + chrome.i18n.getMessage("subscribed_feed_tooltip");
			tabFeedTitle.subscribed = true;
			feedsMessageDiv.style.display = "none";
			newFeed.loadFeed(options.defaultTimeout);
			setAvailableTitle();
		}
	}
}

function getContentDetails(feedObject, dataDiv) {
	var content = document.createElement('div');
	content.className = feedDataClass;
	var itemsArray = feedObject.getItems();
	backgroundPage.sortFeedItems(feedObject, itemsArray);
	feedItems[feedObject.popupIdx] = itemsArray;

	var error = feedObject.error;
	dataDiv.errorMsg = error;
	if (error) {
		var item = document.createElement("div");
		item.className = "error_item";
		item.title = error;
		item.textContent = error;
		content.appendChild(item);
	}

	var unseenDivs = [];
	var divs = [];

	len = itemsArray.length;
	for (var i = 0; i<len; ++i) {
		createItemDiv(itemsArray[i], feedObject, i, unseenDivs, divs, dataDiv);
	}
	
	if (unseenDivs.length > 0) {
		divs = unseenDivs.concat(divs);
	}

	len = divs.length;
	for (var i = 0; i < len; ++i) {
		content.appendChild(divs[i])
	}
	return content;
}

function createItemDiv(item, feedObject, i_idx, unseenDivs, divs, dataDiv) {
	var f_idx = feedObject.popupIdx;
	var itemDiv = document.createElement("div");
	var idxs = [f_idx, i_idx];
	itemDiv.className = "item";
	itemDiv.itemIdxs = idxs;
	var title = document.createElement("span");
	title.itemIdxs = idxs;

	setItemTitleClass(title, item, feedObject);

	title.dataDiv = dataDiv;
	title.addEventListener("click", openItem);
	var titleText = document.createElement("a");
	titleText.href = "chrome://rssll/item/"+f_idx+"/"+i_idx;
	ctxURL2ItemDiv[titleText.href] = title;
	titleText.innerText = getItemTitle(item);
	setItemToolTip(item, titleText);
	titleText.className = "itemTitleText";
	title.appendChild(titleText);
	itemDiv.appendChild(title);
	if (options.showUnseenFirst && !feedObject.isSeen(item.guid)) {
		unseenDivs.push(itemDiv);
	} else {
		divs.push(itemDiv);
	}
}

function setItemTitleClass(title, item, feedObject) {

	var itemTitleClass = "readItemTitle";
	if (!feedObject.isSeen(item.guid)) {
		itemTitleClass = "unseenItemTitle";
	} else if (!feedObject.isRead(item.guid)) {
		itemTitleClass = "unreadItemTitle";
	}
	setItemTitleStyles(title, itemTitleClass);
}

function setItemTitleStyles(title, itemTitleClass) {
	var className = "itemTitle " + itemTitleClass;
	if (title.className != className)
		title.className = className;
}

function getItemTitle(item) {
	if (!item.displayTitle) {
		item.displayTitle = item.title ? trim11(unhtml(item.title)) : "(no title)";
	}
	return item.displayTitle;
}

function createItemTooltip(item, itemText) {

	if (itemText.tooltip == undefined) {
		var toolTip = trim11(item.title);
		//var toolTip = "";
		if (item.pubDate) {
			//toolTip += '<br>' + chrome.i18n.getMessage("item_pubdate_tag") + ': ' + item.pubDate.toLocaleString();
			toolTip += '\n' + chrome.i18n.getMessage("item_pubdate_tag") + ': ' + item.pubDate.toLocaleString();
		}
		if (item.description) {
			var desc = trim11(unhtml(item.description));
			if (desc.length>0) {
			//	if (item.pubDate)
					toolTip += "\n----------\n";
					//toolTip += "<br>----------<br>";
				toolTip += (desc.length>200 ? desc.substring(0,197)+"..." : desc);
			}
		}
		item.toolTip = toolTip;
		itemText.tooltip = toolTip;
	}
}

/*
 * TODO!!!! TOOLTIP PROBLEM WITH MANIFEST2
 */
function showItemTooltip(evt) {
	var itemText = evt.currentTarget;
    var item = getItem(itemText.parentNode.itemIdxs);
	createItemTooltip(item, itemText);
	//
	//tooltipShowing=true;
	//Tip({arguments: [itemText.tooltip], event: evt});
}

function setItemToolTip(item, itemText) {
	//Tooltip creation is a bit heavy, so we make it a JIT operation,
	//creating only when the mouse is over the item for the first time.
	createItemTooltip(item, itemText);
	var tt = item.toolTip;
	if (tt)
		itemText.tooltip = tt;
	itemText.title = item.toolTip
	//itemText.onmouseover = showItemTooltip;
	//itemText.onmouseout=closeTooltip;
}

function closeTooltip() {
	//tooltipShowing = false;
	//UnTip();
}

function getGroupToolTip(group) {
	var groupFeeds = group.feeds;
	var feedCount = groupFeeds.length;
	var feedErrorCount = 0;
	var feedUnseenCount = 0;
	var feedUnreadCount = 0;
	var itemCount = 0;
	var itemUnseenCount = 0;
	var itemUnreadCount = 0;
	var toolTip = "";

	for (var i = 0; i < feedCount; ++i) {
		var feed = groupFeeds[i];
		if (feed.error) {
			feedErrorCount++;
		}
		itemCount += feed.getItemCount();
		var j = feed.getUnseenCount();
		if (j > 0) {
			feedUnseenCount++;
			itemUnseenCount += j;
		}
		j = feed.getUnreadCount();
		if (j > 0) {
			feedUnreadCount++;
			itemUnreadCount += j;
		}
	}

	toolTip += chrome.i18n.getMessage("group_tooltip_feeds", [""+feedCount, ""+feedUnseenCount, ""+feedUnreadCount]);
	toolTip += "\n" + chrome.i18n.getMessage("group_tooltip_items", [""+itemCount, ""+itemUnseenCount, ""+itemUnreadCount]);
	if (feedErrorCount) {
		toolTip += "\n" + chrome.i18n.getMessage("group_tooltip_errors", [""+feedErrorCount]);
	}
	return toolTip;	
}

function getFeedToolTip(feed) {
	var toolTip = feed.feedTitle ? feed.feedTitle : feed.name;
	toolTip += '\n' + feed.url;
	if (feed.pubDate) {
		toolTip += '\n' + chrome.i18n.getMessage("feed_tooltip_pubdate",[feed.pubDate.toLocaleString()]);
	}
	if (feed.ttl > 0) {
		toolTip += '\n' + chrome.i18n.getMessage("feed_tooltip_ttl",[""+feed.ttl]);
	}
	if (feed.expire) {
		toolTip += '\n' + chrome.i18n.getMessage("feed_tooltip_upd",[feed.expire.toLocaleString()]);
	}
	toolTip += '\n' + chrome.i18n.getMessage("feed_tooltip_items",[""+feed.getItemCount(), ""+feed.getUnseenCount(), ""+feed.getUnreadCount()]);
	if (feed.error) {
		toolTip += "\n" + chrome.i18n.getMessage("feed_tooltip_error");
	}
	return toolTip;	
}

function showData(event) {
	var idx = event.currentTarget.feedIdx;
	var feed = idx < 0 ? dummyFeeds[(-1)-idx] : feeds[idx];
	openDiv(feed, event.altKey, event.shiftKey);
	/*
	 * We don't want to try and actualy GO to any of these URLs!
	 */
	event.returnValue = false;
	event.stopImmediatePropagation();
	event.stopPropagation();
	return false;
}

function openDiv(feed, altKey, shiftKey) {
	var targetFeedDataDiv = feedDataDivs[feed.url];
	if (targetFeedDataDiv && targetFeedDataDiv.openned) {
		genericCloseDiv(targetFeedDataDiv, feed, altKey, shiftKey)
	} else {
		genericOpenDiv(targetFeedDataDiv, feed, altKey, shiftKey)
	}
}

function genericOpenDiv(targetFeedDataDiv, feed, altKey, shiftKey) {

	if (useGroups) {
		var openGroupFeed = openFeeds[0];
	   	if (feed.popupGroupIdx && openGroupFeed != dummyFeeds[feed.popupGroupIdx]) {
			openDiv(dummyFeeds[feed.popupGroupIdx], false, false);
			if (!targetFeedDataDiv) {
				targetFeedDataDiv = feedDataDivs[feed.url];
			}
		} else if ((!feed.popupGroupIdx) && openGroupFeed) {
			genericCloseDiv(feedDataDivs[openGroupFeed.url], openGroupFeed, false, false)
		}
	}

	var targetFeedType = targetFeedDataDiv.feedType;

	if (targetFeedDataDiv.openFunction(targetFeedDataDiv,feed, altKey, shiftKey)) {
		if (openFeeds[targetFeedType]) {
			genericCloseDiv(feedDataDivs[openFeeds[targetFeedType].url], openFeeds[targetFeedType], false, false);
		}
		openFeeds[targetFeedType] = feed;
		targetFeedDataDiv.openned = true;
		var feedDiv = targetFeedDataDiv.parentNode;
		feedDiv.className = "opennedFeedDiv";
		feedContainer.className = targetFeedDataDiv.openContainerClass;
		if (options.hideOthersOnOpen && feedDiv.container) {
			feedDiv.container.parentNode.className = "feedDiv";
			feedContainer.appendChild(feedDiv);
		}
		feedDiv.scrollIntoViewIfNeeded();
	}
}

function genericCloseDiv(targetFeedDataDiv, feed, altKey, shiftKey) {
	var targetFeedType = targetFeedDataDiv.feedType;
	if (targetFeedDataDiv.closeFunction(targetFeedDataDiv, feed, altKey, shiftKey)) {
		openFeeds[targetFeedType] = null;
		targetFeedDataDiv.openned = false;
		var feedDiv = targetFeedDataDiv.parentNode;
		feedDiv.className = "feedDiv";
		feedContainer.className = closedContainerClass;
		if (options.hideOthersOnOpen && feedDiv.container) {
			feedDiv.container.insertBefore(feedDiv,feedDiv.belowDiv);
			feedDiv.container.parentNode.className = "opennedFeedDiv";
		}
	}
}

function openGroupDiv(div, group, altKey, shiftKey, preventButtonUpdate) {
	/*
	 * A group title has been clicked on - we simply expand the group.
	 */

	if (div.empty) {
		buildGroupContent(group, div);
	}

	if (altKey) {
		var groupFeeds = group.feeds;
		for (var i = 0; i < groupFeeds.length; ++i) {
			var feed = groupFeeds[i];
			if (shiftKey) {
				readAll(feed, false);
			} else {
				openFeedDiv(feedDataDivs[feed.url], feed, true, false, preventButtonUpdate);
			}
		}
		return false;
	}
	
	return true;
}

function closeGroupDiv(div, group, altKey, shiftKey) {
	var groupFeeds = group.feeds; 
	if (altKey) {
		for (var i = 0; i < groupFeeds.length; ++i) {
			var feed = groupFeeds[i];
			if (shiftKey) {
				readAll(feed, false);
			} else {
				openFeedDiv(feedDataDivs[feed.url], feed, true, false);
			}
		}
		return false;
	}

	for(var i = 0; i < groupFeeds.length; ++i) {
		var groupFeed = groupFeeds[i];
		if (groupFeed && feedDataDivs[groupFeed.url]) {
			var feedDiv = feedDataDivs[groupFeed.url];
			if (feedDiv.openned) {
				genericCloseDiv(feedDiv, groupFeed)
			}
		}
	}
	return true;
}

function openFeedDiv(div, feed, altKey, shiftKey, preventButtonUpdate) {
	/*
	 * A feed title has been clicked on
	 * If the shift key is pressed, simply open its URL in a
	 * new tab (return false to not affect the display).
	 *
	 * If the ALT key is pressed, then the feed content should be 
	 * marked as "seen" and (return false to not affect the display.
	 *
	 * Otherwise mark unseen titles as "displayed" and return true
	 * to effect the open.
	 */

	if (shiftKey && !altKey) {
		showUrl(feed.url, false);
		return false;
	}

	if (altKey) {
		if (shiftKey) {
			readAll(feed, false)
		} else {
			markFeedDivSeen(feed, div);
		}
		return false;
	}

	if (div) {
		if (div.empty) {
			buildFeedContent(feed, div);
		}

		var unseenItems = div.getElementsByClassName("unseenItemTitle");
		var len = unseenItems.length;
		for (var i = 0; i < len; ++i) {
			getItem(unseenItems[i].itemIdxs).displayed = true;
		}	
		backgroundPage.lastOpenedFeed = feed;
	}
	return true;
}

function openAvailableDiv(div, feed, altKey, shiftKey) {
	if (div.empty) {
		buildAvailableFeeds(div);
	}
	return !altKey;
}

function closeFeedDiv(div, feed, altKey, shiftKey) {
	if (shiftKey) {
		showUrl(feed.url, false);
		return false;
	}

	markFeedDivSeen(feed, div);
	if (!altKey) {
		changeCurrent(div, 0);
		if (backgroundPage.lastOpenedFeed.url == feed.url) {
			backgroundPage.lastOpenedFeed = null;
		}
	}
	return (!altKey);
}

function markFeedDivSeen(feed, div) {
	if (div && !div.empty) {
		var unseenItemNodes = div.getElementsByClassName("unseenItemTitle");
		var len = unseenItemNodes.length;
		var unseenItems = []; 
		for (var i = 0; i < len; ++i) {
			unseenItems.push(unseenItemNodes[i]);
		}
		for (var i = 0; i < len; ++i) {
			/*
			 * We set the item as seen and the anchor style for every unseen 
			 * to seen now so that they show-up as seen on next opening
			 */
			var unseenItem = getItem(unseenItems[i].itemIdxs);
			feed.setSeen(unseenItem.guid);
			delete unseenItem.displayed;
			setItemTitleStyles(unseenItems[i], "unreadItemTitle");
		}
	} else {
		var items = feed.getItems();
		var len = items.length;
		var item;
		for (var i = 0; i < len; ++i) {
			feed.setSeen(items[i].guid);
		}
	}
	setFeedTitleClass((div ? div.feedTitle : null), feed, true);
}

function closeAvailableDiv(div) {
	return true;
}

function showUrl(url, focus, reuse, callback) {
	if (url.indexOf("http:") != 0 && url.indexOf("https:") != 0) {
		return;
	}
	backgroundPage.openInTab(url, focus, reuse, true, callback);
}

function moreStories(evt) {
	if (evt.currentTarget.link)
		showUrl(evt.currentTarget.link, false, false);
}

function reloadAllFeeds() {
	var len = feeds.length;
	for (var i = 0; i < len; ++i) {
		internalUpdateFeed(feeds[i]);
	}
	setLoadingMsg();
}

function reloadGroup(group) {
	for (i in group.feeds) {
		internalUpdateFeed(group.feeds[i]);
	}
	setLoadingMsg();
}

function internalUpdateFeed(feed) {
	if (feed && !feed.updating) {
		feed.loadFeed(options.defaultTimeout);
	}
}

function reloadFeedEvent(evt) {
	reloadFeed(openFeeds[1]);
}

function reloadFeed(feed) {
	internalUpdateFeed(feed)
	setLoadingMsg();
}

function setLoadingMsg() {
	countUpdating();
	if (loadingCount > 0) {
		setMsg((loadingCount == 1 ? chrome.i18n.getMessage("one_feed_loading") :  chrome.i18n.getMessage("multiple_feeds_loading", [""+loadingCount])));
	} else {
		clearMsg();
		loadingCount = 0;
	}
}

function setMsg(text) {
	msg.innerHTML = text;
}

function clearMsg() {
	msg.innerHTML = "";
}

function readAll(feed, open, selector) {
	var dataDiv = feedDataDivs[feed.url];
	if ((!dataDiv) || dataDiv.empty) {
		var items = feed.getItems();
		var len = items.length;
		var item;
		for (var i = 0; i < len; ++i) {
			item = items[i];
			if ((!selector) || selector(feed, item)) { 
				if (open) {
					if (openCount < 20) { 
						openCount++;
						feed.setRead(item.guid);
						showUrl(item.url, false, false,
							((options.focusFirstTab && !tabOpened) ? setFirstTabId : undefined));
						tabOpened = true;
					}
				} else {
					feed.setRead(item.guid);
				}
			}
		}
	} else {
		var links = dataDiv.contentDiv.getElementsByClassName("itemTitle");
		var len = links.length;
		var link;
		var len;
		for (var i = 0; i < len; ++i) {
			link = links[i];
			item = getItem(link.itemIdxs);
			if ((!selector) || selector(feed, item)) { 
				if (open) {
					if (openCount < 20) { 
						openCount++;
						feed.setRead(item.guid);
						setItemTitleStyles(link, "readItemTitle");
						showUrl(item.url, false, false,
							((options.focusFirstTab && !tabOpened) ? setFirstTabId : undefined));
						tabOpened = true;
					}
				} else {
					feed.setRead(item.guid);
					setItemTitleStyles(link, "readItemTitle");
				}
			}
		}
	}
	setFeedTitleClass((dataDiv ? dataDiv.feedTitle : null), feed, true);
}

function markRead(evt) {
    var feed = feeds[evt.currentTarget.parentNode.parentNode.feedIdx];
    readAll(feed, false);
	if (!evt.ctrlKey) {
		openDiv(feed, false, false);
	}
}

function openUnseen(feed) {
	var chooseUnseen = function(myfeed, item) {return !(myfeed.isSeen(item.guid));};
	readAll(feed, true, chooseUnseen);
}
function openUnread(feed) {
	var chooseUnread = function(myfeed, item) {return !(myfeed.isRead(item.guid));};
	readAll(feed, true, chooseUnread);
}

function openAll(event) {
	openCount = 0;
	if (event.shiftKey) {
		openUnread(feeds[event.currentTarget.parentNode.parentNode.feedIdx]);
	} else if (event.altKey) {
		readAll(feeds[event.currentTarget.parentNode.parentNode.feedIdx], true);
	} else {
		openUnseen(feeds[event.currentTarget.parentNode.parentNode.feedIdx]);
	}
	if ((event.ctrlKey ^ options.singleItem) > 0) {
		window.close();
	}
}

function openAllUnread() {
	var len = feeds.length;
	openCount = 0;
	for (var i = 0; i < len; ++i) {
		openUnread(feeds[i]);
	}
}

function openAllUnseen() {
	var len = feeds.length;
	openCount = 0;
	for (var i = 0; i < len; ++i) {
		openUnseen(feeds[i]);
	}
}

function openGroupUnread(group) {
	openCount = 0;
	for (i in group.feeds) {
		openUnread(group.feeds[i]);
	}
}

function openGroupUnseen(group) {
	openCount = 0;
	for (i in group.feeds) {
		openUnseen(group.feeds[i]);
	}
}

function markFeedSeen(feed) {
	openFeedDiv(feedDataDivs[feed.url], feed, true, false, true); 
}

function markFeedRead(feed) {
	openFeedDiv(feedDataDivs[feed.url], feed, true, true, true); 
}

function markGroupSeen(group) {
	openGroupDiv(feedDataDivs[group.url], group, true, false, true); 
}

function markGroupRead(group) {
	openGroupDiv(feedDataDivs[group.url], group, true, true, true); 
}

function markAllSeen() {
	var len = feeds.length;
	var feed;
	for (var i = 0; i < len; ++i) {
		markFeedSeen(feeds[i]);
	}
}

function markAllRead() {
	var len = feeds.length;
	var feed;
	for (var i = 0; i < len; ++i) {
		markFeedRead(feeds[i]);
	}
}

function allFeedsMark(evt) {
	if (evt.shiftKey)
		markAllRead();
	else
		markAllSeen();
	evt.returnValue = false;
	return false;
}

function allFeedsRead(evt) {
	var checkClose = true;
	if (evt.shiftKey) {
		openAllUnread();
	} else {
		openAllUnseen();
	}
	if (checkClose && (event.ctrlKey ^ options.singleItem) > 0) {
		window.close();
	}
	evt.returnValue = false;
	return false;
}

function setFirstTabId(tab) {
	stateInfo.firstTab = tab.id;
}

function openItem(evt) {
	return realOpenItem(
		evt.currentTarget,
		evt.altKey,
		evt.ctrlKey,
		evt.shiftKey
	);
}

function realOpenItem(link, alt, ctrl, shift) {
	var titleLink = link.dataDiv.feedTitle;
	var feedObject = feeds[titleLink.feedIdx];
	changeCurrent(link.dataDiv, 0, link.parentNode);
	var linkItem = getItem(link.itemIdxs);
	if (alt && feedObject.isRead(linkItem.guid)) {
		feedObject.unsetRead(linkItem.guid);
	} else {
		feedObject.setRead(linkItem.guid);
		var closeOnOpen = ((ctrl ^ options.singleItem) != 0);
	}
	setFeedTitleClass(titleLink, feedObject, true);
	setItemTitleClass(link, linkItem, feedObject);
	if (!alt) {
		var closeOnOpen = uberShowUrl(linkItem.url, alt, ctrl, shift)
		if (closeOnOpen) {
			window.close();
		}
	}
	return false;
}

function uberShowUrl(url, alt, ctrl, shift) {
	var closeOnOpen = ((ctrl ^ options.singleItem) != 0);
	var focusOnOpen = (closeOnOpen && !tabOpened);
	showUrl(url, focusOnOpen, false,
		((options.focusFirstTab && !closeOnOpen && !tabOpened) ? setFirstTabId : undefined));
	tabOpened = true;
	return closeOnOpen;
}

function initToolbar() {
	setSoundIcon();
	allread.title = chrome.i18n.getMessage("allread_tooltip");
	allmark.title = chrome.i18n.getMessage("allmark_tooltip");
	refresh.title = chrome.i18n.getMessage("reload_all_tooltip");
	open_options.title = chrome.i18n.getMessage("open_options_tooltip");
	help.title = chrome.i18n.getMessage("open_help_tooltip");
	close_popup.title = chrome.i18n.getMessage("close_popup_tooltip");
}

function toggleSound() {
	setPopupMuteState(!stateInfo.muteSound);
}

function setPopupMuteState(state) {
	backgroundPage.setPopupMuteState(state);
	setSoundIcon();
}

function setSoundIcon() {
	if (!options.playSound) {
		soundSpan.className="hidden";
	} else if (stateInfo.muteSound) {
		soundToggle.className = "squareLink sound_mute";
		soundToggle.title = chrome.i18n.getMessage("enable_sound");
	} else {
		soundToggle.className = "squareLink sound_on";
		soundToggle.title = chrome.i18n.getMessage("mute_sound");
	}
}

function keyDownHandler(evt) {
	if (evt.keyCode == 37) {
		if (feeds.length > 1) {
			showPrev(evt);
			evt.returnValue = false;
			evt.stopImmediatePropagation();
			evt.stopPropagation();
			return false;
		}
	} else if (evt.keyCode == 39) {
		if (feeds.length > 1) {
			showNext(evt);
			evt.returnValue = false;
			evt.stopImmediatePropagation();
			evt.stopPropagation();
			return false;
		}
	} else if (evt.keyCode == 38) {  //UP
		if (feeds.length > 0) {
			if (openFeeds[1]) {
				var newItem = changeCurrent(feedDataDivs[openFeeds[1].url], -1, false, true);
				showTooltip(newItem);
			}
		}
		evt.returnValue = false;
		evt.stopImmediatePropagation();
		evt.stopPropagation();
		return false;
	} else if (evt.keyCode == 40) {  //DOWN
		if (feeds.length > 0) {
			if (openFeeds[1]) {
				var newItem = changeCurrent(feedDataDivs[openFeeds[1].url], 1, false, true);
				showTooltip(newItem);
			}
		}
		evt.returnValue = false;
		evt.stopImmediatePropagation();
		evt.stopPropagation();
		return false;
	} else if (evt.keyCode == 27 || evt.keyCode == 8) {  //ESCAPE or Backspace - override if the tooltip is showing;
		if (tooltipShowing) {
			closeTooltip();
			evt.returnValue = false;
			evt.stopImmediatePropagation();
			evt.stopPropagation();
			return false;
		}
		return true;
	} else if (evt.keyCode == 13) {  //ENTER
		if (currentItem) {
			realOpenItem(currentItem, evt.altKey, evt.ctrlKey, evt.shiftKey);
			if (!evt.altKey) {
				currentItem = undefined;
			}
		}
		evt.returnValue = false;
		evt.stopImmediatePropagation();
		evt.stopPropagation();
		return false;
	} else if (evt.keyCode == 82) {  //r
		if (evt.shiftKey) {
			if (evt.altKey)
				markAllRead();
			else
				openAllUnread();
			evt.returnValue = false;
			evt.stopImmediatePropagation();
			evt.stopPropagation();
			return false;
		}
		return true;
	} else if (evt.keyCode == 83) {  //S
		if (evt.shiftKey) {
			if (evt.altKey)
				markAllSeen();
			else
				openAllUnseen();
			evt.returnValue = false;
			evt.stopImmediatePropagation();
			evt.stopPropagation();
			return false;
		}
		return true;
	}
}

function showTooltip(item) {
	closeTooltip();
	var target = item.getElementsByClassName("itemTitleText")[0];
	createItemTooltip({target: target, currentTarget: target, clientX: target.offsetLeft, clientY: target.offsetTop + (target.offsetHeight / 2)});
}

function changeCurrent(dataDiv, direction, item, scroll) {
//	var current = dataDiv.getElementsByClassName("currentItem")[0];
	var current;
	if (currentItem) {
		current = currentItem.parentNode;
		if (current) {
			closeTooltip();
			current.className = "item";
			currentItem = undefined;
		}
	}
	var newCurrent;
	if (item) {
		newCurrent = item;
	} else if (direction != 0) {
		var items = dataDiv.getElementsByClassName("item");
		if (current) {
			if (direction > 0) {
				newCurrent = current.nextSibling;
				if (!newCurrent) {
					newCurrent = items[0];
				}
			} else {
				newCurrent = current.previousSibling;
			    if (!newCurrent) {
					newCurrent = items[items.length - 1];
				}
			}
		} else if (items.length > 0) {
			newCurrent = items[0];
		}
	}

	if (newCurrent) {
		newCurrent.className = "item currentItem";
		if (scroll) {
			newCurrent.scrollIntoViewIfNeeded();
		}
		currentItem = newCurrent.firstChild;
	}				
	return newCurrent;
}

/*
 * CONTEXT MENU PROCESSING
 */
function ctx_openItem(info) {
	var url = info.linkUrl;
	var link = ctxURL2ItemDiv[url];
	if (link) {
		realOpenItem(link, false, false, false);
	}
}

function ctx_markItemUnread(info) {
	var url = info.linkUrl;
	var link = ctxURL2ItemDiv[url];
	if (link) {
		var titleLink = link.dataDiv.feedTitle;
		var feedObject = feeds[titleLink.feedIdx];
		var linkItem = getItem(link.itemIdxs);
		if (feedObject.isRead(linkItem.guid)) {
			realOpenItem(link, true, false, false);
		}
	}
}

function ctx_markItemRead(info) {
	var url = info.linkUrl;
	var link = ctxURL2ItemDiv[url];
	if (link) {
		var titleLink = link.dataDiv.feedTitle;
		var feedObject = feeds[titleLink.feedIdx];
		var linkItem = getItem(link.itemIdxs);
		if (!feedObject.isRead(linkItem.guid)) {
			realOpenItem(link, true, false, false);
		}
	}
}

function ctx_reloadFeed(info) {
	var url = info.linkUrl;
	var link = ctxURL2FeedDiv[url];
	if (link) {
		reloadFeed(feeds[link.feedIdx]);
	}
}

function ctx_openFeedHome(info) {
	var url = info.linkUrl;
	var link = ctxURL2FeedDiv[url];
	if (link) {
		var feedObject = feeds[link.feedIdx];
		var moreStories = feedObject.getMoreStories();
		if (moreStories) {
			uberShowUrl(moreStories, false, false, false);
		}
	}
}

function ctx_markFeedSeen(info) {
	var url = info.linkUrl;
	var link = ctxURL2FeedDiv[url];
	if (link) {
		markFeedSeen(feeds[link.feedIdx]);
	}
}

function ctx_markFeedRead(info) {
	var url = info.linkUrl;
	var link = ctxURL2FeedDiv[url];
	if (link) {
		markFeedRead(feeds[link.feedIdx]);
	}
}

function ctx_openFeedUnseen(info) {
	var url = info.linkUrl;
	var link = ctxURL2FeedDiv[url];
	if (link) {
		openUnseen(feeds[link.feedIdx]);
	}
}

function ctx_openFeedUnread(info) {
	var url = info.linkUrl;
	var link = ctxURL2FeedDiv[url];
	if (link) {
		openUnread(feeds[link.feedIdx]);
	}
}

function ctx_openFeedAll(info) {
	var url = info.linkUrl;
	var link = ctxURL2FeedDiv[url];
	if (link) {
		readAll(feeds[link.feedIdx], true);
	}
}

function ctx_setSoundNotification(info) {
	setPopupMuteState(!info.checked);
}

function ctx_openOptionsPage(info) {
	backgroundPage.openExtensionPage('options.html');
}

function ctx_openAboutPage(info) {
	window.location.replace("updated.html");
}

function ctx_openAllUnread(info) {
	openAllUnseen();
}

function ctx_openAllUnseen(info) {
	openAllUnread();
}

function ctx_markAllRead(info) {
	markAllRead();
}

function ctx_markAllSeen(info) {
	markAllSeen();
}

function ctx_reloadAllFeeds(info) {
	reloadAllFeeds();
}

function ctx_reloadGroup(info) {
	var url = info.linkUrl;
	var link = ctxURL2GroupDiv[url];
	if (link) {
		reloadGroup(dummyFeeds[(-1)-link.feedIdx]);
	}
}

function ctx_markGroupRead(info) {
	var url = info.linkUrl;
	var link = ctxURL2GroupDiv[url];
	if (link) {
		markGroupRead(dummyFeeds[(-1)-link.feedIdx]);
	}
}

function ctx_openGroupUnseen(info) {
	var url = info.linkUrl;
	var link = ctxURL2GroupDiv[url];
	if (link) {
		openGroupUnseen(dummyFeeds[(-1)-link.feedIdx]);
	}
}

function ctx_openGroupUnread(info) {
	var url = info.linkUrl;
	var link = ctxURL2GroupDiv[url];
	if (link) {
		openGroupUnread(dummyFeeds[(-1)-link.feedIdx]);
	}
}

function ctx_markGroupSeen(info) {
	var url = info.linkUrl;
	var link = ctxURL2GroupDiv[url];
	if (link) {
		markGroupSeen(dummyFeeds[(-1)-link.feedIdx]);
	}
}



var contextMenuProcessors = {};

function initContextMenuProcessors() {
	contextMenuProcessors["ctxItemLink/ctxItemOpen"]     = ctx_openItem;
	contextMenuProcessors["ctxItemLink/ctxItemMarkUnread"] = ctx_markItemUnread;
	contextMenuProcessors["ctxItemLink/ctxItemMarkRead"] = ctx_markItemRead;

	contextMenuProcessors["ctxFeedLink/ctxFeedReload"]     = ctx_reloadFeed;
	contextMenuProcessors["ctxFeedLink/ctxFeedHome"] = ctx_openFeedHome;
	contextMenuProcessors["ctxFeedLink/ctxFeedOpenUnseen"] = ctx_openFeedUnseen;
	contextMenuProcessors["ctxFeedLink/ctxFeedOpenUnread"] = ctx_openFeedUnread;
	contextMenuProcessors["ctxFeedLink/ctxFeedOpenAll"] = ctx_openFeedAll;
	contextMenuProcessors["ctxFeedLink/ctxFeedMarkSeen"] = ctx_markFeedSeen;
	contextMenuProcessors["ctxFeedLink/ctxFeedMarkRead"] = ctx_markFeedRead;

	contextMenuProcessors["ctxGroupLink/ctxGroupReload"]     = ctx_reloadGroup;
	contextMenuProcessors["ctxGroupLink/ctxGroupOpenUnseen"] = ctx_openGroupUnseen;
	contextMenuProcessors["ctxGroupLink/ctxGroupOpenUnread"] = ctx_openGroupUnread;
	contextMenuProcessors["ctxGroupLink/ctxGroupMarkSeen"] = ctx_markGroupSeen;
	contextMenuProcessors["ctxGroupLink/ctxGroupMarkRead"] = ctx_markGroupRead;

	contextMenuProcessors["ctxGlobalActions/_globalActionMenu/ctxSoundNotifications"] = ctx_setSoundNotification;
	contextMenuProcessors["ctxGlobalActions/_globalActionMenu/ctxOpenOptionsPage"] = ctx_openOptionsPage;
	contextMenuProcessors["ctxGlobalActions/_globalActionMenu/ctxOpenAboutPage"] = ctx_openAboutPage;
	contextMenuProcessors["ctxGlobalActions/_globalActionMenu/ctxOpenAllUnreadItems"] = ctx_openAllUnread;
	contextMenuProcessors["ctxGlobalActions/_globalActionMenu/ctxOpenAllUnseenItems"] = ctx_openAllUnseen;
	contextMenuProcessors["ctxGlobalActions/_globalActionMenu/ctxMarkAllFeedsRead"] = ctx_markAllRead;
	contextMenuProcessors["ctxGlobalActions/_globalActionMenu/ctxMarkAllFeedsSeen"] = ctx_markAllSeen;
	contextMenuProcessors["ctxGlobalActions/_globalActionMenu/ctxReloadAllFeeds"] = ctx_reloadAllFeeds;

	contextMenuProcessors["ctxPageActions/ctxSoundNotifications"] = ctx_setSoundNotification;
	contextMenuProcessors["ctxPageActions/ctxOpenOptionsPage"] = ctx_openOptionsPage;
	contextMenuProcessors["ctxPageActions/ctxOpenAboutPage"] = ctx_openAboutPage;
	contextMenuProcessors["ctxPageActions/ctxOpenAllUnreadItems"] = ctx_openAllUnread;
	contextMenuProcessors["ctxPageActions/ctxOpenAllUnseenItems"] = ctx_openAllUnseen;
	contextMenuProcessors["ctxPageActions/ctxMarkAllFeedsRead"] = ctx_markAllRead;
	contextMenuProcessors["ctxPageActions/ctxMarkAllFeedsSeen"] = ctx_markAllSeen;
	contextMenuProcessors["ctxPageActions/ctxReloadAllFeeds"] = ctx_reloadAllFeeds;

	contextMenuProcessors["ctxToolActions/ctxOpenAllUnreadItems"] = ctx_openAllUnread;
	contextMenuProcessors["ctxToolActions/ctxOpenAllUnseenItems"] = ctx_openAllUnseen;
	contextMenuProcessors["ctxToolActions/ctxMarkAllFeedsRead"] = ctx_markAllRead;
	contextMenuProcessors["ctxToolActions/ctxMarkAllFeedsSeen"] = ctx_markAllSeen;
}
function contextMenuClicked(info, tab) {

	var processor = contextMenuProcessors[info.menuItemId];
	if (processor) {
		processor(info);
	} else {
		alert ("NO PROCESSOR FOR: " + info.menuItemId);
	}
}
