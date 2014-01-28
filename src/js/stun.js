/**
 * STUN connection API
 */

var stun = (function() {
	
	/**
	 * Namespace
	 */

	var stun = {};

	/**
	 * Socket connection
	 */

	stun.socket = undefined;

	/**
	 * STUN server initialization. Check STUN server selection from localstorage,
	 * if exists check connection via websocket, if not display STUN server selection
	 * page on DOM
	 */
	
	stun.init = function(stunServer) {
		// check whether stun server is already defined in localstorage
		if (typeof stunServer === 'undefined') {
			// No stun server defined
			// Display stun server selection
			var stunSelectPage = $('#setup-template').html().replace('{{user}}', client.name);
			$('#main-content').html(stunSelectPage)

			// Get stun default selection template
			var defaultTemplate = $('#stun-select').attr('data-default');
			stunSelection = $('#' + defaultTemplate).html();

			// Replace stun selection placeholder with default template
			$('#stun-select').html(stunSelection);

			// EVENT LISTENER

			/**
			 * Handle stun setup submission, stun server input received from text input
			 * and then initialized and check for socket timeout within 2s. On timeout,
			 * text input will be resetted and user must resubmit
			 */
			$('#main-content').on('submit', '#stun-setup', function(e) {
				// prevent default post submit action
				e.preventDefault();

				var stunServer = $('#stun-server').val();

				console.log("Input STUN server from form: ", stunServer);
				stun.connect(stunServer);
			});

			/**
			 * Handle stun selection from 3 choices: default, local, and custom
			 * stun server address. Default and local options have default value
			 * stored in data-address attribute, custom selection invoke new form
			 * with text input
			 */
			$('#main-content').on('click', '.stun-option', function(e) {
				e.preventDefault();

				var stunServer = $(this).attr('data-address');

				if (stunServer === 'custom') {
					// custom stun server
					console.log('selecting custom STUN server, displaying form');
					$('#setup').css('height', '380px');
					var customSTUNForm = $('#custom-stun-template').html()
					$('#stun-select').html(customSTUNForm);
				}
				else {
					// STUN server selected from options
					// initialize
					console.log('selecting STUN server from options: ', stunServer);
					stun.connect(stunServer);
				}
			})

			/**
			 * Handle cancel button on custom form input, replace form with default
			 * 3 stun options to choose. DOM is replaced and not hidden
			 */
			$('#main-content').on('click', '#custom-stun-cancel', function(e) {
				// prevent click default behavior
				e.preventDefault();

				// Replace custom stun input with default stun server selections
				$('#setup').css('height', '320px');
				$('#stun-select').html($('#stun-select-template').html());
			});
		}
		else {
			// STUN server already defined
			// Initialize connection via websocket
			console.log('STUN server is already defined: ', stunServer);
			stun.connect(stunServer);
		}	
	}

	/**
	 * Initialize socket connection to server. Register event handler
	 * after 'connect', save server selection to cookies, and change DOM elements,
	 * then emit dashboard data to server as relay
	 */

	stun.connect = function(stunServer) {
		// reset current connection
		if (stun.socket == undefined) {
			stun.socket = io.connect(stunServer);
			stun.socket.socket.connect();
		}
		else {
			stun.socket = io.connect(stunServer);
		}

		// wait response from socket server
		$('#main-content').removeClass('fadeIn').html($('#loading-template').html());
		dashboard.init(stunServer);

		stun.socket.on('connect', function() {
			// save stun server selection on localstorage
			chrome.storage.local.set({'stun': stunServer});

			// register socket to listen event
			stun.register();

			stun.socket.emit('init-ip');
		});
	}

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
	}

	/**
	 * Reset STUN websocket connection
	 */

	stun.reset = function() {
		if (stun.socket) {
			stun.socket.disconnect();
			stun.socket = undefined;
			chrome.storage.local.remove('stun');
		}
		stun.init();
	}

	return stun;

})();