/**
 * Dashboard API (DOM rendering)
 */

var dashboard = (function($) {
	
	/**
	 * Namespace
	 */

	var dashboard = {};

	console.log('Initializing dashboard API');

	/**
	 * Periodic device checker job
	 *
	 * @api private;
	 */

	var checkDevice;

	/**
	 * Get all media inputs
	 */

	/**
	 * Device checker
	 */

	var checkDeviceStatus = function() {

		// clear current status check
		var resetStatus = function(elem) {
			$(elem).removeClass('on').removeClass('off').removeClass('unknown').addClass('check');
		};

		var gotSources = function(sources) {
			var audio = 0,
				video = 0;

			for (var i = 0; i < sources.length; i++) {
				var source = sources[i];
				if (source.kind === 'video') {
					video++;
				}
				else if (source.kind == 'audio') {
					audio++;
				}
			}

			if (audio > 0) {
				$('#audio-in-info').addClass('on');
			}
			else {
				$('#audio-in-info').addClass('off');
			}

			if (video > 0) {
				$('#camera-info').addClass('on');
			}
			else {
				$('#camera-info').addClass('off');
			}
		};

		resetStatus('#camera-info');
		resetStatus('#audio-in-info');
		resetStatus('#stun-info');

		if (stun.socket && stun.socket.socket.connected === true) {
			$('#stun-info').addClass('on');
		}
		else {
			$('#stun-info').addClass('off');
		}

		if (typeof MediaStreamTrack === 'undefined') {
			// undetected
			$('#camera-info').addClass('unknown');
			$('#audio-in-info').addClass('unknown');
		}
		else {
			MediaStreamTrack.getSources(gotSources);
		}

	};

	/**
	 * Initialize default dashboard template on HTML DOM. Get devices and connection
	 * information from socket server
	 */
	dashboard.init = function(stunServer) {

		console.log('Initializing dashboard home');

		// Clear previous job and start job on first load in .5 seconds then in 5s
		clearInterval(checkDevice);
		setTimeout(function() {checkDeviceStatus();}, 500);
		checkDevice = setInterval(function() {checkDeviceStatus();}, 5000);

		// get required template
		var template = $('#dashboard-template').html();

		// get device status
		template = template.replace('{{user}}', client.name);
		template = template.replace('{{display-status}}', 'on');
		template = template.replace('{{camera-status}}', 'check');
		template = template.replace('{{audio-in-status}}', 'check');
		template = template.replace('{{audio-out-status}}', 'on');

		// get network info
		template = template.replace('{{stun-server}}', stunServer);
		template = template.replace('{{client-ip}}', 'Checking...');

		$('#main-content').addClass('fadeIn').html(template);

		// replace content with template
		var contentDefault = $('#' + $('#dashboard-content').attr('data-default')).html();
		$('#dashboard-content').html(contentDefault);

		eventListener.register('dashboard-home-event');
	};

	/**
	 * Set Client IP, data received via websocket on handshake.address
	 */

	dashboard.initIP = function(d) {
		$('#client-ip').html(d.data.IP);
	};

	/**
	 * Render STUN selection page
	 */

	dashboard.renderSelectSTUN = function() {
		var stunSelectPage = $('#setup-template').html().replace('{{user}}', client.name);
		$('#main-content').html(stunSelectPage);

		// Get stun default selection template
		var defaultTemplate = $('#stun-select').attr('data-default');
		stunSelection = $('#' + defaultTemplate).html();

		// Replace stun selection placeholder with default template
		$('#stun-select').html(stunSelection);

		// EVENT LISTENER
		eventListener.register('stun-form-submit');
		eventListener.register('stun-form-cancel');
		eventListener.register('stun-select-click');
	};

	/**
	 * Display LOCAL_CONTENT form in popup overlaying the initial dashboard page
	 */

	dashboard.localPlayback = function(e) {
		e.preventDefault();

		// Replace popup DOM with CREATE_ROOM form
		var popupForm = $('#local-content-template').html();
		$('#popup').html(popupForm);

		var localMediaPlayback = $('#local-playback-template').html();
		$('#dashboard-content').html(localMediaPlayback);

		eventListener.register('local-playback-select');
		eventListener.register('local-playback-submit');
		eventListener.register('local-playback-cancel');
	};

	/**
	 * Display CREATE_ROOM form in popup overlaying the initial dashboard page, and
	 * add event listener on the element in the popup
	 */
	dashboard.createRoom = function(e) {
		// prevent default click on link behavior from initial request
		e.preventDefault();

		// Replace popup DOM with CREATE_ROOM form
		var popupForm = $('#create-room-template').html();
		$('#popup').html(popupForm);

		// EVENT LISTENER ------------------------------------------------//
		eventListener.register('create-room-submit');
		eventListener.register('create-room-add-slides');
		eventListener.register('create-room-cancel');
	};

	/**
	 * Initialize stream from getUserMedia.
	 *
	 * Receiving data from websocket contains result from CREATE_ROOM form
	 * If true, getUserMedia is invoked using constraints to make sure user
	 * has audio and video on their system to proceed to stream
	 */

	dashboard.initStream = function (d) {
		// check whether CREATE_ROOM request is valid
		if (d.status === true) {

			var constraints = stream.getConstraints();

			var successCallback = function (mediastream) {
				stream.local = mediastream;
				stream.roomInfo = d.roomInfo;
				console.log("Starting stream");
				stream.start();
			};

			var errorCallback = function (error) {
				console.log('initStream error on getUserMedia: ', error);
			};

			navigator.getUserMedia(constraints, successCallback, errorCallback);
		}
		else {
			console.log("Unable to start stream");
			stream.clear();

			// request is not valid or there's an error
			// display the error to user
			$('#message').addClass('error').html("ERROR: " + d.error).fadeIn(750, function() {
				$(this).delay(1000).fadeOut(750);
			});
		}
	};

	/**
	 * Render stream page
	 */

	dashboard.renderStreamPage = function(info) {
		var streamTemplate = $('#stream-template').html();
		streamTemplate = streamTemplate.replace('{{room_name}}', info.name);
		streamTemplate = streamTemplate.replace('{{room_desc}}', info.desc);
		streamTemplate = streamTemplate.replace('{{room_speaker}}', info.creator.name);
		$('#dashboard-content').html(streamTemplate);
	};

	/**
	 * Render creator stream on stream page
	 */

	dashboard.renderCreatorStream = function(streamURL) {
		var mainStream = $('#stream')[0];
		mainStream.autoplay = true;
		mainStream.mute = true;
		mainStream.src = streamURL;
	};

	/**
	 * Render viewer stream on stream page
	 */

	dashboard.renderViewerStream = function(clientID, streamURL, muted) {
		// Create new stream element on video tag
		var viewerStream = document.createElement('video');
		viewerStream.id = clientID;
		viewerStream.className = 'stream--remote';
		viewerStream.autoplay = true;
		viewerStream.src = streamURL;

		// Check whether existing stream is from current user to prevent
		// feedback noise using mute as default
		if (muted === true) {
			viewerStream.muted = true;
		}

		// Append stream element on peer list
		$('#peer-stream').append(viewerStream); 
	};

	/**
	 * Display LOCAL_CONTENT form in popup overlaying the initial dashboard page
	 */

	dashboard.renderDeviceSelect = function(e) {
		e.preventDefault();

		// Replace popup DOM with SELECT_DEVICE template
		var deviceSelectTemplate = $('#device-select-template').html();
		$('#dashboard-content').html(deviceSelectTemplate);

		// enable back button
		eventListener.register('select-device-cancel');

		var populateForm = function(sources) {
			var camera = 0,
				audio = 0;

			for (var i = 0; i < sources.length; i++) {
				var source = sources[i];
				console.log('source ' + source.kind + ': ', source);
				if (source.kind === 'video') {
					camera++;
					dashboard.renderDeviceCameraItem(camera, source.id);
				}
				else if (source.kind == 'audio') {
					audio++;
					dashboard.renderDeviceAudioItem(audio, source.id);
				}
			}

			eventListener.previewCameraInput();
			eventListener.previewAudioInput();
		}

		// Loop between media sources track
		MediaStreamTrack.getSources(populateForm);
	};

	/**
	 * Append list to device camera selection
	 */

	dashboard.renderDeviceCameraItem = function(id, deviceID) {
		var deviceName = "Input Camera " + id,
			options = document.getElementById('device-select-item').innerHTML;

		options = options.replace('{{item_id}}', deviceID);
		options = options.replace('{{item_val}}', deviceID);
		options = options.replace('{{item_name}}', deviceName);

		if (typeof client.input.video !== 'undefined' && client.input.video == deviceID) {
			options = options.replace('{{item_select}}', 'selected="selected"');
		}
		else {
			options = options.replace('{{item_select}}', '');
		}

		$('#device-select-camera').append(options);
	}

	/**
	 * Append list to device audio selection
	 */

	dashboard.renderDeviceAudioItem = function(id, deviceID) {
		var deviceName = "Input Audio " + id,
			options = document.getElementById('device-select-item').innerHTML;

		options = options.replace('{{item_id}}', deviceID);
		options = options.replace('{{item_val}}', deviceID);
		options = options.replace('{{item_name}}', deviceName);

		if (typeof client.input.audio !== 'undefined' && client.input.audio == deviceID) {
			options = options.replace('{{item_select}}', 'selected="selected"');
		}
		else {
			options = options.replace('{{item_select}}', '');
		}

		$('#device-select-audio').append(options);
	}

	/**
	 * Show list room received from stun server via websocket. Also handle click event
	 * on room selection to initialize join() on room. Invoke getUserMedia on click event
	 */
	dashboard.showListRoom = function(d) {
		// Display room selection template
		var roomListPage = $('#join-room-template').html();
		$('#dashboard-content').html(roomListPage);

		// Loop through data received via websocket and parse it
		// on template builder, then display in room selections
		var rooms = d.rooms;
		for (var i in rooms) {
			if (rooms[i]) {			
				// Get partial template of room list
				var room = $('#list-room-template').html(),
					roomInfo = rooms[i];
				
				// set value based on data received
				room = room.replace('{{room_id}}', roomInfo.id);
				room = room.replace('{{room_name}}', roomInfo.name);
				room = room.replace('{{room_desc}}', roomInfo.desc);
				room = room.replace('{{room_visitor}}', roomInfo.totalConnect);
				room = room.replace('{{room_creator}}', roomInfo.creator.name);

				// Display on DOM
				$('#room-list').append(room);
			}
		}

		eventListener.register('join-room-select', rooms);
		eventListener.register('join-room-cancel');
	};

	/**
	 * Render chat message
	 */

	dashboard.renderChat = function(sender, message) {
		// Parse data into HTML
		var chatTemplate = $('#chat-template').html();
		chatTemplate = chatTemplate.replace('{{name}}', sender);
		chatTemplate = chatTemplate.replace('{{message}}', message);

		// Prepend data into DOM
		$('#chat-list').prepend(chatTemplate);
	}

	/**
	 * Show current STUN status
	 *
	 * Display STUN object contain client sessions, room lists to console.
	 * Data received from websocket
	 */

	dashboard.showStatusSTUN = function(d) {
		console.log(d);
	};

	/**
	 * Logging out, remove all data from localstorage, replace DOM
	 * with login page
	 */

	dashboard.logout = function(e) {
		// prevent default click behavior
		e.preventDefault();

		// remove user & stun data from localstorage
		if (chrome.storage) {
			chrome.storage.local.remove('user');
			chrome.storage.local.remove('stun');
		}
		else {
			localStorage.removeItem('user');
			localStorage.removeItem('stun');
		}

		// Display login page
		dashboard.renderAuthPage();
	};

	/**
	 * Display auth page and add event listener
	 */

	dashboard.renderAuthPage = function() {
		// replace DOM with login page
		var loginPage = $('#login-template').html();
		$('#main-content').html(loginPage);

		eventListener.clear('#main-content');
		eventListener.register('auth-login-form');
	};

	/**
	 * Handle display when room is destroyed. Room can be destroyed because of
	 * 2 reasons, the creator left, or current user left. Reset HTML DOM to
	 * match current state.
	 */

	dashboard.handleLeaveRoom = function(d) {
		if (d.creator == d.client || d.client == stun.socket.socket.sessionid) {
			// current user left, reset all data
			stream.clear();
			webrtc.resetPeers();
			presentation.reset();

			// change DOM
			$('#dashboard-content').html($('#dashboard-home-template').html());
		}
		else {
			// Other user leave room
			// Update DOM to remove user video
			$('#' + d.client).remove();
			webrtc.removePeer(d.client);

			// Prepare leave message and add to chat list
			var leaveMessage = $('#leave-room-message-template').html().replace('{{name}}', d.name);
			$('#chat-list').prepend(leaveMessage);
		}
	};

	return dashboard;

})(jQuery);