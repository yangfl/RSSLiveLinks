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
 * Functions that tie bits of the UI together
 *
 * They don't refence ANY of the options at all, only HTML elements
 */
window.addEventListener("load", function() {load()}, false);

function setStaticEventListeners() {
	var handlers = [
		{"element":"addButton", "event":"click", "handler": function() {showFeedMod('opt_feedAddHeader', null, addSubscriptionFromForm)}},
		{"element":"autoopenNew", "event":"change", "handler": feedModInput},
		{"element":"autoopenNew", "event":"input", "handler": feedModInput},
		{"element":"changesUnseen", "event":"change", "handler": feedModInput},
		{"element":"changesUnseen", "event":"input", "handler": feedModInput},
		{"element":"defaultTimeout", "event":"change", "handler": checkNumeric},
		{"element":"deleteButton", "event":"click", "handler": deleteFeeds},
		{"element":"deleteGButton", "event":"click", "handler": deleteGroups},
		{"element":"displayOptionsTab", "event":"click", "handler": switchTab},
		{"element":"errorFeedTitle_default", "event":"click", "handler": function() {defaultOptionsClicked(errorFeedTitle_default, 'errorFeedTitle')}},
		{"element":"errorFeedTitle_fontStyle", "event":"click", "handler": function() {italicClicked(errorFeedTitle_fontStyle, 'errorFeedTitle')}},
		{"element":"feedCancelButton", "event":"click", "handler": feedModHide},
		{"element":"feedGroupSelect", "event":"change", "handler": feedModInput},
		{"element":"feedGroupSelect", "event":"input", "handler": feedModInput},
		{"element":"feedModSaveButton", "event":"click", "handler": feedModSave},
		{"element":"feedNameText", "event":"change", "handler": feedModInput},
		{"element":"feedNameText", "event":"input", "handler": feedModInput},
		{"element":"feedNetworkTimeout", "event":"change", "handler": feedModInput},
		{"element":"feedNetworkTimeout", "event":"keypress", "handler": checkNumeric},
		{"element":"feedRefreshTime", "event":"change", "handler": feedModInput},
		{"element":"feedSortItems", "event":"change", "handler": feedModInput},
		{"element":"feedUrlText", "event":"change", "handler": feedModInput},
		{"element":"feedUrlText", "event":"input", "handler": feedModInput},
		{"element":"fontOptionsTab", "event":"click", "handler": switchTab},
		{"element":"importCancelButton", "event":"click", "handler": function() {importCnfHide(true)}},
		{"element":"importMergeButton", "event":"click", "handler": function() {importCnfDialogOverlay.callback(false)}},
		{"element":"importReplaceButton", "event":"click", "handler": function() {importCnfDialogOverlay.callback(true)}},
		{"element":"maxConcurrent", "event":"keypress", "handler": checkNumeric},
		{"element":"maxItemsCount", "event":"keypress", "handler": checkNumeric},
		{"element":"modifyButton", "event":"click", "handler": modifyFeed},
		{"element":"modifyGButton", "event":"click", "handler": modifyGroup},
		{"element":"moveDownButton", "event":"click", "handler": moveFeedDown},
		{"element":"moveGDownButton", "event":"click", "handler": moveGFeedDown},
		{"element":"moveGUpButton", "event":"click", "handler": moveGFeedUp},
		{"element":"moveUpButton", "event":"click", "handler": moveFeedUp},
		{"element":"newGroup", "event":"change", "handler": addNewGroup},
		{"element":"otherOptionsTab", "event":"click", "handler": switchTab},
		{"element":"popUpHeight", "event":"change", "handler": function() {setRange(popUpHeight)}},
		{"element":"popUpHeight_text", "event":"change", "handler": function() {setRange(popUpHeight_text)}},
		{"element":"popUpHeight_text", "event":"keypress", "handler": checkNumeric},
		{"element":"popUpWidth", "event":"change", "handler": function() {setRange(popUpWidth)}},
		{"element":"popUpWidth_text", "event":"change", "handler": function() {setRange(popUpWidth_text)}},
		{"element":"popUpWidth_text", "event":"keypress", "handler": checkNumeric},
		{"element":"readFeedTitle_default", "event":"click", "handler": function() {defaultOptionsClicked(readFeedTitle_default, 'readFeedTitle')}},
		{"element":"readFeedTitle_fontStyle", "event":"click", "handler": function() {italicClicked(readFeedTitle_fontStyle, 'readFeedTitle')}},
		{"element":"readItemTitle_default", "event":"click", "handler": function() {defaultOptionsClicked(readItemTitle_default, 'readItemTitle')}},
		{"element":"readItemTitle_fontStyle", "event":"click", "handler": function() {italicClicked(readItemTitle_fontStyle, 'readItemTitle')}},
		{"element":"refreshButton", "event":"click", "handler": restore_options},
		{"element":"saveButton", "event":"click", "handler": save_options},
		{"element":"soundFile", "event":"keypress", "handler": playChosenSound},
		{"element":"statusLine", "event":"click", "handler": function() {statusLine.className='hide'}},
		{"element":"subsAndGroupsTab", "event":"click", "handler": switchTab},
		{"element":"unlimitedCalls", "event":"click", "handler": function() {unlimitedClicked(unlimitedCalls, maxConcurrent)}},
		{"element":"unlimitedItems", "event":"click", "handler": function() {unlimitedClicked(unlimitedItems, maxItemsCount)}},
		{"element":"unreadFeedTitle_default", "event":"click", "handler": function() {defaultOptionsClicked(unreadFeedTitle_default, 'unreadFeedTitle')}},
		{"element":"unreadFeedTitle_fontStyle", "event":"click", "handler": function() {italicClicked(unreadFeedTitle_fontStyle, 'unreadFeedTitle')}},
		{"element":"unreadItemTitle_default", "event":"click", "handler": function() {defaultOptionsClicked(unreadItemTitle_default, 'unreadItemTitle')}},
		{"element":"unreadItemTitle_fontStyle", "event":"click", "handler": function() {italicClicked(unreadItemTitle_fontStyle, 'unreadItemTitle')}},
		{"element":"unseenFeedTitle_default", "event":"click", "handler": function() {defaultOptionsClicked(unseenFeedTitle_default, 'unseenFeedTitle')}},
		{"element":"unseenFeedTitle_fontStyle", "event":"click", "handler": function() {italicClicked(unseenFeedTitle_fontStyle, 'unseenFeedTitle')}},
		{"element":"unseenItemTitle_default", "event":"click", "handler": function() {defaultOptionsClicked(unseenItemTitle_default, 'unseenItemTitle')}},
		{"element":"unseenItemTitle_fontStyle", "event":"click", "handler": function() {italicClicked(unseenItemTitle_fontStyle, 'unseenItemTitle')}},
		{"element":"updateAvailable", "event":"click", "handler": updateAvailableFeeds},
		{"element":"useBookmarkFolder", "event":"change", "handler": feedModInput},
		{"element":"useBookmarkFolder", "event":"input", "handler": feedModInput}
	];

	function addHandler(handler_def) {
		document.getElementById(handler_def.element).addEventListener(handler_def["event"], handler_def["handler"]);
	}
	handlers.forEach(addHandler);
	
	var	colorPickers = [
		{"element":"unseenFeedTitle_color", "settings": {"hash": true}},
		{"element":"unreadFeedTitle_color", "settings": {"hash": true}},
		{"element":"readFeedTitle_color",   "settings": {"hash": true}},
		{"element":"errorFeedTitle_color",  "settings": {"hash": true}},
		{"element":"unseenItemTitle_color", "settings": {"hash": true}},
		{"element":"unreadItemTitle_color", "settings": {"hash": true}},
		{"element":"readItemTitle_color",   "settings": {"hash": true}}
	];

	function addColorPickers(picker_def) {
		var valueElement  = document.getElementById(picker_def.element);
		var pickerElement = document.getElementById(picker_def.element + "_picker");
		var settings = picker_def.settings;
		settings["valueElement"] = valueElement;
		var picker = new jscolor.color(pickerElement, settings);
		pickerElement["colorPicker"] = picker;
	}
	colorPickers.forEach(addColorPickers);
	
}

function updateStatus(text, timeout) {
	statusText.innerHTML = text;
	statusText.title = text;
	statusLine.className = "show";
	if (timeout) {
		setTimeout(function() {
			statusLine.className = "hide";
		}, timeout);
	}
}

function updateDialog(overlayName, text, timeout) {
	var overlay = document.getElementById(overlayName);
	var messages = overlay.getElementsByClassName("messages")[0];
	if (messages) {
		messages.innerHTML = text;
		messages.title = text;
		messages.className = "messages messages-show";
		if (timeout) {
			setTimeout(function() {
				messages.className = "messages messages-hide";
			}, timeout);
		}
	}
}

function checkNumeric()
{
	// Get ASCII value of key that user pressed
	var key = window.event.keyCode;

	// Was key that was pressed a numeric character (0-9)?
	if ( key > 47 && key < 58 )
		return; // if so, do nothing
	else
		window.event.returnValue = null; // otherwise, 
	// discard character
}

function setRange(element, value) {
	var setElement = false;
	if (!value) {
		value = element.value;
	} else {
		setElement = true;
	}
	var iValue = parseInt(value);
	var text;
	if (element.type == "range") {
		var text = element.nextElementSibling;
		if (text.type == "text") {
			text.value = "" + iValue;
			if (setElement) {
				element.value = iValue;
			}
		}
	} else if (element.type == "text") {
		var range = element.previousElementSibling;
		if (range.type == "range") {
			var iRange;
			if (range.min && iValue < (iRange = parseInt(range.min))) {
				value = iRange;
			}
			if (range.max &&  iValue > (iRange = parseInt(range.max))) {
				value = iRange;
			}
			range.value = ""+value;
			element.value = ""+value;
		}
	}
}

function switchTab(evt) {
	var tab;
	var tabContainer = document.getElementById("tab-container");
	if (!evt) {
		tab = document.getElementById(tabContainer.dataset.defaulttab);
	} else {
		tab = evt.target;
	}
	if (tab) {
		var activeTab = tabContainer.getElementsByClassName("active")[0];
		var activeContent = activeTab ? document.getElementById(activeTab.dataset.associatedcontent) : undefined;
		var content = document.getElementById(tab.dataset.associatedcontent);
		if (activeTab) {
			activeTab.className="tab";
		}
		activeTab = tab;
		activeTab.className="tab active";
		if (activeContent) {
			activeContent.className="tab-content";
		}
		activeContent = content;
		activeContent.className="tab-content show";
	}
}

function unlimitedClicked(chkbox, counter) {
	counter.disabled = (chkbox.checked ? "disabled" : "")
}

function playChosenSound() {
	var el = document.getElementById('audioNotify');
	el.src = soundFile.value;
	el.load();
	el.play();			
}

function initFileImport() {
	/* this clears the hidden file input element's state */
	importConfigInput.innerHTML = importConfigInput.innerHTML;
	var el = document.getElementById("fileImport");
	el.disabled = "";
	importConfig.className = "link";
	el.addEventListener("change",	 function(event){importCnfShow(doImport);}, false); 
	el.addEventListener("dragenter", function(event){importConfig.className = "link dropping";}, false);
	el.addEventListener("dragleave", function(event){importConfig.className = "link";}, false);
}

function importCnfHide(enableImport) {
	hideOverlay("importCnfDialogOverlay");
	if (enableImport) {
		initFileImport();
	}
}

function importCnfShow (func) {
	var fi = document.getElementById("fileImport");
	var file = fi.files[0]
	if (file) {
		fi.disabled = "disabled";
		importCnfDialogOverlay.callback = func;
		showOverlay("importCnfDialogOverlay");
	}
}

/*
 * Font stuff
 */
var defaultColors = {errorFeedTitle_color: "#FF0000", unseenFeedTitle_color: "#FF0000", unreadFeedTitle_color: "#000000", readFeedTitle_color: "#000000",
	unseenItemTitle_color: "#FF0000", unreadItemTitle_color: "#000099", readItemTitle_color: "#000000"};

var defaultFontStyles = {errorFeedTitle: true, unseenFeedTitle: false, unreadFeedTitle: false, readFeedTitle: false,
	unseenItemTitle: false, unreadItemTitle: false, readItemTitle: false};

var fontStyles = [ "normal", "italic" ];

function italicClicked(checkBox, titleClassName) {
	checkBox.value = checkBox.checked ? fontStyles[1] : fontStyles[0];
}

var titleStyles = {feedTitle: {fontSize: "font-size", fontFamily: "font-family"}, 
	unseenFeedTitle: {color: "color", fontWeight: "font-weight", fontStyle: "font-style"},
	unreadFeedTitle: {color: "color", fontWeight: "font-weight", fontStyle: "font-style"},
	readFeedTitle: {color: "color", fontWeight: "font-weight", fontStyle: "font-style"},
	errorFeedTitle: {color: "color", fontWeight: "font-weight", fontStyle: "font-style"},
	itemTitle: {fontSize: "font-size", fontFamily: "font-family"}, 
	unseenItemTitle: {color: "color", fontWeight: "font-weight", fontStyle: "font-style"},
	unreadItemTitle: {color: "color", fontWeight: "font-weight", fontStyle: "font-style"},
	readItemTitle: {color: "color", fontWeight: "font-weight", fontStyle: "font-style"}};

function unsetDefault(titleClassName) {
	window[titleClassName + "_color_picker"].disabled = "";
	window[titleClassName + "_color"].disabled = "";
	window[titleClassName + "_fontWeight"].disabled = "";
	window[titleClassName + "_fontStyle"].disabled = "";
	window[titleClassName + "_default"].checked = false;
}

function defaultOptionsClicked(checkBox, titleStyleName)
{
	if (checkBox.checked) {
		setDefault(titleStyleName);
	} else {
		unsetDefault(titleStyleName);
	}
}

function setDefault(titleClassName) {
	var hiddenColorHolderId = titleClassName + "_color";
	var picker = window[titleClassName + "_color_picker"];
	var hiddenColorHolder = window[hiddenColorHolderId];
	var fontWeight = window[titleClassName + "_fontWeight"];
	var fontStyle = window[titleClassName + "_fontStyle"];
	picker.style["background-color"] = defaultColors[hiddenColorHolderId];
	hiddenColorHolder.value = defaultColors[hiddenColorHolderId];
	fontStyle.checked = defaultFontStyles[titleClassName];
	italicClicked(fontStyle, titleClassName);
	fontWeight.value = "default";
	picker.disabled = "disabled";
	hiddenColorHolder.disabled = "disabled";
	fontWeight.disabled = "disabled";
	fontStyle.disabled = "disabled";
	window[titleClassName + "_default"].checked = true;
}

/*
 * Handle selection events with the same semantics as Windows explorer
 * with the exception that if there is only one row selected and it is
 * clicked again, then it is deselected.
 */
function rowSelected(event) {
	var target = event.currentTarget;
	var container = target.container;
	var selCtrl = container.selectionControl;
	var extend = event.shiftKey;
	var add = event.ctrlKey;
	var targetChecked = target.checked;
	var origSelected = selCtrl.selected;
	if (selCtrl.selected == 0) {
		setSelected(target, selCtrl);
		selCtrl.selectionHead = target.index;
	} else if (!(extend || add)) {
		//there are selections, but no modifiers - clear the selection
		//then select the target if it wasn't originally selected
		clearSelection(container);
		if (origSelected > 1 || !targetChecked) {
			setSelected(target, selCtrl);
			selCtrl.selectionHead = target.index;
		}
	} else if (add && !extend) {
		//Add to (or remove from) the current selection
		//Not - in Windows if you unselect with ctrl, the element still
		//becomes the selection head.
		selCtrl.selectionHead = target.index; 
		if (targetChecked) {
			setUnselected(target, selCtrl);
		} else {
			setSelected(target, selCtrl);
		}
	} else if (extend && !add) {
		//extend the selection from the selection head to the current target
		extendSelection(container, target, true);
	} else {
		// both are pressed so we do an extend with no unselection.
		extendSelection(container, target, false);
	}
	selCtrl.deleteButton.disabled = (selCtrl.selected == 0 ? "disabled" : "");

	if (selCtrl.selected == 1) {
		selCtrl.modifyButton.disabled = "";
		var row = container.getElementsByClassName("selectedRowDiv")[0];
		selCtrl.moveUpButton.disabled = (row.index > 0 ? "" : "disabled");
		selCtrl.moveDownButton.disabled = (row.index < (selCtrl.data.length -1) ? "" : "disabled");
	} else {
		selCtrl.modifyButton.disabled = "disabled";
		selCtrl.moveUpButton.disabled = "disabled";
		selCtrl.moveDownButton.disabled = "disabled";
	}
}

function extendSelection(container, target, doUnselects) {
	var selCtrl = container.selectionControl;
	var selTop;
	var selBottom;

	if (selCtrl.selectionHead > target.index) {
		selTop = target.index;
		selBottom = selCtrl.selectionHead;
	} else {
		selBottom = target.index;
		selTop = selCtrl.selectionHead;
	}

	var selects = [];

	/*
	 * Save the rows we have to select
	 */
	feedRows = container.getElementsByClassName("rowDiv");
	for (var i = 0; i < feedRows.length; ++i) {
		var feedRow = feedRows[i];
		if (feedRow.index >= selTop && feedRow.index <= selBottom) {
			selects.push(feedRow);
		}
	}
	if (doUnselects) {
		/*
		 * Unselect the rows we have to unselect
		 */
		var feedRows = container.getElementsByClassName("selectedRowDiv");
		for (var i = 0; i < feedRows.length;) {
			var feedRow = feedRows[i];
			if (feedRow.index < selTop || feedRow.index > selBottom) {
				setUnselected(feedRow, selCtrl);
			} else {
				i++;
			}
		}
	}
	/*
	 * And select those we must select
	 */
	for (var i = 0; i < selects.length; ++i) {
		setSelected(selects[i], selCtrl);
	}
}

function setSelected(target, selCtrl) {
	target.checked = true;
	target.className = "selectedRowDiv";
	selCtrl.selected++;
}

function setUnselected(target, selCtrl) {
	target.checked = false;
	target.className = "rowDiv";
	selCtrl.selected--;
}

function clearSelection(container) {
	var selCtrl = container.selectionControl;
	var feedRows = container.getElementsByClassName("selectedRowDiv");
	while (feedRows.length > 0) {
		setUnselected(feedRows[0], selCtrl);
	}
	selCtrl.selected = 0;
	selCtrl.selectionHead = -1;
}

/*
 * File export drag logic
 */
function dragFile(evt) {
	var fileDetails;
	var target = evt.currentTarget;
	if(typeof target.dataset === "undefined") {
	    // Grab it the old way
	    fileDetails = target.getAttribute("data-downloadurl");
	} else {
	    fileDetails = target.dataset.downloadurl;
	}
	evt.dataTransfer.setData("DownloadURL",fileDetails);
	evt.stopImmediatePropagation();
}

function showOverlay(overlayName) {
	var el = document.getElementById(overlayName);
	el.style.display = "block";
	dialogs.style.display = "-webkit-box";
}

function hideOverlay(overlayName) {
	var el = document.getElementById(overlayName);
	el.style.display = "none";
	dialogs.style.display = "none";
}

function updateOverlayMessage(overlayName, text, timeout) {
	var overlay = document.getElementById(overlayName);
	var messages = overlay.getElementsByClassName("messages")[0];
	if (messages) {
		var textDiv = messages.getElementsByClassName("message-text")[0];
		if (text && textDiv) {
			textDiv.innerHTML = text;
			messages.title = text;
			messages.className = "messages messages-show";
			if (timeout) {
				setTimeout(function() {
					messages.className = "messages messages-hide";
				}, timeout);
			}
		} else {
			messages.className = "messages messages-hide";
		}
	}
}
