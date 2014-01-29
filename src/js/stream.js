/**
 * Stream API
 */

var stream = (function(window) {
	
	/**
	 * Namespace
	 */

	var stream = {};

	console.log('Initializing stream API');

	/**
	 * Local stream
	 */

	stream.local = {};

	/**
	 * Room info
	 */

	stream.roomInfo = {};

	/**
	 * Display stream page, initialize local stream, presentation slide, and data channel
	 * also contain event listener for recording function, chat, and presentation control
	 * signal
	 */
	stream.start = function() {

		var roomInfo = stream.roomInfo;

		dashboard.renderStreamPage(roomInfo);

		var localStreamURL = window.URL.createObjectURL(stream.local);

		if (roomInfo.creator.sessionID == stun.socket.socket.sessionid) {
			// current user is creator, initialize stream as primary stream
			// and mute his/her own stream to remove feedback noise
			dashboard.renderCreatorStream(localStreamURL);

			presentation.init();

			/**
			 * Event listener for presentation slide control signal.
			 *
			 * Two types of presentation slide control signal, previous and next.
			 * Every control signal will be broadcasted directly as current slide
			 * position to minimze computation on all clients
			 */
			$('#main-content').on('click', '.slide-control', function(e) {
				e.preventDefault();
				var controlSignal = $(this).attr('data-control');

				presentation.control(controlSignal, stun.socket, webrtc.peers);
			});
		}
		else {
			// current user is not creator, place his/her stream as viewer mode
			// and mute his/her stream to prevent feedback noise
			dashboard.renderViewerStream(stun.socket.socket.sessionid, localStreamURL, true);
		}

		/**
		 * Event listener on record stream button
		 *
		 * Prevent button default behavior, change button to STOP button, and invoke
		 * recordStream() function to start recording stream. Recording will stopped
		 * when room is destroyed or user decided to stop recording using STOP button
		 */
		$('#main-content').on('click', '#record-stream-button', function(e) {
			e.preventDefault();

			var streamToRecord,
				creatorSessionID = stream.roomInfo.creator.sessionID,
				currentSessionID = stun.socket.socket.sessionid,
				controlSignal = $(this).attr('data-control');

			if (creatorSessionID == currentSessionID) {
				streamToRecord = stream.local;
			}
			else {
				streamToRecord = webrtc.peers[creatorSessionID].remoteStream.stream;
			}

			console.log('Initialize recording using ', streamToRecord);

			recorder.control(controlSignal, streamToRecord);
		});

		/**
		 * Event listener for chatbox submit button
		 *
		 * Prevent default submit button, instead, directly place chat message
		 * from textarea into chat history and broadcast it via WebRTC data
		 * channel to other participant.
		 */
		$('#main-content').on('submit', '#chat', function(e) {
			// Prevent HTTP POST request
			e.preventDefault();

			// read chat message from textarea
			var message = $('#chatbox')[0];

			// send!
			chat.send(webrtc.peers, message.value);

			// reset textarea value
			message.value = null;
		});
	};

	/**
	 * Clear local stream (if any)
	 */

	stream.clear = function() {
		if (stream.local.stop) {
			stream.local.stop();
			stream.local = {};
		}

		stream.roomInfo = {};
	};

	return stream;

})(window);