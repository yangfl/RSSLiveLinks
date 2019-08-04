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

elements = [
	{"element": "addButton", "attr": "innerHTML", "msg": "opt_addButton"},
	{"element": "addButtonHelp", "attr": "title", "msg": "opt_addButtonHelp"},
	{"element": "animateButtonHelp", "attr": "title", "msg": "opt_animateButtonHelp"},
	{"element": "animateButtonLabel", "attr": "innerHTML", "msg": "opt_animateButtonLabel"},
	{"element": "autoopenNewHelp", "attr": "title", "msg": "opt_autoopenNewHelp"},
	{"element": "autoopenNewLabel", "attr": "innerHTML", "msg": "opt_autoopenNewLabel"},
	{"element": "askOnUpdateHelp", "attr": "title", "msg": "opt_askOnUpdateHelp"},
	{"element": "askOnUpdateLabel", "attr": "innerHTML", "msg": "opt_askOnUpdateLabel"},
	{"element": "advancedOptionsHeader", "attr": "innerHTML", "msg": "opt_advancedOptionsHeader"},
	{"element": "advancedOptionsHeader", "attr": "title", "msg": "opt_advancedOptionsHelp"},
	{"element": "availableFeedsHeader", "attr": "innerHTML", "msg": "opt_availableFeedsHeader"},
	{"element": "availableFeedsHeader", "attr": "title", "msg": "opt_availablesHelp"},
	{"element": "changesUnseenHelp", "attr": "title", "msg": "opt_changesUnseenHelp"},
	{"element": "changesUnseenLabel", "attr": "innerHTML", "msg": "opt_changesUnseenLabel"},
	{"element": "configExport", "attr": "innerHTML", "msg": "opt_getConfig"},
	{"element": "configExport", "attr": "title", "msg": "opt_getConfigHelp"},
	{"element": "defaultTimeoutHelp", "attr": "title", "msg": "opt_defaultTimeoutHelp"},
	{"element": "defaultTimeoutLabel", "attr": "innerHTML", "msg": "opt_defaultTimeoutLabel"},
	{"element": "defaultTtlHelp", "attr": "title", "msg": "opt_defaultTtlHelp"},
	{"element": "defaultTtlLabel", "attr": "innerHTML", "msg": "opt_defaultTtlLabel"},
	{"element": "deleteButton", "attr": "innerHTML", "msg": "opt_deleteButton"},
	{"element": "deleteGButton", "attr": "innerHTML", "msg": "opt_deleteButton"},
	{"element": "displayOptionsTab", "attr": "innerHTML", "msg": "opt_displayOptionsHeader"},
	{"element": "displayOptionsTab", "attr": "title", "msg": "opt_displayOptionsHelp"},
	{"element": "displayOptionsTabHeader", "attr": "innerHTML", "msg": "opt_displayOptionsHeader"},
	{"element": "errorColorLabel", "attr": "innerHTML", "msg": "opt_colorLabel"},
	{"element": "errorDefaultLabel", "attr": "innerHTML", "msg": "opt_defaultLabel"},
	{"element": "errorItalicLabel", "attr": "innerHTML", "msg": "opt_italicLabel"},
	{"element": "errorLabel", "attr": "innerHTML", "msg": "opt_errorLabel"},
	{"element": "errorWeightLabel", "attr": "innerHTML", "msg": "opt_weightLabel"},
	{"element": "feedCancelButton", "attr": "innerHTML", "msg": "opt_feedCancelButton"},
	{"element": "feedFontsHeader", "attr": "innerHTML", "msg": "opt_feedFontsHeader"},
	{"element": "feedFontsHeader", "attr": "title", "msg": "opt_feedFontsHelp"},
	{"element": "feedGroupSelectLabel", "attr": "innerHTML", "msg": "opt_feedGroupSelectLabel"},
	{"element": "feedModHeader", "attr": "innerHTML", "msg": "opt_feedModHeader"},
	{"element": "feedModSaveButton", "attr": "innerHTML", "msg": "opt_feedModSaveButton"},
	{"element": "feedNameLabel", "attr": "innerHTML", "msg": "opt_feedNameLabel"},
	{"element": "feedNetworkTimeoutHelp", "attr": "title", "msg": "opt_feedNetworkTimeoutHelp"},
	{"element": "feedNetworkTimeoutLabel", "attr": "innerHTML", "msg": "opt_feedNetworkTimeoutLabel"},
	{"element": "feedRefreshTimeHelp", "attr": "title", "msg": "opt_feedRefreshTimeHelp"},
	{"element": "feedRefreshTimeLabel", "attr": "innerHTML", "msg": "opt_feedRefreshTimeLabel"},
	{"element": "feedSortItemsHelp", "attr": "title", "msg": "opt_feedSortItemsHelp"},
	{"element": "feedSortItemsLabel", "attr": "innerHTML", "msg": "opt_feedSortItemsLabel"},
	{"element": "feedUrlLabel", "attr": "innerHTML", "msg": "opt_feedUrlLabel"},
	{"element": "fixPopupClosesBugHelp", "attr": "title", "msg": "opt_fixPopupClosesBugHelp"},
	{"element": "fixPopupClosesBugLabel", "attr": "innerHTML", "msg": "opt_fixPopupClosesBugLabel"},
	{"element": "focusFirstTabHelp", "attr": "title", "msg": "opt_focusFirstTabHelp"},
	{"element": "focusFirstTabLabel", "attr": "innerHTML", "msg": "opt_focusFirstTabLabel"},
	{"element": "fontFamilyLabel", "attr": "innerHTML", "msg": "opt_fontFamilyLabel"},
	{"element": "fontOptionsTab", "attr": "innerHTML", "msg": "opt_fontOptionsHeader"},
	{"element": "fontOptionsTabHeader", "attr": "innerHTML", "msg": "opt_fontOptionsHeader"},
	{"element": "fontSizeLabel", "attr": "innerHTML", "msg": "opt_fontSizeLabel"},
	{"element": "groupsButtonHelp", "attr": "title", "msg": "opt_groupsButtonHelp"},
	{"element": "groupsHeader", "attr": "innerHTML", "msg": "opt_groupsHeader"},
	{"element": "groupsHeader", "attr": "title", "msg": "opt_groupsHelp"},
	{"element": "hideOnOpenHelp", "attr": "title", "msg": "opt_hideOnOpenHelp"},
	{"element": "hideOnOpenLabel", "attr": "innerHTML", "msg": "opt_hideOnOpenLabel"},
	{"element": "importCancelButton", "attr": "innerHTML", "msg": "opt_importCancelButton"},
	{"element": "importCnfHeader", "attr": "innerHTML", "msg": "opt_importCnfHeader"},
	{"element": "importCnfMsg", "attr": "innerHTML", "msg": "opt_importCnfMsg"},
	{"element": "importConfig", "attr": "title", "msg": "opt_importConfigHelp"},
	{"element": "importConfigText", "attr": "innerHTML", "msg": "opt_importConfig"},
	{"element": "importMergeButton", "attr": "innerHTML", "msg": "opt_importMergeButton"},
	{"element": "importReplaceButton", "attr": "innerHTML", "msg": "opt_importReplaceButton"},
	{"element": "item_fontFamilyLabel", "attr": "innerHTML", "msg": "opt_fontFamilyLabel"},
	{"element": "itemFontsHeader", "attr": "innerHTML", "msg": "opt_itemFontsHeader"},
	{"element": "itemFontsHeader", "attr": "title", "msg": "opt_itemFontsHelp"},
	{"element": "item_fontSizeLabel", "attr": "innerHTML", "msg": "opt_fontSizeLabel"},
	{"element": "item_readColorLabel", "attr": "innerHTML", "msg": "opt_colorLabel"},
	{"element": "item_readDefaultLabel", "attr": "innerHTML", "msg": "opt_defaultLabel"},
	{"element": "item_readItalicLabel", "attr": "innerHTML", "msg": "opt_italicLabel"},
	{"element": "item_readLabel", "attr": "innerHTML", "msg": "opt_readLabel"},
	{"element": "item_readWeightLabel", "attr": "innerHTML", "msg": "opt_weightLabel"},
	{"element": "item_unreadColorLabel", "attr": "innerHTML", "msg": "opt_colorLabel"},
	{"element": "item_unreadDefaultLabel", "attr": "innerHTML", "msg": "opt_defaultLabel"},
	{"element": "item_unreadItalicLabel", "attr": "innerHTML", "msg": "opt_italicLabel"},
	{"element": "item_unreadLabel", "attr": "innerHTML", "msg": "opt_unreadLabel"},
	{"element": "item_unreadWeightLabel", "attr": "innerHTML", "msg": "opt_weightLabel"},
	{"element": "item_unseenColorLabel", "attr": "innerHTML", "msg": "opt_colorLabel"},
	{"element": "item_unseenDefaultLabel", "attr": "innerHTML", "msg": "opt_defaultLabel"},
	{"element": "item_unseenItalicLabel", "attr": "innerHTML", "msg": "opt_italicLabel"},
	{"element": "item_unseenLabel", "attr": "innerHTML", "msg": "opt_unseenLabel"},
	{"element": "item_unseenWeightLabel", "attr": "innerHTML", "msg": "opt_weightLabel"},
	{"element": "maintainBadgeHelp", "attr": "title", "msg": "opt_maintainBadgeHelp"},
	{"element": "maintainBadgeLabel", "attr": "innerHTML", "msg": "opt_maintainBadgeLabel"},
	{"element": "maxConcurrentHelp", "attr": "title", "msg": "opt_maxConcurrentHelp"},
	{"element": "maxConcurrentLabel", "attr": "innerHTML", "msg": "opt_maxConcurrentLabel"},
	{"element": "maxItemsCountHelp", "attr": "title", "msg": "opt_maxItemsCountHelp"},
	{"element": "maxItemsCountLabel", "attr": "innerHTML", "msg": "opt_maxItemsCountLabel"},
	{"element": "modifyButton", "attr": "innerHTML", "msg": "opt_modifyButton"},
	{"element": "modifyGButton", "attr": "innerHTML", "msg": "opt_modifyButton"},
	{"element": "networkOptionsHeader", "attr": "innerHTML", "msg": "opt_networkOptionsHeader"},
	{"element": "networkOptionsHeader", "attr": "title", "msg": "opt_newtWorkOptionsHelp"},
	{"element": "newAtTopHelp", "attr": "title", "msg": "opt_newAtTopHelp"},
	{"element": "newAtTopLabel", "attr": "innerHTML", "msg": "opt_newAtTopLabel"},
	{"element": "newGroup", "attr": "placeholder", "msg": "opt_enterGroupName"},
	{"element": "notificationOptionsHeader", "attr": "innerHTML", "msg": "opt_notificationOptionsHeader"},
	{"element": "notificationOptionsHeader", "attr": "title", "msg": "opt_notificationOptionsHelp"},
	{"element": "openFirstHelp", "attr": "title", "msg": "opt_openFirstHelp"},
	{"element": "openFirstLabel", "attr": "innerHTML", "msg": "opt_openFirstLabel"},
	{"element": "opmlExport", "attr": "innerHTML", "msg": "opt_getOPML"},
	{"element": "opmlExport", "attr": "title", "msg": "opt_getOPMLHelp"},
	{"element": "optionsHeader", "attr": "innerHTML", "msg": "opt_optionsHeader"},
	{"element": "otherOptionsTab", "attr": "innerHTML", "msg": "opt_otherOptionsHeader"},
	{"element": "otherOptionsTabHeader", "attr": "innerHTML", "msg": "opt_otherOptionsHeader"},
	{"element": "playSoundHelp", "attr": "title", "msg": "opt_playSoundHelp"},
	{"element": "playSoundLabel", "attr": "innerHTML", "msg": "opt_playSoundLabel"},
	{"element": "popupBehaviourHeader", "attr": "innerHTML", "msg": "opt_popupBehaviourHeader"},
	{"element": "popupContentHeader", "attr": "innerHTML", "msg": "opt_popupContentHeader"},
	{"element": "popupDensityHelp", "attr": "title", "msg": "opt_popupDensityHelp"},
	{"element": "popupDensityLabel", "attr": "innerHTML", "msg": "opt_popupDensityLabel"},
	{"element": "popupDimsHeader", "attr": "innerHTML", "msg": "opt_popupDimsHeader"},
	{"element": "popupHeightHelp", "attr": "title", "msg": "opt_popupHeightHelp"},
	{"element": "popUpHeightLabel", "attr": "innerHTML", "msg": "opt_popUpHeightLabel"},
	{"element": "popupWidthHelp", "attr": "title", "msg": "opt_popupWidthHelp"},
	{"element": "popUpWidthLabel", "attr": "innerHTML", "msg": "opt_popUpWidthLabel"},
	{"element": "readColorLabel", "attr": "innerHTML", "msg": "opt_colorLabel"},
	{"element": "readDefaultLabel", "attr": "innerHTML", "msg": "opt_defaultLabel"},
	{"element": "readItalicLabel", "attr": "innerHTML", "msg": "opt_italicLabel"},
	{"element": "readLabel", "attr": "innerHTML", "msg": "opt_readLabel"},
	{"element": "readWeightLabel", "attr": "innerHTML", "msg": "opt_weightLabel"},
	{"element": "refreshButton", "attr": "innerHTML", "msg": "opt_refreshButton"},
	{"element": "refreshButtonHelp", "attr": "title", "msg": "opt_refreshButtonHelp"},
	{"element": "saveButton", "attr": "innerHTML", "msg": "opt_saveButton"},
	{"element": "saveButtonHelp", "attr": "title", "msg": "opt_saveButtonHelp"},
	{"element": "showAvailableHelp", "attr": "title", "msg": "opt_showAvailableHelp"},
	{"element": "showAvailableLabel", "attr": "innerHTML", "msg": "opt_showAvailableLabel"},
	{"element": "singleItemHelp", "attr": "title", "msg": "opt_singleItemHelp"},
	{"element": "singleItemLabel", "attr": "innerHTML", "msg": "opt_singleItemLabel"},
	{"element": "sortItemsHelp", "attr": "title", "msg": "opt_sortItemsHelp"},
	{"element": "sortItemsLabel", "attr": "innerHTML", "msg": "opt_sortItemsLabel"},
	{"element": "soundFileHelp", "attr": "title", "msg": "opt_soundFileHelp"},
	{"element": "soundFileLabel", "attr": "innerHTML", "msg": "opt_soundFileLabel"},
	{"element": "subsAndGroupsTab", "attr": "innerHTML", "msg": "opt_subsAndGroupsHeader"},
	{"element": "subsAndGroupsTabHeader", "attr": "innerHTML", "msg": "opt_subsAndGroupsHeader"},
	{"element": "subsButtonHelp", "attr": "title", "msg": "opt_subsButtonHelp"},
	{"element": "subscriptionsHeader", "attr": "innerHTML", "msg": "opt_subscriptionsHeader"},
	{"element": "subscriptionsHeader", "attr": "title", "msg": "opt_subscriptionsHelp"},
	{"element": "unlimitedCallsHelp", "attr": "title", "msg": "opt_unlimitedCallsHelp"},
	{"element": "unlimitedCallsLabel", "attr": "innerHTML", "msg": "opt_unlimitedLabel"},
	{"element": "unlimitedItemsHelp", "attr": "title", "msg": "opt_unlimitedItemsHelp"},
	{"element": "unlimitedItemsLabel", "attr": "innerHTML", "msg": "opt_unlimitedLabel"},
	{"element": "unreadColorLabel", "attr": "innerHTML", "msg": "opt_colorLabel"},
	{"element": "unreadDefaultLabel", "attr": "innerHTML", "msg": "opt_defaultLabel"},
	{"element": "unreadItalicLabel", "attr": "innerHTML", "msg": "opt_italicLabel"},
	{"element": "unreadLabel", "attr": "innerHTML", "msg": "opt_unreadLabel"},
	{"element": "unreadWeightLabel", "attr": "innerHTML", "msg": "opt_weightLabel"},
	{"element": "unseenColorLabel", "attr": "innerHTML", "msg": "opt_colorLabel"},
	{"element": "unseenDefaultLabel", "attr": "innerHTML", "msg": "opt_defaultLabel"},
	{"element": "unseenItalicLabel", "attr": "innerHTML", "msg": "opt_italicLabel"},
	{"element": "unseenLabel", "attr": "innerHTML", "msg": "opt_unseenLabel"},
	{"element": "unseenWeightLabel", "attr": "innerHTML", "msg": "opt_weightLabel"},
	{"element": "updateAvailable", "attr": "innerHTML", "msg": "opt_updateAvailable"},
	{"element": "updateAvailableHelp", "attr": "title", "msg": "opt_updateAvailableHelp"},
	{"element": "useAvailableIconHelp", "attr": "title", "msg": "opt_useAvailableIconHelp"},
	{"element": "useAvailableIconLabel", "attr": "innerHTML", "msg": "opt_useAvailableIconLabel"},
	{"element": "useBookmarkFolderHelp", "attr": "title", "msg": "opt_useBookmarkFolderHelp"},
	{"element": "useBookmarkFolderLabel", "attr": "innerHTML", "msg": "opt_useBookmarkFolderLabel"},
	{"element": "useGroupsHelp", "attr": "title", "msg": "opt_useGroupsHelp"},
	{"element": "useGroupsLabel", "attr": "innerHTML", "msg": "opt_useGroupsLabel"},
	{"element": "useWebWorkerHelp", "attr": "title", "msg": "opt_useWebWorkerHelp"},
	{"element": "useWebWorkerLabel", "attr": "innerHTML", "msg": "opt_useWebWorkerLabel"},
	{"element": "documentElement", "attr": "lang", "msg": "@@ui_locale"},
	{"element": "document", "attr": "title", "msg": "opt_title"}
];

function i18nInit() {

	elements.forEach(function(def) {
		var el = (def.element == "document" ? document : document.getElementById(def.element));
		if (el) {
			el[def.attr] = chrome.i18n.getMessage(def.msg);
		}
	});

	var optn = document.createElement("OPTION");
	optn.text = chrome.i18n.getMessage("opt_feedNoGroupOption");
	optn.value = "";
	feedGroupSelect.options.add(optn);
}
