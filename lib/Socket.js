var sockjs = require('sockjs');
var _ = require('underscore');
var redis  = require('redis');
var utils = require('../utils');

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

    conn.on('data', _.bind(this.data, this));
};

// New message for channel
Socket.prototype.data = function(message) {
    var data = JSON.parse(message);

    utils.authenticate(this.prefix, data.key).then(_.bind(function() {
        this.publisher.publish(this.prefix, data.message);
    }, this), function(error) {
        // TODO handle error
        console.log(error);
    });
};

module.exports = Socket;
