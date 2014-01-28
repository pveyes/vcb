/**
 * Recorder Helper API
 *
 * Require: jQuery, WebMRecorder
 */

var recorder = (function($, WebMrecorder) {
	
	/**
	 * Namespace
	 */

	var recorder = {};

	/**
	 * Recorder library
	 */

	recorder.lib = undefined

	/**
	 * Record current stream (video on creator), start encoding and wait
	 * until stop() function is invoked. Stream is recorded from the moment
	 * user click on RECORD button, not from ROOM_CREATED event
	 */
	 
	recorder.start = function(stream) {
		console.log('Start recording...');

		if (recorder.lib) {
			// check existing record system
			return true;
		}
		else {
			recorder.lib = new WebMrecorder(stream);
			recorder.lib.init();
		}
	}

	/**
	 * Stop current stream recorder, and save the stream files in disk
	 */

	recorder.stop = function() {
		console.log('Stop recording...');

		if (recorder.lib) {
			recorder.lib.stop();
			recorder.lib = undefined;
		}
		else {
			return false;
		}
	};

	/**
	 * Control signaling recorder API
	 */

	recorder.control = function(control, stream) {

		if (control == 'record') {
			$('#record-stream-button').removeClass('record-button').addClass('stop-button').html('Stop').attr('data-control', 'stop');
			recorder.start(stream);
		}
		else {
			$('#record-stream-button').removeClass('stop-button').addClass('record-button').html('Record').attr('data-control', 'record');
			recorder.stop();
		}
	};

	return recorder;

})(jQuery, recordWebM);