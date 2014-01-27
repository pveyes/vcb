/**
 * Storage API for chrome apps and HTML5 localStorage
 */

var storage = (function() {

	/**
	 * Namespace
	 */

	var storage = {};

	/**
	 * Default storage type
	 */

	storage.type = 'localStorage';

	/**
	 * Check current system API
	 */

	if (typeof chrome.storage.local !== 'undefined') {
		storage.type = 'chrome';
	};
	
	/**
	 * Save API
	 */

	storage.save = function(key, value) {
		try {			
			if (storage.type == 'chrome') {
				var data;
				data[key] = value;
				chrome.storage.local.save(data);
			}
			else {
				localStorage.setItem(key, value);
			}
		}
		catch(e) {
			console.log('Save API error: ', e);
		}
	};

	/**
	 * Get API
	 */

	storage.get = function(key) {
		var value;

		try {			
			if (storage.type == 'chrome') {
				chrome.storage.local.get(function(data) {
					console.log(data);
					console.log(typeof data);
					console.log(data[key]);
					value = (typeof data === 'undefined') ? undefined : data[key];
				});
			}
			else {
				value = localStorage.getItem(data);
			}
		}
		catch(e) {
			console.log('Get API error: ', e);
			value = undefined;
		}

		console.log(value);

		return value;
	};

	return storage;
})();