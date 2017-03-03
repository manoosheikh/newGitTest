'use strict';

// last messages
var messages = [];
const MAX_MESSAGES = 20;

// return all the stored events
exports.getMessages = function() {
    return messages;
};

// store an event
exports.storeMessage = function (message) {

    // store the message
    messages.push(message);

    // make sure to store at most MAX_MESSAGES messages
    if (messages.length > MAX_MESSAGES) {
        messages.shift();
    }
};
