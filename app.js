/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , config = require('./config') // config file
  , db = require('./db')
  , sockets = require('./sockets')

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

// Routes

app.get('/', routes.index);
app.post('/newchannel', routes.newchannel);
app.post('/newmessage', routes.newmessage);

sockets.run(app);

app.listen(config.port);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
