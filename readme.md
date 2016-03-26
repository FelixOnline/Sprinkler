# ![image](logo.png) Sprinkler

*A real time messaging platform*

Sprinkler allows the creation of multiple real time channels and the ability to push data through those channels to all connected users.

## Requirements:
* node.js
* Redis

A PHP client is also available: https://github.com/FelixOnline/Sprinkler-php

## Documentation:

There are:
* /message/:channel [POST] - Post a message to the specified channel. The message should be in JSON format. A header of "key" must be specified with the channel key. You will receive, in return, a JSON object which includes the current number of listeners in the field "listeners".
* /channel [GET] - Lists all channels in JSON format
* /channel/:channel [GET] - Obtain details on the specified channel, requires admin access. Will return a JSON object with fields "endpoint" (channel name), "listeners" (number of connected clients) and "key" (channel key)
* /channel/:channel [POST] - Resets the channel key, requires admin access. Will return same response as the GET method (with a new key supplied)
* /channel/:channel [DELETE] - Deletes the specified channel, requires admin access.
* /channel [POST] - Creates a new channel, requires admin access. Pass as the request body a JSON object with the sole field "object". Will return a JSON object in the same format as the /channel/:channel [GET] method.

Admin access endpoints requires a header of "key" set to the admin key (which is set in the config file).

Endpoints will, on the whole, respond in JSON with a field of "status" set to OK or ERROR. If an ERROR status is received there will also be a non-HTTP 200 response set. The only time a non-JSON respons should be received is where the server has crashed.

New channels will be notified on the prefix "new-endpoint", and deleted ones on "removed-endpoint".

All channels are accessed (by default) by sockjs clients at http://0.0.0.0:3000/ with the relevant prefix set. No permissions are required to access channels (nor can channels be protected).

Note that SSL support is currently not present.

The following channel names are forbidden:
* channel
* message
* new-endpoint
* removed-endpoint

It is highly recommended that your Redis server saves the database to file, so in the event of a server failure the channels do not need to be recreated. Sprinkler will automatically reload all channels stored in Redis' database when restarted, so if Redis restarts and loads its database from file, you can pick up from exactly where you left off with minimal downtime.

## Example:

Create a new channel `test`:

	curl 'http://0.0.0.0:3000/channel' -H 'Content-Type: application/json' -H 'key: ADMIN_KEY' -X POST -d '{"channel": "test"}'

This will return:
	
	{
  		"status": "OK",
  		"key": "CHANNEL_KEY"
	}

You can then use this key to send a message to all clients connected to the `test` channel:

	curl 'http://0.0.0.0:3000/message/test' -H 'Content-Type: application/json' -H 'key: CHANNEL_KEY' -X POST -d '{"message": "Hello World"}'

If there are any sockjs clients listening to `http://0.0.0.0:3000` with the prefix `\test` they will recieve the string message:

	{"message": "Hello World"}

## Setup:

Create a `config.js` based on `config.js.sample`.

Start your Redis server.

Then do:

    npm install
    node app.js