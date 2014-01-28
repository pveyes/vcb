/**
 * Web API 
 */
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;

function guid() {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	};
	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function rand(){
	return Math.ceil(Math.random()*1000000);
}

/**
 * Global variable to store device information
 */
var VCB = {
	uid: guid(),
	version: '3.1',
	status: null,
	roomid: null,
	localStream: null,
	creatorStream: null,
	recorder: null,
	client: null,
}

var checkDevice;

/**
 * main()
 */

chrome.storage.local.get(function(item) {
	console.log('Receiving value from local storage...');

	// Check if data on localstorage exists
	if (item && item.user) {
		// initialize client and stun server
		init(item);
	}
	else {
		// show authenticated page
		auth();
	}
})

/**
 * Initialize all data received via localstorage
 */
var init = function(data) {
	console.log('Local storage data received, checking client data and STUN server');
	initClient(data.user);
	initSTUN(data.stun);
}

var auth = function() {
	console.log('Local storage data is not received, displaying auth page');

	// Client is not defined
	// Display login page to guest
	var loginPage = $('#login-template').html();
	$('#main-content').html(loginPage);

	initAuthListener();
}

var initAuthListener = function() {
	// Reset event listener
	$('#main-content').off();

	/**
	 * Login page event listener
	 *
	 * Prevent default submit action, save user name from input field
	 * to local storage and proceed to STUN server selection
	 */
	$('#main-content').on('submit', '#login', function(e) {
		// Prevent HTTP POST request
		e.preventDefault();

		// False loading...
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
 * Client initialization. Save client data from localstorage
 * to client object in memory for faster read
 */
var initClient = function(name) {
	// Set client object
	VCB.client = {
		name: name,
		uid: VCB.uid,
		version: VCB.version
	}
}

/**
 * Global variable to store websocket connection to STUN server
 */
var socket;

/**
 * STUN server initialization. Check STUN server selection from localstorage,
 * if exists check connection via websocket, if not display STUN server selection
 * page on DOM
 */
var initSTUN = function(stun) {
	// check whether stun server is already defined in localstorage
	if (typeof stun === 'undefined') {
		// No stun server defined
		// Display stun server selection
		var stunSelectPage = $('#setup-template').html().replace('{{user}}', VCB.client.name);
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
			initSocketConnection(stunServer);
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
				initSocketConnection(stunServer);
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
		console.log('STUN server is already defined: ', stun);
		initSocketConnection(stun);
	}	
}

var resetSTUN = function() {
	if (socket) {
		socket.disconnect();
		socket = undefined;
		chrome.storage.local.remove('stun');
	}
	initSTUN();
}

/**
 * Initialize socket connection to server. Register event handler
 * after 'connect', save server selection to cookies, and change DOM elements,
 * then emit dashboard data to server as relay
 */
function initSocketConnection(stunServer) {
	// reset current connection
	if (socket == undefined) {
		socket = io.connect(stunServer);
		socket.socket.connect();
	}
	else {
		socket = io.connect(stunServer);
	}

	// wait response from socket server
	$('#main-content').removeClass('fadeIn').html($('#loading-template').html());
	initDashboard(stunServer);

	socket.on('connect', function() {
		// save stun server selection on localstorage
		chrome.storage.local.set({'stun':stunServer});

		// register socket to listen event
		registerSocket();

		socket.emit('init-ip');
	});
}

/**
 * Register websocket to accept some type of connections after 
 * successfully establish connection between client and server.
 */
var registerSocket = function() {
	socket.on('init-ip', initIP);
	socket.on('create-room', initStream);
	socket.on('list-room', showListRoom);
	socket.on('status-stun', showStatusSTUN);
}

/**
 * Initialize default dashboard template on HTML DOM. Get devices and connection
 * information from socket server
 */
var initDashboard = function(stunServer)
{
	clearInterval(checkDevice);

	// get required template
	var template = $('#dashboard-template').html();

	// get device status
	template = template.replace('{{user}}', VCB.client.name);
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
	$('#main-content').on('click', '#local-content-button', localPlayback);
	$('#main-content').on('click', '#create-room-button', createRoom);
	$('#main-content').on('click', '#join-room-button', joinRoom);
	$('#main-content').on('click', '#select-device-button', selectDevice);
	$('#main-content').on('click', '#leave-room-button', leaveRoom);
	$('#main-content').on('click', '#logout', logout);
	$('#main-content').one('click', '.change-stun-button', function() {
		$(this).off('click');
		resetSTUN();
	});
	$('#main-content').on('mouseover', '.main-menu', function() {
		var hoverClass = 'hover-' + $(this).attr('data-hover');
		$('#main-menus').attr('class', hoverClass);
	})
}

/**
 * Initialize default dashboard template on HTML DOM. Get devices and connection
 * information from socket server
 */
var initIP = function(d)
{
	$('#client-ip').html(d.data.IP);
}

/**
 * Get dashboard data status such as stun server selection, camera
 * status, and microphone status
 */
var checkDeviceStatus = function() {
	// clear current status check
	var resetStatus = function(elem) {
		elem.removeClass('on').removeClass('off').removeClass('unknown').addClass('check');
	}

	resetStatus($('#camera-info'));
	resetStatus($('#audio-in-info'));
	resetStatus($('#stun-info'));

	if (socket && socket.socket.connected == true) {
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
 * Logging out, remove all data from localstorage, replace DOM
 * with login page
 */

var logout = function(e) {
	// prevent default click behavior
	e.preventDefault();

	// remove user & stun data from localstorage
	chrome.storage.local.remove(['user', 'stun']);

	// replace DOM with login page
	var loginPage = $('#login-template').html();
	$('#main-content').html(loginPage);

	initAuthListener();
}


var VCBnet = new Object();
var Vpeer;

/**
 * Display LOCAL_CONTENT form in popup overlaying the initial dashboard page
 */

var localPlayback = function(e) {
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
 * Display LOCAL_CONTENT form in popup overlaying the initial dashboard page
 */

var selectDevice = function(e) {
	e.preventDefault();

	// Replace popup DOM with CREATE_ROOM form
	var popupForm = $('#select-device-template').html()
	$('#popup').html(popupForm)
}


/**
 * Display CREATE_ROOM form in popup overlaying the initial dashboard page, and
 * add event listener on the element in the popup
 */
var createRoom = function(e) {
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
			creator: VCB.client.name
		}

		// request getUserMedia
		var constraints = {
			audio: true,
			video: true
		}

		var successCallback = function(stream) {
			VCB.localStream = stream;
			socket.emit('create-room', VCB.client, roomInfo);
		}

		var errorCallback = function(error) {
			console.log('initStream error on getUserMedia: ', error);
		}

		navigator.getUserMedia(constraints, successCallback, errorCallback);

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
 * Show list room received from stun server via websocket. Also handle click event
 * on room selection to initialize join() on room. Invoke getUserMedia on click event
 */
var showListRoom = function(d) {
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
		if (VCB.localStream) {
			VCB.localStream.stop();			
		}

		var roomID = this.id;
		VCB.roomid = d.data;

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

		VCB.roomInfo = roomInfo;

		var successCallback = function(stream) {
			VCB.localStream = stream;
			startStream(roomInfo);
			socket.emit('join-room', roomID);
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

var joinRoom = function(e) {
	e.preventDefault()
	socket.emit('list-room', VCB.client);
}

var statusSTUN = function() {
	socket.emit('status-stun');
}

/**
 * Initialize stream in main mode, used to display primary stream from creator
 */
var initMainStream = function(localStreamURL) {
	var mainStream = $('#stream')[0];
	mainStream.autoplay = true;
	mainStream.mute = true;
	mainStream.src = localStreamURL;
}

/**
 * Initialize stream in viewer mode, used when another user is joined to
 * room. If current user is join, his/her video is muted to prevent
 * feedback noise
 */
var initNewStream = function(remoteSessionID, newStreamURL, muted) {
	// Create new stream element on video tag
	var streamRemote = document.createElement('video');

	// Set stream element parameters
	streamRemote.id = remoteSessionID;
	streamRemote.className = 'stream--remote';
	streamRemote.autoplay = true;
	streamRemote.src = newStreamURL;

	// Check whether existing stream is from current user to prevent
	// feedback noise using mute as default
	if (muted == true) {
		streamRemote.mute = true;
	}

	// Append stream element on peer list
	$('#peer-stream').append(streamRemote); 
}

/**
 * Start stream using WebRTC
 *
 * Display stream page, initialize local stream, presentation slide, and data channel
 * also contain event listener for recording function, chat, and presentation control
 * signal
 */
var startStream = function(roomInfo) {

	// add alert before reload
	// window.onbeforeunload = function(e) {
	// 	e = e || window.event;

	// 	if (e) {
	// 		e.returnValue = "You're leaving this room if you reload page";
	// 	}

	// 	return "You're leaving this room if you reload page";
	// }

	// template builder
	var streamT = $('#stream-template').html()
	streamT = streamT.replace('{{room_name}}', roomInfo.name)
	streamT = streamT.replace('{{room_desc}}', roomInfo.desc) 
	streamT = streamT.replace('{{room_speaker}}', roomInfo.creator.name)
	$('#dashboard-content').html(streamT)

	var localStreamURL = window.URL.createObjectURL(VCB.localStream)

	VCB.roomInfo = roomInfo;

	if (roomInfo.creator.sessionID == socket.socket.sessionid) {
		// current user is creator, initialize stream as primary stream
		// and mute his/her own stream to remove feedback noise
		initMainStream(localStreamURL)
		$('#stream').attr('muted','yes');

		presentation.init(socket, VCBpeer);

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

			presentation.control(controlSignal, socket, VCBpeer);
		});
	}
	else {
		// current user is not creator, place his/her stream as viewer mode
		// and mute his/her stream to prevent feedback noise
		initNewStream(socket.sessionID, localStreamURL, true);
	}

	/** Constructor for VCBpeer.${clientID} Object
	** @return {session:{local,remote},peer,datachannel}
	 */
	var VCBpeerConstructor = function(){
		return{
			session: {
				local:null,
				remote:null
			},
			peer: null,
			datachannel: null       
		}
	};

	/** Constructor for VCBpeer.${clientID} Object
	** @param @data object of {t,l,p,s,d}
	** @return DataChannel message object of {t,l,p,s,d}
	**      @t type message [c,p]
	**          @c chat type
	**          @p file presentation type
	**          @e other event type
	**      @l number split message for message length > buffer length of DataChannel
	**      @p part of number. Value various from 1 to @l
	**      @s status of message. 
	**          0:error message; 
	**          1:start part messages; 
	**          2:part of messages; 
	**          3:last part messages;
	**          4:single message
	**      @d data of message
	 */

	var msgDataChannelConstructor = function(data) {
		var tmp = data || new Object;
		return {
			t: tmp.t||null,
			l: tmp.l||null,
			p: tmp.p||null,
			s: tmp.s||null,
			d: tmp.d||null
		};
	};

	/** VCBpeer Object contain SDP and RTCPeerConnection object connectiong to other clients
	** @structure {@clientID:{session:{local,remote},peer,datachannel}}
	** @param @clientID client.session (on STUN server) of remote client connected. Its index of this Object
	** @param @local SDP that set to RTCPeerConnection.setLocalDescription()
	** @param @remote SDP that set to RTCPeerConnection.setRemoteDescription()
	** @param @peer RTCPeerConnection object created to connect with client @clientID
	** @param @datachannel RTCDataChannel object created by RTCPeerConnection.createDataChannel() method
	 */
	var VCBpeer = new Object();
	Vpeer = VCBpeer;

	// Process RTCPeerConnection
	var handleAskOffer = function(d) {
		// Send notification to clients
		// New client join, add notification on chat list
		var joinMessage = $('#join-room-message-template').html().replace('{{name}}', d.data.client.name)
		$('#chat-list').prepend(joinMessage)

		// Create RTCPeerConnection
		VCBpeer[d.data.from] = new VCBpeerConstructor();
		VCBpeer[d.data.from].peer = new webkitRTCPeerConnection(null,{optional: [{RtpDataChannels: true}]});
		var peer = VCBpeer[d.data.from].peer;

		// Create RTCDataChannel and 
		// handle datachannel event on RTCDataChannel
		VCBpeer[d.data.from].datachannel = peer.createDataChannel(d.data.from,{reliable: true});
		var channel = VCBpeer[d.data.from].datachannel;
		channel.onclose = function(e) {
			console.log("DataChannelObject onclose from: " + d.data.from);
			console.log(e);
		};
		channel.onerror = function(e) {
			console.log("DataChannelObject onerror from: " + d.data.from);
			console.log(e);
		};
		channel.onmessage = function(e) {
			console.log("DataChannelObject onmessage from: " + d.data.from);
			console.log(e);
			dataChannel.receiveMessage(d,e);
		};
		channel.onopen = function(e) {
			console.log("DataChannelObject onopen from: " + d.data.from);
			console.log(e);
			presentation.broadcast(socket, d.data.from);
		};

		// Handle handshake event on RTCPeerConnection
		peer.addStream(VCB.localStream);
		peer.onicecandidate = function(e){
			console.log('Info: onicecandidate send from this PC to '+d.data.from); console.log(e);
			var tmpCandidate = {
				candidate:e.candidate.candidate, 
				sdpMLineIndex:e.candidate.sdpMLineIndex, 
				sdpMid:e.candidate.sdpMid
			};
			var res = {
				status:true,
				data:{
					from:this.id,
					to:d.data.from,
					candidate:tmpCandidate
				}
			};
			socket.emit('on-ice-candidate',res);
		};
		peer.onsignalingstatechange = function(e){
			console.log('Info: onsignalingstatechange from '+d.data.from); console.log(e);
		};
		peer.oniceconnectionstatechange = function(e){
			console.log('Info: oniceconnectionstatechange from '+d.data.from); console.log(e);
		};
		peer.onaddstream = function(e){
			console.log('Info: onaddstream from '+d.data.from); console.log(e);
			VCBpeer[d.data.from].remoteStream = e;
			var remoteStream = window.URL.createObjectURL(e.stream);
			initNewStream(d.data.from, remoteStream, false);
		};
		peer.onremovestream = function(e){
			console.log('Info: onremovestream from '+d.data.from); console.log(e);
		};
		peer.createOffer(function(e){
			console.log('Info: createOffer from this PC to '+d.data.from); console.log(e);
			VCBpeer[d.data.from].session.local = e;
			var res = {
				status:true,
				data:{
					//from:d.data.to,
					to:d.data.from,
					session:{
						sdp:e.sdp,
						type:e.type
					}
				}
			};
			socket.emit('get-offer', res);
		});
	};
	var handleGetOffer = function(d) {
		if (d.data.client.sessionID != socket.socket.sessionid) {
			// Send notification to clients
			// New client join
			var joinMessage = $('#join-room-message-template').html().replace('{{name}}', d.data.client.name)
			// Append to chat list
			$('#chat-list').prepend(joinMessage)            
		}

		console.log('Info: handleGetOffer with input param @d:'); console.log(d);
		VCBpeer[d.data.from] = new VCBpeerConstructor();
		// Create RTCPeerConnection
		VCBpeer[d.data.from].peer = new webkitRTCPeerConnection(null,{optional: [{RtpDataChannels: true}]});
		var peer = VCBpeer[d.data.from].peer;
		// Handle event on RTCPeerConnection
		peer.addStream(VCB.localStream);
		peer.onicecandidate = function(e){
			console.log('Info: onicecandidate send from this PC to '+d.data.from); console.log(e);
			var tmpCandidate = {
				candidate:e.candidate.candidate, 
				sdpMLineIndex:e.candidate.sdpMLineIndex, 
				sdpMid:e.candidate.sdpMid
			};
			var res = {
				status:true,
				data:{
					//from:this.id,
					to:d.data.from,
					candidate:tmpCandidate
				}
			};
			socket.emit('on-ice-candidate',res);
		};
		peer.onsignalingstatechange = function(e){
			console.log('Info: onsignalingstatechange from '+d.data.from); console.log(e);
		};
		peer.oniceconnectionstatechange = function(e){
			console.log('Info: oniceconnectionstatechange from '+d.data.from); console.log(e);
		};
		peer.onaddstream = function(e) {
			console.log('Info: onaddstream from ', d); console.log(e);
			VCBpeer[d.data.from].remoteStream = e;

			var newStreamURL = window.URL.createObjectURL(e.stream)
			if (d.data.from == roomInfo.creator.sessionID) {
				initMainStream(newStreamURL);
			}
			else {
				initNewStream(d.data.from, newStreamURL, false);
			}
		}

		peer.onremovestream = function(e){
			console.log('Info: onremovestream from '+d.data.from); console.log(e);
		};
		peer.ondatachannel = function(e) {
			console.log('Info: ondatachannel from '+d.data.from); console.log(e);
			VCBpeer[d.data.from].datachannel = e.channel;
			var channel = e.channel;
			channel.onclose = function(e) {
				console.log("getOffer peer DataChannelObject onclose from: ", d.data.from)
				console.log(e)
			}
			channel.onerror = function(e) {
				console.log("getOffer peer DataChannelObject onerror from: ", d.data.from)
				console.log(e)
			}
			channel.onmessage = function(e) {
				console.log("getOffer peer DataChannelObject onmessage from: ", d.data.from)
				console.log(e);
				dataChannel.receiveMessage(d, e);
			}
			channel.onopen = function(e) {
				console.log("getOffer peer DataChannelObject onopen", d);
				console.log(e)
			}
		};
		// Process input SDP
		var SessionDescription = new RTCSessionDescription({
									sdp:d.data.session.sdp, 
									type:d.data.session.type
								});
		VCBpeer[d.data.from].session.remote = SessionDescription;
		peer.setRemoteDescription(SessionDescription);
		peer.createAnswer(function(e){
			console.log('Info: createAnswer from this PC to '+d.data.from); console.log(e);
			VCBpeer[d.data.from].session.local = e;
			var res = {
				status:true,
				data:{
					//from:this.id,
					to:d.data.from,
					session:{
						sdp:e.sdp,
						type:e.type
					}
				}
			};
			socket.emit('get-answer',res);
		});
	};

	var handleGetAnswer = function(d){
		console.log('Info: handleGetAnswer with input param @d:');
		var peer = VCBpeer[d.data.from].peer;
		var SessionDescription = new RTCSessionDescription({
									sdp:d.data.session.sdp,
									type:d.data.session.type
								});
		VCBpeer[d.data.from].session.remote = SessionDescription;
		peer.setLocalDescription(VCBpeer[d.data.from].session.local);
		peer.setRemoteDescription(VCBpeer[d.data.from].session.remote);
		var res = {
			status:true,
			data:{
				//from:this.id,
				to:d.data.from
			}
		};
		socket.emit('get-last-description',res);
	};

	var handleGetLastDescription = function(d){
		console.log('Info: handleGetLastDescription with input param @d:'); console.log(d);
		var peer = VCBpeer[d.data.from].peer;
		peer.setLocalDescription(VCBpeer[d.data.from].session.local);
	};

	var handleOnIceCandidate = function(d){
		console.log('Info: handleOnIceCandidate with input param @d:'); console.log(d);
		var peer = VCBpeer[d.data.from].peer;
		var IceCandidate = new RTCIceCandidate(d.data.candidate);
		peer.addIceCandidate(IceCandidate);
	}

	/**
	 * Handle display on room is destroyed. Room can be destroyed because of
	 * 2 reasons, the creator left, or current user left. Reset HTML DOM to
	 * initial state, which is dashboard page.
	 */
	var handleLeaveRoom = function(d) {
		// stop local stream
		if (d.creator == d.client || d.client == socket.socket.session) {
			VCB.localStream.stop()
			$('#dashboard-content').html($('#dashboard-home-template').html())
			// reset mem
			VCBpeer = new Object();
			Vpeer = new Object();
			presentation.reset();
		}
		else {
			// Other user leave room
			// Update DOM to remove user video
			$('#' + d.client).remove()
			VCBpeer[d.client] = undefined;

			// Prepare leavemessage
			var leaveMessage = $('#leave-room-message-template').html().replace('{{name}}', d.name)
			// Append to chat list
			$('#chat-list').prepend(leaveMessage)		
		}
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
		var control = $(this).attr('data-control');

		var streamToRecord,
			creatorSessionID = VCB.roomInfo.creator.sessionID,
			currentSessionID = socket.socket.sessionid;

		if (creatorSessionID == currentSessionID) {
			streamToRecord = VCB.localStream;
		}
		else {
			streamToRecord = VCBpeer[creatorSessionID].remoteStream.stream;
		}

		recorder.control(control, streamToRecord);
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
		chat.send(VCBpeer, message.value);

		// reset textarea value
		message.value = null;
	});
	/**
	 * Register websocket with any other connection types which are available
	 * after initial connection is established (room created)
	 */
	socket.on('ask-offer', handleAskOffer);
	socket.on('get-offer', handleGetOffer);
	socket.on('get-answer', handleGetAnswer);
	socket.on('get-last-description', handleGetLastDescription);
	socket.on('on-ice-candidate', handleOnIceCandidate);
	socket.on('start-presentation', presentation.start);
	socket.on('control-presentation', presentation.applyControl);
	socket.on('leave-room', handleLeaveRoom);
};

/**
 * Leave room, send signal to STUN server and stop localstream
 * also, remove all getUserMedia stream on current user
 */
var leaveRoom = function() {
	socket.emit('leave-room');
	VCB.localStream.stop();
};

/**
 * Initialize stream from getUserMedia.
 *
 * Receiving data from websocket contains result from CREATE_ROOM form
 * If true, getUserMedia is invoked using constraint to make sure user
 * has audio and video on their system to proceed to stream
 */
var initStream = function(d) {
	// check whether CREATE_ROOM request is valid
	if (d.status == true) {

		VCB.roomid = d.roomInfo.id;
		VCB.roomInfo = d.roomInfo;

		startStream(d.roomInfo);
	}
	else {
		if (VCB.localStream) {
			VCB.localStream.stop();
			VCB.localStream = undefined;
		}

		// request is not valid or there's an error
		// display the error to user
		$('#message').addClass('error').html("ERROR: " + d.error).fadeIn(750, function() {
			$(this).delay(1000).fadeOut(750)
		});
	}
}

/**
 * Show current STUN status
 *
 * Display STUN object contain client sessions, room lists to console.
 * Data received from websocket
 */
var showStatusSTUN = function(d) {
	console.log(d);
}