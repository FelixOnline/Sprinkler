var redis  = require('redis');
var Q = require('q');

var utils = {};

utils.authenticate = function(channel, k) {
    var db = redis.createClient();
    var deferred = Q.defer();

    // check authentication key
    db.hget('keys', channel, function(err, key) {
        if (err) {
            deferred.reject(err);
        }

        if (key !== k) {
            deferred.reject(new Error('Authentication failure'));
        }

        deferred.resolve();
    });

    return deferred.promise;
};

utils.overshadowListeners = function(ee, event, handler) {
    var new_handler, old_listeners;
    old_listeners = ee.listeners(event).slice(0);
    ee.removeAllListeners(event);

    new_handler = function() {
        var j, len, listener;

        if (handler.apply(this, arguments) !== true) {
            for (j = 0, len = old_listeners.length; j < len; j++) {
                listener = old_listeners[j];
                listener.apply(this, arguments);
            }
            return false;
        }
        return true;
    };

    ee.addListener(event, new_handler);

    return new_handler;
}

module.exports = utils;
