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

module.exports = utils;
