// this example reproduced  with generous permission of @ricardoatsouza on Github
// source: https://github.com/ricardoatsouza/ms-bing-speech-streaming-example
// Modified by Matthew
"use strict";
const process = require('process');
const bingSpeechService = require('ms-bing-speech-service');
const Mic = require('node-microphone');
const debug = require('debug')('app');
function createLog (ns) {
    const subDebug = debug.extend(ns);
    const log = subDebug.extend('log');
    const logEvent = subDebug.extend('event:log');
    const errorEvent = subDebug.extend('event:error');
    const logger = {
        log,
        logEvent,
        errorEvent,
        error: subDebug.extend('error'),
        event: (target, name) => {
            if (name === 'error') {
                target.on(name, () => errorEvent('error: %o', err && err.stack || err));
                return logger;
            }
            target.on(name, (data) => {
                if (data !== undefined) {
                    logEvent('%s %o', name, data);
                    return;
                }
                logEvent(name);
            });
            return logger;
        }
    };
    return logger;
}
const debugMS = createLog('ms');
const debugMic = createLog('mic');

const config = require('./config.json');

// Create microphone stream
let mic = new Mic();
let stream = mic.startRecording();

// Log microphone info
mic.on('info', data => debugMic.logEvent(data.toString()))
debugMic
    // Throw microphone errors when I mess something up
    .event(mic, 'error');

// Create recognizer
const recognizer = new bingSpeechService(config.bingOptions);

// Event handler
const handleRecognition = (event) => {
    const status = event.RecognitionStatus;
    debugMS.log('%s: %o', status, event);
};

// Initialize the recognizer
recognizer.start().then(() => {
    debugMS.log("inited");

    recognizer.on('recognition', handleRecognition);
    debugMS
        .event(recognizer, 'error')
        .event(recognizer, 'close');

    // The microphone stream will be sent to the MS recognizer
    recognizer.sendStream(stream)
    
}).catch((error) => {
    debugMS.error('Error while trying to start the recognizer. %O', error);
    process.exit(1);
});