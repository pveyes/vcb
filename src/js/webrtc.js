/**
 * WebRTC Helper API
 */

var webrtc = (function() {
	
	/**
	 * Namespace
	 */

	var webrtc = {};

	console.log('Initializing WebRTC API');

	/**
	 * Peer lists
	 * Peers object contain SDP and RTCPeerConnection object connectiong to other clients
	 *
	 * @structure {@clientID:{session:{local,remote},peer,datachannel}}
	 * @param @clientID client.session (on STUN server) of remote client connected. Its index of this Object
	 * @param @local SDP that set to RTCPeerConnection.setLocalDescription()
	 * @param @remote SDP that set to RTCPeerConnection.setRemoteDescription()
	 * @param @peer RTCPeerConnection object created to connect with client @clientID
	 * @param @datachannel RTCDataChannel object created by RTCPeerConnection.createDataChannel() method
	 */


	webrtc.peers = [];

	/**
	 * Peer constructor
	 */

	webrtc.peerConstructor = function() {
		return{
			session: {
				local:null,
				remote:null
			},
			peer: null,
			datachannel: null       
		}
	}

	/**
	 * Reset peers
	 */

	webrtc.resetPeers = function() {
		console.log('removing all peers from webrtc object');
		webrtc.peers = {};
	}

	/**
	 * Remove client from peer lists
	 */

	webrtc.removePeer = function(client) {
		console.log('removing ' + client + ' from webrtc object');
		delete webrtc.peers[client];
	};

	/**
	 * handle askOffer
	 */

	webrtc.handleAskOffer = function(d) {
		// Send notification to clients
		// New client join, add notification on chat list
		var joinMessage = $('#join-room-message-template').html().replace('{{name}}', d.data.client.name)
		$('#chat-list').prepend(joinMessage)

		// Create RTCPeerConnection
		webrtc.peers[d.data.from] = new webrtc.peerConstructor();
		webrtc.peers[d.data.from].peer = new webkitRTCPeerConnection(null,{optional: [{RtpDataChannels: true}]});
		var peer = webrtc.peers[d.data.from].peer;

		// Create RTCDataChannel and 
		// handle datachannel event on RTCDataChannel
		webrtc.peers[d.data.from].datachannel = peer.createDataChannel(d.data.from,{reliable: true});
		var channel = webrtc.peers[d.data.from].datachannel;

		channel.onclose = function(e) {
			console.log("DataChannelObject onclose from: ", d.data.from);
			console.log(e);
		};
		channel.onerror = function(e) {
			console.log("DataChannelObject onerror from: ", d.data.from);
			console.log(e);
		};
		channel.onmessage = function(e) {
			console.log("DataChannelObject onmessage from: ", d.data.from);
			console.log(e);

			dataChannel.receiveMessage(d,e);
		};
		channel.onopen = function(e) {
			console.log("DataChannelObject onopen from: ", d.data.from);
			console.log(e);

			presentation.broadcast(stun.socket, d.data.from);
		};

		peer.addStream(stream.local);

		// Handle handshake event on RTCPeerConnection
		peer.onicecandidate = function(e){
			console.log('Info: onicecandidate send from this PC to: ', d.data.from);
			console.log(e);

			var tmpCandidate = {
				candidate: e.candidate.candidate, 
				sdpMLineIndex: e.candidate.sdpMLineIndex, 
				sdpMid: e.candidate.sdpMid
			};
			var res = {
				status: true,
				data: {
					from: this.id,
					to: d.data.from,
					candidate: tmpCandidate
				}
			};
			stun.socket.emit('on-ice-candidate',res);
		};
		peer.onsignalingstatechange = function(e) {
			console.log('Info: onsignalingstatechange from: ', d.data.from);
			console.log(e);
		};
		peer.oniceconnectionstatechange = function(e) {
			console.log('Info: oniceconnectionstatechange from: ', d.data.from);
			console.log(e);
		};
		peer.onaddstream = function(e) {
			console.log('Info: onaddstream from: ', d.data.from);
			console.log(e);

			webrtc.peers[d.data.from].remoteStream = e;
			var remoteStream = window.URL.createObjectURL(e.stream);
			dashboard.renderViewerStream(d.data.from, remoteStream, false);
		};
		peer.onremovestream = function(e) {
			console.log('Info: onremovestream from: ', d.data.from);
			console.log(e);
		};
		peer.createOffer(function(e) {
			console.log('Info: createOffer from this PC to: ', d.data.from);
			console.log(e);

			webrtc.peers[d.data.from].session.local = e;
			var res = {
				status: true,
				data:{
					//from:d.data.to,
					to: d.data.from,
					session: {
						sdp: e.sdp,
						type: e.type
					}
				}
			};
			stun.socket.emit('get-offer', res);
		});
	};

	/**
	 * handle getOffer
	 */

	webrtc.handleGetOffer = function(d) {
		if (d.data.client.sessionID != stun.socket.socket.sessionid) {
			// Send notification to clients
			// New client join
			var joinMessage = $('#join-room-message-template').html().replace('{{name}}', d.data.client.name)
			// Append to chat list
			$('#chat-list').prepend(joinMessage)            
		}

		console.log('Info: handleGetOffer with input param @d:');
		console.log(d);

		// Create RTCPeerConnection
		webrtc.peers[d.data.from] = new webrtc.peerConstructor();
		webrtc.peers[d.data.from].peer = new webkitRTCPeerConnection(null,{optional: [{RtpDataChannels: true}]});
		var peer = webrtc.peers[d.data.from].peer;

		peer.addStream(stream.local);
		
		// Handle event on RTCPeerConnection
		peer.onicecandidate = function(e){
			console.log('Info: onicecandidate send from this PC to '+d.data.from); console.log(e);
			var tmpCandidate = {
				candidate: e.candidate.candidate, 
				sdpMLineIndex: e.candidate.sdpMLineIndex, 
				sdpMid: e.candidate.sdpMid
			};
			var res = {
				status:true,
				data:{
					//from:this.id,
					to: d.data.from,
					candidate: tmpCandidate
				}
			};
			stun.socket.emit('on-ice-candidate',res);
		};
		peer.onsignalingstatechange = function(e) {
			console.log('Info: onsignalingstatechange from: ', d.data.from);
			console.log(e);
		};
		peer.oniceconnectionstatechange = function(e) {
			console.log('Info: oniceconnectionstatechange from: ', d.data.from);
			console.log(e);
		};
		peer.onaddstream = function(e) {
			console.log('Info: onaddstream from: ', d);
			console.log(e);
			
			webrtc.peers[d.data.from].remoteStream = e;
			var newStreamURL = window.URL.createObjectURL(e.stream)

			if (d.data.from == stream.roomInfo.creator.sessionID) {
				dashboard.renderCreatorStream(newStreamURL);
			}
			else {
				dashboard.renderViewerStream(d.data.from, newStreamURL, false);
			}
		}
		peer.onremovestream = function(e){
			console.log('Info: onremovestream from: ', d.data.from);
			console.log(e);
		};
		peer.ondatachannel = function(e) {
			console.log('Info: ondatachannel from: ', d.data.from);
			console.log(e);

			webrtc.peers[d.data.from].datachannel = e.channel;
			var channel = e.channel;

			// Handle data channel event
			channel.onclose = function(e) {
				console.log("getOffer peer DataChannelObject onclose from: ", d.data.from)
				console.log(e)
			}
			channel.onerror = function(e) {
				console.log("getOffer peer DataChannelObject onerror from: ", d.data.from)
				console.log(e)
			}
			channel.onmessage = function(e) {
				console.log("getOffer peer DataChannelObject onmessage from: ", d.data.from)
				console.log(e);
				dataChannel.receiveMessage(d, e);
			}
			channel.onopen = function(e) {
				console.log("getOffer peer DataChannelObject onopen", d);
				console.log(e)
			}
		};

		// Process input SDP
		var SessionDescription = new RTCSessionDescription({
									sdp:d.data.session.sdp, 
									type:d.data.session.type
								});
		webrtc.peers[d.data.from].session.remote = SessionDescription;
		peer.setRemoteDescription(SessionDescription);
		peer.createAnswer(function(e){
			console.log('Info: createAnswer from this PC to '+d.data.from); console.log(e);
			webrtc.peers[d.data.from].session.local = e;
			var res = {
				status:true,
				data:{
					//from:this.id,
					to:d.data.from,
					session:{
						sdp:e.sdp,
						type:e.type
					}
				}
			};
			stun.socket.emit('get-answer', res);
		});
	};

	/**
	 * handle getAnswer
	 */

	webrtc.handleGetAnswer = function(d) {
		console.log('Info: handleGetAnswer with input param @d:');

		var peer = webrtc.peers[d.data.from].peer;
		var SessionDescription = new RTCSessionDescription({
									sdp: d.data.session.sdp,
									type: d.data.session.type
								});

		webrtc.peers[d.data.from].session.remote = SessionDescription;
		peer.setLocalDescription(webrtc.peers[d.data.from].session.local);
		peer.setRemoteDescription(webrtc.peers[d.data.from].session.remote);

		var res = {
			status:true,
			data:{
				//from:this.id,
				to:d.data.from
			}
		};

		stun.socket.emit('get-last-description', res);
	};

	/**
	 * handle getLastDescription
	 */

	webrtc.handleGetLastDescription = function(d) {
        console.log('Info: handleGetLastDescription with input param @d:');
        console.log(d);

        var peer = webrtc.peers[d.data.from].peer;
        peer.setLocalDescription(webrtc.peers[d.data.from].session.local);
	};

	/**
	 * handle handleOnIceCandidate
	 */

	webrtc.handleOnIceCandidate = function(d) {
        console.log('Info: handleOnIceCandidate with input param @d:');
        console.log(d);

        var peer = webrtc.peers[d.data.from].peer;
        var IceCandidate = new RTCIceCandidate(d.data.candidate);
        peer.addIceCandidate(IceCandidate);
	};

	return webrtc;

})();