module.exports = function(client) {

	var onRoom = false;

	var leaveRoom = function () {
		if (onRoom == false) {
			return false;
		}
		else {
			onRoom = false;
			return true;
		}
	}

	var joinRoom = function (roomID) {
		if (onRoom == false) {
			onRoom = roomID;
			return true;
		}
		else {
			return false;
		}
	}

	var getRoom = function () {
		return onRoom;
	};
	
	return {
		name: client.name,
		uid: client.uid,
		sessionID: client.sessionID,
		version: client.version,
		getRoom: getRoom,
		joinRoom: joinRoom,
		leaveRoom: leaveRoom
	};
}