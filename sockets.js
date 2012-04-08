/*
 * Sockets
 */
var socket = require('socket.io')
  , db = require('./db')
  , channels = {}

exports.run = function(app) {
  var io = socket.listen(app);
  io.set('log level', 1); // reduce logging
  db.channels.on('load', function() { // when db is ready
    db.channels.forEach(function(key, val) { // loop through each channel
      channels[key] = io.of('/'+key).on('connection', function(socket) {
        socket.emit('message', { hello: 'Welcome to the '+key+' channel' }); // welcome message
      });
    });
  });
}

exports.channel = channels;

