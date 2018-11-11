// this example reproduced  with generous permission of @ricardoatsouza on Github
// source: https://github.com/ricardoatsouza/ms-bing-speech-streaming-example
// Modified by Matthew
"use strict";
const process = require('process');
const request = require('request');
const uuidv4 = require('uuid/v4');
const bingSpeechService = require('ms-bing-speech-service');
const Mic = require('node-microphone');
const Speaker = require('speaker');
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
const debugTR = createLog('tr');

const config = require('./config.js');

// Set HTTP options for Microsoft Translator
const translatorReqOptions = {
    method: 'POST',
    baseUrl: 'https://api.cognitive.microsofttranslator.com/',
    url: 'translate',
    qs: {
      'api-version': '3.0',
      'to': config.translatorOptions.toLanguage,
      'from': config.translatorOptions.fromLanguage
    },
    headers: {
      'Ocp-Apim-Subscription-Key': config.translatorOptions.subscriptionKey,
      'Content-type': 'application/json',
      'X-ClientTraceId': uuidv4().toString()
    },
    json: true
};

// Create the Speaker instance
const speaker = new Speaker({
    channels: 2,          // 2 channels
    bitDepth: 16,         // 16-bit samples
    sampleRate: 44100     // 44,100 Hz sample rate
});

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

    if (status === "Success"){
      // Deep copy the only way I know how
      let options = JSON.parse(JSON.stringify(translatorReqOptions));
      options['body'] = [{
        'text': event.DisplayText
      }];
      request(options)
          .on('response', function(response){
            debugTR.log('Response %s', response.statusCode);
          })
          .on('data', (body) => {
            debugTR.log('Data: %o', JSON.parse(body));
          })
          .on('error', function(err){
            debugTR.log('Error: %s', err);
          });
    }
    debugMS.log('%s: %o', status, event);
};

// Initialize the recognizer
recognizer.start().then(() => {
    debugMS.log("MS Speech service initiatilized");

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
