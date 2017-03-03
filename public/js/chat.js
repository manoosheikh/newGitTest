$(function () {
    'use strict';

    /////////////////////////////////////////////////////////////////////
    // Appearance, DOM elements
    /////////////////////////////////////////////////////////////////////

    // chat appearance
    var FADE_TIME = 150; // ms
    var TYPING_TIMER_LENGTH = 400; // ms

    // better colors
    var COLORS = [
        '#e21400', '#91580f', '#f8a700', '#f78b00', '#58dc00', '#287b00',
        '#a8f07a', '#4ae8c4', '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
    ];

    // login page references
    var $loginPage = $('.login.page');
    var $loginUsername = $loginPage.find('.login-username');
    var $loginError = $loginPage.find('.login-error');

    // chat page references
    var $chatPage = $('.chat.page');
    var $chatUsers = $chatPage.find('.chat-users ul');
    var $chatElements = $chatPage.find('.chat-messages');
    var $chatInput = $chatPage.find('.chat-input');

    // current input (depending on selected page)
    var $currentInput = $loginUsername.focus();


    /////////////////////////////////////////////////////////////////////
    // Socket.IO section
    /////////////////////////////////////////////////////////////////////

    // current status
    var status = {
        loggedIn: false
    };

    // create socket.io instance
    var socket = io();

    // connected to the server
    socket.on('connect', function () {
        console.log('connect');
    });

    // disconnected (eg. problems with the connection to the server)
    socket.on('disconnect', function () {
        console.log('disconnect');

        // update status
        status.loggedIn = false;

        // return to login page
        showLogin();
    });

    // login ok
    socket.on('login_ok', function (username) {
        console.log('login_ok: ' + username);

        // now we are connected to the chat room
        status.loggedIn = true;

        // switch to chat page
        showChat();
    });

    // login fail
    socket.on('login_fail', function (error) {
        console.log('login_fail: ' + error);

        // show the error message
        $loginError.show();

        // animation
        $loginError.effect('shake', {
            speed: 20,
            distance: 5,
            times: 3
        });
    });

    // received users' list
    socket.on('users', function (users) {
        console.log('users: ' + users);

        // add each user to the users' list
        users.forEach(addUser);
    });

    // a new user joined
    socket.on('user_join', function (username) {
        console.log('user_join: ' + username);

        if (status.loggedIn) {

            // write "grey" message
            addLogMessage(username + ' joined');

            // add user to the left list
            addUser(username);
        }
    });

    // an user left
    socket.on('user_left', function (username) {
        console.log('user_left: ' + username);

        if (status.loggedIn) {

            // write "grey" message
            addLogMessage(username + ' left');

            // remove user from the left list
            removeUser(username);
        }
    });

    // a new message received
    socket.on('message', function (message) {
        console.log('message: ' + JSON.stringify(message));

        if (status.loggedIn) {

            // append new message to the chat
            addChatMessage(message);
        }
    });

    // somebody is typing
    socket.on('start_typing', function (username) {
        console.log('start_typing: ' + username);

        // display the typing message
        addChatTyping(username);
    });

    // somebody stopped typing
    socket.on('stop_typing', function (username) {
        console.log('stop_typing: ' + username);

        // remove the typing message
        removeChatTyping(username);
    });

    /////////////////////////////////////////////////////////////////////
    // Input events
    /////////////////////////////////////////////////////////////////////

    // key pressed
    $(window).keydown(function (event) {

        // auto-focus the current input when a key is typed
        if (!(event.ctrlKey || event.metaKey || event.altKey)) {
            $currentInput.focus();
        }

        // ENTER pressed
        if (event.which === 13) {

            // if on chat page -> send message
            if (status.loggedIn) {

                // send message
                sendMessage();

                // end message => stop typing
                socket.emit('stop_typing');
                status.typing = false;
            }

            // if on login page -> try to join the chat
            else {
                var username = escapeHtml($loginUsername.val().trim());

                // try to join the chat
                if (username) {
                    socket.emit('login', username);
                }
            }
        }
    });

    // user is typing...
    $chatInput.on('input', updateTyping);

    // focus input when clicking anywhere on login page
    $loginPage.click(function () {
        $currentInput.focus();
    });

    // focus input when clicking on the message input's border
    $chatInput.click(function () {
        $chatInput.focus();
    });


    /////////////////////////////////////////////////////////////////////
    // Functions
    /////////////////////////////////////////////////////////////////////

    // show login page
    function showLogin() {

        // hide chat
        $chatPage.fadeOut();

        // hide error
        $loginError.hide();

        // show login
        $loginPage.show();

        // focus on username input
        $currentInput = $loginUsername.focus();

        // clear users' list
        $chatUsers.empty();
    }

    // show chat page
    function showChat() {

        // hide login
        $loginPage.fadeOut();

        // show chat
        $chatPage.show();

        // focus on message input
        $currentInput = $chatInput.focus();
    }

    // prevents input from having injected markup
    function escapeHtml(string) {
        return $('<div/>').text(string).text();
    }

    // gets the color of a username through a hash
    function getUsernameColor(username) {

        // compute hash code
        var hash = 7;
        for (var i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + (hash << 5) - hash;
        }

        // calculate color
        var index = Math.abs(hash % COLORS.length);
        return COLORS[index];
    }

    // sends a chat message
    function sendMessage() {

        // get + escape text
        var message = escapeHtml($chatInput.val());

        // if non-empty message and socket connected
        if (message && status.loggedIn) {

            // send message to the server
            socket.emit('message', message);

            // cancel the text
            $chatInput.val('');
        }
    }

    // add an user to the list of online users
    function addUser(username) {

        // create a new user
        var $usernameDiv = $('<li class="username"/>')
            .text(username)
            .attr('data-username', username)
            .css('color', getUsernameColor(username));

        // append it to the online users
        $chatUsers.append($usernameDiv);
    }

    // remove an user from the list of online users
    function removeUser(username) {

        // search and remove
        $chatUsers.find('[data-username="' + username + '"]').remove();

        // this user left -> so remove its typing message
        removeChatTyping(username);
    }

    // adds a message element to the messages and scrolls to the bottom
    // end = false --> append it after the last chat message (not typing message)
    // end = true --> append it after the last typing message
    function addChatElement($el, end) {

        // fade in the new element
        $el.hide().fadeIn(FADE_TIME);

        // append the element
        if (end === true) {
            $chatElements.append($el);
        } else {
            var $chatMessages = $chatElements.find('.message:not(.typing), .log').last();
            if ($chatMessages.length > 0) {
                $chatMessages.after($el);
            } else {
                $chatElements.append($el);
            }
        }

        // scroll to bottom
        $chatElements[0].scrollTop = $chatElements[0].scrollHeight;
    }

    // create a new chat message element
    function createChatElement(message) {

        // username
        var $usernameSpan = $('<span class="username"/>')
            .text(message.username)
            .css('color', getUsernameColor(message.username));

        // message body
        var $messageBodySpan = $('<span class="message-body">')
            .text(message.message);

        // message
        return $('<li class="message"/>')
            .data('username', message.username)
            .append($usernameSpan, $messageBodySpan);
    }

    // add a "log message"
    function addLogMessage(message) {

        // create a new log message
        var $el = $('<li>').addClass('log').text(message);

        // append it to the chat
        addChatElement($el, false);
    }

    // adds the visual chat message to the message list
    function addChatMessage(message) {

        // append it to the chat
        addChatElement(createChatElement(message), false);
    }

    // adds the visual chat typing message
    function addChatTyping(username) {

        // create the new node
        var $el = createChatElement({
            username: username,
            message: 'is typing...'
        });

        // add some attributes
        $el.addClass('typing')
            .attr('data-username', username);

        // append it to the chat
        addChatElement($el, true);
    }

    // gets the 'X is typing' messages of a given user
    function getTypingMessages(username) {
        return $chatElements.find('.typing.message[data-username=' + username + ']');
    }

    // removes the visual chat typing message
    function removeChatTyping(username) {
        getTypingMessages(username).fadeOut(function () {
            $(this).remove();
        });
    }

    // updates the typing event
    function updateTyping() {
        if (status.loggedIn) {

            // user started typing
            if (!status.typing) {
                status.typing = true;
                socket.emit('start_typing');
            }

            // save time
            status.lastTypingTime = (new Date()).getTime();

            // after a fixed timeout -> user stopped typing
            setTimeout(function () {
                var typingTimer = (new Date()).getTime();
                var timeDiff = typingTimer - status.lastTypingTime;
                if (timeDiff >= TYPING_TIMER_LENGTH && status.typing) {
                    socket.emit('stop_typing');
                    status.typing = false;
                }
            }, TYPING_TIMER_LENGTH);
        }
    }

});
