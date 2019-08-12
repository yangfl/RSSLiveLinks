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
 * A content script to find RSS link elements and send the
 * pertinent details back to the mother ship
 */
function findRSSLinks() {
	var links = []; 
	linkEls = document.getElementsByTagName('link');
	var altTitle;
	var altTitleCount = 0;
	if (linkEls.length > 0) {
		var titleEl = document.getElementsByTagName('title')[0];
		if (titleEl) {
			altTitle = titleEl.innerText;
		}
	}

	for (var i = 0; i < linkEls.length; ++i) {
		var link = linkEls[i]; 
		if ((link.type == 'application/rss+xml' || link.type == 'application/atom+xml') && link.href) {
			var myTitle = link.title;
			if (!myTitle) {
				myTitle = altTitle;
				if (myTitle && (altTitleCount > 0) ) {
					myTitle += (altTitleCount + 1);
				}
				altTitleCount++;
			}
			if (myTitle) {
				links.push({name: myTitle, url: link.href});
			}
		}
	}
	if (links.length > 0) {
		chrome.extension.sendRequest(links);
	}
} 

findRSSLinks();
