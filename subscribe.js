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
(new Image()).src = "img/rssll_128x128.png";
window.addEventListener("load", addsubscription, false);

var url;
var tabFeedForURL;
var backgroundPage;

function setStaticEventHandlers() {
	document.body.addEventListener("keypress", function(evt) {
		if (evt.keyCode == 13 && !saveButton.disabled) { 
			save(); 
		}
	}, false);
	feedNameText.addEventListener("keyup", validateInput, false);
	saveButton.addEventListener("click", save, false);
	closeButton.addEventListener("click", closeWindow, false);
}

function addsubscription()
{
	setStaticEventHandlers();
	backgroundPage = chrome.extension.getBackgroundPage();
	pageTitle.innerText = chrome.i18n.getMessage("subscribe_title");
	subsAdderHeader.innerText = chrome.i18n.getMessage("subscribe_header");

	dialogHeader.innerText = chrome.i18n.getMessage("subscribe_title");

	feedSortItemsHelp.title = chrome.i18n.getMessage("subscribe_dlg_text");

	feedNameLabel.innerText = chrome.i18n.getMessage("opt_feedNameLabel");

	feedGroupSelectLabel.innerText =  chrome.i18n.getMessage("opt_feedGroupSelectLabel");
	var groupArray = [];
	var options = backgroundPage.options;
	for (var groupName in options.groups)
	{
		var idx = options.groups[groupName];
		groupArray[idx] = groupName
	}

	feedGroupSelect.options.length = 0;
	var optn = document.createElement("OPTION");
	optn.text = chrome.i18n.getMessage("opt_feedNoGroupOption");
	optn.value = "";
	feedGroupSelect.options.add(optn);

	for (var i = 0; i < groupArray.length; ++i)
	{
		var group = groupArray[i];
		if (group) {
			optn = document.createElement("OPTION");
			optn.text = group;
			optn.value = group;
			feedGroupSelect.options.add(optn);		
		}
	}

	feedSortItemsLabel.innerText = chrome.i18n.getMessage("opt_feedSortItemsLabel");
	feedSortItemsHelp.title = chrome.i18n.getMessage("opt_feedSortItemsHelp");
	useBookmarkFolderLabel.innerText = chrome.i18n.getMessage("opt_useBookmarkFolderLabel");
	useBookmarkFolderHelp.title = chrome.i18n.getMessage("opt_useBookmarkFolderHelp");
	autoopenNewLabel.innerText = chrome.i18n.getMessage("opt_autoopenNewLabel");
	autoopenNewHelp.title = chrome.i18n.getMessage("opt_autoopenNewHelp");

	saveButton.innerText = chrome.i18n.getMessage("save_button");
	closeButton.innerText = chrome.i18n.getMessage("close_button");

	var	feedInfo = backgroundPage.feedInfo;
	var feeds = feedInfo.feeds;
	var feedsByURL = feedInfo.feedsByURL;
	url = decodeURIComponent(location.search.substring(1));
	tabFeedForURL = backgroundPage.tabFeedsByURL[url];
	urlLabel.innerText = chrome.i18n.getMessage("opt_feedUrlLabel");;
	urlText.innerText = url;
	if (feedsByURL[url] != undefined) {
		alert(chrome.i18n.getMessage("subscribe_already", [feeds[feedsByURL[url]].name]));
		closeWindow();
	} else {
		/*
		 * If we have detected the same feed (and usually we will have done) 
		 * then we default the name to the name in our detected data.
		 */
		if (tabFeedForURL) {
			feedNameText.value = tabFeedForURL.feed.name
		}
		showOverlay("feedModDialogOverlay");
	}
}

/**
 * Validates the input in the form.
 */
function validateInput() {
	var valid = descriptionText.value.length > 0;
	saveButton.disabled = !valid;
}

function save() {
	var myFeedDetail = {};
	/*
	 * Copy any data we already have for the detected feed
	 */
	if (tabFeedForURL) {
		for (var key in tabFeedForURL.feed) {
			myFeedDetail[key] = tabFeedForURL.feed[key];
		}
	}
	myFeedDetail.name = feedNameText.value;
	myFeedDetail.useBookmarkFolder = useBookmarkFolder.checked;
	myFeedDetail.autoopenNew = autoopenNew.checked;
	myFeedDetail.url = url;
	if (feedGroupSelect.value != "") {
		myFeedDetail.group = feedGroupSelect.value;
	}
	myFeedDetail.sortItems = parseInt(feedSortItems.value);
	backgroundPage.addSubscriptionFromPopup(myFeedDetail, true);
	closeWindow();
}

function closeWindow() {
	chrome.tabs.getSelected(
		undefined,			 
		function(tab) {
			chrome.tabs.remove(tab.id);
		}
	);
}

function showOverlay(overlayName) {
	var el = document.getElementById(overlayName);
	el.style.display = "block";
	dialogs.style.display = "-webkit-box";
}

