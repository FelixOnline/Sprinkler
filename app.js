//
// Sprinkler
//

var express = require('express');
var sockjs  = require('sockjs');
var http    = require('http');
var fs = require('fs');

// 1. Check for config file
var config;
if (!fs.existsSync('./config.js')) {
    // TODO start config setup
    throw new Error('Config file not found');
} else {
    config  = require('./config'); // config file
}

  //, routes = require('./routes')
  //, db = require('./db')
  //, sockets = require('./sockets')

// 1. Echo sockjs server
//var sockjs_opts = {sockjs_url: "http://cdn.sockjs.org/sockjs-0.3.min.js"};
var ping = sockjs.createServer({});
ping.on('connection', function(conn) {
    conn.on('data', function(message) {
        conn.write('pong');
    });
});

// 2. Express server
var app = express();
var server = http.createServer(app);

ping.installHandlers(server, { prefix:'/ping' });

console.log(' [*] Listening on 0.0.0.0:' + config.port);
server.listen(config.port, '0.0.0.0');
/*

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/index.html');
});

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
