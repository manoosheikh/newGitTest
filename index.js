'use strict';

// import libraries
var http = require('http');
var fs = require('fs');
var url = require('url');
var logger = require('./logger.js');
var socket = require('socket.io');
var users = require('./users.js');
var history = require('./history.js');


// create simple webserver: now serve the index.html
var server = http.createServer(function (request, response) {

    // log request
    logger.emit('info', '>> new request: ' + request.url);

    // parse the request
    var path = url.parse(request.url).pathname;
    if (path === '/') {
        path = '/index.html';
    }

    // read the file
    var fileStream = fs.createReadStream(__dirname + '/public' + path);

    // serve file asynchronusly
    response.writeHead(200);
    fileStream.pipe(response);

    // file not found
    fileStream.on('error', function (err) {
        response.writeHead(404);
        response.end();
    });

});


// create socket.io instance and tell it to use our server
var io = socket(server);
io.on('connect', function (socket) {
    logger.emit('info', 'client connected');

    // login attemp
    socket.on('login', function (username) {

        // check if the username is available
        if (!socket.username && users.insertUser(username)) {

            // log
            logger.emit('info', 'new login ok: ' + username);

            // save the username for this socket
            socket.username = username;

            // login ok
            socket.emit('login_ok', username);

            // send connected users
            socket.emit('users', users.getUsers());

            // send chat history
            history.getMessages().forEach(function(message) {
                socket.emit('message', message);
            });

            // notify the other clients
            socket.broadcast.emit('user_join', username);
        }

        // username taken
        else {

            // log
            logger.emit('error', 'new login fail: ' + username);

            // login fail
            socket.emit('login_fail', 'username already taken');
        }
    });

    // listen to messages
    socket.on('message', function (message) {
        logger.emit('info', 'new message: ' + message);

        // make sure the user is logged in the chat
        if (socket.username) {

            // add the username to the message
            var msg = {
                message: message,
                username: socket.username
            };

            // send it to all the other clients
            socket.broadcast.emit('message', msg);

            // send it back to this client
            socket.emit('message', msg);

            // store message
            history.storeMessage(msg);
        }
    });

    // the client disconnects
    socket.on('disconnect', function () {

        // remove username from the lists
        // [make sure the user was logged in]
        if (users.removeUser(socket.username)) {

            // log
            logger.emit('info', 'user left: ' + socket.username);

            // say everybody that the user left
            socket.broadcast.emit('user_left', socket.username);
        }

        // log
        logger.emit('info', 'client disconnected');
    });

    // the user is typing
    socket.on('start_typing', function () {
        logger.emit('info', 'start_typing: ' + socket.username);

        // make sure the user is logged in the chat
        if (socket.username) {

            // say everybody that the user is typing
            socket.broadcast.emit('start_typing', socket.username);
        }
    });

    // the user stopped typing
    socket.on('stop_typing', function () {
        logger.emit('info', 'stop_typing: ' + socket.username);

        // make sure the user is logged in the chat
        if (socket.username) {

            // say everybody that the user has stopped typing
            socket.broadcast.emit('stop_typing', socket.username);
        }
    });

});


// run webserver
var port = process.env.PORT || 8080;
server.listen(port, function () {
    console.log('listen to port ' + port);
});
