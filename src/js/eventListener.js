/**
 * EventListener Helper API
 *
 * Require: jQuery
 */

var eventListener = (function($) {
	
	/**
	 * Namespace
	 */

	var eventListener = {};

	console.log('Initializing eventListener API');

	/**
	 * Clear event listener on element
	 *
	 * @param	string		element identifier
	 */

	eventListener.clear = function(element) {
		console.log('clearing all event listener on ', element);
		$(element).off();
	};

	/**
	 * Register event
	 *
	 * @param	string		event method in dash format (event-method-name)
	 */

	eventListener.register = function(event, param) {
		console.log('registering ' + event + ' with param ', param);
		var methodName = eventListener.parse(event),
			method = eventListener[methodName];

		if (typeof method === 'function') {
			// callable method
			method(param);
		}
		else {
			// there's no event listener with this method name
			console.log('Invalid event handler ', event);
		}
	};

	/**
	 * Parse event name to method in camelCase format
	 * Ref: http://stackoverflow.com/questions/10425287/convert-string-to-camelcase-with-regular-expression
	 *
	 * @param	string		event method in dash format (event-method-name)
	 * @return	string		event method in camelCase format (eventMethodName)
	 */

	eventListener.parse = function(eventName) {
		return eventName.toLowerCase().replace(/-(.)/g, function(match, group) {
			return group.toUpperCase();
		});
	};

	/**
	 * Register click event on dashboard
	 */

	eventListener.dashboardHomeEvent = function() {

		/**
		 * Clear previous event listener
		 */
		eventListener.clear('#main-content');

		/**
		 * Register event listener on main dashboard default action.
		 */

		$('#main-content').on('click', '#local-content-button', dashboard.localPlayback);
		$('#main-content').on('click', '#create-room-button', dashboard.createRoom);
		$('#main-content').on('click', '#join-room-button', stun.joinRoomRequest);
		$('#main-content').on('click', '#select-device-button', dashboard.renderDeviceSelect);
		$('#main-content').on('click', '#leave-room-button', stun.leaveRoomRequest);
		$('#main-content').on('click', '#logout', dashboard.logout);
		$('#main-content').one('click', '.change-stun-button', stun.reset);
		$('#main-content').on('mouseover', '.main-menu', function() {
			var hoverClass = 'hover-' + $(this).attr('data-hover');
			$('#main-menus').attr('class', hoverClass);
		});		
	};

	/**
	 * Handle stun setup submission, stun server input received from text input
	 * and then initialized and check for socket timeout within 2s. On timeout,
	 * text input will be resetted and user must resubmit
	 */

	eventListener.stunFormSubmit = function() {
		$('#main-content').on('submit', '#stun-setup', function(e) {
			// prevent default post submit action
			e.preventDefault();

			var stunServer = $('#stun-server').val();

			console.log("Input STUN server from form: ", stunServer);
			stun.connect(stunServer);
		});
	};


	/**
	 * Handle cancel button on custom form input, replace form with default
	 * 3 stun options to choose. DOM is replaced and not hidden
	 */

	eventListener.stunFormCancel = function() {
		$('#main-content').on('click', '#custom-stun-cancel', function(e) {
			// prevent click default behavior
			e.preventDefault();

			// Replace custom stun input with default stun server selections
			$('#setup').css('height', '320px');
			$('#stun-select').html($('#stun-select-template').html());
		});		
	};

	/**
	 * Handle stun selection from 3 choices: default, local, and custom
	 * stun server address. Default and local options have default value
	 * stored in data-address attribute, custom selection invoke new form
	 * with text input
	 */

	eventListener.stunSelectClick = function() {
		$('#main-content').on('click', '.stun-option', function(e) {
			e.preventDefault();

			var stunServer = $(this).attr('data-address');

			if (stunServer === 'custom') {
				// custom stun server
				console.log('selecting custom STUN server, displaying form');
				$('#setup').css('height', '380px');
				var customSTUNForm = $('#custom-stun-template').html();
				$('#stun-select').html(customSTUNForm);
			}
			else {
				// STUN server selected from options
				// initialize
				console.log('selecting STUN server from options: ', stunServer);
				stun.connect(stunServer);
			}
		});	
	};

	/**
	 * Handle local playback selection using input file, check if media is supported
	 * to play, if not, display error to user
	 */

	eventListener.localPlaybackSelect = function() {
		$('#main-content').on('change', '#local-content-input', function() {
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
	};

	/**
	 * Play local media in video tag
	 */

	eventListener.localPlaybackSubmit = function() {
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
	};

	/**
	 * Cancel all current action in local playback mode and return to dashboard home
	 */

	eventListener.localPlaybackCancel = function() {
		$('#main-content').on('click', '.local-playback-close', function(e) {
			e.preventDefault();

			var defaultDashboardTemplate = $('#dashboard-home-template').html();
			$('#dashboard-content').html(defaultDashboardTemplate);

			// remove form popup in pretty way using CSS animation
			// and then remove popup DOM
			$('#popup form').removeClass('fadeInDown').addClass('fadeOutUp');
			$('#popup > .popup').removeClass('fadeIn').addClass('fadeOut').delay(1500).hide(function() {
				$(this).remove();
			});	
		});	
	};

	/**
	 * Event listener on form submit in CREATE_ROOM
	 *
	 * Prevent form to submit and cause HTTP POST request, instead get
	 * input value directly via DOM and construct them into roomInfo
	 * object, and then sent it via websocket to STUN server
	 */

	eventListener.createRoomSubmit = function() {
		$('#main-content').on('submit', '#create-room', function(e) {
			// Prevent submit form, input will be handled via javascript
			// not HTTP request
			e.preventDefault();

			// Construct room object from input values
			var roomInfo = {
				name: $('#room-name-input').val(),
				desc: $('#room-desc-input').val(),
				creator: client.name
			};

			stun.socket.emit('create-room', client, roomInfo);

			// Remove CREATE_ROOM form popup and destroy the DOM
			// for performance purpose
			$('#popup > .popup').removeClass('fadeIn').addClass('fadeOut').delay(1500).hide(function() {
				$(this).remove();
			});
		});
	};

	/**
	 * Event listener on form presentation input in CREATE_ROOM
	 *
	 * Encode all image input into base64 and store them in sorted array,
	 * get number of image selected and store those numbers in presentation object
	 */

	eventListener.createRoomAddSlides = function() {
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
				};

				reader.readAsDataURL(file);
			}
		});
	};

	/**
	 * Event listener on cancel button in CREATE_ROOM
	 *
	 * Prevent button for another action except removing CREATE_ROOM popup
	 * and return dashboard into its initial state
	 */

	eventListener.createRoomCancel = function() {
		$('#main-content').on('click', '#create-room-cancel', function(e) {
			// prevent default button behavior
			e.preventDefault();

			// remove form popup in pretty way using CSS animation
			// and then remove popup DOM
			$('#popup form').removeClass('fadeInDown').addClass('fadeOutUp');
			$('#popup > .popup').removeClass('fadeIn').addClass('fadeOut').delay(1500).hide(function() {
				$(this).remove();
			});
		});
	};

	/**
	 * Event listener on room selection
	 *
	 * Clear stream before requesting getUserMedia, initialize new stream
	 * as viewer mode
	 */

	eventListener.joinRoomSelect = function(rooms) {
		$('#main-content').on('click', '.room-join-button', function(e) {
			// Prevent default click action
			e.preventDefault();

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
			};

			var errorCallback = function(error) {
				console.log('Error getUserMedia:', error);
			};

			var constraints = {
				audio: true,
				video: true
			};

			navigator.getUserMedia(constraints, successCallback, errorCallback);
		});
	};

	/**
	 * Return to dashboard from JOIN_ROOM page
	 */

	eventListener.joinRoomCancel = function() {
		$('#main-content').on('click', '#join-room-cancel', function() {
			var defaultDashboardTemplate = $('#dashboard-home-template').html();
			$('#dashboard-content').html(defaultDashboardTemplate);
		});
	};

	/**
	 * Preview camera in device select
	 */

	eventListener.previewCameraInput = function() {

		var tempStream;

		var cameraSelector = document.querySelector("select#device-select-camera");

		document.getElementById('device-select-camera').onchange = function() {

			var selectedCamera = this.value;
			var cameraPreview = document.getElementById('device-camera-preview');

			if (typeof tempStream !== 'undefined') {
				tempStream.stop();
			}

			// Reset video tag
			cameraPreview.pause();
			cameraPreview.src = '';

			var successCallback = function(mediastream) {
				console.log('new mediastream test ', mediastream);
				console.log('new mediastream url ', window.URL.createObjectURL(mediastream));

				tempStream = mediastream;

				cameraPreview.src = window.URL.createObjectURL(mediastream);
				cameraPreview.play();
			};

			var errorCallback = function(e) {
				console.log('Preview camera getUserMedia error ', e);
			};

			var cameraSource  = cameraSelector.value;

			console.log(cameraSource);

			var constraints = {
				audio: {
					optional: [ { sourceId: client.input.audio } ]
				},
				video: {
					optional: [ { sourceId: cameraSource } ]
				}
			}

			console.log(constraints);

			navigator.getUserMedia(constraints, successCallback, errorCallback);			
		};
	};

	/**
	 * Preview camera in device select
	 */

	eventListener.previewAudioInput = function() {
		$('#main-content').on('change', '#device-select-audio', function() {

			// Reset audio animation
			var canvas = document.getElementById('device-audio-preview'),
				canvasContext = canvas.getContext('2d'),
				deviceID = $(this).val();

			canvasContext.clearRect(0, 0, 0, 0);

			var tempConstraints = {
				audio: {
					optional: [{ sourceId: deviceID }]
				}
			};

			console.log('Testing audio using device ', tempConstraints.audio.optional[0].sourceId);

			var successCallback = function(mediastream) {
			};

			var errorCallback = function(e) {
				console.log('Preview audio getUserMedia error ', e);
			};

			navigator.getUserMedia(tempConstraints, successCallback, errorCallback);			
		})
	};

	/**
	 * Return to dashboard from SELECT_DEVICE page
	 */

	eventListener.selectDeviceCancel = function() {
		$('#main-content').on('click', '#device-select-cancel', function() {
			var defaultDashboardTemplate = $('#dashboard-home-template').html();
			$('#dashboard-content').html(defaultDashboardTemplate);
		});		
	};

	/**
	 * Change 'login' method from HTTP POST to localStorage
	 */

	eventListener.authLoginForm = function() {
		$('#main-content').on('submit', '#login', function(e) {
			// Prevent HTTP POST request
			e.preventDefault();

			// delay...
			$('#login-button').attr('disabled', 'disabled').val('LOGGING IN..');

			// get user name and validate
			var user = $('#user').val();
			if (typeof user !== 'undefined' && user.length > 0) {
				// assume user valid, save user name preferences in memory 
				client.name = user;

				// also set in localstorage
				if (chrome.storage) {
					chrome.storage.local.set({'user': user});
				}
				else {
					localStorage.setItem('user', user);
				}

				// next step, show STUN server selection
				dashboard.renderSelectSTUN();
			}
			else {
				// show error
				$('#login-button').removeAttr('disabled').val('LOG IN');
			}
		});
	};

	return eventListener;

})(jQuery);