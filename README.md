# Insta-Honyaku

This basic node application takes a microphone input and outputs subtitles in English and translates them into Japanese

## Getting Started

```
npm i
```

### Prerequisites

Windows & Mac: [SoX](http://sox.sourceforge.net/)
Linux: Alsa-utils

### SoX

Download, unzip and add the folder path to your `PATH` environment variable.

Execute `sox` to test.

## TODO

* Pipe to speaker  
* Fix the models -- Slight pauses are interpreted as periods and it causes problems with the translation  
* Models include, speech to text model and translation model  
* We can download transcripts from podcasts, etc. to improve model
* Add better README  

## License

This project is licensed under the ISC License - see the [LICENSE.md](LICENSE.md) file for details
