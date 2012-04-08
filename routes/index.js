var db = require('../db');

/*
 * GET home page.
 */

exports.index = function(req, res){
  res.json('Hello');
};

/*
 * POST create a new channel
 *
 * Expects:
 *  {
 *      key: "API_KEY",
 *      name: "CHANNEL_NAME"
 *  }
 */

exports.newchannel = function(req, res) {
  var keys = db.keys;
  if(keys.get(req.body.key)) { // check key against database
    if(!req.body.name) { // check that request has provided name of channel to create
      res.json('No name specified', 400);
    } else {
      if(db.channels.get(req.body.name)) { // channel already exists
        res.json('Channel already exists, sorry!', 409);
      } else {
        var now = new Date();
        db.channels.set(req.body.name, { created: now.toJSON(), 'created_by': req.body.key }, function() {
          res.json('Success');
        });
      }
    }
  } else {
    res.json('Wrong key', 401);
  }
};

/*
 * POST new message
 *
 * Expects:
 *  {
 *      key: "API_KEY",
 *      channel: "CHANNEL_NAME",
 *      event: "EVENT_NAME", // defaults to 'message'
 *      message: "MESSAGE" // anything
 *  }
 */

exports.newmessage = function(req, res) {
  var keys = db.keys;
  if(keys.get(req.body.key)) { // check key against database
    if(db.channels.get(req.body.channel)) { // channel exists
      var event = req.body.event;
      if(!req.body.event) { // if no socket.io event specified
        event = 'message';
      }
      res.json('Success');
    } else {
      res.json("Channel doesn't exist, sorry!", 409);
    }
  } else {
    res.json('Wrong key', 401);
  }
};
