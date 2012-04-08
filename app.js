/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , socket = require('socket.io')
  , dirty = require('dirty')
  , config = require('./config') // config file

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// DB's
var db = {};
db.keys = dirty.Dirty('keys.db');
db.channels = dirty.Dirty('channels.db');

// Routes

app.get('/', routes.index);

// Socket.io

var io = socket.listen(app);
io.set('log level', 1); // reduce logging

io.sockets.on('connection', function(socket) {
    if(cache) {
        socket.emit('datastart', { data: cache });
    } else {
        getData(config.url, function(json) {
            cache = json;
            socket.emit('datastart', { data: cache });
        });
    }
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
