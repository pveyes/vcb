/**
 * WebRTC Helper API
 */

var webrtc = (function() {
	
	/**
	 * Namespace
	 */

	var webrtc = {};

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
	 * Websocket connection
	 *
	 * @api private
	 */

	var socket;

	/**
	 * Attach pointer to websocket
	 */

	webrtc.attachSocket = function(s) {
		socket = s;
	}

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

		socket.emit('get-last-description', res);
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