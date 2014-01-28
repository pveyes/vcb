/**
 * DataChannel API
 */

var dataChannel = (function() {
	
	/**
	 * Namespace
	 */

	var dataChannel = {};

	/**
	 * Buffer for receiving message
	 */

	dataChannel.buffer = [];

	/**
	 * Message constructor
	 */

	dataChannel.msgConstructor = function(data) {
		var tmp = data || new Object;
		return {
			t: tmp.t || null,
			l: tmp.l || null,
			p: tmp.p || null,
			s: tmp.s || null,
			d: tmp.d || null
		};
	};

	/**
	 * Handle message receive via DataChannel
	 *
	 * @param @d object of {status,data{from,to}}. It forward route data from STUN.
	 * @param @e object of RTCDataChannelEvent
	 */
	dataChannel.receiveMessage = function(d, e) {
		var msgObj = JSON.parse(e.data);
		var cekMessage;

		if (msgObj) {
			cekMessage = msgObj.t && msgObj.l && msgObj.p && msgObj.s &&msgObj.d
		}
		else{
			cekMessage = false;
		};

		if (cekMessage) {

			switch (msgObj.s) {
				case 1:
					dataChannel.buffer[d.data.from] = msgObj.d;
					break;
				case 2:
					dataChannel.buffer[d.data.from] += msgObj.d;
					break;
				case 3:
					dataChannel.buffer[d.data.from] += msgObj.d;
					dataChannel.joinMessage(d, dataChannel.buffer[d.data.from], msgObj);
					break;
				case 4:
					dataChannel.buffer[d.data.from] = msgObj.d;
					dataChannel.joinMessage(d, dataChannel.buffer[d.data.from], msgObj);
					break;
				default:
					console.log('Warning: No event handler for this message status: '+msgObj.s);
					break;
			};
		}
		else {
			console.log('Error: Wrong format data message received');
		}
	};

	/**
	 * Handle event after received messages is joined
	 *
	 * @param @joinMessage string to process due to received message type
	 * @param @objectMessage object of msgDataChannelConstructor contain {s}
	 */

	dataChannel.joinMessage = function(d, joinMessage, objectMessage){
		switch(objectMessage.t) {
			case 'c': 
				// Chat
				var sender = d.data.client.name,
					message = joinMessage;

				chat.receive(sender, message);
				break;
			case 'p':
				// Presentation
				var message = JSON.parse(joinMessage),
					index = parseInt(message.p),
					slide = message.f;

				presentation.receive(index, slide);
				break;
			case 'e':
				return false;
				break;
			default:
				console.log('Warning: No event handling for this undefined message type :' + objectMessage.t)
				break;
		};
	};

	
	/** 
	 * Handle message before send via DataChannel.
	 * Check if data split is needed due to big message length
	 *
	 * @param @channel object of RTCDataChannel
	 * @param @data message object of msgDataChannelConstructor {@d}
	 */

	dataChannel.sendMessage = function(channel, data) {
		var msgBuffer = 65;
		var res = new dataChannel.msgConstructor(data);
		res.l = Math.ceil(data.d.length/msgBuffer);

		for (var i=1; i<=res.l; i++) {
			var positionEnd = i*msgBuffer;
			res.p = i;
			if (res.l == 1) {
				//single message
				res.s=4;
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
			};

			res.d = data.d.slice(positionEnd-msgBuffer,positionEnd);
			channel.send(JSON.stringify(res));
		};
	}

	return dataChannel;

})();