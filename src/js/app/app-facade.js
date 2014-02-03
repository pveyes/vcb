(function (app) {

// Facade
app.f = {
	define: function (core, module) {

		// debug
		var core = app.core,
			dom = core.dom,
			events = core.events;

		return {

			publish: function (e) {
				events.trigger(e);
			},

			subscribe: function (e) {
				events.register(e, module)
			},

			bind: function (el, type, fn) {
				dom.bind(el, type, fn);
			},

			unbind: function (el, type, fn) {
				dom.unbind(el, type, fn);
			},

			getHTML: function (el) {
				return el.innerHTML;
			},

			parseHTML: function (el, data) {
				data.forEach(function (obj) {

				})
			}

			setHTML: function (el, content) {
				el.innerHTML = content;
			},

			newGUID: function () {
				return app.utils.newGUID();
			}
		}
	}
};

})(app);