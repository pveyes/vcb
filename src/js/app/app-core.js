(function (app) {

/**
 * Core app using jQuery.
 * It's created to remove all jQuery hard dependency on app modules
 */

app.core = (function () {

	var data = {};

	return {

		/**
		 * Define application module
		 */
		define: function() {
			
		},


		/**
		 * jQuery DOM
		 */
		dom: function () {

			// Basic jQuery selector
			$: function (args) {
				return $(args);
			}
		}
	}

})()
	
})(app);