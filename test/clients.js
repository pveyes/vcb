'use strict';

var assert = require('assert');

function s4() {
	return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

function uid() {
	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function sessionID() {
	return s4() + s4();
}


describe('VCBClients', function () {
	var VCBClients = require('../modules/clients.js'),
		randomClients = Math.round(Math.random() * Math.round(Math.random() * 100)) + 2;

	describe('#add()', function () {	
		// Reset
		VCBClients.clear();

		// insert random number of clients to database
		for (var i = 0; i < randomClients; i++) {
			var sampleClient = {
				name: 'Some client name',
				uid: uid(),
				sessionID: sessionID(),
				version: '3.1',
			};

			var addClient = VCBClients.add(sampleClient);

			it('should able to add new client to database', function () {
				assert.equal(addClient, "new");
			});
		};

		it('should able to add client to database and increase total client', function () {
			assert.equal(VCBClients.totalClient, randomClients);
		});

	});

	describe('#get()', function () {
		// Reset
		VCBClients.clear();

		// insert random client to database
		var sampleClient = {
			name: 'Some client name',
			uid: uid(),
			sessionID: sessionID(),
			version: '3.1',
		};
		VCBClients.add(sampleClient);

		var client = VCBClients.get(sampleClient.sessionID);

		it('should able to get client info from database', function () {
			assert.notEqual(client, false);
		});

		it('should able to get client info from database with valid name', function () {
			assert.equal(client.name, sampleClient.name);
		});

		it('should able to get client info from database with valid uid', function () {
			assert.equal(client.uid, sampleClient.uid);
		});

		it('should able to get client info from database with valid sessionid', function () {
			assert.equal(client.sessionID, sampleClient.sessionID);
		});

		it('should able to get client info from database with valid version', function () {
			assert.equal(client.version, sampleClient.version);
		});
	});

	describe('#remove()', function () {
		// Reset
		VCBClients.clear();

		// insert sample client to database
		var sampleClient = {
			name: 'Some client name',
			uid: uid(),
			sessionID: sessionID(),
			version: '3.1',
		};
		VCBClients.add(sampleClient);

		// insert random number of clients to database
		for (var i = 0; i < randomClients; i++) {
			var sampleClient = {
				name: 'Some client name',
				uid: uid(),
				sessionID: sessionID(),
				version: '3.1',
			};

			VCBClients.add(sampleClient);
		};

		var validRemoveStatus = VCBClients.remove(sampleClient.sessionID);

		it('should able to remove client from database and return valid response', function () {
			assert.equal(validRemoveStatus, true);
		});

		it('should able to remove client from database and decrease total client', function () {
			assert.equal(VCBClients.totalClient, randomClients);
		});
	});

	describe('#list()', function () {
		// Reset
		VCBClients.clear();

		// insert random number of clients to database
		var randomClientsession = new Array();
		for (var i = 0; i < randomClients; i++) {
			var sampleClient = {
				name: 'Some client name',
				uid: uid(),
				sessionID: sessionID(),
				version: '3.1',
			};

			// save
			VCBClients.add(sampleClient);

			// save for testing
			randomClientsession.push(sampleClient.sessionID);
		};

		// Client info must same with the info supplied
		var clientList = VCBClients.list();

		it('should able to get all clients from database with same number as input', function () {
			assert.equal(clientList.length, randomClients);
		});

		it('should able to get all clients from database with valid response', function () {
			for (sessionID in randomClientsession) {
				var testClientInfo = VCBClients.get(randomClientsession[sessionID]);
				assert.notEqual(testClientInfo, false);
			}
		});
	})
});