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

function WebWorker() {
	
	this.requestId = 0;

	this.worker = new Worker('webWorkerRun.js');
	this.requests = {};

	var me = this;
	this.worker.addEventListener('message', 
		function(evt) {
			me.processResponse(evt.data);
		}, false);
}

WebWorker.prototype.runRequest = function(request, data, context, doneFunc, errFunc) {
	var id = "request_" + this.requestId++;
	this.requests[id] = {context: context, doneFunc: doneFunc, errFunc: errFunc};
	this.worker.postMessage({id: id, request: request, data: data});
	return id;
}

WebWorker.prototype.processResponse = function(response) {
	var consoleMsg = response.consoleMsg;

	if (consoleMsg) {
		console.log("WebWorker Message: " + consoleMsg);
		return;
	}

	var id = response.id;
	var data = response.data;
	var error = response.error;
	console.log("Received response to request: " + id);

	request = this.requests[id];

	if (error) {
		if (error instanceof Object) {
			error = "type: " + error.type + ", message: " + error.message;
		}
		console.error("Web Worker error: " + error);
	}

	if (request) {
		delete this.requests[id];
		if (error) {
			if (request.errFunc) {
				console.log("Running error function for: " + id);
				request.errFunc(id, error, data, request.context);
			}
		} else if (request.doneFunc) {
			console.log("Running handler function for: " + id);
			request.doneFunc(id, data, request.context);
		}
	}
}

WebWorker.prototype.cancelRequest = function(id) {
	delete this.requests[id];
}

WebWorker.prototype.terminate = function(id) {
	this.worker.terminate();
}
