module.exports = function(roomInfo) {

	var clients = new Array()

	var getClients = function() {
		var clientList = new Array();

		for (var client in clients){
			clientList.push(client);
		}

		return clientList;
	}

	var addClient = function(clientSessionID) {
		if (! clients[clientSessionID]) {
			clients[clientSessionID] = true;
			this.totalConnect += 1;
			return true;
		}
		else {
			return false;
		}
	}

	var removeClient = function(clientSessionID) {
		if (clients[clientSessionID]) {
			delete clients[clientSessionID];
			this.totalConnect -= 1;
			return true;
		}
		else {
			return false;
		}
	}
	
	return {
		'id': roomInfo.id,
		'name': roomInfo.name,
		'desc': roomInfo.desc,
		'creator': {
			'name': roomInfo.creator.name,
			'sessionID': roomInfo.creator.sessionID
		},
		'totalConnect': 0,
		'getClients': getClients,
		'addClient': addClient,
		'removeClient': removeClient
	}
}
