//
// Sprinkler
//

var express = require('express');
var sockjs = require('sockjs');
var http = require('http');
var fs = require('fs');
var hat = require('hat');

var redis = require('redis');

var Socket = require('./lib/socket');
var utils = require('./lib/utils');

verInfo = utils.getVersion();
utils.log('This is ' + verInfo.name + ' ' + verInfo.version);

// 1. Check for config file
var config;
if (!fs.existsSync('./config.js')) {
    // TODO start config setup
    throw new Error('Config file not found');
} else {
    config  = require('./config'); // config file
}

var db = redis.createClient(config.redisUrl);
var endpoints = {};

// 2. Express server
var app = express();
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();

// Require admin key middleware
var requireAdmin = function(req, res, next) {
    var key = req.get('key');

    if (!key) {
        res.status(400).json({ 'message': 'No key', 'status': 'ERROR' });
        return false;
    }

    // check against admin key
    if (key !== config.admin_key) {
        res.status(401).json({ 'message': 'Wrong key', 'status': 'ERROR' });
        return false;
    }

    next();
};

// Get version
app.get('/', jsonParser, function (req, res) {
    ver = utils.getVersion();
    ver.status = 'OK';

    res.status(200).json(ver);
});

// New message
app.post('/message/:channel', jsonParser, function (req, res) {
    var key = req.get('key');
    var channel = req.params.channel;
    var endpoint = '/' + channel;

    if (!key) {
        res.status(400).json({ 'message': 'No key', 'status': 'ERROR' });
    } else {
        // Check key
        utils.authenticate(endpoint, key).then(function() {
            utils.log('Posted to ' + endpoint + ' by ' + req.ip);

            // post message
            db.publish(endpoint, JSON.stringify(req.body));
            res.status(200).json({
                'status': 'OK',
                'listeners': endpoints[endpoint.substring(1)].getConnections(),
                'endpoint': endpoint
            });
        }, function(error) {
            res.status(401).json({ 'message': 'Wrong key', 'status': 'ERROR' });
        });
    }
});

// Get a list of all channels
app.get('/channel', jsonParser, function (req, res) {
    db.lrange('endpoints', 0, -1, function(err, list) {
        res.status(200).json({ "channels": list, "status": "OK" });
    });
});

// Get channel info
app.get('/channel/:channel', requireAdmin, jsonParser, function (req, res) {
    var channel = req.params.channel;
    var endpoint = '/' + channel;

    db.hexists('keys', endpoint, function(err, check) {
        if (!check) {
            res.status(400).json({ 'message': 'Channel does not exist', 'status': 'ERROR' });
            return false;
        }

        // get key
        db.hget('keys', endpoint, function(err, channelKey) {
            utils.log('Channel info request for ' + endpoint + ' by ' + req.ip);

            res.status(200).json({
                'endpoint': endpoint,
                'key': channelKey,
                'listeners': endpoints[endpoint.substring(1)].getConnections(),
                'status': 'OK'
            });
        });
    });
});

// Generate a new channel key
app.post('/channel/:channel', requireAdmin, jsonParser, function (req, res) {
    // generate channel key
    var channelKey = hat();
    var channel = req.params.channel;
    var endpoint = '/' + channel;

    db.hset('keys', endpoint, channelKey, function(err) {
        utils.log('Key reset for ' + data.endpoint + ' by ' + req.ip);

        res.status(200).json({
            'status': 'OK',
            'endpoint': endpoint,
            'key': channelKey
        });
    });
});

// Create a new channel
app.post('/channel', requireAdmin, jsonParser, function (req, res) {
    // generate channel key
    var channelKey = hat();
    var channel = req.body.channel;

    if (!channel) {
        res.status(400).json({ 'message': 'No channel name', 'status': 'ERROR' });
        return false;
    }

    if (! /^[a-zA-Z0-9]+$/.test(channel)) {
        res.status(400).json({ 'message': 'Channel names must be alphanumeric', 'status': 'ERROR' });
        return false;
    }

    var forbiddenChannels = ['message', 'channel', 'new-endpoint', 'removed-endpoint'];

    if (forbiddenChannels.indexOf(channel) > -1) {
        res.status(400).json({ 'message': 'This channel name is restricted and cannot be used', 'status': 'ERROR' });
        return false;
    }

    var endpoint = '/' + channel;

    // check if channel already exists
    db.hexists('keys', endpoint, function(err, check) {
        if (check) {
            res.status(400).json({ 'message': 'Channel already exists', 'status': 'ERROR' });
            return false;
        }

        // set channel key
        db.hset('keys', endpoint, channelKey, function(err) {
            // add channel to channel list
            db.lpush('endpoints', endpoint, function(err) {
                utils.log('New channel request for ' + endpoint + ' by ' + req.ip);

                // publish new endpoint
                db.publish('new-endpoint', JSON.stringify({
                    'endpoint': endpoint
                }));
                res.status(200).json({
                    'status': 'OK',
                    'endpoint': endpoint,
                    'key': channelKey
                });
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
            res.status(400).json({ 'message': "Channel doesn't exist", 'status': 'ERROR' });
            return false;
        }

        // remove channel key
        db.hdel('keys', endpoint, function(err) {
            // remove channel from channel list
            db.lrem('endpoints', 0, endpoint, function(err) {
                // publish removed endpoint
                utils.log('Delete channel request for ' + endpoint + ' by ' + req.ip);

                db.publish('removed-endpoint', JSON.stringify({
                    'endpoint': endpoint
                }));
                res.status(200).json({
                    'status': 'OK',
                    'endpoint': endpoint
                });
            });
        });
    });
});

var server = http.createServer(app);

utils.log('Listening on ' + config.listen + ':' + config.port);
server.listen(config.port, config.listen);

// 3. Create endpoints

// Get all endpoints that have been setup
db.lrange('endpoints', 0, -1, function(err, list) {
    if(!err) {
        list.forEach(function(endpoint) {
            // Get auth key for endpoint
            db.hget('keys', endpoint, function(err, key) {
                var sock = new Socket(endpoint, key, config.redisUrl);

                utils.log('Restoring endpoint ' + endpoint);

                sock.socket.installHandlers(server, { prefix: sock.prefix });

                endpoints[sock.prefix.substring(1)] = sock;
            });
        });
    }
});

// listen to new endpoints
var sub = redis.createClient();
sub.subscribe('new-endpoint');

sub.on('message', function(channel, message) {
    var data = JSON.parse(message);

    utils.log('Creating endpoint ' + data.endpoint);

    var sock = new Socket(data.endpoint, data.key, config.redisUrl);
    sock.socket.installHandlers(server, { prefix: sock.prefix });

    endpoints[sock.prefix.substring(1)] = sock;
});

// listen to deleted endpoints
var sub2 = redis.createClient();
sub2.subscribe('removed-endpoint');

sub2.on('message', function(channel, message) {
    var data = JSON.parse(message);

    utils.log('Shutting down endpoint ' + data.endpoint);

    delete endpoints[data.endpoint.substring(1)];

    deadEndpoint = function(req, res, extra) {
        regexp = new RegExp('^' + data.endpoint  + '([/].+|[/]?)$');

        if(req.url.match(regexp)) {
            res.setHeader('content-type', 'application/json; charset=UTF-8');
            res.writeHead(404);
            res.end("{'message': \"This endpoint doesn't exist\", 'status': 'ERROR'}");
            return true;
        }

        return false;
    }

    handle1 = utils.overshadowListeners(server, 'request', deadEndpoint);
    handle2 = utils.overshadowListeners(server, 'upgrade', deadEndpoint);
});

process.on('uncaughtException', function(err) {
    console.error('A fatal error has occured with this service. Please fix this error and restart the service.', err);

    process.exit(1);
    return;
})