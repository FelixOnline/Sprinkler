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
      newChannel(key);
    });
  });
}

var newChannel = function(channel) {
  channels[channel] = io.of('/'+channel).on('connection', function(socket) {
    socket.emit('message', { hello: 'Welcome to the '+channel+' channel' }); // welcome message
  });
}

exports.add = function(channel, callback) {
    db.channels.set(req.body.name, { created: now.toJSON(), 'created_by': req.body.key }, function() {
      newChannel(channel);
      if(typeof(callback) == 'function') callback();
    });
}

exports.channel = channels;

