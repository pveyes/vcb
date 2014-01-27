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
	 * Send chat data to other client
	 *
	 * @param client 	client datachannel
	 * @param text	 	textarea
	 */

	chat.send = function(client, message) {
		// message valid, construct new message data channel
		var data = new dataChannel.msgConstructor(message);
		data.t = 'c';
		data.d = message;

		// send data via dataChannel
		dataChannel.sendMessage(client, data);
	};

	return chat;

})(jQuery, dataChannel);