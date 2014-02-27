var sockjs = require('sockjs');
var _ = require('underscore');
var redis  = require('redis');
var utils = require('./utils');

var Socket = function(prefix, key, options) {
    this.prefix = prefix;
    this.key = key;

    var config = options || {};
    // create server
    this.socket = sockjs.createServer(config);

    // create redis publisher
    this.publisher = redis.createClient();

    // setup event handlers
    this.socket.on('connection', _.bind(this.connection, this));
};

Socket.prototype.connection = function(conn) {
    this.conn = conn;

    var sub = redis.createClient();
    sub.subscribe(this.prefix);

    sub.on("message", function(channel, message) {
        conn.write(message);
    });
};

module.exports = Socket;
