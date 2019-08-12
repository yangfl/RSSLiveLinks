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
var backgroundPage = chrome.extension.getBackgroundPage();
var fs = backgroundPage.extensionFS;
var opmlFile;
var configFile;
var tabFeedsByURL = backgroundPage.tabFeedsByURL;
var options = backgroundPage.options;
var feedGroups = [];
var feedGroupsByURL = [];
var currentFeedData = backgroundPage.feedInfo;
var subscriptions = [];
var subscriptionsByURL = [];
var availableDivsByURL = [];
var mods = false;
var groupmods = false;

/*
 * The trouble with font-family strings is that if I refine them, 
 * previous settings get lost.
 * this "table" is designed to do automatic translation of older
 * values to new values which are now keys into a runtime table - much safer.
 */
var fontTranslationTable = {
	"Sans-serif": "sans_serif",
	"Serif": "serif",
	"Arial, Helvetica, sans-serif": "arial",
	"'Arial Black', Gadget, sans-serif": "arial_black",
	"'Bookman Old Style', serif": "bookman_old_style",
	"'Comic Sans MS', cursive": "comic_sans_ms",
	"Garamond, serif": "garamond",
	"Geneva, sans-serif": "geneva",
	"Georgia, serif": "georgia",
	"Impact, Charcoal, sans-serif": "impact",
	"'Lucida Sans Unicode', 'Lucida Grande', sans-serif": "lucida_sans_unicode",
	"'MS Sans Serif', Geneva, sans-serif": "ms_sans_serif",
	"'MS Serif', 'New York', sans-serif": "ms_serif",
	"'Palatino Linotype', 'Book Antiqua', Palatino, serif": "palatino_linotype",
	"Tahoma, Geneva, sans-serif": "tahoma",
	"'Times New Roman', Times, serif": "times_new_roman",
	"'Trebuchet MS', Helvetica, sans-serif": "trebuchet_ms",
	"Verdana, Geneva, sans-serif": "verdana"
};

function load() {
	setStaticEventListeners();
	i18nInit();
	switchTab();
	initExportHrefs();
	restore_options();
}

// Saves options to localStorage.
function save_options() {

	var optionMods = false;
	var newOptions = {};

	if (mods) {
		newOptions.subscriptions = subscriptions;
		optionMods = true;
	}

	var tempInt = parseInt(maxItemsCount.value);

	if (tempInt != options.maxItems) {
		newOptions.maxItems = tempInt;
		optionMods = true;
	}	

	tempInt = parseInt(maxConcurrent.value);

	if (tempInt != options.maxConcurrentRequests) {
		newOptions.maxConcurrentRequests = tempInt;
		optionMods = true;
	}	

	if (options.unlimitedItems != unlimitedItems.checked) {
		newOptions.unlimitedItems = unlimitedItems.checked;
		optionMods = true;
	}	

	if (options.unlimitedRequests != unlimitedCalls.checked) {
		newOptions.unlimitedRequests = unlimitedCalls.checked;
		optionMods = true;
	}	

	tempInt = parseInt(sortItems.value);
	var sortItemsChanged = ((options.sortItems && options.sortItems != tempInt) || (tempInt && !options.sortItems))

	if (sortItemsChanged) {
		newOptions.sortItems = tempInt;
		optionMods = true;
	}	

	tempInt = parseInt(popupDensity.value);
	var popupDensityChanged = ((options.popupDensity && options.popupDensity != tempInt) || (tempInt && !options.popupDensity))

	if (popupDensityChanged) {
		newOptions.popupDensity = tempInt;
		optionMods = true;
	}	

	if (options.soundFile != soundFile.value) {
		newOptions.soundFile = soundFile.value;
		optionMods = true;
	}	

	var tempInt = parseInt(defaultTtl.value);
	if (tempInt != options.defaultTtl) {
		newOptions.defaultTtl = tempInt;
		optionMods = true;
	}	

	var tempInt = parseInt(defaultTimeout.value);
	if (tempInt != options.defaultTimeout) {
		newOptions.defaultTimeout = tempInt;
		optionMods = true;
	}	


	if (options.hideOthersOnOpen != hideOnOpen.checked) {
		newOptions.hideOthersOnOpen = hideOnOpen.checked;
		optionMods = true;
	}	

	if (options.openFirst != openFirst.checked) {
		newOptions.openFirst = openFirst.checked;
		optionMods = true;
	}	

	if (options.useAvailableIcon != useAvailableIcon.checked) {
		newOptions.useAvailableIcon = useAvailableIcon.checked;
		optionMods = true;
	}	

	if (options.animateButton != animateButton.checked) {
		newOptions.animateButton = animateButton.checked;
		optionMods = true;
	}	

	if (options.fixPopupClosesBug != fixPopupClosesBug.checked) {
		newOptions.fixPopupClosesBug = fixPopupClosesBug.checked;
		optionMods = true;
	}	

	if (options.focusFirstTab != focusFirstTab.checked) {
		newOptions.focusFirstTab = focusFirstTab.checked;
		optionMods = true;
	}	

	var sliderPopupWidth = popUpWidth.value
	if (options.popupWidth != sliderPopupWidth) {
		newOptions.popupWidth = sliderPopupWidth;
		optionMods = true;
	}

	var sliderPopupHeight = popUpHeight.value
	if (options.popupHeight != sliderPopupHeight) {
		newOptions.popupHeight = sliderPopupHeight;
		optionMods = true;
	}

	if (options.singleItem != singleItem.checked) {
		newOptions.singleItem = singleItem.checked;
		optionMods = true;
	}	

	if (options.playSound != playSound.checked) {
		newOptions.playSound = playSound.checked;
		optionMods = true;
	}	

	if (options.maintainBadge != maintainBadge.checked) {
		newOptions.maintainBadge = maintainBadge.checked;
		optionMods = true;
	}	

	if (options.useWebWorker != useWebWorker.checked) {
		newOptions.useWebWorker = useWebWorker.checked;
		optionMods = true;
	}	

	if (options.askOnUpdate != askOnUpdate.checked) {
		newOptions.askOnUpdate = askOnUpdate.checked;
		optionMods = true;
	}	

	if (options.showUnseenFirst != newAtTop.checked) {
		newOptions.showUnseenFirst = newAtTop.checked;
		optionMods = true;
	}

	if (options.showAvailable != showAvailable.checked) {
		newOptions.showAvailable = showAvailable.checked;
		optionMods = true;
	}

	if (options.useGroups != useGroups.checked) {
		newOptions.useGroups = useGroups.checked;
		optionMods = true;
	}

	var styleOptions = getStyleFields();
	if (styleOptions) {
		newOptions.styleOptions = styleOptions;
		optionMods = true;
	}	

	if (groupmods) {
		var newGroups = {};
		for (var i = 0; i < feedGroups.length; ++i) {
			newGroups[feedGroups[i].name] = i;
		}
		newOptions.groups = newGroups;
		optionMods = true;
	}

	if (optionMods) {
		chrome.extension.getBackgroundPage().updateOptions(newOptions);
		options = backgroundPage.options;
	}

	saveOPMLFile();
	saveConfigFile();

	var text = chrome.i18n.getMessage("opt_optionsSavedMsg");
	updateStatus(text, 2000);
}

function getStyleFields()
{
	var newStyleOptions = {};
	var styleOptionsChanged = false;
	for (var titleClassName in titleStyles) {
		var originalStyleOptions = options.styleOptions[titleClassName];
		if (!originalStyleOptions) {
			originalStyleOptions = {};
		}
		var	newStyleOptionsForName = {};
		var	styleOptionsForNameAdded = false;
		var myTitleStyles = titleStyles[titleClassName];
		for (var titleStyleName in myTitleStyles) {
			var titleStyleProperty = myTitleStyles[titleStyleName];
			var originalStyleValue = originalStyleOptions[titleStyleProperty];
			var newTitleStyleValue = getTitleStyleValue(titleClassName, titleStyleName);
			/*
			 * The value is undefined or a real value.
			 *
			 * If it is default we don't add it, otherwise we do.
			 *
			 * If the new value is different from the old value we mark the options
			 * as changed
			 */
			if (newTitleStyleValue) {
				if (!styleOptionsForNameAdded) {
					newStyleOptions[titleClassName] = newStyleOptionsForName;
					styleOptionsForNameAdded = true;
				}
				newStyleOptionsForName[titleStyleProperty] = newTitleStyleValue;
			}
			if (newTitleStyleValue != originalStyleValue) {
				styleOptionsChanged = true;
			}
		}
	}
	if (styleOptionsChanged) {
		return newStyleOptions;
	}
}

function getTitleStyleValue(titleClassName, titleStyleName) {
	var field = window[titleClassName + "_" + titleStyleName];
	var titleStyleValue = field.value;
	if (field.disabled || titleStyleValue == "default") {
		titleStyleValue = undefined;
	}
	return titleStyleValue;
}

function initialize() {
	subscriptions = [];
	subscriptionsByURL = [];
	availableDivsByURL = [];
	feedGroups = [];
	feedGroupsByURL = [];
	selected = 0;
	selectionHead = -1;
	mods = false;
	deleteButton.disabled = true;
	modifyButton.disabled = true;
	moveUpButton.disabled = true;
	moveDownButton.disabled = true;
	deleteGButton.disabled = true;
	modifyGButton.disabled = true;
	moveGUpButton.disabled = true;
	moveGDownButton.disabled = true;
	subscribed.innerHTML = "";
	available.innerHTML = "";
	groups.innerHTML = "";
}

// Restores subscriptions box state to saved value from localStorage.
function restore_options() {
	backgroundPage.checkLocalStorageIntegrity();
	backgroundPage.fixGroupIndexing();
	initialize();
	maxItemsCount.value = ""+options.maxItems;
	maxConcurrent.value = ""+options.maxConcurrentRequests;
	defaultTtl.value = ""+options.defaultTtl;
	defaultTimeout.value = ""+options.defaultTimeout;

	for (var titleClassName in titleStyles) {
		if (window[titleClassName + "_default"]) {
			setDefault(titleClassName);
		}
	}

	if (options.unlimitedItems) {
		unlimitedItems.checked = true;
		maxItemsCount.disabled = "disabled";
	}

	if (options.unlimitedRequests) {
		unlimitedCalls.checked = true;
		maxConcurrent.disabled = "disabled";
	}

	hideOnOpen.checked = options.hideOthersOnOpen;
	openFirst.checked = options.openFirst;
	playSound.checked = options.playSound;
	maintainBadge.checked = (options.maintainBadge  == true);
	useWebWorker.checked = options.useWebWorker;
	animateButton.checked = options.animateButton;
	useAvailableIcon.checked = (options.useAvailableIcon == true);
	focusFirstTab.checked = options.focusFirstTab;
	fixPopupClosesBug.checked = options.fixPopupClosesBug;
	setRange(popUpHeight,options.popupHeight);
	setRange(popUpWidth,options.popupWidth);
	singleItem.checked = options.singleItem;
	askOnUpdate.checked = options.askOnUpdate == true;
	newAtTop.checked = options.showUnseenFirst;
	showAvailable.checked = options.showAvailable;
	useGroups.checked = options.useGroups;
	soundFile.value = options.soundFile;
	sortItems.value = "" + (options.sortItems ? options.sortItems : 0);
	popupDensity.value = "" + (options.popupDensity ? options.popupDensity : 0);

	subscribed.selectionControl = {
		data: subscriptions,
		dataByURL: subscriptionsByURL,
		selected: 0,
		selectionHead: -1,
		deleteButton: deleteButton,
		modifyButton: modifyButton,
		moveUpButton: moveUpButton,
		moveDownButton: moveDownButton
	};
	groups.selectionControl = {
		data: feedGroups,
		dataByURL: feedGroupsByURL,
		selected: 0,
		selectionHead: -1,
		deleteButton: deleteGButton,
		modifyButton: modifyGButton,
		moveUpButton: moveGUpButton,
		moveDownButton: moveGDownButton
	};

	for (var i = 0; i < options.subscriptions.length; ++i) {
		addSubscription(options.subscriptions[i]);
	}

	var groupArray = [];
	for (var groupName in options.groups) {
		var idx = options.groups[groupName];
		groupArray[idx] = {
			name: groupName,
			url: "group " + groupName,
			idx: idx
		};
	}

	for (var i = 0; i < groupArray.length; ++i) {
		addGroup( groupArray[i]);
	}

	

	setStyleFields();

	updateAvailableFeeds();
	disableSelect(availableScroll);
	disableSelect(subscribedScroll);
	disableSelect(groupScroll);
}

function setStyleFields() {
	for (var titleStyleName in titleStyles) {
		var styleOptions = options.styleOptions[titleStyleName];
		setStyleFieldsForName(titleStyleName, styleOptions);
	}
}

function setStyleFieldsForName(titleClassName, styleOptions) {
	if (!styleOptions) {
		styleOptions = {};
	}
	var titleClassStyles = titleStyles[titleClassName];
	for (var titleStyleName in titleClassStyles) {
		var titleStyleValue = titleClassStyles[titleStyleName];
		var optionValue = styleOptions[titleStyleValue];
		if (optionValue) {
			var fieldId = titleClassName + "_" + titleStyleName;
			if (titleStyleName == "color") {
				unsetDefault(titleClassName);
				window[fieldId + "_picker"].colorPicker.fromString(optionValue);
				window[fieldId].value = optionValue;
			} else if (titleStyleName == "fontWeight") {
				unsetDefault(titleClassName);
				window[fieldId].value = optionValue;
			} else if (titleStyleName == "fontStyle") {
				unsetDefault(titleClassName);
				window[fieldId].value = optionValue;
				window[fieldId].checked = (fontStyles[0] != optionValue);
			} else {
				if (titleStyleName == "fontFamily" && fontTranslationTable[optionValue]) {
					/*
					 * Attempt to translate any old string :-)
					 */
					optionValue = fontTranslationTable[optionValue];
				}
				window[fieldId].value = optionValue;
			}
		}
	}
}

function updateAvailableFeeds()
{
	var availableFeeds = [];
	for (var tabFeedURL in tabFeedsByURL) {
		availableFeeds.push(tabFeedsByURL[tabFeedURL].feed);
	}
	while(available.hasChildNodes()) available.removeChild(available.firstChild);
	availableDivsByURL = [];
	if (availableFeeds.length > 0) {
		availableFeeds.sort(function(a, b) {return a.name.localeCompare(b.name);});
		for (var i = 0; i < availableFeeds.length; ++ i) {
			var url = availableFeeds[i].url;
			if (!(availableDivsByURL[url])) {
				var div = addToScrollPane(availableFeeds[i], available, addSubscriptionFromAvaliable, i);
				availableDivsByURL[url] = div;
				if (subscriptionsByURL[url]) {
					div.className = "greyedRowDiv";
				}
			}
		}
	}
}

function addSubscriptionFromAvaliable(evt) {
	var rowDiv = evt.currentTarget;
	var feed = rowDiv.feed;

	if (evt.shiftKey) {
		chrome.tabs.create({url: feed.url});
		return;
	}

	if (rowDiv.className != "greyedRowDiv") {
		rowDiv.className = "greyedRowDiv";
		mods = true;
		addSubscription(feed);
	}
}

function doubleClick(evt) {
	doModify(evt.currentTarget);
}

function doubleClickGroup(evt) {
	doModifyGroup(evt.currentTarget);
}

function doModify(row) {
	var feed = row.feed;
	showFeedMod("opt_feedModHeader", feed, function(newData)
		{
			var newURL = newData.url;
			var newName = newData.name;
			var newGroup = newData.group;
			var newRefreshTime = newData.refreshTime;
			var newSortItems = newData.sortItems;
			var newNetworkTimeout = newData.networkTimeout;
			var newChangesUnseen = (newData.changesUnseen == true);
			var newAutoopenNew = (newData.autoopenNew == true);
			var newUseBookmarkFolder = (newData.useBookmarkFolder == true);
			var bookmarkFolderId = feed.bookmarkFolderId;
			if (newURL != feed.url) {
				delete subscriptionsByURL[feed.url];
				var newFeed= {url: newURL, 
					name: newName, 
					group: newGroup, 
					faviconURL: feed.faviconURL, 
					sortItems: newSortItems, 
					refreshTime: newRefreshTime, 
					networkTimeout: newNetworkTimeout, 
					changesUnseen: newChangesUnseen, 
					useBookmarkFolder: newUseBookmarkFolder, 
					bookmarkFolderId: bookmarkFolderId, 
					autoopenNew: newAutoopenNew};
				row.feed = newFeed;
				subscriptionsByURL[newURL] = newFeed;
				subscriptions[row.index] = newFeed;
				row.nameDiv.innerText = newName;
				if (availableDivsByURL[newURL]) {
					availableDivsByURL[newURL].className = "greyedRowDiv";
				}
				mods = true;
			} else if (newName != feed.name 
					|| newGroup != feed.group 
					|| newSortItems != feed.sortItems 
					|| newRefreshTime != feed.refreshTime 
					|| newNetworkTimeout != feed.networkTimeout 
					|| newChangesUnseen != feed.changesUnseen 
					|| newUseBookmarkFolder != feed.useBookmarkFolder 
					|| newAutoopenNew != feed.autoopenNew) {
				var newFeed= {url: feed.url, 
					name: newName, 
					group: newGroup, 
					faviconURL: feed.faviconURL, 
					sortItems: newSortItems, 
					refreshTime: newRefreshTime, 
					networkTimeout: newNetworkTimeout, 
					changesUnseen: newChangesUnseen, 
					useBookmarkFolder: newUseBookmarkFolder, 
					bookmarkFolderId: bookmarkFolderId, 
					autoopenNew: newAutoopenNew
				};
				row.feed = newFeed;
				subscriptionsByURL[feed.url] = newFeed;
				subscriptions[row.index] = newFeed;
				row.nameDiv.innerText = newName;
				mods = true;
			}
		}
	);
}

function addSubscriptionFromForm(feed) {
	mods=true;
	addSubscription(feed);
}

function addNewGroup() {
	var newName = trim11(newGroup.value);
	if (newName == '') {
		newGroup.value = '';
	} else if (feedGroupsByURL["group " + newName]) {
		alert(chrome.i18n.getMessage("opt_duplicateGroupName"));
	} else {
		addGroup({name: newName, url: "group " + newName, idx: feedGroups.length - 1});
		groupmods = true;
		newGroup.value = '';
	}
}

function addSubscription(feed)
{
	subscriptions.push(feed);
	subscriptionsByURL[feed.url] = feed;
	addToScrollPane(feed, subscribed, rowSelected, subscriptions.length - 1, doubleClick);
}

function addGroup(groupFeed) {
	feedGroups.push(groupFeed);
	feedGroupsByURL[groupFeed.url] = groupFeed;
	addToScrollPane(groupFeed, groups, rowSelected, feedGroups.length - 1, doubleClickGroup);
}

function setErrorStatus(stat) {
	updateStatus(stat);
}

function modifyFeed() {
	var feedRow = subscribed.getElementsByClassName("selectedRowDiv")[0];
	doModify(feedRow);
}

function modifyGroup() {
	var groupRow = groups.getElementsByClassName("selectedRowDiv")[0];
	doModifyGroup(groupRow);
}

function doModifyGroup(row) {
	var container = row.container;
	var groupFeed = container.selectionControl.data[row.index];
	var oldName = groupFeed.name;

	var newName = prompt(chrome.i18n.getMessage("opt_modifyGroupName"), oldName);
	if (newName != null && (newName = trim11(newName)) != oldName) {
		groupmods = true;
		groupFeed.name = newName;
		row.nameDiv.innerText = newName;
		for (var i = 0; i < subscriptions.length; ++i) {
			feed = subscriptions[i];
			if (feed.group == oldName) {
				feed.group = newName;
				mods = true;
			}
		}
	}
}

function moveFeedUp() {
	doMoveFeedUp(subscribed);
	mods = true;
}

function moveGFeedUp() {
	doMoveFeedUp(groups);
	groupmods = true;
}

function doMoveFeedUp(container) {
	var feedRow = container.getElementsByClassName("selectedRowDiv")[0];
	var feedRowIndex = feedRow.index;
	var newIndex = feedRowIndex-1;
	feedRow.className = "rowDiv";

	var rowDivs = container.getElementsByClassName("rowDiv");
	var b4Row = rowDivs[newIndex];

	feedRow.parentNode.insertBefore(feedRow, b4Row);
	feedRow.index = newIndex;
	b4Row.index = feedRowIndex;

	var selCtrl = container.selectionControl;
	var data = selCtrl.data;

	var feed = data[feedRowIndex];
	data[feedRowIndex] = data[newIndex];
	data[newIndex] = feed;

	feedRow.className = "selectedRowDiv";
	if (newIndex < 1) {
		selCtrl.moveUpButton.disabled = "disabled";
	}
	if (newIndex < data.length - 1) {
		selCtrl.moveDownButton.disabled = "";
	}

	mods = true;
}

function moveFeedDown() {
	doMoveFeedDown(subscribed);
	mods = true;
}

function moveGFeedDown() {
	doMoveFeedDown(groups);
	groupmods = true;
}

function doMoveFeedDown(container) {
	var feedRow = container.getElementsByClassName("selectedRowDiv")[0];
	var feedRowIndex = feedRow.index;
	var newIndex = feedRowIndex+1;
	feedRow.className = "rowDiv";

	var rowDivs = container.getElementsByClassName("rowDiv");
	var aftRow = rowDivs[newIndex];

	feedRow.parentNode.insertBefore(aftRow, feedRow);
	feedRow.index = newIndex;
	aftRow.index = feedRowIndex;

	var selCtrl = container.selectionControl;
	var data = selCtrl.data;

	var feed = data[feedRowIndex];
	data[feedRowIndex] = data[newIndex];
	data[newIndex] = feed;

	feedRow.className = "selectedRowDiv";
	if (newIndex > 0) {
		selCtrl.moveUpButton.disabled = "";
	}
	if (newIndex >= data.length - 1) {
		selCtrl.moveDownButton.disabled = "disabled";
	}

	mods = true;
}

function deleteGroups(container) {
	doDelete(groups);
	groupmods = true;
}

function deleteFeeds(container) {
	doDelete(subscribed);
	mods = true;
}

function doDelete(container) {
	var feedRows = container.getElementsByClassName("selectedRowDiv");

	var selCtrl = container.selectionControl;
	var data = selCtrl.data;

	for (var row_idx = 0; row_idx < feedRows.length;) {
		var row = feedRows[row_idx];
		var url = row.feed.url;
		delete selCtrl.dataByURL[url];
		container.removeChild(row);
		if (availableDivsByURL[url]) {
			availableDivsByURL[url].className = "rowDiv";
		}
	}

	var newSubscriptions = [];
	feedRows = container.getElementsByClassName("rowDiv");
	for (var row_idx = 0; row_idx < feedRows.length; ++row_idx) {
		var row = feedRows[row_idx];
		newSubscriptions.push(row.feed);
		row.index = row_idx;
	}

	selCtrl.selected = 0;
	selCtrl.deleteButton.disabled = "disabled";
	selCtrl.data.splice(0, selCtrl.data.length);
	for (var i = 0; i < newSubscriptions.length; ++i) {
		selCtrl.data[i] = newSubscriptions[i];
	}
}

function addToScrollPane(feed, div, clickFunction, index, dblClickFunction) {
	var rowDiv = document.createElement("div");
	rowDiv.className = "rowDiv";
	rowDiv.index = index;
	rowDiv.feed = feed;
	rowDiv.container = div;
	rowDiv.onclick = clickFunction;
	rowDiv.title = feed.name + "\n" + feed.url;
	if (currentFeedData.feedsByURL[feed.url] != undefined) {
		var currentFeed = currentFeedData.feeds[currentFeedData.feedsByURL[feed.url]];
		rowDiv.title = rowDiv.title + "\n" + (currentFeed.ttl > 0 ? chrome.i18n.getMessage("opt_subsTTTtlPresent", [""+currentFeed.ttl]) : chrome.i18n.getMessage("opt_subsTTTtlAbsent"))
			+ (currentFeed.pubDate ? ("\n" + chrome.i18n.getMessage("opt_subsTTPublishedTag") + ": " + currentFeed.pubDate.toLocaleString()) : "")
			+ (currentFeed.expire ?  ("\n" + chrome.i18n.getMessage("opt_subsTTNextTag") + ": " + currentFeed.expire.toLocaleString()) : "");
	}
	if (dblClickFunction) {
		rowDiv.ondblclick = dblClickFunction;
	}
	var col1Div = document.createElement("div");
	col1Div.className = "col1Div";
	col1Div.innerText = feed.name;
	rowDiv.appendChild(col1Div);
	rowDiv.nameDiv = col1Div;
	div.appendChild(rowDiv);
	return rowDiv;
}

function showFeedMod(title, feed, callback) {
	feedGroupSelect.options.length = 1;
	for (var i = 0; i < feedGroups.length; ++i) {
		var optn = document.createElement("OPTION");
		optn.text = feedGroups[i].name;
		optn.value = feedGroups[i].name;
		feedGroupSelect.options.add(optn);
	}

	if (feed) {
		feedNameText.value = feed.name;
		feedNameText.originalValue = feed.name;
		feedUrlText.value = feed.url;
		feedUrlText.originalValue = feed.url;
		feedGroupSelect.value = feed.group;
		feedGroupSelect.originalValue = feed.group;
		feedRefreshTime.value = (feed.refreshTime ? feed.refreshTime : "TTL");
		feedRefreshTime.originalValue = feedRefreshTime.value;
		feedSortItems.value = "" + (feed.sortItems ? feed.sortItems : 0);
		feedSortItems.originalValue = feedSortItems.value;
		feedNetworkTimeout.value = (feed.networkTimeout ? ("" + feed.networkTimeout) : "0");
		feedNetworkTimeout.originalValue = feedNetworkTimeout.value;
		useBookmarkFolder.checked = (feed.useBookmarkFolder == true);
		useBookmarkFolder.originalValue = useBookmarkFolder.checked;
		changesUnseen.checked = (feed.changesUnseen == true);
		changesUnseen.originalValue = changesUnseen.checked;
		autoopenNew.checked = (feed.autoopenNew == true);
		autoopenNew.originalValue = autoopenNew.checked;
	} else {
		feedNameText.value = "";
		feedNameText.originalValue = "";
		feedUrlText.value = "";
		feedUrlText.originalValue = "";
		feedGroupSelect.value = "";
		feedGroupSelect.originalValue = "";
		feedRefreshTime.value= "TTL";
		feedRefreshTime.originalValue= "TTL";
		feedSortItems.value= "0";
		feedSortItems.originalValue= "0";
		feedNetworkTimeout.value = "0";
		feedNetworkTimeout.originalValue = "0";
		useBookmarkFolder.checked = false;
		useBookmarkFolder.originalValue = false;
		changesUnseen.checked = false;
		changesUnseen.originalValue = false;
		autoopenNew.checked = false;
		autoopenNew.originalValue = false;
	}
	if (title) {
		feedModHeader.innerText= chrome.i18n.getMessage(title);
	}
	feedModSaveButton.disabled = true;
	feedModSaveButton.callback = callback;


	// Show the dialog box.
	updateOverlayMessage("feedModDialogOverlay");
	showOverlay("feedModDialogOverlay");
}

function feedModHide() {
	updateOverlayMessage("feedModDialogOverlay");
	hideOverlay("feedModDialogOverlay");
}

/**
 * Validates the input in the form (making sure something is entered in both
 * fields and that %s is not missing from the url field.
 */
function feedModInput() {

	var name = trim11(feedNameText.value);
	var url = trim11(feedUrlText.value);
	var group = feedGroupSelect.value;
	var valid;

	if (url != feedUrlText.originalValue && subscriptionsByURL[url]) {
		updateOverlayMessage("feedModDialogOverlay", chrome.i18n.getMessage("opt_alreadySubscribed"));
		valid = false;
	} else {
		updateOverlayMessage("feedModDialogOverlay");
		valid = name.length > 0 &&
		url.length > 0 && 
		(name != feedNameText.originalValue ||
		 url != feedUrlText.originalValue || 
		 group != feedGroupSelect.originalValue || 
		 feedRefreshTime.value != feedRefreshTime.originalValue ||
		 feedSortItems.value != feedSortItems.originalValue ||
		 changesUnseen.checked != changesUnseen.originalValue ||
		 autoopenNew.checked != autoopenNew.originalValue ||
		 useBookmarkFolder.checked != useBookmarkFolder.originalValue ||
		 feedNetworkTimeout.value != feedNetworkTimeout.originalValue);
	}

	feedModSaveButton.disabled = !valid;
}

function getOPMLText() {
	var d=new Date();
	return '<?xml version="1.0" encoding="UTF-8"?>\n' +
			'<opml version="1.0">\n' +
			"    <head>\n" +
			"        <title><![CDATA[RSS Live Links OPML Export]]></title>\n" +
			"        <dateCreated>" + d + "</dateCreated>\n" +
			"    </head>\n" +
			"    <body>\n" +
			getOutlineElements(subscriptions) +
			"    </body>\n" +
			"</opml>";
}

function getOutlineElements(subs) {
	var elements = "";
	for (var i = 0; i < subs.length; ++i) {
		var sub = subs[i];
		elements += (
		'        <outline type="rss" version="RSS" text="' +
		xmlAttrEscape(sub.name)
		+ '" xmlUrl="' +
		xmlAttrEscape(sub.url)
		+ '" title="' +
		xmlAttrEscape(sub.name)
		+ '"/>\n'
		);
	}
	return elements;
}

function addOutline(outline) {
	var type = outline.getAttribute("type");
	if (type == "rss") {
		var url = outline.getAttribute("xmlUrl");
		var name = outline.getAttribute("title");
		if (!name) {
			var name = outline.getAttribute("text");
		}


		if (url && name && !subscriptionsByURL[url]) {
			var newFeed= {
				url: url, 
				name: name, 
				group: undefined, 
				faviconURL: undefined, 
				refreshTime: options.defaultTtl, 
				sortItems: 0, 
				networkTimeout: options.defaultTimeout, 
				changesUnseen: false, 
				useBookmarkFolder: false, 
				autoopenNew: false, 
				bookmarkFolderId: undefined
			};
			subscriptions.push(newFeed);
			subscriptionsByURL[newFeed.url] = newFeed;
			return true;
		}
	}
	return false;
}

function doImport(replace) {
	try {
		var fi = document.getElementById("fileImport");
		var file = fi.files[0];
		if (file) {
			var reader = new FileReader();
			reader.onload = function(evt) {
				var ok = false;

				var text = evt.target.result;
				var text = trim11(text);
				var firstChar = text.charAt(0);
				try {
					if (firstChar == '{') {
						ok = (replace) ? importReplace(text) : importMerge(text);
					} else if (firstChar == '<') {
						ok = importOPML(replace, text);
					} else {
						alert("The import data does not appear to be JSON or XML");
					}
				} catch (err) {
					console.error(err);
				} finally {
					importCnfHide(true);
					if (ok)
						restore_options();
				}
			}
			reader.onerror = function(e) {
				alert("Import file read failed: " + e);
				fsError('Import file read: ', e);
				importCnfHide(true);
			}
			reader.readAsText(file);
		} else {
			importCnfHide(true);
		}
	} catch (err) {
		alert("Import file read failed: " + err);
		console.error("Import file read failed: " + err);
		importCnfHide(true);
	}
}

function importReplace(data) {
	var ok = false;
	try {
		backgroundPage.replaceConfig(data);
		ok = true;
	} catch (err) {
		alert(chrome.i18n.getMessage("opt_badConfig") + ": " + err);
	} 
	return ok;
}

function importMerge(data) {
	var ok = false;
	try {
		save_options();
		backgroundPage.mergeConfig(data);
		ok = true;
	} catch (err) {
		alert(chrome.i18n.getMessage("opt_badConfig") + ": " + err);
	}
	return ok;
}

function importOPML(replace, data) {
	var ok = false;
	try {
		save_options();
		var added = 0;
		var txt = trim11(data);
		if (txt.length > 0) {
			var docOK = false;
			var parser=new DOMParser();
			var	doc=parser.parseFromString(data,"text/xml");
			if (doc) {
				var opml = doc.getElementsByTagName("opml")[0];
				if (opml) {
					var body = opml.getElementsByTagName("body")[0];
					if (body) {
						docOK = true;
						if (replace) {
							subscriptions = [];
							subscriptionsByURL = {};
						}
						var outlines = body.getElementsByTagName("outline");
						var len = outlines.length;
						for (var i=0; i < len; ++i) {
							if (addOutline(outlines[i])) {
								added++;
							}
						}
					}
				}
			}
			if (docOK) {
				if (added > 0) {
					mods = true;
					save_options();
				}
				ok = true;
			} else {
				alert(chrome.i18n.getMessage("opt_badOPML"));
			}
		}
	} catch (err) {
		alert(chrome.i18n.getMessage("opt_badOPML") + ": " + err);
	} 
	return ok;
}

/**
 * Handler for saving the values.
 */
function feedModSave() {
	if (feedModSaveButton.callback) {
		var group = feedGroupSelect.value;
		if (group == "") {
			group = undefined;
		}
		feedModSaveButton.callback({name: trim11(feedNameText.value), 
				url: trim11(feedUrlText.value), 
				group: group, 
				refreshTime: feedRefreshTime.value, 
				sortItems: parseInt(feedSortItems.value), 
				networkTimeout: parseInt(feedNetworkTimeout.value), 
				changesUnseen: changesUnseen.checked, 
				useBookmarkFolder: useBookmarkFolder.checked, 
				autoopenNew: autoopenNew.checked});
	}
	feedModHide();
}

function initExportHrefs() {
	if (fs) {
		initFileImport();
		fs.root.getFile('RSSLiveLinks.opml', {create: true}, 
			function(fileEntry) {
				opmlFile = fileEntry;
				opmlURL = fileEntry.toURL();
				opmlExport.href = opmlURL;
				var fileDetails = "application/octet-stream :RSSLiveLinks.opml :" + opmlURL;
				opmlExport.setAttribute("data-downloadurl", fileDetails);
				opmlExport.addEventListener("dragstart", dragFile, false);
				saveOPMLFile();
			}, 
			function(e){
				fsError('Failed OPML getFile', e);
			}
		);
		fs.root.getFile('RSSLiveLinksConfig.json', {create: true}, 
			function(fileEntry) {
				configFile = fileEntry
				var configURL = fileEntry.toURL();
				configExport.href = configURL;
				var fileDetails = "application/octet-stream :RSSLiveLinksConfig.json :" + configURL;
				configExport.setAttribute("data-downloadurl", fileDetails);
				configExport.addEventListener("dragstart", dragFile, false);
				saveConfigFile();
			}, 
			function(e){
				fsError('Failed Config getFile', e);
			}
		);
	} else {
		configExport.disabled = "disabled";
		opmlExport.disabled = "disabled";
		console.log("No HTML5 file system - drag-export disabled");
	}
}

function saveOPMLFile() {
	saveFile(
		opmlFile,
		getOPMLText(),
		"OPML",
		opmlExport
	);
}

function saveConfigFile() {
	saveFile(
		configFile,
		backgroundPage.getConfigJSON(),
		"Config",
		configExport
	);
}

/*
 * The technique is to truncate the file to zero, then write the data
 */
function saveFile(file, data, type, button) {
	button.disabled="disabled";
	try {
		file.createWriter(
			function(fileWriter) {
				fileWriter.onwriteend = function (e) {
					fileWriter.onwriteend = function (e) {
						button.disabled="";
					};
					fileWriter.onerror = function (e) {
						button.disabled = "disabled";
						fsError('Failed ' + type + ' write', e);
					};
					fileWriter.write(
						new Blob( [data], {type: 'text/plain'} )
					);
				};
				fileWriter.onerror = function (e) {
					button.disabled = "disabled";
					fsError('Failed ' + type + ' truncate', e);
				};
				fileWriter.truncate(0);
			}, 
			function(e){
				button.disabled = "disabled";
				fsError('Failed ' + type + ' createWriter', e);
			}
		);
	} catch (err) {
		button.disabled = "disabled";
		console.error(type + " file write failed: " + err);
	}
}

function fsError(hd, e) {
	var msg;
	switch (e.code) {
	  case FileError.QUOTA_EXCEEDED_ERR:
	    msg = 'QUOTA_EXCEEDED_ERR';
	    break;
	  case FileError.NOT_FOUND_ERR:
	    msg = 'NOT_FOUND_ERR';
	    break;
	  case FileError.SECURITY_ERR:
	    msg = 'SECURITY_ERR';
	    break;
	  case FileError.INVALID_MODIFICATION_ERR:
	    msg = 'INVALID_MODIFICATION_ERR';
	    break;
	  case FileError.INVALID_STATE_ERR:
	    msg = 'INVALID_STATE_ERR';
	    break;
	  default:
	    msg = 'Unknown Error';
	    break;
	};
	console.error(hd + ': ' + msg);
}
