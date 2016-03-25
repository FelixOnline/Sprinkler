//
// Sprinkler
//

var express = require('express');
var sockjs = require('sockjs');
var http = require('http');
var fs = require('fs');
var hat = require('hat');

var redis = require('redis');
var db = redis.createClient();

var Socket = require('./lib/socket');
var utils = require('./lib/utils');

// 1. Check for config file
var config;
if (!fs.existsSync('./config.js')) {
    // TODO start config setup
    throw new Error('Config file not found');
} else {
    config  = require('./config'); // config file
}

// 2. Express server
var app = express();
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();

// Require admin key middleware
var requireAdmin = function(req, res, next) {
    var key = req.get('key');

    if (!key) {
        res.json({ 'message': 'No key', 'status': 'ERROR' }, 400);
        return false;
    }

    // check against admin key
    if (key !== config.admin_key) {
        res.json({ 'message': 'Wrong key', 'status': 'ERROR' }, 401);
        return false;
    }

    next();
};

// New message
app.post('/message/:channel', jsonParser, function (req, res) {
    var key = req.get('key');
    var channel = req.params.channel;
    var endpoint = '/' + channel;

    if (!key) {
        res.json({ 'message': 'No key', 'status': 'ERROR' }, 400);
    } else {
        // Check key
        utils.authenticate(endpoint, key).then(function() {
            // post message
            db.publish(endpoint, JSON.stringify(req.body));
            res.json({
                'status': 'OK'
            }, 200);
        }, function(error) {
            res.json({ 'message': 'Wrong key', 'status': 'ERROR' }, 401);
        });
    }
});

// Get a list of all channels
app.get('/channel', jsonParser, function (req, res) {
    db.lrange('endpoints', 0, -1, function(err, list) {
        res.json(list, 200);
    });
});

// Get channel info
app.get('/channel/:channel', requireAdmin, jsonParser, function (req, res) {
    var channel = req.params.channel;
    var endpoint = '/' + channel;

    db.hexists('keys', endpoint, function(err, check) {
        if (!check) {
            res.json({ 'message': 'Channel does not exist', 'status': 'ERROR' }, 400);
            return false;
        }

        // get key
        db.hget('keys', endpoint, function(err, channelKey) {
            res.json({
                'key': channelKey
            }, 200);
        });
    });
});

// Create a new channel
app.post('/channel', requireAdmin, jsonParser, function (req, res) {
    // generate channel key
    var channelKey = hat();
    var channel = req.body.channel;

    if (!channel) {
        res.json({ 'message': 'No channel name', 'status': 'ERROR' }, 400);
        return false;
    }

    var endpoint = '/' + channel;

    // check if channel already exists
    db.hexists('keys', endpoint, function(err, check) {
        if (check) {
            res.json({ 'message': 'Channel already exists', 'status': 'ERROR' }, 400);
            return false;
        }

        // set channel key
        db.hset('keys', endpoint, channelKey, function(err) {
            // add channel to channel list
            db.lpush('endpoints', endpoint, function(err) {
                // publish new endpoint
                db.publish('new-endpoint', JSON.stringify({
                    'endpoint': endpoint,
                    'key': channelKey
                }));
                res.json({
                    'status': 'OK',
                    'key': channelKey
                }, 200);
            });
        });
    });
});

// Delete channel
app.delete('/channel/:channel', requireAdmin, jsonParser, function (req, res) {
    var channel = req.params.channel;
    var endpoint = '/' + channel;

    // check if channel already exists
    db.hexists('keys', endpoint, function(err, check) {
        if (!check) {
            res.json({ 'message': "Channel doesn't exist", 'status': 'ERROR' }, 400);
            return false;
        }

        // remove channel key
        db.hdel('keys', endpoint, function(err) {
            // remove channel from channel list
            db.lrem('endpoints', 0, endpoint, function(err) {
                // publish removed endpoint
                // TODO actual remove channel handlers
                db.publish('removed-endpoint', JSON.stringify({
                    'endpoint': endpoint
                }));
                res.json({
                    'status': 'OK'
                }, 200);
            });
        });
    });
});

var server = http.createServer(app);

console.log(' [*] Listening on 0.0.0.0:' + config.port);
server.listen(config.port, '0.0.0.0');

// 3. Create endpoints

// Get all endpoints that have been setup
db.lrange('endpoints', 0, -1, function(err, list) {
    if(!err) {
        list.forEach(function(endpoint) {
            // Get auth key for endpoint
            db.hget('keys', endpoint, function(err, key) {
                var sock = new Socket(endpoint, key);
                sock.socket.installHandlers(server, { prefix: sock.prefix });
            });
        });
    }
});

// listen to new endpoints
var sub = redis.createClient();
sub.subscribe('new-endpoint');

sub.on('message', function(channel, message) {
    var data = JSON.parse(message);

    var sock = new Socket(data.endpoint, data.key);
    sock.socket.installHandlers(server, { prefix: sock.prefix });
});

// listen to deleted endpoints
var sub2 = redis.createClient();
sub2.subscribe('removed-endpoint');

sub2.on('message', function(channel, message) {
    var data = JSON.parse(message);

    console.log('[*] Shutting down endpoint ' + data.endpoint);

    deadEndpoint = function(req, res, extra) {
        regexp = new RegExp('^' + data.endpoint  + '([/].+|[/]?)$');

        if(req.url.match(regexp)) {
            res.setHeader('content-type', 'text/html; charset=UTF-8');
            res.writeHead(404);
            res.end("Cannot GET "+data.endpoint+" ");
            return true;
        }

        return false;
    }

    handle1 = utils.overshadowListeners(server, 'request', deadEndpoint);
    handle2 = utils.overshadowListeners(server, 'upgrade', deadEndpoint);
});

process.on('uncaughtException', function(err) {
    console.error('A fatal error has occured with Sprinker. Please fix this error and restart the service.', err);

    process.exit(1);
    return;
})