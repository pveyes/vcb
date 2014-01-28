/**
 * Chat API
 *
 * Require: jQuery
 */

var chat = (function($, dataChannel) {
	
	/**
	 * Namespace
	 */

	var chat = {};

	/**
	 * Receive chat from sender, append to chat list in reverse order
	 *
	 * @param sender	sender name
	 * @param message	message text
	 */

	chat.receive = function(sender, message) {
		// Parse data into HTML
		var chatTemplate = $('#chat-template').html();
		chatTemplate = chatTemplate.replace('{{name}}', sender);
		chatTemplate = chatTemplate.replace('{{message}}', message);

		// Prepend data into DOM
		$('#chat-list').prepend(chatTemplate);
	};

	/**
	 * Validate chat message and send to all clients
	 *
	 * @param clients 	client list
	 * @param message	chat message
	 */

	chat.send = function(clients, message) {
		// Validate message
		if (message.length > 0) {
			// place message directly on sender chat list
			chat.receive("You", message);

			// send chat message to every clients
			for (var client in clients) {
				chat.sendMessage(clients[client].datachannel, message);
			}
		}
		else {
			// display error to user
		}
	}

	/**
	 * Send chat message using data channel
	 *
	 * @param client	client identifier
	 * @param message	chat message
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

})(jQuery, dataChannel);