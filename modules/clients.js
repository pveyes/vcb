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
		logger.info('Success: Add Client ' + clientInfo.sessionID);
		return status;
	}
	else {
		status = 'existing';
		logger.warn('Can\'t add client. Client has been connected');
		return status;
	}
}

exports.remove = function(clientSessionID){
	if (this.clients[clientSessionID]) {
		delete this.clients[clientSessionID];
		this.totalClient -= 1;
		logger.info('Success: Remove client ' + clientSessionID);
		return true;
	}
	else {
		logger.error('Can\'t remove client ' + clientSessionID + '. Client doesn\'t exist');
		return false;
	}
}

exports.list = function() {
	var clients = new Array();

	for (var client in this.clients) {
		clients.push(this.clients[client]);
	}

	return clients;
}