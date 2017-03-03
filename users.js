'use strict';

// usernames which are currently connected to the chat
var usernames = [];

// getter
exports.getUsers = function () {
    return usernames;
};

// insert a new user
// return true if the operation succeed
exports.insertUser = function (username) {
    var free = usernames.indexOf(username) === -1;
    if (free) {
        usernames.push(username);
    }
    return free;
};

// remove a user
// return true if the operation succeed
exports.removeUser = function (username) {
    var index = usernames.indexOf(username);
    if (index > -1) {
        usernames.splice(index, 1);
        return true;
    } else {
        return false;
    }
};