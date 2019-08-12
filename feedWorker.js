/**
 * RSS Live Links - an RSS "live bookmark" extension for Google Chrome
 *
 * Copyright 2012 Martin Bartlett
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
 * This is a web worker that performs feed updates - it does the XMLHttpRequest call and then
 * all the parsing into standard javascript objects, AND all the "changes" calculations. The
 * point of it is that the caller (Feed.js) should then be able to simply take the data and
 * very easily update itself in the foreground thread, leaving the heavy-lifting to this thread.
 *
 * Hopefully, the result is a much faster GUI response.
 *
 * BUT - in fact it wasn't! The web worker worked fine, but it turns out that
 * the XML processing wasn't as huge a bottleneck as I thought, then take into
 * account the fact using a web worker trippled the memory requirements and
 * it really wasn't worth it.
 *
 * The code is still runnable in a web worker, but the that implementation is disabled
 * by not including the web worker in background.html, and including this file 
 * (and xmlhttp.js) directly. 
 *
 * Hey, at least I know how to DO web workers now :-)
 */

/*
 * For TESTING (it figures to use this dynamically)!!!
 */
function localRunRequest(request, data, feed) {

	data.testing = {feed: feed}
	runUpdate(1, data);

}

var xmlNamespace = "http://www.w3.org/XML/1998/namespace";

/*
 * The input and output messaging functions
 */
function runUpdate(id, data) {
	data.response = {};
	data.id = id;
	var feed = data.feed;
	data.response.feed = {
		updateCycleId: feed.updateCycleId,
		baseURL:       feed.baseURL,
		parentURL:     feed.parentURL,
		itemGuids:     feed.itemGuids,
		itemsByGuid:   feed.itemsByGuid,
		deletedItems:  feed.deletedItems,
		moreStories:   feed.moreStories,
		txt: feed.txt,
		ttl: feed.ttl,
		pubDate: feed.pubDate,
		stats: feed.stats,
		faviconURL: feed.faviconURL
	};
	//logMsg("Running update for " + data.url);
	xmlHttpRequestManager.runRequest(data.url, data, handleResponse, handleError, data.timeout);
	//logMsg("Sent update for " + data.url);
};

function endUpdate (data, changed) {
	var response = data.response;
	response.changed = changed;

	//logMsg("Ending update for " + data.url);
	if (data.testing) {
		/*
		 * TESTING
		 */
		var feed     = data.testing.feed;
		var doneFunc = data.testing.doneFunc;
		feed.handleUpdate(response);
	} else {
		returnResponse(data.id, response);
	}
}

/*
 * The stuff that used to be in Feed.js
 */

function handleResponse(data, doc, txt) {
	//logMsg("Handling response for " + data.url);
	try {
		var changed = false;
		if ((!doc) && txt) {
		//if (txt) {
			if (data.testing) {
				var parser = new DOMParser();
				doc = parser.parseFromString(txt, "text/xml");
			} else {
				var parser = new DOMImplementation();
				doc = parser.loadXML(txt).getDocumentElement();
			}
		}
		if (doc) {
			endUpdate(data, populate(data, doc, txt));
		} else {
			data.response.error = 'Not a valid feed';
			endUpdate(data, false);
		}
	} catch (e) {
		var stack = e.stack.replace(/^[^\(]+?[\n$]/gm, '')
			.replace(/^\s+at\s+/gm, '')
			.replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
			.split('\n');
		data.response.error = 'Feed processing error. type: ' + e.type + ", message: " + e.message + "\r\n" + "Stack Trace: " +stack;
		endUpdate(data, false);
	}
}

function handleError(data, errorText) {
	//logMsg("Handling error for " + data.url);
	data.response.error = errorText;
	endUpdate(data, false);
}

function populate (data, doc, txt) {

	var response = data.response;
	var feed = data.feed;
	var responseFeed = response.feed;

	if (feed.txt == txt) {
		//logMsg("NOT populating " + data.url);
		endUpdate(data, false);
		return;
	} else {
		//logMsg("populating " + data.url);
		responseFeed.txt = txt;
	}

	var changed = true;

	var feedPubDate = undefined;
	var dateString = "";

	var feedPubDateEl = doc.getElementsByTagName("lastBuildDate").item(0);
	dateString = trim11(getInner(feedPubDateEl, ''));

	if (dateString.length < 1) { // Try other tag names
		function setDateString(dateTagName) {
			if (!tagNames) {
				console.error("function getDateString() requires one truthy arguments.");
				return;
			} else {
				feedPubDateEl = doc.getElementsByTagName(dateTagName).item(0);
				if (feedPubDateEl && feedPubDateEl.firstChild) {
					var parentTag = feedPubDateEl.parentNode.tagName;
					if (!(parentTag == "item" || parentTag == "entry")) {
						dateString = trim11(getInner(feedPubDateEl, ''));
					}
				}
			}
		}
		setDateString("updated");
		if (dateString.length < 1) {
			setDateString("pubDate");
		}
	}

	if (dateString.length > 0) {
		feedPubDate = createDate(dateString);
	} 

	if (!feedPubDate) {
		feedPubDate = new Date();
	}

	responseFeed.pubDate = feedPubDate;

	var moreStoriesURL;
	var link = doc.getElementsByTagName("link").item(0);
	if (link) {
		var parentTag = link.parentNode.tagName;
		if (parentTag != "item" && parentTag != "entry") {
			var url = link.getAttribute("href");
			if (url) {
				moreStoriesURL = trim11(url);
			} else {
				moreStoriesURL = trim11(getInner(link, null));
			}
		}
	}

	if (!moreStoriesURL) {
		moreStoriesURL = getRootURL(data.url);
	}

	responseFeed.moreStories = moreStoriesURL;

	var title = doc.getElementsByTagName("title").item(0);
	if (title && title.firstChild) {
		parentTag = title.parentNode.tagName;
		if (parentTag != "item" && parentTag != "entry") {
			responseFeed.feedTitle = trim11(getInner(title, "Unknown Feed"));
		}
	}

	var myFavIconURL = feed.faviconURL;

	if ((!myFavIconURL) && responseFeed.moreStories) {
		var rootURL = getRootURL(responseFeed.moreStories);
		myFavIconURL = rootURL + "/favicon.ico";
	}

	if (myFavIconURL) {
		responseFeed.faviconURL = myFavIconURL;
	}

	// get time to live
	responseFeed.ttl = 0;
	var ettl = doc.getElementsByTagName("ttl").item(0);
	responseFeed.ttl = parseInt(getInner(ettl,"0"));
	if (responseFeed.ttl == NaN) {
		responseFeed.ttl = 0;
	}

	return populateItems(data, doc);
}

function populateItems(data, doc) {

	var response = data.response;
	var feed = data.feed;
	var responseFeed = response.feed;

	responseFeed.updateCycleId++;

	var items = doc.getElementsByTagName('entry');
	if (items.length == 0) {
		items = doc.getElementsByTagName('item');
	}

	var newItemGuids = [];
	var newDeletedItems = [];
	var newItemsByGuid = {};

	/*
	 * We now build the new item list and figure out what the difference
	 * is between the old and the new.
	 * 
	 * This is expressed in four counts:
	 *
	 *    additions - new items
	 *    deletions - old items
	 *    moves     - existing items for which previous additions and deletions
	 *                from the list do not account for their position in the new
	 *                list.
	 *    mods      - exisiting items that for which the title or URL has changed
	 *
	 * Note that an itme may cause increments in both the moves and mods counts
	 *
	 * Later, in background.js, these four counts are used to fugure out whether
	 * it would be more economical to keep the old bookmark folder and perform
	 * the additions, deletions, moves and mods or just delete the folder
	 * altogether, recreate it and add all the new items.
	 */
	var additions = 0;
	var deletions = 0;
	var deleteCounts = [];
	var moves = 0;
	var mods = 0;
	var len = items.length;
	var item;
	var guid;
	var newItem;
	var oldItem;
	for (var i = 0; i < len; i++) {
		newItem = getFeedItem(items.item(i), data, i);
		if (!newItem.guid)
			continue;

		if (newItemsByGuid[newItem.guid]) {
			//logMsg("WARN: item in feed \"" + data.name + "\": " + newItem.guid);
			continue;
		}

		oldItem = feed.itemsByGuid[newItem.guid];
		
		if (oldItem) {
			/*
			 * There is an old item with the same GUID
			 */
			if (oldItem.title != newItem.title
			||  oldItem.url != newItem.url
			||  oldItem.description != newItem.description) {
				mods++;
				newItem.modified = true;
				oldItem.title = newItem.title;
				oldItem.url = newItem.url;
				oldItem.description = newItem.description;
			} else {
				oldItem.modified = false;
			}
			oldItem.pubDate = newItem.pubDate;
			oldItem.updateCycleId = responseFeed.updateCycleId;
			oldItem.moved = false;
			oldItem.added = false;
			newItem = oldItem;
		} else {
			/*
			 * There is no old item, mark it as added then, if
			 * it's an item we DID once see, set its seen state
			 * from then.
			 */
			++additions;
			newItem.added = true;
		}

		newItemGuids.push(newItem.guid);
		newItemsByGuid[newItem.guid] = newItem;
	}

	/*
	 * Now we go back through the OLD list and mark deletions.
	 *
	 * At the same time we record how many deletions precede each
	 * index in the old itemGuids array - this allows us to quickly
	 * obtain this count for any apparently moved elements for
	 * the calculation that determines if they have really been moved.
	 */
	len = feed.itemGuids.length;
	for (var i = 0; i < len; i++) {
		guid = feed.itemGuids[i]
		item = feed.itemsByGuid[guid];
		if (item.updateCycleId != responseFeed.updateCycleId) {
			item.deleted = ++deletions;
			newDeletedItems.push(guid);
		}
		deleteCounts[i] = deletions;
	}

	/*
	 * Now we go back through the NEW list and calculate if each
	 * existing item has moved
	 */
	len = newItemGuids.length;
	var previousDeletions;
	var movesAbove;
	var myMoveCount;
	var adjustedIndex;
	for (var i = 0; i < len; i++) {

		guid = newItemGuids[i];
		newItem = newItemsByGuid[guid];

		if (!newItem.added) {
			/*
			 * If the item's new index (i) is equal to the old
			 * index + the number of additions + the number of items moved from below it 
			 * to above t - the number of deletions that precede it in the old list, 
			 * then it hasn't really moved. Otherwise it has.
			 */

			/*
			 * The number of deletions that precede an item in the old list is already
			 * available.
			 */
			previousDeletions = deleteCounts[newItem.position];

			/*
			 * Now take the current position and look up for any moves for which their
			 * old position was below our old position - these kinda count as inserts
			 * above.
			 *
			 * There is almost certainly a way of calculating this without going back up,
			 * but for now (and for clarity) that's what we do.
			 */
			movesAbove = 0;
			myMoveCount = moves;
			for (var j = i-1; j >= 0 && myMoveCount > 0; --j) {
				var movedItem = newItemsByGuid[newItemGuids[j]];
				if (movedItem.moved) {
					myMoveCount--;
					if (movedItem.oldPosition > newItem.position) {
						movesAbove++;
					}
				}
			}

			/*
			 * Calculate the adjusted index and then see if other actions acount for our new
			 * position.
			 */
			adjustedIndex = (newItem.position) + additions + movesAbove- previousDeletions;
			if (adjustedIndex != i) {
				newItem.moved=true;
				moves++;
			}
		}
		newItem.oldPosition = newItem.position
		newItem.position = i;
	}

	var changed = (additions > 0 || deletions > 0 || moves > 0);

	if (changed) {
		responseFeed.itemsByGuid = newItemsByGuid;
		responseFeed.itemGuids = newItemGuids;
		responseFeed.deletedItems = newDeletedItems;
	}

	responseFeed.stats = {additions: additions, deletions: deletions, moves: moves, mods: mods};

	return changed || mods > 0;
}

function getInner(parnt, dflt) {
	var rc = dflt;
	if (parnt) {
		if (parnt.textContent) {
			rc = parnt.textContent;
		} else if (parnt.firstChild && parnt.firstChild.nodeValue) {
			rc = parnt.firstChild.nodeValue;
		} 
	}
	return rc;
}

function getFeedItem(itemXML, data, num) {

	var newItem = {};

	var feed = data.feed;
	var responseFeed = data.response.feed;

	var parentTagName = itemXML.tagName;
	var hrefBase = itemXML.getAttributeNS(xmlNamespace, "base");
	if (hrefBase) {
	   	if (isRelative(hrefBase)) {	
			hrefBase = (hrefBase.charAt(0) == "/" ? responseFeed.baseURL : responseFeed.parentURL) + "/" + hrefBase;
		}
	}

	var desc = itemXML.getElementsByTagName('description').item(0);
	
	if (!desc) {
		desc = itemXML.getElementsByTagName('content').item(0);
	}

	newItem.description = getInner(desc, "");

	var itemTitle = getInner(itemXML.getElementsByTagName('title').item(0), "Unknown title");
	newItem.title = trim11(itemTitle);
	if (newItem.title.length < 1) {
		newItem.title = undefined;
	}

	/*
	 * Trying to cater for feeds that have LOTS of links in an item!
	 *
	 * We take the first one by default, but also look for one that is
	 * "alternate" and "text/html" and prefer THAT one if it exists.
	 */
	var itemUrls = itemXML.getElementsByTagName('link');
	var itemUrl;
	var len = itemUrls.length;
	var rel;
	var type;
	for (var i = 0; i < len; ++i) {
		var url = itemUrls.item(i);

		if (url.parentNode.tagName == parentTagName) {
			if (itemUrl == undefined) {
				itemUrl = url;
			} else {
				rel = url.getAttribute("rel");
				type = url.getAttribute("type"); 
				if (rel == "alternate" && type == "text/html") {
					itemUrl = url;
					break;
				}
			}
		}
	}

	if (itemUrl) {
		var href = itemUrl.getAttribute("href");
		if (href) {
			itemUrl = href;
		} else {
			itemUrl = getInner(itemUrl, '');
		}
	} else {
		itemUrl = '';
	}

	itemUrl = trim11(itemUrl);
	if (itemUrl.length < 1) {
		newItem.url = undefined;
	} else {
	   	if (isRelative(itemUrl)) {	
			newItem.url = (itemUrl.charAt(0) == "/" ? feed.baseURL : (hrefBase ? hrefBase : feed.parentURL)) + "/" + itemUrl;
		} else {
			newItem.url = itemUrl;
		}
	}

	var pubDate = itemXML.getElementsByTagName('pubDate').item(0);
	if (!(pubDate && pubDate.firstChild)) {
		pubDate = itemXML.getElementsByTagName('updated').item(0);
	}
	pubDate = getInner(pubDate, new Date());
	newItem.pubDate = pubDate;

	var guid = itemXML.getElementsByTagName('guid').item(0);
	var guidStr = trim11(getInner(guid, ''));
	if (guidStr.length < 1) {
		guidStr = undefined;
	} 

	if (!guidStr) {
		guid = itemXML.getElementsByTagName('id').item(0);
		guidStr = trim11(getInner(guid, ''));
		if (guidStr.length < 1) {
			guidStr = undefined;
		} 	
	}

	if (guidStr) {
		newItem.guid = guidStr;
	} else if (!(newItem.title == undefined || newItem.description == undefined || newItem.url == undefined)) {
		newItem.guid = newItem.title + newItem.url;
	}

	return newItem;	
}
