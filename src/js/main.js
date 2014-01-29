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

chrome.storage.local.get(['user', 'stun'], function(data) {
	console.log('Receiving value from local storage...');

	// Check if data on localstorage exists
	if (typeof data.user !== 'undefined') {
		// initialize client and stun server
		console.log('Local storage data received from ' + data.user + ', generating client object and STUN server');

		client = {
			name: data.user,
			uid: guid(),
			version: '3.1',
			input: {
				audio: {},
				video: {}
			}
		};

		console.log('client object created: ', client);

		/**
		 * STUN server initialization. Check STUN server selection from localstorage,
		 * if exists check connection via websocket, if not display STUN server selection
		 * page on DOM
		 */
		if (typeof data.stun === 'undefined') {
			// No stun server defined
			// Display stun server selection
			console.log('STUN server has not defined. Displaying STUN server selection page');
			dashboard.renderSelectSTUN();
		}
		else {
			// STUN server already defined
			// Initialize connection via websocket
			console.log('STUN server is already defined: ', data.stun);
			stun.connect(data.stun);
		}	
	}
	else {
		// show authenticated page
		console.log('Local storage data is not received, displaying auth page');
		dashboard.renderAuthPage();
	}
	
});