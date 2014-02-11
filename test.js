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

var VCBClients = require('./modules/clients.js');

it('should able to add new client to database', function () {
	// First total connected client must be 0
	VCBClients.clear();
	assert.equal(VCBClients.totalClient, 0);

	// insert random number of clients to database
	var newClients = Math.round(Math.random() * 5) + 2;
	for (var i = 0; i < newClients; i++) {
		var sampleClient = {
			name: 'Some client name',
			uid: uid(),
			sessionID: sessionID(),
			version: '3.1',
		};

		VCBClients.add(sampleClient);
	};

	// Total connected client must be same with client added
	assert.equal(VCBClients.totalClient, newClients);
});

it('should able to get client info from database', function () {
	var VCBClients = require('./modules/clients.js');

	// First total connected client must be 0
	VCBClients.clear();
	assert.equal(VCBClients.totalClient, 0);

	// insert random client to database
	var sampleClient = {
		name: 'Some client name',
		uid: uid(),
		sessionID: sessionID(),
		version: '3.1',
	};
	VCBClients.add(sampleClient);

	// Client info must same with the info supplied
	var client = VCBClients.get(sampleClient.sessionID);
	assert.equal(client.name, sampleClient.name);
	assert.equal(client.uid, sampleClient.uid);
	assert.equal(client.version, sampleClient.version);
});


it('should able to remove client from database', function () {
	var VCBClients = require('./modules/clients.js');

	// First total connected client must be 0
	VCBClients.clear();
	assert.equal(VCBClients.totalClient, 0);

	// insert sample client to database
	var sampleClient = {
		name: 'Some client name',
		uid: uid(),
		sessionID: sessionID(),
		version: '3.1',
	};
	VCBClients.add(sampleClient);

	// insert random number of clients to database
	var newClients = Math.round(Math.random() * 5) + 2;
	for (var i = 0; i < newClients; i++) {
		var sampleClient = {
			name: 'Some client name',
			uid: uid(),
			sessionID: sessionID(),
			version: '3.1',
		};

		VCBClients.add(sampleClient);
	};

	// Delete sample client
	var validRemoveStatus = VCBClients.remove(sampleClient.sessionID);
	assert.equal(validRemoveStatus, true);
	assert.equal(VCBClients.totalClient, newClients);

	var invalidRemoveStatus = VCBClients.remove(Math.random());
	assert.equal(invalidRemoveStatus, false);
	assert.equal(VCBClients.totalClient, newClients);
});

it('should able to get all client from database', function () {
	var VCBClients = require('./modules/clients.js');

	// First total connected client must be 0
	VCBClients.clear();
	assert.equal(VCBClients.totalClient, 0);

	// insert random number of clients to database
	var newClients = Math.round(Math.random() * 5) + 2;
	for (var i = 0; i < newClients; i++) {
		var sampleClient = {
			name: 'Some client name',
			uid: uid(),
			sessionID: sessionID(),
			version: '3.1',
		};

		VCBClients.add(sampleClient);
	};

	// Client info must same with the info supplied
	var clientList = VCBClients.list();
	assert.equal(clientList.length, newClients);
});