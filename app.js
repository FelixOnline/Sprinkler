//
// Sprinkler
//

var express = require('express');
var sockjs = require('sockjs');
var http = require('http');
var fs = require('fs');

var redis = require('redis');
var db = redis.createClient();

var Socket = require('./lib/Socket');
var utils = require('./utils');

// 1. Check for config file
var config;
if (!fs.existsSync('./config.js')) {
    // TODO start config setup
    throw new Error('Config file not found');
} else {
    config  = require('./config'); // config file
}

// 1. Get sockjs servers
//var sockjs_opts = {sockjs_url: "http://cdn.sockjs.org/sockjs-0.3.min.js"};

var endpoints = [];

var ping = sockjs.createServer({});
ping.on('connection', function(conn) {
    conn.on('data', function(message) {
        conn.write('pong');
    });
});

// 2. Express server
var app = express();

app.use(express.urlencoded());

// New message
app.post('/message/:channel', function (req, res) {
    var key = req.get('key');
    var channel = req.params.channel;
    var endpoint = '/' + channel;

    if (!key) {
        res.json({ 'message': 'No key' }, 401);
    } else {
        // Check key
        utils.authenticate(endpoint, key).then(function() {
            // post message
            db.publish(endpoint, req.body.message);
            res.json({
                'message': req.body.message
            }, 200);
        }, function(error) {
            res.json({ 'message': 'Wrong key' }, 401);
        });
    }
});

var server = http.createServer(app);

console.log(' [*] Listening on 0.0.0.0:' + config.port);
server.listen(config.port, '0.0.0.0');

// 3. Create endpoints

// special case for ping
ping.installHandlers(server, { prefix: '/ping' });

// Get all endpoints that have been setup
db.lrange('endpoints', 0, -1, function(err, list) {
    list.forEach(function(endpoint) {
        // Get auth key for endpoint
        db.hget('keys', endpoint, function(err, key) {
            var sock = new Socket(endpoint, key);
            sock.socket.installHandlers(server, { prefix: sock.prefix });
        });
    });
});

/*

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(function(err, req, res, next){
    if(err) {
      res.json({ response: 'error', message: err.toString() }, 500);
    }
  });
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/', routes.index);
app.post('/newchannel', routes.newchannel);
app.post('/newmessage', routes.newmessage);

sockets.run(app);

app.listen(config.port);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
*/
