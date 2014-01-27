'use strict';

var express = require('express'),
	VCB = require('./modules/vcb.js'),
	port = 2013

var app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server)

io.set('log level', 2);

var vcb = new VCB()
vcb.attachSocket(io)

server.listen(port)
console.log("Listening on port: ", port)