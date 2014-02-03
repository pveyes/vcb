/**
 * Presentation API
 *
 * Require: dataChannel
 */

var presentation = (function(dataChannel) {

	/**
	 * Namespace
	 */

	var presentation = {};

	console.log('Initializing presentation API');

	/**
	 * Current slide indicator
	 */

	presentation.currentSlide = 0;

	/**
	 * Total slide indicator
	 */

	presentation.totalSlide = 0;

	/**
	 * Total size presentation
	 */

	presentation.size = 0;

	/**
	 * Base64-decoded images of all presentation slides
	 */

	presentation.slides = [];

	/**
	 * Reset presentation content
	 */

	presentation.reset = function() {
		presentation.slides = [];
		presentation.currentSlide = 0;
		presentation.totalSlide = 0;
		presentation.size = 0;
	};

	/**
	 * Add slides to presentation data
	 */

	presentation.addSlide = function(slide) {
		presentation.slides.push(slide);
		presentation.totalSlide += 1;
		presentation.size += slide.length;
	};

	/**
	 * Init presentation (creator) and add event listener
	 */

	presentation.init = function() {
		if (presentation.totalSlide > 0) {
			// Display first slide on stream page, and show current slide &
			// total slides.
			$('#slide-current').attr('src', presentation.slides[0]);
			$('#slide-current-num').html((presentation.currentSlide+1) + '/' + presentation.totalSlide);

			// Allow fullscreen slide using click
			eventListener.register('presentation-full-screen');

			// Style fix for single slide
			if (presentation.currentSlide == presentation.totalSlide-1) {
				$('#slide-control-next').addClass('disabled');
			}

			// Display element
			$('#slide-current').show();
			$('#slide-control').show();
		}
	};

	/**
	 * Send presentation control signal from creator
	 *
	 * @param socket	websocket pointer
	 * @param vcbpeer	clients list to send control signal via websocket
	 */

	presentation.control = function(control, socket, clients) {
		if (control == 'next') {
			if (presentation.currentSlide < presentation.totalSlide-1) {
				presentation.currentSlide += 1;
			}
			else {
				console.log('maximum next control signal exceeded');
				return false;
			}
		}
		else if (control == 'prev') {
			if (presentation.currentSlide > 0) {
				presentation.currentSlide -= 1;					
			}
			else {
				console.log('maximum previous control signal exceeded');
				return false;
			}
		}
		else {
			console.log('invalid control signal');
			return false;
		}

		if (presentation.currentSlide > 0) {
			$('#slide-control-prev').removeClass('disabled');
		}
		if (presentation.currentSlide === 0) {
			$('#slide-control-prev').addClass('disabled');
		}
		if (presentation.currentSlide < presentation.totalSlide-1) {
			$('#slide-control-next').removeClass('disabled');
		}
		if (presentation.currentSlide == presentation.totalSlide-1) {
			$('#slide-control-next').addClass('disabled');
		}

		$('#slide-current-num').html((presentation.currentSlide+1) + '/' + presentation.totalSlide);
		$('#slide-current').attr('src', presentation.slides[presentation.currentSlide]);

		for (var client in clients){
			if (client) {			
				var d = {
					data: {
						to: client,
						page: presentation.currentSlide
					}
				};

				console.log('sending control signal to client ', client);
				socket.emit('control-presentation', d);
			}
		}
	};

	/**
	 * Broadcast presentation slides data in partials
	 */

	presentation.broadcast = function(socket, clientID) {
		for (var i in presentation.slides) {
			if (presentation.slides[i]) {
				var msg = new dataChannel.msgConstructor();
				msg.t = 'p';
				data = {
					f: presentation.slides[i],	// base64-decoded image of slide
					p: i						// current slide indicator
				};
				msg.d = JSON.stringify(data);
				presentation.send(socket, clientID, msg);				
			}
		}
	};

	/**
	 * Send presentation data to client
	 */

	presentation.send = function(socket, clientID, msgFile) {
		var msgBuffer = 50000;
		var res = new dataChannel.msgConstructor(data);
		var d = {
			data: {
				to: clientID,
				file: null
			}
		};
		res.l = Math.ceil(msgFile.d.length / msgBuffer);
		res.t = 'p';

		for (var i = 1; i <= res.l; i++) {
			var positionEnd = i*msgBuffer;
			res.p = i;
			if (res.l == 1) {
				//single message
				res.s = 4;
			}
			else {
				//splited message
				switch(i) {
					case 1:
						res.s = 1;
						break;
					case res.l:
						res.s = 3;
						break;
					default:
						res.s = 2;
						break;
				}
			}

			res.d = msgFile.d.slice(positionEnd-msgBuffer, positionEnd);
			d.data.file = JSON.stringify(res);
			socket.emit('init-presentation', d);
		}
	};

	/**
	 * Receive partial presentation slides data 
	 */

	presentation.receive = function(index, slide) {
		presentation.slides[index] = slide;
		presentation.totalSlide += 1;
		presentation.size += slide.length;

		if (index === 0) {
			// Initialize current slide indicator
			$('#slide-current').attr('src', presentation.slides[0]).show();

			// Allow fullscreen slide using click
			eventListener.register('presentation-full-screen');
		}
	};
	
	/**
	 * Initalize presentation data. Data recevied from websocket as base64
	 * encoded image. Each data will then be parsed and stored on global
	 * variables presentation as an array.
	 */

	presentation.start = function(d) {
		var tmp = {
			data: d.data.file
		};

		if (d.status === true) {
			dataChannel.receiveMessage(d, tmp);

			// Presentation data is sent partially, periodically update DOM
			// with updated totalSlide everytime data received
			$('#slide-current-num').html((presentation.currentSlide + 1) + '/' + presentation.totalSlide);
		}
		else {
			// error
			console.log("Presentation start error");
		}
	};


	/**
	 * Handle control signal received via websocket, used to navigate between slide
	 * in presentation (next / previous)
	 */

	presentation.applyControl = function(d) {
		console.log('receiving presentation control signal');
		currentSlide = d.data.page;
		$('#slide-current-num').html((currentSlide+1) + '/' + presentation.totalSlide);
		$('#slide-current').attr('src', presentation.slides[currentSlide]);
	};

	return presentation;

})(dataChannel);