/**
 * STUN connection API
 *
 * Require: Socket.IO
 */

var stun = (function(io) {
	
	/**
	 * Namespace
	 */

	var stun = {};

	console.log('Initializing STUN API');

	/**
	 * Socket connection
	 */

	stun.socket = undefined;

	/**
	 * Initialize socket connection to server. Register event handler
	 * after 'connect', save server selection to cookies, and change DOM elements,
	 * then emit dashboard data to server as relay
	 */

	stun.connect = function(stunServer) {
		console.log('Connecting STUN Server: ', stunServer);

		// reconnect stun
		stun.socket = io.connect(stunServer);
		stun.socket.socket.connect();

		// wait response from socket server
		dashboard.init(stunServer);

		// Save to localStorage
		if (chrome.storage) {
			chrome.storage.local.set({'stun': stunServer});
		}
		else {
			localstorage.setItem('stun', stunServer);
		}


		stun.socket.on('connect', function() {
			// register socket to listen event
			stun.register();

			// Client connected, request client IP on handshake.address
			stun.socket.emit('init-ip');
		});
	};

	/**
	 * Register websocket to accept some type of connections after 
	 * successfully establish connection between client and server.
	 */

	stun.register = function() {

		/**
		 * Dashboard default relay
		 */

		stun.socket.on('init-ip', dashboard.initIP);
		stun.socket.on('create-room', dashboard.initStream);
		stun.socket.on('list-room', dashboard.showListRoom);
		stun.socket.on('status-stun', dashboard.showStatusSTUN);
		stun.socket.on('leave-room', dashboard.handleLeaveRoom);

		/**
		 * WebRTC default relay
		 */

		stun.socket.on('ask-offer', webrtc.handleAskOffer);
		stun.socket.on('get-offer', webrtc.handleGetOffer);
		stun.socket.on('get-answer', webrtc.handleGetAnswer);
		stun.socket.on('get-last-description', webrtc.handleGetLastDescription);
		stun.socket.on('on-ice-candidate', webrtc.handleOnIceCandidate);

		/**
		 * Control signal relay on presentation slides
		 */

		stun.socket.on('start-presentation', presentation.start);
		stun.socket.on('control-presentation', presentation.applyControl);
	};

	/**
	 * Reset STUN websocket connection
	 */

	stun.reset = function() {
		if (stun.socket) {
			stun.socket.disconnect();
			stun.socket = undefined;

		}

		if (chrome.storage) {
			chrome.storage.local.remove('stun');				
		}
		else {
			localStorage.removeItem('stun');
		}

		dashboard.renderSelectSTUN();
	};

	/**
	 * Request list rooms to join
	 */

	stun.joinRoomRequest = function(e) {
		e.preventDefault();
		stun.socket.emit('list-room', client);
	};

	/**
	 * Send leave room request to STUN server via websocket, clear current stream
	 */

	stun.leaveRoomRequest = function() {
		stun.socket.emit('leave-room');
		stream.clear();
	};

	/**
	 * Request current STUN status via websocket
	 */

	stun.statusRequest = function() {
		stun.socket.emit('status-stun');
	};

	return stun;

})(io);