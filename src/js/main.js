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

chrome.storage.local.get(function(data) {
	console.log('Receiving value from local storage...');

	// Check if data on localstorage exists
	if (data && data.user) {
		// initialize client and stun server
		console.log('Local storage data received, checking client data and STUN server');

		client = {
			name: data.user,
			uid: guid(),
			version: '3.1'
		};

		stun.init(data.stun);
	}
	else {
		// show authenticated page
		console.log('Local storage data is not received, displaying auth page');
		dashboard.auth();
	}
});