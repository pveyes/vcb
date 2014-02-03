var recordWebM = function(stream){
	var inputStream = stream;
	var WebM;
	var statusRecording; //0: not recording, 1: recording, 2: finish recording
	var fileWriter;
	var reqID;
	var timeCurrent;
	var acsp; // audioCreateScriptProcessor
	var recordPixelHeight = 240;
	var recordPixelWidth = 320;
	var canvas = document.createElement('canvas');
	canvas.width = recordPixelWidth;
	canvas.height = recordPixelHeight;
	var context = canvas.getContext('2d');
	var videoLocalStream = document.createElement('video');

	videoLocalStream.src = window.URL.createObjectURL(inputStream);
	videoLocalStream.autoplay = true;
	videoLocalStream.muted = true;
	videoLocalStream.height = recordPixelHeight;
	videoLocalStream.width = recordPixelWidth;
	/*
	** parseWebP, parseRIFF, strToBuffer is used for process WebP images, extracting to produce VP8 frame before write to WebM file
	 */
	var parseWebP = function(riff) {
	    var VP8 = riff.RIFF[0].WEBP[0];

	    var frame_start = VP8.indexOf('\x9d\x01\x2a'); // A VP8 keyframe starts with the 0x9d012a header
	    for (var i = 0, c = []; i < 4; i++) c[i] = VP8.charCodeAt(frame_start + 3 + i);

	    var width, horizontal_scale, height, vertical_scale, tmp;

	    //the code below is literally copied verbatim from the bitstream spec
	    tmp = (c[1] << 8) | c[0];
	    width = tmp & 0x3FFF;
	    horizontal_scale = tmp >> 14;
	    tmp = (c[3] << 8) | c[2];
	    height = tmp & 0x3FFF;
	    vertical_scale = tmp >> 14;
	    return {
	        width: width,
	        height: height,
	        data: VP8,
	        riff: riff
	    };
	}

	var parseRIFF = function(string) {
	    var offset = 0;
	    var chunks = { };

	    while (offset < string.length) {
	        var id = string.substr(offset, 4);
	        var len = parseInt(string.substr(offset + 4, 4).split('').map(function(i) {
	            var unpadded = i.charCodeAt(0).toString(2);
	            return (new Array(8 - unpadded.length + 1)).join('0') + unpadded;
	        }).join(''), 2);
	        var data = string.substr(offset + 4 + 4, len);
	        offset += 4 + 4 + len;
	        chunks[id] = chunks[id] || [];

	        if (id == 'RIFF' || id == 'LIST') {
	            chunks[id].push(parseRIFF(data));
	        } else {
	            chunks[id].push(data);
	        }
	    }
	    return chunks;
	}

	var strToBuffer = function(str) {
	    return new Uint8Array(str.split('').map(function(e) {
	        return e.charCodeAt(0);
	    }));
	}

	var reqAnime = function(time){
		// Context
		context.drawImage(videoLocalStream,0,0,recordPixelWidth,recordPixelHeight);
		
		// Timing
		var delta = time - timeCurrent;
		timeLast = timeCurrent;
		timeCurrent = time;
		

		// Generate Image
		var dataImage = canvas.toDataURL('image/webp',1);
		var dataBinaryImageWebP = parseWebP(parseRIFF(atob(dataImage.slice(23))));
		var duration = Math.round(delta);
		if(duration>0){
			var dataImageWebp = strToBuffer(dataBinaryImageWebP.data.slice(4));
			WEBM.add(dataImageWebp,'video',Math.round(delta));
		}
		reqID = requestAnimationFrame(reqAnime);
	};

	var initRecord = function(){
		var handlingCreateWriter = function(err){
			console.log('Error: Create Writter')
		}
		chrome.fileSystem.chooseEntry(
			{
				type: 'saveFile', 
				suggestedName: '3.webm'
			}, 
			function(writableFileEntry) {
				writableFileEntry.createWriter(
					function(writer) {
						fileWriter = writer;
						statusRecording = 0;
						startRecord();
					}, 
					handlingCreateWriter
				);
			}
		)
	}

	var startRecord = function(){
		console.log(statusRecording);
		switch(statusRecording){
			case 0: //nothing
				statusRecording = 1; 
				break;
			case 1:
				return console.log('Error: It has been recording. Cant start recording in parallel.');
				break;
			case 2:
				return console.log('Error: Cant start recording, please call init() again');
				break;
			default: 
				return console.log('Error: Cant start recording, please call init() once');
				break;
		}

		// WebM encoder
		configWebM = {
			PixelHeight: recordPixelHeight,
			PixelWidth: recordPixelWidth
		}
		WEBM = new Ngisx(fileWriter,configWebM);
		WEBM.init();
		
		// Audio Process
		var ac = new webkitAudioContext();
		var acmss = ac.createMediaStreamSource(inputStream);
		acsp = ac.createScriptProcessor(16384,2,2);
		acmss.connect(acsp)
		acsp.connect(ac.destination)
		acsp.onaudioprocess = function(e){
			var audio32Float = e.inputBuffer.getChannelData(0);
			var ab = new ArrayBuffer(2*audio32Float.length);
			var dv = new DataView(ab)
			for(var i in audio32Float){
				dv.setInt16(Number(i)*2,audio32Float[i]*0x7fff);
			}
			WEBM.add(ab,'audio',0);
		}

		performanceID = performance.now();
		timeCurrent = performanceID;
		reqID = requestAnimationFrame(reqAnime);
	} 

	var stopRecord = function(){
		// stopAudioFrameProcess
		acsp.onaudioprocess = function(e){
			tmp1=e;
		}
		// stopImageFrameProcess
		cancelAnimationFrame(reqID);
		WEBM.stop();
		statusRecording = 2;
	}

	return {
		init: initRecord,
		start: startRecord,
		stop: stopRecord
	}
}
