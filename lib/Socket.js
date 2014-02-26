var sockjs = require('sockjs');
var _ = require('underscore');
var redis  = require('redis');
var db = redis.createClient();
var Q = require('q');

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

    this.authenticate(data.key).then(_.bind(function() {
        this.publisher.publish(this.prefix, data.message);
    }, this), function(error) {
        // TODO handle error
        console.log(error);
    });
};

Socket.prototype.authenticate = function(k) {
    var deferred = Q.defer();

    // check authentication key
    db.hget('keys', this.prefix, _.bind(function(err, key) {
        if (err) {
            deferred.reject(err);
        }

        if (key !== k) {
            deferred.reject(new Error('Authentication failure'));
        }

        deferred.resolve();
    }, this));

    return deferred.promise;
};

module.exports = Socket;
