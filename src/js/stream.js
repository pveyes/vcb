/**
 * Stream API
 */

var stream = (function(window) {
	
	/**
	 * Namespace
	 */

	var stream = {};

	/**
	 * Local stream
	 */

	stream.local = {};

	/**
	 * Room info
	 */

	stream.roomInfo = {};

	/**
	 * Socket sessionID, to check primary / secondary stream
	 */

	var socketSessionID;

	/**
	 * Attach pointer to websocket connection
	 */

	stream.setSocketSessionID = function(sessionID) {
		socketSessionID = sessionID;
	}

	/**
	 * Initialize creator stream
	 */

	stream.initCreator = function(stream) {
		var mainStream = $('#stream')[0];
		mainStream.autoplay = true;
		mainStream.mute = true;
		mainStream.src = stream;
	}

	/**
	 * Initialize stream in viewer mode, used when another user is joined to
	 * room. If current user is joined, his/her video is muted to prevent
	 * feedback noise
	 */

	stream.initViewer = function(clientID, stream, muted) {
		// Create new stream element on video tag
		var viewerStream = document.createElement('video');
		viewerStream.id = clientID;
		viewerStream.className = 'stream--remote';
		viewerStream.autoplay = true;
		viewerStream.src = stream;

		// Check whether existing stream is from current user to prevent
		// feedback noise using mute as default
		if (muted == true) {
			viewerStream.mute = true;
		}

		// Append stream element on peer list
		$('#peer-stream').append(viewerStream); 
	}

	/**
	 * Display stream page, initialize local stream, presentation slide, and data channel
	 * also contain event listener for recording function, chat, and presentation control
	 * signal
	 */
	stream.start = function() {

		var roomInfo = stream.roomInfo;

		// template builder
		var streamTemplate = $('#stream-template').html()
		streamTemplate = streamTemplate.replace('{{room_name}}', roomInfo.name)
		streamTemplate = streamTemplate.replace('{{room_desc}}', roomInfo.desc) 
		streamTemplate = streamTemplate.replace('{{room_speaker}}', roomInfo.creator.name)
		$('#dashboard-content').html(streamTemplate);

		console.log('starting to stream');
		console.log(stream.local);

		var localStreamURL = window.URL.createObjectURL(stream.local);

		if (roomInfo.creator.sessionID == socketSessionID) {
			// current user is creator, initialize stream as primary stream
			// and mute his/her own stream to remove feedback noise
			stream.initCreator(localStreamURL)
			$('#stream').attr('muted','yes');

			presentation.init(socket, webrtc.peers);

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

				presentation.control(controlSignal, socket, webrtc.peers);
			});
		}
		else {
			// current user is not creator, place his/her stream as viewer mode
			// and mute his/her stream to prevent feedback noise
			stream.initViewer(socketSessionID, localStreamURL, true);
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
				currentSessionID = socketSessionID,
				controlSignal = $(this).attr('data-control');

			if (creatorSessionID == currentSessionID) {
				streamToRecord = stream.local;
			}
			else {
				streamToRecord = webrtc.peers[creatorSessionID].remoteStream.stream;
			}

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

	stream.stopLocalStream = function() {
		if (stream.local.stop) {
			stream.local.stop();
			stream.local = {};
		}
	}

	return stream;

})(window)