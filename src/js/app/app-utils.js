(function (app) {
	
app.utils = (function () {
	return {
		typeEqual: function (input, desiredType) {
			return app.utils.type(input).toLowerCase == desiredType;
		},

		type: function () {
			return Object.prototype.toString.call(input).match(/^\[object\s(.*)\]$/)[1];
		},

		newGUID: function () {
			var s4 = function () {
				return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
			};

			return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
		}
	};
})

})(app);