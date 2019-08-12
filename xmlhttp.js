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
 * This file attempts to implement some intelligent handling of XMLHttpRequest objects by
 * providing a "manager" that retains a pool of request objects.
 *
 * If you limit the size of the pool, you SHOULD limit the network overhead incurred
 * by these requests, at the expense, of course, of a certain amount of delay in loading
 * resources at busy times.
 *
 * The idea is to TRY and make the popup more responsive and use less memory at the
 * same time!
 */

var httpDelayTime = inWorker ? 0 : 20;
/*var httpSliceDelayTime = 15000;
var httpSliceMax = 16;*/

var httpRequestCount = 0;

function delayRun(requestor, requestData) {
	//console.log("REQUESTOR " + requestor.num + ": scheduling request: " + requestData.url);
	if (httpDelayTime > 0) {
		setTimeout( function() {
			requestor.run(requestData);
		}, httpDelayTime);
	} else {
		requestor.run(requestData);
	}
}

function delayOnLoad(requestor, func, context, doc, txt) {
	if (httpDelayTime > 0) {
		setTimeout( function() {
			func(context, doc, txt);
		}, httpDelayTime);
	} else {
		func(context, doc, txt);
	}
}

function delayOnError(requestor, func, context, errorText) {
	if (httpDelayTime > 0) {
		setTimeout( function() {
			func(context, errorText);
		}, httpDelayTime);
	} else {
		func(context, errorText);
	}
}

function XMLHttpRequestManager() {
	this.requestorPool = [];
	this.requestQueue = [];
	this.maxRunning = 4;
	this.poolSize = 0;
	this.nextRequestorNum = 1;
/*	this.requestTimes = [];
	this.paused = false;*/
}
/*
 * Pause/un-pause - could be useful in the future, but not now!
 *
XMLHttpRequestManager.prototype.unpause = function() {
	logMsg("REQUEST MANAGER: UN-PAUSING: " + this.requestTimes.length);
	this.paused = false;
	var requestor = undefined;
	while (this.requestQueue.length > 0 && (requestor = this.getFromPool())) {
		requestor.runNext();
	}
}

XMLHttpRequestManager.prototype.pause = function() {
	logMsg("REQUEST MANAGER: PAUSING: " + this.requestTimes.length);
	var manager = this;
	setTimeout( function() {
		manager.unpause();
	}, httpSliceDelayTime);
	this.paused = true;
}

XMLHttpRequestManager.prototype.trimRequestTimes = function() {
	var then = (new Date()).getTime() - httpSliceDelayTime;
	while (this.requestTimes[0] < then) {
		this.requestTimes.shift();
	}
	logMsg("REQUEST MANAGER: trimmed to: " + this.requestTimes.length);
}

XMLHttpRequestManager.prototype.checkPause = function() {
	if (this.paused) {
		return true;
	} else {
		if (this.requestTimes.length >= httpSliceMax) {
			this.trimRequestTimes();
		}
		if (this.requestTimes.length >= httpSliceMax) {
			this.pause();
			return true;
		}
		this.requestTimes.push((new Date()).getTime());
		return false;
	}
}
*/
XMLHttpRequestManager.prototype.getFromPool = function() {
/*	if (this.checkPause()) {
		return undefined;
	}*/
	var requestor = undefined;
	if (this.requestorPool.length > 0) {
		requestor = this.requestorPool.shift();
		requestor.queued = false;
		//console.log("REQUEST MANAGER: reusing queued requestor. Pool size: " + this.poolSize);
	} else if (this.poolSize < this.maxRunning) {
		var num = this.nextRequestorNum++;
		requestor = new XMLHttpRequestor(this, num);
		this.poolSize++;
		//console.log("REQUEST MANAGER: created requestor "+num+". Pool size: " + this.poolSize);
	}
	return requestor;
}	

XMLHttpRequestManager.prototype.returnToPool = function(requestor) {
	if (this.requestorPool.length < this.maxRunning) {
		this.requestorPool.push(requestor);
		requestor.queued = true;
	} else {
		this.poolSize--;
		//console.log("REQUEST MANAGER: cleaning requestor. Pool size: " + this.poolSize);
		requestor.clean();
	}
}	

XMLHttpRequestManager.prototype.getNextRequest = function() {
	/*if (this.checkPause()) {
		return null;
	}*/
	if (this.requestQueue.length > 0) {
		//console.log("REQUEST MANAGER: dequeing request. Requests in queue: " + (this.requestQueue.length - 1));
		return this.requestQueue.shift();
	} else {
		return null;
	}
}

XMLHttpRequestManager.prototype.setMaxRunning = function(maxRunning) {
	//logMsg("REQUEST MANAGER: changing max pool size to " + maxRunning + ". Current max: " + this.maxRunning + ", Current pool size: " + this.poolSize + ", Current available: " + this.requestorPool.length);
	if (this.maxRunning == maxRunning)
		return;
	var poolSize = this.requestorPool.length;
	this.maxRunning = maxRunning;
	if (poolSize > maxRunning)  {
		while (poolSize > maxRunning) {

			this.requestorPool.pop().clean();
			poolSize--;
			this.poolSize--;
			//console.log("REQUEST MANAGER: cleaning requestor. Pool size: " + this.poolSize);
		}
	} 
}

XMLHttpRequestManager.prototype.runRequest = function(url, context, doneFunc, failFunc, timeout) {
	var requestor = this.getFromPool();
	var requestData = {url: url, context: context, doneFunc: doneFunc, failFunc: failFunc, timeout: timeout};
	if (requestor) {
		delayRun(requestor, requestData);
		//console.log("REQUEST MANAGER: requests running: " + (this.poolSize - this.requestorPool.length));
	} else {
		//logMsg("QUEUEING: " + url);
		this.requestQueue.push(requestData);
		//console.log("REQUEST MANAGER: requests in queue: " + this.requestQueue.length);
	}
}

function XMLHttpRequestor(manager, num) {
	this.num = num;
	this.manager = manager;
	this.setRequest();
}

XMLHttpRequestor.prototype.setRequest = function() {
	this.request = new XMLHttpRequest();
	this.request.requestor = this;

	this.request.onload = function() {
		if (this.status >= 300) {
			var errorText = this.readyState + " - " + this.status + " - " + this.statusText;
			this.requestor.handleError(errorText);
		} else {	
			var requestData = this.requestData;
			this.requestData = undefined;
			if (this.queued) {
				logMsg("LOGIC ERROR: REQUESTOR " + this.requestor.num + ": onload should not be run on queued requestor");
			}
			this.finished = true;
			try {
				if (this.timeoutTimer != undefined) {
					clearTimeout(this.timeoutTimer);
					this.timeoutTimer = undefined;
				}
				delayOnLoad(
					this.requestor,
					requestData.doneFunc,
					requestData.context,
					this.responseXML,
					this.responseText
				);
				this.requestor.runNext();
			} catch (err) {
				this.requestData = requestData;
				this.requestor.handleError(err.message);
				this.requestData = undefined;
			}
		}
	};

	this.request.onerror = function() {
		var errorText = this.readyState + " - " + this.status + " - " + this.statusText;
		this.requestor.handleError(errorText);
	};
}

XMLHttpRequestor.prototype.clean = function() {
	this.manager = undefined;
	this.request.requestor = undefined;
	this.request.onerror = undefined;
	this.request.onload = undefined;
	this.request = undefined;
}

XMLHttpRequestor.prototype.handleError = function(errorText) {
	var req = this.request;
	var requestData = req.requestData;
	req.requestData = undefined;
	//logMsg("REQUESTOR "+this.num+": handling error \""+errorText);

	if (this.queued) {
		logMsg("LOGIC ERROR: REQUESTOR "+this.num+": onerror should not be run on queued requestor");
	}
	req.finished = true;
	if (req.timeoutTimer != undefined) {
		clearTimeout(req.timeoutTimer);
		req.timeoutTimer = undefined;
	}
	delayOnError(this, requestData.failFunc, requestData.context, 'Failed to fetch ' + requestData.url + ': ' + errorText);
	this.runNext();
}

XMLHttpRequestor.prototype.runNext = function() {
	//console.log("REQUESTOR "+this.num+": cleaning the request");
	this.request.abort();
	this.request.requestData = undefined;
	/* WORKAROUND FOR NON CLEANUP OF REQUEST OBJECTS BY ABORT! */
	this.request.requestor = undefined;
	this.request.onerror = undefined;
	this.request.onload = undefined;
	this.request = undefined;
	//this.request = undefined; // NOT doing this just in case we need the data - but we shouldn't!
	var nextRequest = this.manager.getNextRequest();
	if (nextRequest) {
		delayRun(this, nextRequest);
	} else {
		//console.log("REQUESTOR "+this.num+": returning to pool");
		this.manager.returnToPool(this);
	}
}

XMLHttpRequestor.prototype.setTimeout = function (seconds) {
	var requestor = this;
	var req = this.request;
	//console.log("APPLYING TIMEOUT OF " + seconds + " to " + req.requestData.url);
	req.timeoutTimer = setTimeout(
		function() {
			if (requestor.queued) {
				//console.log("LOGIC ERROR: REQUESTOR "+requestor.num+": timeout should not be run on queued requestor");
			}
			var myReq = requestor.request;
			myReq.timeoutTimer = undefined;
			if ((!myReq.finished) && myReq.readyState != 4) {
				var emsg = "Failed to load: timed out after " + seconds + " seconds";
				//logMsg("REQUESTOR "+myReq.requestor.num+": timed out for : " + myReq.requestData.url + " (readyState: " + myReq.readyState +")");
				myReq.abort();
				requestor.handleError(emsg);
			}
		}, seconds * 1000);
}

XMLHttpRequestor.prototype.run = function(requestData) {
	/* WORKAROUND FOR NON CLEANUP OF REQUEST OBJECTS BY ABORT! */
	this.setRequest();
	var req = this.request;
	req.finished = false;
	req.requestData = requestData;
	req.open("GET", requestData.url);
	//req.setRequestHeader("If-Modified-Since", "Mon, 1 Jul 2013 00:00:01 GMT");
	if (requestData.timeout > 0) {
		this.setTimeout(requestData.timeout);
	}
	//logMsg("REQUESTOR "+this.num+": sending request " + (++httpRequestCount) + " for URL: " + requestData.url);
	try {
		req.send();
	//	logMsg("REQUESTOR "+this.num+": sent request for URL: " + requestData.url);
	} catch (err) {
		this.handleError(err.message);
	}
}

