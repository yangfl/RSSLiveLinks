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
 * Bookmark processing
 */

var homeFolder;

var folderIds = {};

var feedsByFolderId = {};

var delayedUpdates = {};

var clearedFolders = {};

var firstTime = false;

var bookmarksInitialized = false;

function onRemovedCallback(id, info) {
	var feed = feedsByFolderId[id];
	if (feed) {
		delete folderIds[feed.url];
		saveFolderIds();
		feed.useBookmarkFolder = false;
		delete feedsByFolderId[id];
		saveOptions();
	}
}

function deleteBookmarkFolder(feed, doneFunction) {
	try {
		var folderId = folderIds[feed.url];
		if (folderId) {
			delete folderIds[feed.url];
			saveFolderIds();
			delete feedsByFolderId[folderId];
			feed.useBookmarkFolder = false;
			chrome.bookmarks.removeTree(folderId);
		}
	} catch(e) { console.error("Error in 'deleteBookmarkFolder' for feed '"+feed.name+"': " + e); }
	if (doneFunction) {
		doneFunction(feed);
	} else {
		saveOptions();
	}
}

function hasBookmarkFolder(feed) {
	if (folderIds[feed.url])
		return true;
	else
		return false;
}

function renameBookmarkFolder(feed, newName) {

	var folderId = folderIds[feed.url];
	var oldName = feed.name;
	var doRename = function(nodes) {
		if ((!nodes) || nodes.length < 1) {
			console.warn("Bookmark folder for \"" + oldName + "\" has disappeared");
			deleteBookmarkFolder(feed);
		} else if (nodes[0].title == oldName) {
			chrome.bookmarks.update(folderId, {title: newName}, function(node) {
				if (!node) {
					console.warn("Bookmark folder for \"" + oldName + "\" has disappeared");
					deleteBookmarkFolder(feed);
				}
			});
		}
	};
	try {
		if (folderId) {
			chrome.bookmarks.get(folderId, doRename);
		}
	} catch(e) { console.error("Error in 'renameBookmarkFolder' for feed '"+feed.name+"': " + e); }
}

function createBookmarkFolder(feed, doneFunction, parentFolder) {
	try {
		var parms = {parentId: (parentFolder ? parentFolder.id : homeFolder.id), title: feed.name};
		chrome.bookmarks.create(
			parms, 
			function(folder) {
				if (!folder) {
					console.error("Failed to create bookmark folder \"" + feed.name + "\" in parent id " + parentId);
				} else {
					folderIds[feed.url] = folder.id;
					saveFolderIds();
					feedsByFolderId[folder.id] = feed;
				}
				if (doneFunction) {
					doneFunction(feed, folder);
				} else if (folder) {
					loadBookmarkFolder(feed, folder, doneFunction)					
				}
			}
		);
	} catch(e) { 
		console.error("Error in 'createBookmarkFolder' for feed '"+feed.name+"': " + e); 
		if (doneFunction) {
			doneFunction(feed);
		}
	}
}

function checkAllFeedFolders() {
	var doneData = {count: feedInfo.feeds.length};
	feedInfo.feeds.forEach( function(feed) {
		checkFeedFolder(feed, doneData);
	});
}

function checkFeedFolder(feed, doneData) {
	var folderId = folderIds[feed.url];
	if (folderId) {
		doneData.count--;
		if (doneData.count <= 0 && doneData.changes) {
			saveFolderIds();
			saveOptions();
		}
		return;
	}
	chrome.bookmarks.get(folderId, function(nodes) {
		if (nodes.length == 0) {
			delete folderIds[folderId];
			delete feedsByFolderId[node.id]
			feed.useBookmarkFolder = false;
			doneData.changes = true;
		}
		doneData.count--;
		if (doneData.count <= 0 && doneData.changes) {
			saveFolderIds();
			saveOptions();
		}
	});
}

function earlyInitBookmarks() {
	firstTime = loadFolderIds();
	chrome.bookmarks.onRemoved.addListener(onRemovedCallback);
}

function initBookmarks() {

	var initChanges = false;
	var feedFolderCheckCount = feedInfo.feeds.length;

	var initCheckFeedFolder = function (nodes, feed) {
		if ((!nodes) || nodes.length == 0) {
			console.warn("Unsetting useBookmarkFolder for " + feed.name + ". Bookmark folder not found");
			delete folderIds[feed.url];
			feed.useBookmarkFolder = false;
			initChanges = true;
		} else {
			var node = nodes[0];
			if (!feed.useBookmarkFolder) {
				console.warn("Correcting useBookmarkFolder for " + feed.name + ". Bookmark folder found");
				feed.useBookmarkFolder = true;
				initChanges = true;
			}
			feedsByFolderId[node.id] = feed;
			//We delay the clear/load till a first sucessful update
			//feed.folderLoading = true;
			//clearFolder(node, feed, internalLoadBookmarkFolder);
		}
	}

	var feedCheckDone = function() {
		feedFolderCheckCount--;
		if (feedFolderCheckCount <= 0) {
			if (initChanges) {
				saveFolderIds();
				saveOptions();
			}
			for (var url in delayedUpdates) {
				var duData = delayedUpdates[url];
				delete delayedUpdates[url];
				updateBookmarkFolder(duData.feed, duData.doneFunction);
			}
			bookmarksInitialized = true;
		}
	};

	var runFeedFolderCheck = function (feed) {
		chrome.bookmarks.get(folderIds[feed.url], function(nodes1) {
			initCheckFeedFolder(nodes1, feed);
			feedCheckDone();
		});
	};

	var initCheckFeedFolders = function () {
		for (var i = 0; i < feedInfo.feeds.length; ++i) {
			var feed = feedInfo.feeds[i];
			if (folderIds[feed.url]) {
				runFeedFolderCheck(feed);
			} else {
				if (feed.useBookmarkFolder) {
					console.warn("Unsetting useBookmarkFolder for " + feed.name + ". Bookmark folder not found");
					feed.useBookmarkFolder = false;
					initChanges = true;
				}
				feedCheckDone();
			}
		}
	};

	chrome.bookmarks.get("1", function(nodes) {
		if (nodes.length == 0) {
		console.warn("Folder 1 not present");
			chrome.bookmarks.get("0", function(nodes1) {
				homeFolder = nodes1[0];
				if (!firstTime) {
					initCheckFeedFolders();
				}
			});
		} else {
			homeFolder = nodes[0];
			if (!firstTime) {
				initCheckFeedFolders();
			}
		}
	});

	if (firstTime) {
		migrateBookmarks()
	}
}

function loadFolderIds() {
	var folderIdsJSON = localStorage["folderIds"];
	if (!folderIdsJSON) {
		saveFolderIds();
		return true;	
	} else {
		folderIds = JSON.parse(folderIdsJSON);
		return false;
	}
}

function saveFolderIds() {
	var fids = JSON.stringify(folderIds);
	saveToLocalStorage("folderIds", fids);
}

function clearFolder(folder, feed, doneFunction, doneDoneFunction) {

	console.log("Clearing bookmarks for " + feed.name);
	var nodeCount = 0;
	var nodesDeleted = function() {
		nodeCount--;
		if (nodeCount <= 0 && doneFunction) {
			doneFunction(feed, folder, doneDoneFunction);
		}
	};

	chrome.bookmarks.getChildren(folder.id, function(nodes){
		nodeCount = nodes.length;
		if (nodeCount == 0) {
			if (doneFunction) {
				doneFunction(feed, folder, doneDoneFunction);
			}
		} else {
			nodes.forEach( function(item) {
				if (item.url && item.url.length > 0) {
					chrome.bookmarks.remove(item.id, nodesDeleted);
				} else {
					chrome.bookmarks.removeTree(item.id, nodesDeleted);
				}
			});
		}
	});
}

function loadBookmarkFolder(feed, folder, doneFunction) {
	if (bookmarksInitialized && !feed.folderLoading) {
		internalLoadBookmarkFolder(feed, folder, doneFunction);
	}
}

function internalLoadBookmarkFolder(feed, folder, doneFunction) {
	console.log("Loading bookmarks for " + feed.name);
	feed.folderLoading = true;

	var items = feed.getItems();
	var toDo = items.length;

	var doneData = {toDo: toDo, feed: feed, doneFunction: doneFunction};

	/*
	 * Function is in background.js
	 */
	sortFeedItems(feed, items);

	if (items.length <= 0) {
		finishedBookmarkUpdate(doneData);
	} else {
		for (var i = 0; i < items.length; ++i) {
			createBookmark(folder.id, items[i], i, doneData);
		}
	}
}

function finishedBookmarkUpdate(data, debugString) {
	data.toDo--;
/*	if (debugString) {
		console.log("UPDATE ACTION COMPLETE FOR \"" +data.feed.name + "\": " + debugString +". toDo=" + data.toDo);
	}*/
	if (data.toDo <= 0) {
/*		if (debugString) {
			console.log("ALL UPDATE ACTIONS COMPLETE FOR \"" +data.feed.name + "\"");
		}*/
		data.feed.folderLoading = false;
		if (data.doneFunction) {
			data.doneFunction(data.feed);
		}
	}
}

function finishedCreateBookmark(newNode, item, doneData, debugString) {
	if (!newNode) {
		console.error("Failed to create bookmark \"" + item.title + "\" for feed \"" + doneData.feed.name + "\"");
	} else {
		item.bookmarkId = newNode.id;
	}
	finishedBookmarkUpdate(doneData, debugString);
}	

function createBookmark(parentId, item, index, doneData, debugString) {
	try {
		var myItem = item;
		var parms = {parentId: parentId, title: getItemTitle(item), url: item.url};
		if (index != undefined) {
			parms.index = index;
		}
		chrome.bookmarks.create(
			parms,
			function(newNode) {finishedCreateBookmark(newNode, myItem, doneData, debugString)});
	} catch(e) { 
		console.error("Error in 'createBookmark' for feed '"+item.feed.name+"': " + e); 
		finishedBookmarkUpdate(doneData, (debugString ? (debugString + " (error)") : null));
	}
}

function updateBookmarkFolder(feed, doneFunction) {
	var folderId = folderIds[feed.url];
	if (feed.folderLoading) {
		console.warn("NOT updating bookmarks for " + feed.name + ": folder is already being updated");
	} else if (!folderId) {
		console.log("NOT updating bookmarks for " + feed.name + ": no associated folder");
		if (doneFunction) {
			doneFunction(feed);
		}
	} else if (!bookmarksInitialized) {
		delayedUpdates[feed.url] = {feed: feed, doneFunction: doneFunction};
	} else {
		feed.folderLoading = true;
		try {
			if (!clearedFolders[folderId]) {
				if (!feed.error) {
					chrome.bookmarks.get(folderId, function (nodes) {
						if ((nodes) && nodes.length > 0) {
							clearFolder(nodes[0], feed, internalLoadBookmarkFolder, doneFunction);
						}
					});
					clearedFolders[folderId] = true;
				} else {
					console.log("NOT clearing bookmarks for " + feed.name + ": feed is in error at the moment");
				}
			} else {
				internalUpdateBookmarkFolder(feed, folderId, doneFunction);
			}
		} catch(e) { 
			console.error("Error in 'updateBookmarkFolder' for feed '"+feed.title+"': " + e);
			feed.folderLoading = false;
		}
	}
}

function internalUpdateBookmarkFolder(feed, folderId, doneFunction) {
	console.log("Updating bookmarks for " + feed.name);
	var doneData = {feed: feed, doneFunction: doneFunction};

	chrome.bookmarks.getChildren(folderId, function (bookmarks) {
		performFolderUpdates(doneData, bookmarks);
	});
}

function performFolderUpdates(doneData, bookmarks) {
	var feed = doneData.feed;
	var items = feed.getItems();
	var deletedItems =  [];
	var toDeleteIds = [];
	var itemBookmarkIds = [];
	var folderBookmarkIds = [];
	var toDo = 0;

	/*
	 * Function is in background.js
	 */
	sortFeedItems(feed, items);

	if (!bookmarks) {
		console.warn("Bookmark folder for \"" + feed.name + "\" has disappeared");
		deleteBookmarkFolder(feed);
		finishedBookmarkUpdate(doneData, "Folder no longer exists");
		return;
	}

	//Collect the bookmark IDs on the items
	items.forEach(function(item) {
		if (item.bookmarkId != undefined) {
			itemBookmarkIds[item.bookmarkId] = true;
		}
	});

	//Collect the bookmark IDs in the folder and mark those we no longer have
	bookmarks.forEach(function(bookmark) {
		if (!itemBookmarkIds[bookmark.id]) {
			deletedItems.push(bookmark);
		} else {
			folderBookmarkIds[bookmark.id] = true;
		}
	});

	//Count the actions we need to take
	toDo = deletedItems.length;
	var creates = 0;
	var moves = 0;
	var updates = 0;
	items.forEach(function(item) {
		if (item.added || item.bookmarkId == undefined || !folderBookmarkIds[item.bookmarkId]) {
			++toDo;
			++creates;
		} else {
			if (item.moved) {
				++toDo;
				++moves;
			}	
			if (item.modified) {
				++toDo;
				++updates;
			}
		}
	});
	
	doneData.toDo = toDo;

	if (toDo <= 0) {
		// Nothing to do :-)
		finishedBookmarkUpdate(doneData, "nothing to do");
		return;
	}

	var folderId = folderIds[feed.url];
	//Carry out the actions!
	//console.log("Running updates for \"" + feed.name +"\": total="+ toDo +", creates=" + creates + ", moves=" + moves + ", updates=" + updates + ", deletes=" + deletedItems.length);
	for (var j = 0; j < items.length; ++j) {
		var item = items[j];
		if (item.added || item.bookmarkId == undefined || !folderBookmarkIds[item.bookmarkId]) {
			createBookmark(folderId, item, j, doneData, "create");
		} else {
			if (item.moved) {
				try {
					chrome.bookmarks.move(item.bookmarkId, {parentId: folderId, index: j});
				} catch(e) { console.error("Error in 'chrome.bookmarks.move' for item '"+item.title+"': " + e); }	
				finishedBookmarkUpdate(doneData, "move");
			}
			if (item.modified) {
				try {
					chrome.bookmarks.update(item.bookmarkId, {title: getItemTitle(item)});
				} catch(e) { console.error("Error in 'chrome.bookmarks.update' for item '"+item.title+"': " + e); }
				finishedBookmarkUpdate(doneData, "update");
			}
		}
	}
	/*
	 * Even if our "moved" algorithm from the feed fails, at least we can delete anything that's not in
	 * the feed at the moment!
	 */
	for (var j = 0; j < deletedItems.length ; ++j) {
		try {
			chrome.bookmarks.remove(deletedItems[j].id);
		} catch(e) { console.error("Error in 'chrome.bookmarks.remove' for id '"+deletedItems[j].title+"': " + e); }
		finishedBookmarkUpdate(doneData, "delete");
	}
}

function getItemTitle(item) {
	if (!item.displayTitle) {
		item.displayTitle = item.title ? trim11(unhtml(item.title)) : "(no title)";
	}
	return item.displayTitle;
}

/*
 * One-time function for converting "RSS Live Links" folders to the
 * new way of doing things in 1.5
 */
function migrateBookmarks() {

	var done = false;

	var foldersToDo = feedInfo.feeds.length;

	var migrationComplete = function() {
		foldersToDo--;
		if (foldersToDo <= 0) {
			console.log("RSS Live Links home folder conversion complete");
			saveOptions();
		}
	}
	
	var migrationLoad = function (feed, folder) {
		internalLoadBookmarkFolder(feed, folder, migrationComplete);
	};

	var fullLoad = function (dummyFeed, parentFolder) {
		for (var i = 0; i < feedInfo.feeds.length; ++i) {
			var feed = feedInfo.feeds[i];
			feed.useBookmarkFolder = true;
			feed.folderLoading = true;
			createBookmarkFolder(feed, migrationLoad, parentFolder);
		}
	};

	var getFolderChildren = function (nodes) {
		var folders = [];
		/*
		 * Breadth first check - the folder, if it is present, is most likely
		 * to be on the toolbar
		 */
		for (var i = 0; (!done) && i < nodes.length; ++i) {
			var node = nodes[i];
			if ((!node.url) || node.url == "") {	
				if (node.title == "RSS Live Links") {
					done = true;
					console.log("Found RSS Live Links home folder. Converting to new style");
					clearFolder(node, null, fullLoad);
				} else if (node.children) {
					folders.push(node);
				}
			}
		}
		for (var i = 0; (!done) && i < folders.length; ++i) {
			getFolderChildren(folders[i].children);
		}
	}

	var scanFolders = function(nodes) {
		getFolderChildren(nodes);
		if (!done) {
			console.log("RSS Live Links home folder not found - no conversion necessary");
		}
	}

	chrome.bookmarks.getTree(scanFolders);
}
