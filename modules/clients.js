// Internal variable of Room
var VCBClient = require('./client.js'); 

exports.clients = new Object();
exports.totalClient = 0;

var logger;

exports.setLogger = function(log) {
	logger = log;
}

exports.get = function(clientSessionID) {
	var client = this.clients[clientSessionID]

	if (client) {
		return client
	}
	else {
		return false
	}
}

exports.add = function(clientInfo) {

	if (! this.clients[clientInfo.sessionID]) {
		this.clients[clientInfo.sessionID] = new VCBClient(clientInfo)
		this.totalClient += 1;
		status = 'new';
		return status;
	}
	else {
		status = 'existing';
		return status;
	}
}

exports.remove = function(clientSessionID){
	if (this.clients[clientSessionID]) {
		delete this.clients[clientSessionID];
		this.totalClient -= 1;
		return true;
	}
	else {
		return false;
	}
}

exports.clear = function () {
	for (client in this.clients) {
		delete this.clients[client];
		this.totalClient -= 1;
	}
}

exports.list = function () {
	var clients = new Array();

	for (var client in this.clients) {
		clients.push(this.clients[client]);
	}

	return clients;
}