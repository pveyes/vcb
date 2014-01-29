/**
 * Chat API
 */

var chat = (function(dataChannel) {
	
	/**
	 * Namespace
	 */

	var chat = {};

	console.log('Initializing chat API');

	/**
	 * Receive chat from sender, append to chat list in reverse order
	 *
	 * @param	string		sender name
	 * @param	string		message text
	 */

	chat.receive = function(sender, message) {
		dashboard.renderChat(sender, message);
	};

	/**
	 * Validate chat message and send to all clients
	 *
	 * @param	array		client list
	 * @param	string		chat message
	 */

	chat.send = function(clients, message) {
		// Validate message
		if (message.length > 0) {
			// place message directly on sender chat list
			chat.receive("You", message);

			// send chat message to every clients
			for (var client in clients) {
				if (clients[client]) {
					chat.sendMessage(clients[client].datachannel, message);					
				}
			}
		}
		else {
			// display error to user
		}
	};

	/**
	 * Send chat message using data channel
	 *
	 * @param	datachannel	client identifier
	 * @param	string		chat message
	 */

	chat.sendMessage = function(client, message) {
		// message valid, construct new message data channel
		var data = new dataChannel.msgConstructor(message);
		data.t = 'c';
		data.d = message;

		// send data via dataChannel
		dataChannel.sendMessage(client, data);
	};

	return chat;

})(dataChannel);