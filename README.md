## Virtual Classbox 3.1 [![Build Status](https://travis-ci.org/pveyes/vcb.png?branch=master)](https://travis-ci.org/pveyes/vcb)

> Capstone Project. Video, Audio & Data Streaming + Storage

## Overview

My capstone project. Implementing video, audio, and data (presentation slide, chat) streaming using WebRTC and Websocket

## Start

Install requirement

    npm install

Enable these flag on `chrome://flags`

- Experimental Extension APIs
- Extensions on chrome:// URLs

Open `chrome://extensions`, click **Load unpacked extension** and select `vcb/app` folder. Click Launch

Start STUN server

    node index.js

## Build

Client side javascript and CSS must be built after edit. Grunt is used for build and must be installed

    npm install -g grunt-cli
    grunt build

## Testing

> TODO