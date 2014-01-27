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

	chat.send = function(client, text) {
		// message valid, construct new message data channel
		var message = new dataChannel.msgConstructor(text);
		message.t = 'c';
		message.d = text;

		// send data via dataChannel
		dataChannel.sendMessage(client, message);
	};

	return chat;

})(jQuery, dataChannel);