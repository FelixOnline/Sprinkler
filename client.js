/*
 * Client connection
 */
var io = require('socket.io-client')
  , db = require('./db');

var url = process.argv[2]
  , channel = process.argv[3]
  , listen = url;

if(!url) {
  console.log('Please specify a url to listen to!');
  process.exit(1);
}

/*
 * Add logging to socket by overriding $emit function
 */
var addlog = function(socket) {
  var $emit = socket.$emit;
  socket.$emit = function() {
    console.log(socket.name, Array.prototype.slice.call(arguments));
    $emit.apply(socket, arguments);
  };
}

if(channel) { //if a channel is specified
  console.log('Listening to channel '+channel);
  listen += '/'+channel;
  addlog(io.connect(listen));
} else { // else listen to all channels
  console.log('No channel, listening to all channels');
  db.channels.on('load', function() { // when db is ready
    db.channels.forEach(function(key, val) { // loop through each channel
      addlog(io.connect(listen+'/'+key));
    });
  });
}

