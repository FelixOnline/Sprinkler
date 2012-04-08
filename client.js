/*
 * Client connection
 */
var io = require('socket.io-client');

var dev = io.connect('http://localhost:3000/dev');
dev.on('connect', function() {
  console.log('connected');
});
dev.on('message', function(data) {
  console.log(data);
});
