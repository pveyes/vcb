module.exports = function(client) {	

	var leaveRoom = function() {
		var result;

		if (this.onRoom) {
			this.onRoom = false;
			result = true;
		}
		else {
			result = false;
		}

		return result;
	}

	var joinRoom = function(roomID) {
		var result;

		if (this.onRoom) {
			result = false;
		}
		else {
			this.onRoom = roomID;
			result = true;
		}

		return result;
	}
	
	return {
		name: client.name,
		uid: client.uid,
		sessionID: client.sessionID,
		version: client.version,
		onRoom: false,
		leaveRoom: leaveRoom,
		joinRoom: joinRoom
	};
}