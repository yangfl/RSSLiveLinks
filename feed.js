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
 * The Feed and FeedItem objects that isolate the model (the RSS feed and its items) from the
 * presentation.
 */

var feedDelayTime = 0;

function handleFeedUpdateResponse(id, data, feed) {
	feed.handleUpdate(data);
}

function handleFeedUpdateError(id, error, data, feed) {
	feed.setError(error);
	feed.endUpdate(false);
}

function Feed(name, url, maxEnts, refreshTime, defaultTtl, faviconURL) {
	this.ownerWindow = window;
	this.updated = new Date();
	this.url = url;
	this.name = name;

	/*
	 * Data items required by the web-worker
	 */
	this.data = {};
	this.data.updateCycleId = 0;
	this.data.baseURL = getRootURL(url);
	this.data.parentURL = getParentURL(url, this.data.baseURL.length);
	this.data.deletedItems = [];
	this.data.itemGuids = [];
	this.data.itemsByGuid = {};
	this.data.moreStories = null;
	this.data.txt = null;
	this.data.pubDate = null;
	this.data.faviconURL = faviconURL;
	this.data.stats = {additions: 0, deletions: 0, moves: 0, mods: 0};

	this.defaultTtl = defaultTtl;
	this.maxItemsSize = 0;
	this.networkTimeout = 0;
	this.itemsSize = 0;
	this.deletedSeenStates = new DeletedSeenStates();
	this.feedTitle = this.name;
	this._seenStates ={};
	this._unseenCount = 0;
	this._unreadCount = 0;
	this.refreshTime = refreshTime;
	this.ttl = 0;
	this.expire = 0;
	this.maxItems = maxEnts;
	this._init();
}

Feed.prototype.getMoreStories = function() {
	return this.data.moreStories;
}

Feed.prototype.getMaxItems = function() {
	return this.maxItems;
}

Feed.prototype.setMaxItems = function(maxEnts) {
	this.maxItems = maxEnts;
	this._setState()
}

Feed.prototype.setDefaultTtl = function(ttl) {
	var myTTL = parseInt(ttl);
	if (isNaN(myTTL)) {
		console.error("Feed.setDefaultTtl ttl invalid: " + ttl);
		return
	}
	this.data.defaultTtl = myTTL;
	this.setExpireTime();
}

Feed.prototype.setRefreshTime = function(time) {
	if (time != "TTL") {
		var myTime = parseInt(time);
		if (isNaN(myTime)) {
			console.error("Feed.setRefreshTime time invalid: " + time);
			return
		}
		time = myTime;
		if (time < 1) {
			time = 1;
		} else if (time > 60) {
			time = 60;
		}
	}
	this.refreshTime = time;
	this.setExpireTime();
}

Feed.prototype.hasUnseen = function() {
	return (this._unseenCount > 0);
}

Feed.prototype.getUnseenCount = function() {
	return this._unseenCount;
}

Feed.prototype.hasUnread = function() {
	return (this._unreadCount > 0);
}

Feed.prototype.getUnreadCount = function() {
	return this._unreadCount
}

Feed.prototype.getItemByGuid =function (guid) {
	return this.data.itemsByGuid[guid];
}

Feed.prototype.getItemCount = function() {
	var max = this.getMaxItems();
	return (max < 0 ? this.itemsSize : Math.min(this.itemsSize, max));
}

Feed.prototype.getItems = function() {
	var myItems = [];
	var itemGuids = this.data.itemGuids;
	var itemsByGuid = this.data.itemsByGuid;
	var myCount = this.getItemCount();
	for (var i = 0; i < myCount; ++i) {
		myItems[i] = itemsByGuid[itemGuids[i]];

	}
	return myItems;
}

Feed.prototype.getSeenStates = function() {
	var states = this.deletedSeenStates.getSeenStates();
	for (var guid in this._seenStates) {
		states[guid] = this._seenStates[guid];
	}
	return states;
}

Feed.prototype._init = function() {
	this.seen = false;
	this.data.stats = {additions: 0, deletions: 0, moves: 0, mods: 0};
}

Feed.prototype.setExpireTimeTTL = function() {
	var ittl = 5;
	if (this.data.ttl > 0) {
		ittl = this.data.ttl;
	} else if (this.defaultTtl > 0) {
		ittl = this.defaultTtl;
	}
	var now = new Date();
	if (this.data.pubDate) {
		var myPubDate = new Date(this.data.pubDate.toString());
		myPubDate.setTime(myPubDate.getTime() + (60000 * ittl));
		if (myPubDate.getTime() > now.getTime()) {
			this.expire = myPubDate;
			return;
		}
	} 
	now.setTime(this.updated.getTime()+(60000 * ittl));
	this.expire = now;
}

Feed.prototype.setExpireTime = function() {
	if (this.refreshTime == "TTL") {
		this.setExpireTimeTTL()
	} else {
		var myDate=new Date();
		myDate.setTime(this.updated.getTime()+(60000 * this.refreshTime));
		this.expire = myDate;
	}
}

Feed.prototype.loadFeed = function(dfltTimeout) {

	if (this.updating) {
		console.warn("Feed " + this.name + ": Rejecting load request - already loading");
		return;
	}

	this.updating = true;

	if (this.networkTimeout > 0) {
		dfltTimeout = this.networkTimeout;
	}

	var request = { feed: this.data, url: this.url, name: this.name, timeout: dfltTimeout };

	if (!window.rssllWebWorker) {
		localRunRequest("update_feed", request, this);
	} else {
		window.rssllWebWorker.runRequest("update_feed", request, this, handleFeedUpdateResponse, handleFeedUpdateError);
	}
}

Feed.prototype.handleUpdate = function(data) {
	if (data.error) {
		this.setError(data.error);
		this.endUpdate(false);
	} else if (!data.changed) {
		this.setError(undefined);
		this.endUpdate(false);
	} else {
		this.populate(data);
		this.endUpdate(true);
	}
}

Feed.prototype.endUpdate = function(changed) {

	//console.warn("Feed " + this.name + ": running endUpdate");

	this.updating = false;
	if (this.updateCallback) {
		this._fireCallback(this.updateCallback, changed);
	}
	this.updated = new Date();
	this.setExpireTime();
}

Feed.prototype.setError = function(errorMsg) {

	var oldError = this.error;
	this.error = errorMsg;
	if ((!oldError) && (errorMsg) && this.errorStateCallback) {
		this._fireCallback(this.errorStateCallback);
	} else if (oldError && (!errorMsg) && this.errorStateCallback) {
		this._fireCallback(this.errorStateCallback);
	}
}

Feed.prototype.populate = function(data) {

	//console.warn("Feed " + this.name + ": running populate. sync=" + sync);

	this._init();
	var oldData = this.data;
	var newData = data.feed;
	if (newData.feedTitle && newData.feedTitle != this.feedTitle) {
		this.feedTitle = newData.feedTitle;
	}
	var deletedItems = newData.deletedItems;

	if (newData.faviconURL && newData.faviconURL != this.imageSrc) {
		var im = new Image();
		im.src = newData.faviconURL;
		var imfeed = this;
		im.onload=function() {
			if (imfeed.image && imfeed.image.parentNode) {
				imfeed.image.src = im.src;
			}
			imfeed.imageSrc = im.src;
		}
	}

	/*
	 * Clean up deleted items
	 */
	for (var i = 0; i < deletedItems.length; ++i) {
		var guid = deletedItems[i];
		var oldItem = oldData.itemsByGuid[guid];
		if (oldItem) {
			var deletedState = this._seenStates[guid];
			if (deletedState) {
				delete this._seenStates[guid];
				this.deletedSeenStates.addDeletedState(guid, deletedState);
			}
		}
	}

	this.data = newData;
	this.itemsSize = newData.itemGuids.length;
	if (this.itemsSize > this.maxItemsSize) {
		this.maxItemsSize = this.itemsSize;
	}
	this._setState();
	this.deletedSeenStates.trim(this.maxItemsSize);
}	

Feed.prototype.setSeenStateByGuid = function(guid, state) {
	if (state instanceof Object) {
		state = (state.read ? 2 : (state.seen ? 1 : 0 ));
	}

	//var item = this.data.itemsByGuid[guid];
	//if (item) {
		if (state > 1) {
			this.setRead(guid);
		} else if (state > 0) {
			this.setSeen(guid);
		}
//	} else {
//		this.deletedSeenStates.addDeletedState(guid, state);
//	}
}

Feed.prototype._fireCallback = function(callback, arg) {

	var feed = this;
	if (feedDelayTime > 0) {
		this.ownerWindow.setTimeout( function() {
				callback(feed, arg);
		}, feedDelayTime);
	} else {
		callback(feed, arg);
	}
}

Feed.prototype._incrementUnread = function() {
	this._unreadCount++;
	if (this._unreadCount == 1 && this.unreadStateCallback) {
		this._fireCallback(this.unreadStateCallback);
	}
}

Feed.prototype._decrementUnread = function() {
	var cnt = this._unreadCount - 1;
	cnt = cnt < 0 ? 0 : cnt;
	this._unreadCount = cnt;
	if (cnt == 0 && this.unreadStateCallback) {
		this._fireCallback(this.unreadStateCallback);
	}
}

Feed.prototype._incrementUnseen = function() {
	this._unseenCount++;
	if (this._unseenCount == 1 && this.unseenStateCallback) {
		this._fireCallback(this.unseenStateCallback);
	}
}

Feed.prototype._decrementUnseen = function() {
	var cnt = this._unseenCount - 1;
	cnt = cnt < 0 ? 0 : cnt;
	this._unseenCount = cnt;
	if (cnt == 0 && this.unseenStateCallback) {
		this._fireCallback(this.unseenStateCallback);
	}
}

Feed.prototype._setState  = function() {

	var oldUnseenCount = this._unseenCount;
	var oldUnreadCount = this._unreadCount;

	this._unseenCount = 0;
	this._unreadCount = 0;
	
	var len = this.getItemCount();
	var state;
	for (var i = 0; i < len; ++i) {
		state = this._seenStates[this.data.itemGuids[i]];
		state = state ? state : 0;
		if (state < 2) {
			this._unreadCount++;
			if (state < 1) {
				this._unseenCount++;
			}
		}
	}
	if (this.unseenStateCallback &&
		((oldUnseenCount == 0 && this._unseenCount != 0) 
	  || (oldUnseenCount != 0 && this._unseenCount == 0))) {
		this._fireCallback(this.unseenStateCallback);
	}
	if (this.unreadStateCallback &&
		((oldUnreadCount == 0 && this._unreadCount != 0) 
	  || (oldUnreadCount != 0 && this._unreadCount == 0))) {
		this._fireCallback(this.unreadStateCallback);
	}
}

Feed.prototype.setSeen = function(guid) {
	var state = this._seenStates[guid];
	if (!state) {
		this._decrementUnseen();
		this._seenStates[guid] = 1;
	}
}

Feed.prototype.isSeen = function(guid) {
	return this._seenStates[guid] > 0;
}

Feed.prototype.setRead = function(guid) {
	var state = this._seenStates[guid];
	state = state ? state :0;
	if (state < 2) {
		if (state < 1) {
			this._decrementUnseen();
		}
		this._decrementUnread();
		this._seenStates[guid] = 2;
	}
}

Feed.prototype.unsetRead = function(guid) {
	var state = this._seenStates[guid];
	state = state ? state : 0;
	if (state == 2) {
		this._incrementUnread();
		this._seenStates[guid] = 1;
	}
}

Feed.prototype.isRead = function(guid) {
	return this._seenStates[guid] == 2;
}

function DeletedSeenStates () {

	var deletedGuids = [];
	var deletedStates = {};
	var deletedCount = 0;

	this.report = function() {
		return "deletedCount: " + deletedCount + ", deletedSize: " + deletedGuids.length;
	}

	this.getSeenStates = function() {
		var states = {};
		for (var guid in deletedStates) {
			states[guid] = deletedStates[guid];
		}
		return states;
	}

	this.addDeletedState = function(guid, state) {
		if (state > 0) {
			if (!deletedStates[guid]) {
				deletedCount++;
			}
			deletedGuids.unshift(guid);
			deletedStates[guid] = state;
		}
	}

	this.removeDeletedItem = function(guid) {
		if (deletedStates[guid]) {
			deletedCount--;
			var state = deletedStates[guid];
			delete deletedStates[guid];
			return state;
		}
		return 0;
	}

	this.trim = function (size) {
		var deletedLen = deletedGuids.length;
		if (deletedCount > size || deletedLen > (size * 1.5)) {
			var newDeletedGuids = [];
			var newDeletedStates = {};
			var deletedGuid;
			for (var i = 0; i < deletedLen && newDeletedGuids.length < size; i++) {
				deletedGuid = deletedGuids[i];
				if (deletedGuid 
				&& deletedStates[deletedGuid] 
				&& !newDeletedStates[deletedGuid]) {
					newDeletedGuids.push(deletedGuid);
					newDeletedStates[deletedGuid] = deletedStates[deletedGuid];
				}
			}
			deletedGuids = newDeletedGuids;
			deletedStates = newDeletedStates;
			deletedCount = deletedGuids.length;
		}
	}
}
