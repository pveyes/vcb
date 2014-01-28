/**
 * Dashboard API
 *
 * Require: jQuery
 */

var dashboard = (function($) {
	
	/**
	 * Namespace
	 */

	var dashboard = {};

	/**
	 * Periodic device checker job
	 *
	 * @api private;
	 */

	var checkDevice;

	/**
	 * Device checker
	 */

	var checkDeviceStatus = function() {
		// clear current status check
		var resetStatus = function(elem) {
			elem.removeClass('on').removeClass('off').removeClass('unknown').addClass('check');
		}

		resetStatus($('#camera-info'));
		resetStatus($('#audio-in-info'));
		resetStatus($('#stun-info'));

		if (stun.socket && stun.socket.socket.connected == true) {
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
			function gotSources(sources) {
				var audio = 0, video = 0;
				for (var i = 0; i < sources.length; i++) {
					var source = sources[i]
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
			}
			MediaStreamTrack.getSources(gotSources);
		}
	}

	/**
	 * Initialize default dashboard template on HTML DOM. Get devices and connection
	 * information from socket server
	 */
	dashboard.init = function(stunServer) {

		// Clear previous job and start job on first load in .5 seconds
		clearInterval(checkDevice);
		setTimeout(function() {checkDeviceStatus()}, 500);

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

		checkDevice = setInterval(function() {checkDeviceStatus()}, 5000);

		/**
		 * Clear previous event handler
		 */
		$('#main-content').off();

		/**
		 * Register event handler on main dashboard default action.
		 */
		$('#main-content').on('click', '#local-content-button', dashboard.localPlayback);
		$('#main-content').on('click', '#create-room-button', dashboard.createRoom);
		$('#main-content').on('click', '#join-room-button', dashboard.joinRoom);
		$('#main-content').on('click', '#select-device-button', dashboard.selectDevice);
		$('#main-content').on('click', '#leave-room-button', dashboard.leaveRoom);
		$('#main-content').on('click', '#logout', dashboard.logout);
		$('#main-content').one('click', '.change-stun-button', stun.reset);
		$('#main-content').on('mouseover', '.main-menu', function() {
			var hoverClass = 'hover-' + $(this).attr('data-hover');
			$('#main-menus').attr('class', hoverClass);
		})
	}

	/**
	 * Set Client IP, data received via websocket on handshake.address
	 */

	dashboard.initIP = function(d) {
		$('#client-ip').html(d.data.IP);
	}

	/**
	 * Display LOCAL_CONTENT form in popup overlaying the initial dashboard page
	 */

	dashboard.localPlayback = function(e) {
		e.preventDefault();

		// Replace popup DOM with CREATE_ROOM form
		var popupForm = $('#local-content-template').html()
		$('#popup').html(popupForm);

		var localMediaPlayback = $('#local-playback-template').html()
		$('#dashboard-content').html(localMediaPlayback);

		$('#main-content').on('change', '#local-content-input', function(e) {
			var file = this.files[0];
			var type = file.type;
			var videoNode = document.getElementById('local-playback');
			var canPlayFile = videoNode.canPlayType(type);

			canPlayFile = (canPlayFile === '' ? 'no' : canPlayFile);

			if (canPlayFile === 'no') {
				// cannot play media
				console.log('unable to play media');
			}
			else {
				var fileURL = window.URL.createObjectURL(file);
				videoNode.src = fileURL;
				videoNode.setAttribute('data-playable', 'playable');
			}
		});

		$('#main-content').on('submit', '#local-content-form', function(e) {
			e.preventDefault();
			$('#local-playback-wrapper').show();
			
			// Remove LOCAL_CONTENT form popup and destroy the DOM
			// for performance purpose
			$('#popup > .popup').removeClass('fadeIn').addClass('fadeOut').delay(1500).hide(function() {
				$(this).remove();
				$('#local-playback')[0].play();
			});
		});

		$('#main-content').on('click', '.local-playback-close', function(e) {
			e.preventDefault();

			var defaultDashboardTemplate = $('#dashboard-home-template').html();
			$('#dashboard-content').html(defaultDashboardTemplate);

			// remove form popup in pretty way using CSS animation
			// and then remove popup DOM
			$('#popup form').removeClass('fadeInDown').addClass('fadeOutUp');
			$('#popup > .popup').removeClass('fadeIn').addClass('fadeOut').delay(1500).hide(function() {
				$(this).remove()
			});		
		});
	}

	/**
	 * Display CREATE_ROOM form in popup overlaying the initial dashboard page, and
	 * add event listener on the element in the popup
	 */
	dashboard.createRoom = function(e) {
		// prevent default click on link behavior from initial request
		e.preventDefault();

		// Replace popup DOM with CREATE_ROOM form
		var popupForm = $('#create-room-template').html()
		$('#popup').html(popupForm)

		// EVENT LISTENER ------------------------------------------------//

		/**
		 * Event listener on form submit in CREATE_ROOM
		 *
		 * Prevent form to submit and cause HTTP POST request, instead get
		 * input value directly via DOM and construct them into roomInfo
		 * object, and then sent it via websocket to STUN server
		 */
		$('#main-content').on('submit', '#create-room', function(e) {
			// Prevent submit form, input will be handled via javascript
			// not HTTP request
			e.preventDefault()

			// Construct room object from input values
			var roomInfo = {
				name: $('#room-name-input').val(),
				desc: $('#room-desc-input').val(),
				creator: client.name
			}

			stun.socket.emit('create-room', client, roomInfo);

			// Remove CREATE_ROOM form popup and destroy the DOM
			// for performance purpose
			$('#popup > .popup').removeClass('fadeIn').addClass('fadeOut').delay(1500).hide(function() {
				$(this).remove()
			})
		})

		/**
		 * Event listener on form presentation input in CREATE_ROOM
		 *
		 * Encode all image input into base64 and store them in sorted array,
		 * get number of image selected and store those numbers in presentation object
		 */
		$('#main-content').on('change', '#room-presentation-input', function(e) {
			// reset presentation object
			presentation.reset();

			// read all files and store to presentation data
			var files = e.target.files;
			for (var i = 0; i < files.length; i++) {
				var reader = new FileReader();
				var file = files[i];

				reader.onload = function(e) {
					presentation.addSlide(e.target.result);
				}

				reader.readAsDataURL(file);
			}
		})

		/**
		 * Event listener on cancel button in CREATE_ROOM
		 *
		 * Prevent button for another action except removing CREATE_ROOM popup
		 * and return dashboard into its initial state
		 */
		$('#main-content').on('click', '#create-room-cancel', function(e) {
			// prevent default button behavior
			e.preventDefault()

			// remove form popup in pretty way using CSS animation
			// and then remove popup DOM
			$('#popup form').removeClass('fadeInDown').addClass('fadeOutUp');
			$('#popup > .popup').removeClass('fadeIn').addClass('fadeOut').delay(1500).hide(function() {
				$(this).remove()
			});
		});
	};

	/**
	 * Initialize stream from getUserMedia.
	 *
	 * Receiving data from websocket contains result from CREATE_ROOM form
	 * If true, getUserMedia is invoked using constraint to make sure user
	 * has audio and video on their system to proceed to stream
	 */

	dashboard.initStream = function(d) {
		// check whether CREATE_ROOM request is valid
		if (d.status == true) {

			// request getUserMedia
			var constraints = {
				audio: true,
				video: true
			}

			var successCallback = function(mediastream) {
				stream.local = mediastream;
				stream.roomInfo = d.roomInfo;
				console.log("Starting stream");
				stream.start();
			}

			var errorCallback = function(error) {
				console.log('initStream error on getUserMedia: ', error);
			}

			navigator.getUserMedia(constraints, successCallback, errorCallback);
		}
		else {
			console.log("Unable to start stream");
			stream.clear();

			// request is not valid or there's an error
			// display the error to user
			$('#message').addClass('error').html("ERROR: " + d.error).fadeIn(750, function() {
				$(this).delay(1000).fadeOut(750)
			});
		}
	}

	/**
	 * Display LOCAL_CONTENT form in popup overlaying the initial dashboard page
	 */

	dashboard.selectDevice = function(e) {
		e.preventDefault();

		// Replace popup DOM with SELECT_DEVICE template
		var selectDeviceTemplate = $('#select-device-template').html();
		$('#dashboard-content').html(selectDeviceTemplate);
	}

	/**
	 * Request list rooms to join
	 */

	dashboard.joinRoom = function(e) {
		e.preventDefault()
		stun.socket.emit('list-room', client);
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
			// Get partial template of room list
			var room = $('#list-room-template').html(),
				roomInfo = rooms[i]
			
			// set value based on data received
			room = room.replace('{{room_id}}', roomInfo.id)
			room = room.replace('{{room_name}}', roomInfo.name)
			room = room.replace('{{room_desc}}', roomInfo.desc)
			room = room.replace('{{room_total_connect}}', roomInfo.totalConnect)
			room = room.replace('{{speaker}}', roomInfo.creator.name)

			// Display on DOM
			$('#room-list').append(room)
		}

		/**
		 * Event listener on room selection
		 *
		 * Clear stream before requesting getUserMedia, initialize new stream
		 * as viewer mode
		 */
		$('#main-content').on('click', '.room', function(e) {
			// Prevent default click action
			e.preventDefault()

			// Clear previous media stream
			stream.clear();

			var roomID = this.id;

			var roomInfo;

			for (var i = 0; i< rooms.length; i++) {
				if (rooms[i].id == roomID) {
					roomInfo = rooms[i];
					break;
				}
			}

			if (! roomInfo) {
				return false;
			}

			stream.roomInfo = roomInfo;

			var successCallback = function(mediastream) {
				stream.local = mediastream;
				stream.start();
				stun.socket.emit('join-room', roomID);
			}

			var errorCallback = function(error) {
				console.log('Error getUserMedia:', error);
			}

			var constraints = {
				audio: true,
				video: true
			}

			navigator.getUserMedia(constraints, successCallback, errorCallback);        
		});

		$('#main-content').on('click', '#join-room-cancel', function(e) {
			var defaultDashboardTemplate = $('#dashboard-home-template').html();
			$('#dashboard-content').html(defaultDashboardTemplate);
		});
	}

	/**
	 * Request current STUN status via websocket
	 */

	dashboard.statusSTUN = function(e) {
		e.preventDefault();
		stun.socket.emit('status-stun');
	}

	/**
	 * Show current STUN status
	 *
	 * Display STUN object contain client sessions, room lists to console.
	 * Data received from websocket
	 */

	dashboard.showStatusSTUN = function(d) {
		console.log(d);
	}

	/**
	 * Logging out, remove all data from localstorage, replace DOM
	 * with login page
	 */

	dashboard.logout = function(e) {
		// prevent default click behavior
		e.preventDefault();

		// remove user & stun data from localstorage
		chrome.storage.local.remove(['user', 'stun']);

		// add event listener
		dashboard.auth();
	}

	/**
	 * Display auth page and add event listener
	 */

	dashboard.auth = function() {
		// replace DOM with login page
		var loginPage = $('#login-template').html();
		$('#main-content').html(loginPage);

		// Reset all event listener
		$('#main-content').off();

		// Change 'login' method from HTTP POST to localStorage
		$('#main-content').on('submit', '#login', function(e) {
			// Prevent HTTP POST request
			e.preventDefault();

			// delay...
			$('#login-button').attr('disabled', 'disabled').val('LOGGING IN..');

			// get user name and validate
			var user = $('#user').val();
			if (typeof user !== 'undefined' && user.length > 0) {
				// assume user valid, save user name preferences in localstorage
				var data = {'user':user};
				chrome.storage.local.set(data);
				init(data);
			}
			else {
				// show error
				$('#login-button').removeAttr('disabled').val('LOG IN');
			}
		});
	}

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
			$('#dashboard-content').html($('#dashboard-home-template').html())
		}
		else {
			// Other user leave room
			// Update DOM to remove user video
			$('#' + d.client).remove()
			webrtc.removePeers(d.client);

			// Prepare leave message and add to chat list
			var leaveMessage = $('#leave-room-message-template').html().replace('{{name}}', d.name)
			$('#chat-list').prepend(leaveMessage)		
		}
	}

	/**
	 * Send leave room request to STUN server via websocket, clear current stream
	 */

	dashboard.leaveRoom = function() {
		stun.socket.emit('leave-room');
		stream.clear();
	};

	return dashboard;

})(jQuery);