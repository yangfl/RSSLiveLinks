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

/*
 * "tab_<tabid>" -> array of feed objects
 */
var tabFeeds = {};

/*
 * feed URL -> {feed: feed object, tabCount: number of tabs publishing it}
 */
var tabFeedsByURL = {};

function tabUpdated(tabId, info, tab) {
	if (info.status == "complete") {
		tabRemoved(tabId);
		addTabDetails(tab);
	}
}

function tabRemoved(tabId) {
	var closedId = "tab_" + tabId;
	var closedTabFeeds = tabFeeds[closedId];
	if (closedTabFeeds)	{
		for (var i = 0; i < closedTabFeeds.length; ++i) {
			var feed = closedTabFeeds[i];
			var tabsForURL = tabFeedsByURL[feed.url];
			tabsForURL.tabCount--;
			if (tabsForURL.tabCount <= 0) {
				delete(tabFeedsByURL[feed.url]);
			}
		}
		delete(tabFeeds[closedId]);
	}
	checkBrowserIcon();
}

var unsubscribedIcon = false;

function checkBrowserIcon(force) {
	var needUpdate = force;
	if (options.useAvailableIcon) {
		var unsubscribed = false;
		for (url in tabFeedsByURL) {
			if (feedInfo.feedsByURL[url] == undefined) {
				unsubscribed = true;
			}
		}
		if (unsubscribed != unsubscribedIcon) {
			gfx.src = (unsubscribed ? "img/rssll_plus_rss19x19.png" : "img/rssll_19x19.png");
			needUpdate = true;
			unsubscribedIcon = unsubscribed;
		}
	} else {
		if (gfx.src != "img/rssll_19x19.png") {
			gfx.src = "img/rssll_19x19.png";
			needUpdate = true;
		}
	}
	if (needUpdate) {
		setButtonTitle(badgeCount, badgeErrors);
	}
}

chrome.tabs.onUpdated.addListener(tabUpdated);
chrome.tabs.onRemoved.addListener(tabRemoved);

	chrome.extension.onRequest.addListener(
		function(request, sender, sendResponse) 
		{
			if (!sender.tab) {
				return;
			}
			var tabId = sender.tab.id;
			var links = request;
			if (!links) {
				return;
			}
			var modLinks = [];
			for (var i = 0; i < links.length; ++i) {
				var link = links[i];
				if (!(link.name===undefined || link.url===undefined)) {
					if (sender.tab.favIconUrl) {
						link.faviconURL = sender.tab.favIconUrl;
					}
					modLinks.push(link);
					var tabsForURL = tabFeedsByURL[link.url];
					if (!tabsForURL) {
						tabFeedsByURL[link.url] = {feed: link, tabCount: 1};
					} else {
						tabsForURL.tabCount++;
					}
				}
			}
			if (modLinks.length > 0) {
				tabFeeds["tab_" + tabId] = modLinks;   
			}
			checkBrowserIcon();
		}
); 

function addTabDetails(tab) {
	if (tab.url && (tab.url.indexOf("http://") == 0 || tab.url.indexOf("https://") == 0)) {
		getTabRSS(tab.id);
	}
}

function getTabRSS(tabId) {
	chrome.tabs.executeScript(tabId, {
file: "findrss.js", allFrames: true
//file: "findrss.js"
});
}

function addAllTabs(tabs) {
	for (var i = 0; i < tabs.length; ++i) {
		addTabDetails(tabs[i]);
	}       
}
