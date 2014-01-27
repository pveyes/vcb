var VCBRoom = require('./room.js');

/** Variable comments
** @variable roomID: unique ID of room
** @variable clientID: session of client socket. Its unique value
 */
 
// Random generator
function guid() {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}

	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4()
}

//Interface Rooms
exports.totalRoom = 0;
exports.totalConnectAllRoom = 0
exports.rooms = new Array();

var logger;

exports.setLogger = function(log) {
	logger = log;
}

/**
 * Client create new Room
 *
 * @param room object of {name, desc}
 * @param clientID
 * @return room object of roomConstructor {id, name, desc, creator}
 */
exports.add = function(roomInfo) {
	var roomID = guid()
	roomInfo.id = roomID;
	this.rooms[roomID] = new VCBRoom(roomInfo);
	this.totalRoom += 1;

	logger.info('Success: Add room with creator ' + roomInfo.creator.sessionID);

	return this.rooms[roomID];
}

exports.remove = function(roomID) {
	var connectedClients = new Array();

	if (this.rooms[roomID]) {
		connectedClients = this.rooms[roomID].getClients();
		this.totalRoom -= 1;
		this.totalConnectAllRoom -= connectedClients.length;

		delete this.rooms[roomID];
		logger.info('Success: Room ' + roomID + ' removed');
		return connectedClients;
	}
	else {
		logger.error('Can\'t remove room. Room doesn\'t exist');
		return false;
	}
}

exports.join = function(clientSessionID, roomID) {
	var addClientToRoom = this.rooms[roomID].addClient(clientSessionID)

	if (addClientToRoom == true) {
		this.totalConnectAllRoom += 1;
		logger.info('Success: Added client ' + clientSessionID + ' to room ' + roomID);
		logger.info('Client list on this room: ' + this.rooms[roomID].getClients());
		return true;
	}
	else {
		logger.error('Can\'t join room. Room ' + roomID + ' doesnt exist');
		return false;
	}
}

exports.leave = function(clientSessionID, roomID) {
	logger.info('Removing client ' + clientSessionID + ' from room ' + roomID);
	var removeClientFromRoom = this.rooms[roomID].removeClient(clientSessionID);

	if (removeClientFromRoom == true) {
		this.totalConnectAllRoom -= 1;
		logger.info('Client ' + clientSessionID + ' removed from room ' + roomID);
		return true;
	}
	else {
		logger.error('Can\'t remove client from room. Room ' + roomID + ' doesn\'t exist');
		return false;
	}
}

exports.getClients = function(roomID) {
	var clients;

	if (this.rooms[roomID]) {
		clients = this.rooms[roomID].getClients();
		logger.info('Success: Get list client connect to room ' + roomID);
		return clients;
	}
	else {
		logger.error('Can\'t touch client connected to the room ' + roomID + '. Room doesnt exist');
		return false
	}
}

exports.list = function() {
	var rooms = new Array();

	for(var r in this.rooms) {
		rooms.push(this.rooms[r])
	}

	return rooms
}

exports.get = function(roomID) {
	var result;

	if (this.rooms[roomID]) {
		logger.info('Success: Get room ' + roomID);
		return this.rooms[roomID];
	}
	else {
		logger.error('Can\'t touch room. Room doesnt exist');
		return false;
	}
}