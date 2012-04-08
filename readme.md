# Sprinkler

*A real time messaging platform*

Sprinkler allows the creation of multiple real time channels and the ability to push data through those channels to connected users.

## Requirements:
* node.js

## Modules:
* [express](https://github.com/visionmedia/express)
* [socket.io](https://github.com/learnboost/socket.io)
* [dirty](https://github.com/felixge/node-dirty)

## Examples:

Create a new channel `test`

    curl -v -H "Accept: application/json" -H "Content-type: application/json" -X POST -d '{"key":"APIKEY", "name":"test"}' http://localhost:3000/newchannel

Send a message to all clients connected to `test` channel

    curl -v -H "Accept: application/json" -H "Content-type: application/json" -X POST -d '{"key":"APIKEY", "channel":"test", "message": {"hello": "world"}}' http://localhost:3000/newmessage

