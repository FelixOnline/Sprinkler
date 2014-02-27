# ![image](logo.png) Sprinkler

*A real time messaging platform*

Sprinkler allows the creation of multiple real time channels and the ability to push data through those channels to all connected users.

## Requirements:
* node.js


## Examples:

Create a new channel `test`:

	curl 'http://0.0.0.0:3000/channel' -H 'Content-Type: application/json' -H 'key: ADMIN_KEY' -X POST -d '{"channel": "test"}'

This will return:
	
	{
  		"status": "OK",
  		"key": "CHANNEL_KEY"
	}

You can then use this key to send a message to all clients connected to the `test` channel:

	curl 'http://0.0.0.0:3000/channel' -H 'Content-Type: application/json' -H 'key: CHANNEL_KEY' -X POST -d '{"message": "Hello World"}'

If there are any sockjs clients listening to `http://0.0.0.0:3000` with the prefix `\test` they will recieve the string message:

	{"message": "Hello World"}


## Setup:

    npm install
    node app.js

Create a `config.js` based on `config.js.sample`
