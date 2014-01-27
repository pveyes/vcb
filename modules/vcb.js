'use strict';

module.exports = function() {

	var VCBClients = require('./clients.js'),
		VCBRooms = require('./rooms.js'),
		io,
		logger;

	/**
	 * Check whether vcb client is valid
	 */

	var clientValid = function(clientInfo) {
		if (clientInfo.uid && clientInfo.version && clientInfo.name) {
			return true
		}
		else {
			return false
		}
	}

	/**
	 * Check whether room info is valid
	 */

	var roomValid = function(roomInfo) {
		if (roomInfo.name && roomInfo.desc && roomInfo.creator) {
			return true
		}
		else {
			return false
		}
	}

	/** Request status STUN Server
	** @socket emit list io socket connect, VCBSession, VCBRooms
	**		signal: 'statusSTUN'
	**		data: {status,data:{io,VCBSession,VCBRooms}}
	 */

	var statusSTUN = function() {
		var res = new Object(),
			sockets = new Array(),
			clients, rooms;

		for (var id in io.connected) {
			sockets.push(id);
		}

		clients = VCBClients.list();
		rooms = VCBRooms.list();

		res = {
			'status': true,
			'data': {
				'sockets': sockets,
				'clients': clients,
				'rooms': rooms
			}
		}
		logger.info('Info:StatusSTUN: '+res);
		logger.info('STUN:End request status STUN from session:'+this.id);
		io.sockets.sockets[this.id].emit('status-stun',res);
	};

	/**
	 * Request creating Room from client to STUN Server
	 *
	 * @param	client object of clientConstructor {uid, version}
	 * @param	room object of roomConstructor {name, desc}
	 * @sockets	emit message to creator
	 *		signal: 'create-room'
	 *		data: {status,data:roomID}
	 */

	var createRoom = function(clientInfo, roomInfo) {
		var clientSessionID = this.id,
			inputValid = clientValid(clientInfo) && roomValid(roomInfo),
			response = new Object;

		logger.info('STUN:Start createRoom with param @client @roomfrom from session:' + this.id);
		logger.info(clientInfo);
		logger.info(roomInfo);

		if (inputValid) {
			// Client is valid, add to VCB Client List
			clientInfo.sessionID = clientSessionID
			var resAddClient = VCBClients.add(clientInfo),
				client = VCBClients.get(clientSessionID)

			if (client) {
				if (client.onRoom) {
					// client already in room
					response = {
						'status': false,
						'error': "Client already in room"
					}
				}
				else {				
					// Create new room
					roomInfo.creator = {
						'name': clientInfo.name,
						'sessionID': clientSessionID
					}
					var room = VCBRooms.add(roomInfo)
					var resJoinRom = VCBRooms.join(clientSessionID, room.id)

					if (resJoinRom) {
						client.onRoom = room.id

						response = {
							'status': true,
							'roomInfo': room
						}
					}
					else {
						response = {
							'status': false,
							'error': "Cannot join room"
						}
					}
				}
			}
			else {
				response = {
					'status': false,
					'error': "Error when validating clients to STUN Server"
				}
			}
		}
		else {
			response = {
				'status': false,
				'error': "Input is not valid"
			}
			logger.info('STUN:Error ' + this.id + ': Wrong message object [client{uid, version}, room{name,desc}]');
		}

		try {
			io.sockets.sockets[clientSessionID].emit('create-room', response);			
		}
		catch(e) {
			logger.info("Exception on create-room request");
			logger.info(e);
		}

		logger.info('STUN:Finish createRoom from session:' + this.id);
	}

	/**
	 * Request list Room from client to STUN Server
	 * Try connection and add client to VCBSession
	 * 
	 * @param client object of clientConstructor {uid, version}
	 * @socket emit message to requester
	 *		signal: 'list-room'
	 *		data: {status,data:{rooms:array of VCBRoom{id, name, desc, creator, totalConnect}}}
	 */

	var listRoom = function(clientInfo) {
		var clientSessionID = this.id
		  , respnse = new Object()
		  , rooms;

		logger.info('STUN:Start listRoom with param @client from session:' + this.id);

		if (clientValid(clientInfo)) {
			// Add if client not exits in VCB Client List
			clientInfo.sessionID = clientSessionID
			VCBClients.add(clientInfo)
			rooms = VCBRooms.list();

			if (rooms) {
				response = {
					'request': true,
					'status': true,
					'rooms': rooms,
				}
			}
			else {
				response = {
					'request': true,
					'status': false,
					'rooms': null,
				}
			}

		}
		else {
			response = {
				'request': false,
				'status': false,
				'rooms': null
			}
			logger.info('STUN:Error ' + this.id + ': Wrong message object [client{uid, version}]');
			logger.info(clientInfo);
		}

		try {
			io.sockets.sockets[clientSessionID].emit('list-room', response);		
		}
		catch(e) {
			logger.info("Exception on list-room request");
			logger.info(e);
		}

	};

	/** Request join Room from client to STUN Server
	** Global Scheme
	**      -------------                   --------                   ----------------
	**      |Client Join|                   |Server|                   |Client Creator|
	**      -------------                   --------                   ----------------
	**      joinRoom----------------------->ask-offer-------------------------------->o
	**                                                        [createRTCPeerConnection]
	**                                                                    [createOffer]
	**      o<------------------------------get-offer<------------------------get-offer
	**      [createRTCPeerConnection]
	**      [setRemoteDescription]
	**      [createAnswer]
	**      [setLocalDescription]
	**      get-answer--------------------->get-answer------------------------------->o
	**                                                            [setLocalDescription]
	**                                                           [setRemoteDescription]
	**      o<------------------------------get-last-description<--get-last-description
	**      on-ice-candidate--------------->on-ice-candidate------------------------->o
	**                                         :
	**      o<------------------------------on-ice-candidate<----------on-ice-candidate
	**      [streamProcess]<------------------------------------------->[streamProcess]
	**
	** @param roomID string of room.id 
	** @socket emit message to creator
	**		signal: 'ask-offer'
	**		data: {status,data:(opt)message}
	 */

	var joinRoom = function(roomID) {
		var clientSessionID = this.id,
			client = VCBClients.get(clientSessionID),
			res = new Object(),
			roomClients;

		logger.info('STUN:Start joinRoom with param @roomID from session:'+this.id);

		if (client) {

			if (! client.onRoom) {

				var clients = VCBRooms.getClients(roomID);
				var result = VCBRooms.join(clientSessionID, roomID)

				if (result) {
					client.onRoom = roomID;
					roomClients = clients
				}
				else {
					roomClients = null
				}
			}
		}

		try {
			if (roomClients) {
				res = {
					'status': true,
					'data': {
						'from': clientSessionID,
						'client': VCBClients.get(clientSessionID)
					}
				}

				for(var i in roomClients) {
					res.data.to = roomClients[i];
					io.sockets.sockets[roomClients[i]].emit('ask-offer', res);
				}
			}
			else {
				res.status = false;
				res.error = "Room is invalid";
				io.sockets.sockets[clientSessionID].emit('ask-offer', res);
			}
		}
		catch(e) {
			logger.info('Exception in join-room request, client: ', clientSessionID);
			logger.info(e);
		}
		logger.info('STUN:Finish joinRoom with param @roomID from session:'+this.id);
	}

	var initLeaveRoom = function(clientSessionID) {
		var result = {
			'status': false,
			'creator': null,
			'clients': null,
			'message': null
		};
		var client = VCBClients.get(clientSessionID);

		if (client) {

			if (client.onRoom) {
				var roomID = client.onRoom
				  , room = VCBRooms.get(roomID)
				  , clients = VCBRooms.getClients(roomID);

				// remove current client from room
				VCBRooms.leave(clientSessionID, roomID)
				client.onRoom = false;

				result.status = true;
				result.creator = room.creator.sessionID;
				result.clients = clients;

				if (room.creator.sessionID == clientSessionID) {
					// creator leaves room
					// remove all other connected clients from room
					for (var i = 0; i < clients.length; i++) {
						if (clients[i] != clientSessionID) {
							VCBRooms.leave(clients[i], roomID);
							var roomClient = VCBClients.get(clients[i]);
							roomClient.onRoom = false;							
						}
					}

					// remove room
					VCBRooms.remove(roomID);
				}
			}
			else {
				result.message = 'client is not in the room';
			}
		}
		else {
			result.message = 'client doesn\'t exists';
		}

		return result;		
	}

	/** Request leave Room from client to STUN Server
	** Try connection and add client to VCBSession
	** @param client object of clientConstructor {uid, version}
	** @socket emit message to requester
	**		signal: 'leave-room'
	**		data: {status,data:{creator:[true|false],clientSessionID that leaving room}}
	 */
	var leaveRoom = function() {
		logger.info('STUN:Start leaveRoom @roomID from session:' + this.id);

		var clientSessionID = this.id
		  , resLeaveRoom = initLeaveRoom(clientSessionID);

		try {
			var response;

			if (resLeaveRoom.status == true) {
				var client = VCBClients.get(clientSessionID);
				response = {
					'status': true,
					'creator': resLeaveRoom.creator,
					'client': client.sessionID,
					'name': client.name
				};

				for (var i in resLeaveRoom.clients) {
					var leaveClientSessionID = resLeaveRoom.clients[i]
					io.sockets.sockets[leaveClientSessionID].emit('leave-room', response);
				}
			}
			else {
				response = {
					'status': false,
					'error': "Cannot leave room, " + resLeaveRoom.message
				};
				io.sockets.sockets[clientSessionID].emit('leave-room', response);
			}
		}
		catch(e) {
			logger.info('Exception on leave-room request, client: ', clientSessionID);
			logger.info(e);
		}
		logger.info('STUN:Finish leaveRoom @roomID from session:' + this.id);
	}

	/**
	 * Disconnect Event trigered by client when 
	 * socket connection break to server or call close() method.
	 * Technically after heartbeat request timeout
	 */

	var disconnectClient = function() {
		var clientSessionID = this.id
		  , resLeaveRoom = initLeaveRoom(clientSessionID);

		logger.info('STUN:Disconnect client: ' + this.id);

		try {
			var response;

			if (resLeaveRoom.status == true) {
				// Page refresh / closed connection
				// Remove client from DB
				var client = VCBClients.get(clientSessionID)
				VCBClients.remove(clientSessionID);

				response = {
					'creator': resLeaveRoom.creator,
					'client': client.sessionID,
					'name': client.name
				}

				for (var i in resLeaveRoom.clients) {
					var leaveClientSessionID = resLeaveRoom.clients[i]

					if (leaveClientSessionID != clientSessionID) {
						io.sockets.sockets[leaveClientSessionID].emit('leave-room', response);
					}
				}
			}
		}
		catch(e) {
			logger.info('Exception on disconnect-client request, client: ', clientSessionID);
			logger.info(e);
		}
		logger.info('STUN:Finish disconnect process from client: ' + this.id);
	}

	/** Relay SDP Offer
	** @param d object of {data:{to,from,session}}
	** @socket
	**		signal:
	**		data: {status,data:{to,from,session}}
	 */
	var getOffer = function(d) {
		var cekMessage;

		logger.info('STUN: getOffer with @param object {data:{to,from,session}} from client '+this.id); 
		logger.info(d);

		//Verify input message
		if (d) {
			if (d.data) {
				cekMessage = (d.data.to && d.data.session);
			}
		};

		if (cekMessage) {
			clientSessionID = this.id
			var res = {
				'status': true,
				'data': {
					'from': clientSessionID,
					'to': d.data.to,
					'session': d.data.session,
					'client': VCBClients.get(clientSessionID)
				}
			};
			io.sockets.sockets[d.data.to].emit('get-offer',res);
		}
		else {
			logger.info('STUN: Error process getOffer. Input message invalid from client '+this.id);
		}
	}

	/** Relay SDP Answer
	** @param d object of {data:{to,from,session}}
	** @socket
	**		signal:
	**		data: {status,data:{to,from,session}}
	 */
	var getAnswer = function(d) {
		var cekMessage;

		logger.info('STUN: getAnswer with @param object {data:{to,from,session}} from client '+this.id); 
		logger.info(d);

		//Verify input message
		if(d){
			if(d.data){
				cekMessage = (d.data.to && d.data.session);
			}
		};
		if(cekMessage){
			var res = {
				status:true,
				data:{
					from:this.id,
					to:d.data.to,
					session:d.data.session
				}
			};
			io.sockets.sockets[d.data.to].emit('get-answer',res);
		}
		else{
			logger.info('STUN: Error process getAnwer. Input message invalid from client '+this.id);
		};
	};
	/** Last handshake process for RTCPeerCommunication
	** @param d object of {data:{to,from}}
	** @socket
	**		signal:
	**		data: {status,data:{to,from}}
	 */	
	var getLastDescription = function(d){
		var cekMessage;

		logger.info('STUN: getLastDescription with @param object {data:{to,from}} from client '+this.id); 
		logger.info(d);

		//Verify input message
		if(d){
			if(d.data){
				cekMessage = (d.data.to);
			}
		};
		if(cekMessage){
			var res = {
				status:true,
				data:{
					from:this.id,
					to:d.data.to,
				}
			};
			io.sockets.sockets[d.data.to].emit('get-last-description',res);
		}
		else{
			logger.info('STUN: Error process getLastDescription. Input message invalid from client '+this.id);
		};
	};
	/** Relay IceCandidate betwen 2 Client
	** @param d object of {data:{to,from,candidate}}
	** @socket
	**		signal:
	**		data: {status,data:{to,from,candidate}}
	 */
	var onIceCandidate = function(d) {
		var cekMessage;

		logger.info('STUN: onIceCandidate with @param object {data:{to,from,candidate}} from client '+this.id); 
		logger.info(d);

		//Verify input message
		if(d){
			if(d.data){
				cekMessage = (d.data.to && d.data.candidate);
			}
		};
		if(cekMessage){
			var res = {
				status:true,
				data:{
					from:this.id,
					to:d.data.to,
					candidate:d.data.candidate
				}
			};
			io.sockets.sockets[d.data.to].emit('on-ice-candidate',res);
		}
		else {
			logger.info('STUN: Error process onIceCandidate. Input message invalid from client '+this.id);
		}
	};

	var getClientIP = function(clientSessionID, address)
	{
		var response = {
			data: {
				'IP': address.address
			}
		}

		io.sockets.sockets[clientSessionID].emit('init-ip', response);
	}

	/**
	 * Initialization signal relay for presentation slide, contains all presentation
	 * data in base64-encoded image arrays
	 */
	var initPresentation = function(d) {
		var cekMessage = false;

		logger.info('STUN: presentation with @param object {data:{from,file}} from client '+this.id);
		logger.info(d);

		if (d) {
			if (d.data) {
				cekMessage = (d.data.to && d.data.file);
			}
		}

		if (cekMessage) {
			var res = {
				status: true,
				data: {
					from: this.id,
					to: d.data.to,
					file: d.data.file
				}
			}
			io.sockets.sockets[d.data.to].emit('init-presentation', res);
		}
		else {
			logger.info('STUN: Error process presentation. Input message invalid from client '+this.id);
		}
	}

	/**
	 * Control signal relay for presentation slide
	 */
	var controlPresentation = function(d) {
		var cekMessage = false;

		logger.info('STUN: presentation with @param object {data:{from,file}} from client '+this.id); 
		logger.info(d);

		if (d) {
			if (d.data) {
				cekMessage = (d.data.to && d.data.page >= 0);
			}
		}

		if (cekMessage) {
			var res = {
				status: true,
				data: {
					from: this.id,
					to: d.data.to,
					page: d.data.page
				}
			}
			io.sockets.sockets[d.data.to].emit('control-presentation', res);
		}
		else {
			logger.info('STUN: Error process presentation. Input message invalid from client '+this.id);
		}
	}

	/**
	 * Attach event listener to websocket
	 */

	var attachSocket = function(socketio) {
		io = socketio;

		// Logger
		logger = io.log;
		VCBClients.setLogger(logger);
		VCBRooms.setLogger(logger);

		// Event listener
		io.sockets.on('connection', function(socket) {
			var address = socket.handshake.address;

			socket.on('init-ip', function() {
				getClientIP(socket.id, address);
			})

			socket.on('status-stun', statusSTUN);

			socket.on('disconnect', disconnectClient);
			socket.on('list-room', listRoom);
			socket.on('create-room', createRoom);
			socket.on('leave-room', leaveRoom);
			socket.on('join-room', joinRoom);
			socket.on('init-presentation', initPresentation);
			socket.on('control-presentation', controlPresentation);
			socket.on('get-offer', getOffer);
			socket.on('get-answer', getAnswer);
			socket.on('get-last-description', getLastDescription);
			socket.on('on-ice-candidate', onIceCandidate);
		})
	}

	return {
		'attachSocket': attachSocket
	};
}