/**
 * Global variable to store device information
 */

var client = {};

/**
 * Main
 *
 * Read current localStorage value check user name and STUN server
 * configurations. Show login page if user name is not set, and show
 * STUN server selections when STUN server is not set.
 */

console.log('Starting application...');

var init = function(userName, stunServer) {

	// initialize client
	client = {
		name: undefined,
		uid: guid(),
		version: '3.1',
		input: {
			audio: undefined,
			video: undefined
		}
	};

	// Check if data on localstorage exists
	if (typeof userName === 'undefined' || userName == null) {
		// show authenticated page
		console.log('Local storage data is not received, displaying auth page');
		dashboard.renderAuthPage();
	}
	else {
		// initialize client and stun server
		console.log('Local storage data received from ' + userName + ', generating client object and STUN server');

		client.name = userName;

		/**
		 * STUN server initialization. Check STUN server selection from localstorage,
		 * if exists check connection via websocket, if not display STUN server selection
		 * page on DOM
		 */
		if (typeof stunServer === 'undefined' || stunServer == null) {
			// No stun server defined
			// Display stun server selection
			console.log('STUN server has not defined. Displaying STUN server selection page');
			dashboard.renderSelectSTUN();
		}
		else {
			// STUN server already defined
			// Initialize connection via websocket
			console.log('STUN server is already defined: ', stunServer);
			stun.connect(stunServer);
		}
	}
}

if (chrome.storage) {
	chrome.storage.local.get(['user', 'stun'], function(data) {
		console.log('Receiving value from chrome apps storage...');
		init(data.user, data.stun);
	});
}
else {
	var user = localStorage.getItem('user'),
		stun = localStorage.getItem('stun');

	console.log('Receiving value from local storage...');
	init (user, stun);
}