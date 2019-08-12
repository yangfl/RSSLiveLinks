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
function trim11 (str) {
	if (str) {
		str = str.replace(/^\s+/, '');
		for (var i = str.length - 1; i >= 0; i--) {
			if (/\S/.test(str.charAt(i))) {
				str = str.substring(0, i + 1);
				break;
			}
		}
	}
	return str;
}

function clone(obj) {
	var ClonedObject = function(){};
	ClonedObject.prototype = obj;
	return new ClonedObject;
}

var isoDateRE = new RegExp( // broken up for #tag1
  "([0-9]{4})" // Year
+ "("
+   "-"
+   "([0-9]{2})" // Month
+   "("
+     "-"
+     "([0-9]{2})" // Day
+    "("
+       "T" // T tag
+       "([0-9]{2})" // Hours
+       ":"
+       "([0-9]{2})" // Minutes
+       "("
+         ":"
+         "([0-9]{2})" // Seconds
+         "(\.([0-9]+))?" // Milliseconds
+       ")?"
+       "("
+         "Z"// Z tag
+       "|"
+         "(([-+])([0-9]{2}):([0-9]{2}))" // #tag1 Timezone? Not found in standard. Is this useful? What's this?
+       ")?"
+     ")?"
+   ")?"
+ ")?"
);

function isTimeStamp(xmlDate) {
	//return /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z/.test(xmlDate);
	return isoDateRE.test(xmlDate);
}

function timeStampToDate(timestamp) {
	var d = timestamp.match(isoDateRE);

	if (d == null) return new Date();

	var offset = 0;
	var dat = new Date(d[1], 0, 1);

	if (d[3])  { dat.setMonth(d[3] - 1); }
	if (d[5])  { dat.setDate(d[5]); }
	if (d[7])  { dat.setHours(d[7]); }
	if (d[8])  { dat.setMinutes(d[8]); }
	if (d[10]) { dat.setSeconds(d[10]); }
	if (d[12]) { dat.setMilliseconds(Number("0." + d[12]) * 1000); }
	if (d[14]) {
		offset = (Number(d[16]) * 60) + Number(d[17]);
		offset *= ((d[15] == '-') ? 1 : -1);
	}

	offset -= dat.getTimezoneOffset();
	time = (Number(dat) + (offset * 60 * 1000));
	dat.setTime(Number(time));
	return dat;
}


function createDate(str) {
	var dat = new Date(str);
	if (dat == "Invalid Date") {
		dat = timeStampToDate(str);
	}
	return dat;
}

function disableSelect(elem) {
	elem.onselectstart = function () { return false; }
	elem.onmousedown = function () { return false; }
}

function unhtml(str) {
	translator.innerHTML = str;
	return translator.innerText.replace(/[\f\n\r\t\v\0]/g, ' ');
}

function xmlAttrEscape(str) {
	str = str.replace(/&/g, "&amp;");
	str = str.replace(/"/g, "&quot;");
	str = str.replace(/'/g, "&apos;");
	str = str.replace(/</g, "&lt;");
	str = str.replace(/>/g, "&gt;");
	return str;
}

var absoluteURLStart = /^[a-zA-Z]+:\/\/.*/;

function isRelative(url) {
	return !url.match(absoluteURLStart);
}

function getRootURL(fullURL) {
	start_from = fullURL.indexOf(".");
	var slash = fullURL.indexOf("/", start_from);
	return (slash > 0 ? fullURL.substring(0,slash) : fullURL);
}	

function getParentURL(fullURL, start) {
	var slash = fullURL.lastIndexOf("/");
	return (slash >= (start ? start : 0) ? fullURL.substring(0,slash) : fullURL);
}
