/*
 * Client connection
 */
var io = require('socket.io-client');

var test = io.connect('http://176.34.227.200:8000/tes');
test.on('connect', function() {
  console.log('connected');
});
test.on('message', function(data) {
  console.log(data);
});
test.on('news', function(data) {
  console.log('news', data);
});
