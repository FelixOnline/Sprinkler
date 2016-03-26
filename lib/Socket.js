var sockjs = require('sockjs');
var _ = require('underscore');
var redis  = require('redis');
var utils = require('./utils');

var Socket = function(prefix, key, redisUrl, options) {
    this.prefix = prefix;
    this.key = key;
    this.redisUrl = redisUrl;

    this.connections = 0;

    var config = options || {};
    // create server
    this.socket = sockjs.createServer(config);

    // setup event handlers
    this.socket.on('connection', _.bind(this.connection, this));
};

Socket.prototype.getConnections = function() {
    return this.connections;
}

Socket.prototype.connection = function(conn) {
    this.conn = conn;

    var sub = redis.createClient(this.redisUrl);
    sub.subscribe(this.prefix);

    sub.on("message", function(channel, message) {
        conn.write(message);
    });

    this.connections++;

    utils.log('Connection on ' + this.prefix + ' (' + this.connections + ' listeners).');

    conn.on("close", _.bind(this.disconnection, this));
};

Socket.prototype.disconnection = function(conn) {
    this.connections--;
    utils.log('Disconnection on ' + this.prefix + ' (' + this.connections + ' listeners).');
}

module.exports = Socket;
