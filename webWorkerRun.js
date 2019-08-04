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


var inWorker = true;
function logMsg(msg) {
	self.postMessage({consoleMsg: msg});
}

importScripts("utilities.js", "feedWorker.js", "xml4script/tinyxmlsax.js", "xml4script/tinyxmlw3cdom.js", "xmlhttp.js");

var xmlHttpRequestManager = new XMLHttpRequestManager();
self.addEventListener('message', 
	function(e) {
		var message = e.data;
		runRequest(message);
	}, false);

function runRequest(message) {
	try {
		if (message.request == "set_max_cncrnt_rqsts") {
			xmlHttpRequestManager.setMaxRunning(message.data);
			returnResponse(message.id);
		} else 	if (message.request == "update_feed") {
			runUpdate(message.id, message.data);
		} else {
			returnError(message.id, "Web Worker: unrecognized request: " + message.request);
		}
	} catch (e) {
		returnError(message.id, {name: e.name, message: e.message});
	}
}

function returnResponse(id, data) {
	var response = {};
	response.id = id;
	response.data = data;
	response.ok = true;
	self.postMessage(response);
}

function returnError(id, error) {
	var response = {};
	response.id = id;
	response.error = error;
	self.postMessage(response);
}
