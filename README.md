## Virtual Classbox 3.1

> Capstone Project. Video, Audio & Data Streaming + Storage

## Start

Enable these flag on `chrome://flags`

- Experimental Extension APIs
- Extensions on chrome:// URLs

Open `chrome://extensions`, click **Load unpacked extension** and select `vcb/app` folder. Click Launch

Start STUN server

    node index.js

## Build

Client side javascript and CSS must be built after edit. Grunt is used for build and must installed

    npm install -g grunt-cli
    grunt build

## Testing

> TODO