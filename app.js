// this example reproduced  with generous permission of @ricardoatsouza on Github
// source: https://github.com/ricardoatsouza/ms-bing-speech-streaming-example
// Modified by Matthew
"use strict";
const process = require('process');
const bingSpeechService = require('ms-bing-speech-service');
const Mic = require('mic');
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
let mic = Mic({
    // endian: 'big', // OR 'little'
    // bitwidth: '16', // OR 8 OR 24 OR anything valid supported by arecord OR sox
    // encoding: 'signed-integer', // OR 'unsigned-integer'
    // rate: '16000', // 8000 OR 16000 OR 44100 OR anything valid supported by arecord OR sox
    // channels: '1', // 1 OR 2 OR anything valid supported by arecord OR sox
    // fileType: 'raw', // wave on linux?
    // debug: true, // To get the full debug stuff
    // exitOnSilence: 6 // The 'silence' signal is raised after reaching these many consecutive frames
});
// mic.pause() - pauses the microphone
// mic.resume() - resumes the microphone
// mic.stop() - stops the stream

let stream = mic.getAudioStream();
stream.on('data', data => debugMic.log('received %d bytes', data.length));
debugMic
    .event(stream, 'error')
    .event(stream, 'startComplete')
    .event(stream, 'stopComplete')
    .event(stream, 'pauseComplete')
    .event(stream, 'resumeComplete')
    .event(stream, 'silence')
    .event(stream, 'processExitComplete')

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

    // Starting the mic after the init.
    mic.start();
    
}).catch((error) => {
    debugMS.error('Error while trying to start the recognizer. %O', error);
    process.exit(1);
});