// this example reproduced  with generous permission of @ricardoatsouza on Github
// source: https://github.com/ricardoatsouza/ms-bing-speech-streaming-example
// Modified by Matthew
"use strict";
const process = require('process');
const bingSpeechService = require('ms-bing-speech-service');
const Mic = require('node-microphone');

const config = require('./config.js');

// Create microphone stream
let mic = new Mic();
let stream = mic.startRecording();

// Log microphone info
mic.on('info', (info) => { console.log(info.toString()); });

// Throw microphone errors when I mess something up
mic.on('error', (error) => { console.log(error); });

// Create recognizer
const recognizer = new bingSpeechService(config.bingOptions);

// Event handler
const handleRecognition = (event) => {
    const status = event.RecognitionStatus;
    console.log(`${status}:  ${JSON.stringify(event)}`);
};

// Initialize the recognizer
recognizer.start().then(() => {
    console.log("Ms speech api connected");
    recognizer.on('recognition', (event) => {handleRecognition(event)});
    recognizer.on('close', () => {console.log("Recognizer is closed.")});
    recognizer.on('error', (error) => {console.error(error)});

	// The microphone stream will be sent to the MS recognizer
    recognizer.sendStream(stream)
    
}).catch((error) => {
	console.error("Error while trying to start the recognizer.");
	console.error(error);
	process.exit(1);
});