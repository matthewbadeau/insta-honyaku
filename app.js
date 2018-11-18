// this example reproduced  with generous permission of @ricardoatsouza on Github
// source: https://github.com/ricardoatsouza/ms-bing-speech-streaming-example
// Modified by Matthew
"use strict";
const fs = require('fs');
const process = require('process');
const request = require('request');
const uuidv4 = require('uuid/v4');
const bingSpeechService = require('ms-bing-speech-service');
const Mic = require('node-microphone');
const Speaker = require('speaker');
const debug = require('debug')('app');

const now = (new Date(Date.now())).toISOString().replace(/[:-]/gi, '');

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
let micStream = mic.startRecording();

// Make wav file stream
let wavFile = fs.createWriteStream('./wav/speech_' + now + '.wav');

// Log microphone info
mic.on('info', data => debugMic.logEvent(data.toString()))
debugMic
    // Throw microphone errors when I mess something up
    .event(mic, 'error');

// Make txt file stream
let txtFile = fs.createWriteStream('./txt/speech_' + now + '.txt');

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
      txtFile.write(event.DisplayText + '\r');
      request(options)
          .on('response', function(response){
            debugTR.log('Response %s', response.statusCode);
          })
          .on('data', (body) => {
            let data = (JSON.parse(body))[0];
            txtFile.write(data['translations'][0]['text'] + '\r');
            debugTR.log('Data: %o', data);
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

    // microphone stream written to .wav file
    micStream.pipe(wavFile);
    // The microphone stream will be sent to the MS recognizer
    recognizer.sendStream(micStream);

}).catch((error) => {
    debugMS.error('Error while trying to start the recognizer. %O', error);
    process.exit(1);
});
