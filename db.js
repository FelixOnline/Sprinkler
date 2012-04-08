/*
 * DB connections
 */

var dirty = require('dirty');

var db = {};

db.keys = dirty.Dirty('keys.db');
db.channels = dirty.Dirty('channels.db');

module.exports = db;
