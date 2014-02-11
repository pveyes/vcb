'use strict';

var assert = require('assert');

describe('VCBClient', function () {
	var VCBClient = require('../modules/client.js');

	var sampleClient = {
		name: 'Some client name',
		uid: 'RANDOM-UID',
		sessionID: 'RANDOM-SESSION-ID',
		version: '3.1',
	};

	var client = new VCBClient(sampleClient);

	var roomID = Math.round(Math.random() * 123);

	describe('#joinRoom()', function () {
		var joinRoom = client.joinRoom(roomID);
		var clientRoom = client.getRoom();

		it('should able to join client to room', function () {
			assert.deepEqual(joinRoom, true);
		});

		it('should able to set correct room to client info', function () {
			assert.equal(clientRoom, roomID);
		});

		// second try should fail
		var joinRoomAgain = client.joinRoom(roomID);
		it('should not able to join client to room after joined', function () {
			assert.deepEqual(joinRoomAgain, false);
		});
	});

	describe('#leaveRoom()', function () {
		var leaveRoom = client.leaveRoom(roomID);
		var clientRoom = client.getRoom();

		it('should able to leave client from room', function () {
			assert.deepEqual(leaveRoom, true);
		});

		it('should able to remove room info from client after left', function () {
			assert.equal(clientRoom, false);
		});

		// second try should fail
		var leaveRoomAgain = client.leaveRoom(roomID);
		it('should not able to leave client from room after left', function () {
			assert.deepEqual(leaveRoomAgain, false);
		});
	});
});