'use strict';

// import libraries
var EventEmitter = require('events');

// colours constansts
const COLOR_RED = '\x1b[31;1m';
const COLOR_BLUE = '\x1b[36;1m';
const COLOR_RESET = '\x1b[0m';


// create custom logger
var logger = new EventEmitter();
logger.on('info', function (message) {
    console.log(COLOR_BLUE, message, COLOR_RESET);
});
logger.on('error', function (message) {
    console.log(COLOR_RED, message, COLOR_RESET);
});

// export the logger-obj as a module
module.exports = logger;