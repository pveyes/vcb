var printArrayBuffer = function(ab){
	var dataView = new DataView(ab);
	console.log(['dataView:',dataView])
	for(var i=0;i<ab.byteLength;i++){
		console.log(dataView.getUint8(i));
	};
};

/** NginX is WEBM encoder using video codec VP_8
** @param fileEntry
** @param config
** @return void
*/
var Ngisx = function (fileEntry,config){
	var fileWriter = fileEntry;
	var currentTime = 0;
	var clusterTime = 0;
	var clusterMaxDuration = 30000 //30second
	// var clusterMaxDuration = 3000 //3second
	var clusterSize = 0;
	var segmentSize = 0;
	var queryFrame = new Array();

	/** Array of object {blob,position} to buffer Blob object before write to FileWriter
	*/
	var queryInsertFile = new Array();

	/** Position of data size {duration, cluster}
	*/
	var bytePosition = {
		duration: {data:null, position:null}, 
		segment: {data:null, position:null},
		cluster: {data:null, position:null}
	};	

	/** Convert string input to array buffer of string
	** @param @str string
	** @return @arrayBuffer
	*/
	var strToArrayBuffer = function(str){
		var byteLength = str.length;
		var arrayBuffer = new ArrayBuffer(byteLength);
		var dataView = new DataView(arrayBuffer);
		var splitStr = str.split('');
		for (var i in splitStr){
			dataView.setUint8(i,splitStr[i].charCodeAt(0));
		};
		return arrayBuffer;
	};
	/** Convert integer input to array buffer of number
	** @param @num integer
	** @param @bytes integer 
	** @result @arrayBuffer
	 */
	var numToArrayBuffer = function(num,bytes){
		var byteLength;
		var nbit = 0;
		var parts = new Array();
		do {
			parts.push(num & 0xff);
			num = num >> 8;
		}while(num);
		if(bytes){
			if(bytes>parts.length){
				nbit = bytes - parts.length;
				byteLength = bytes;
			} else {
				byteLength = parts.length;
			}
		} else {
			var byteLength = parts.length;
		};
		var arrayBuffer = new ArrayBuffer(byteLength);
		var dataView = new DataView(arrayBuffer);
		var partsReverse = parts.reverse()
		for(var i in partsReverse){
			var offset = Number(i)+nbit;
			dataView.setUint8(offset,partsReverse[i]);
		};
		return arrayBuffer;
	};

	/** Convert integer/float input into array buffer of float
	** @param @num integer/float number
	** @param @floatType ['float32','float64']
	** @result @arrayBuffer
	 */
	var floatToArrayBuffer = function(num,floatType){
		var type = floatType || 'float32';
		var arrayBuffer = new ArrayBuffer(8);
		var dataView = new DataView(arrayBuffer);
		switch (type){
			case 'float32':
				dataView.setFloat32(0,num);
				arrayBuffer = arrayBuffer.slice(0,4);
				break;
			case 'float64':
				dataView.setFloat64(0,num);
				break;
		};
		return arrayBuffer;
	};
	
	/** Generate array buffer of data size EBML
	** @param @dataSize int of data size class [0..7]
	**		dataSize1 : 1xxx xxxx
	**		dataSize2 : 01xx xxxx  xxxx xxxx
	**		dataSize3 : 001x xxxx  xxxx xxxx  xxxx xxxx
	**		dataSize4 : 0001 xxxx  xxxx xxxx  xxxx xxxx  xxxx xxxx
	**		dataSize5 : 0000 1xxx  xxxx xxxx  xxxx xxxx  xxxx xxxx  xxxx xxxx
	**		dataSize6 : 0000 01xx  xxxx xxxx  xxxx xxxx  xxxx xxxx  xxxx xxxx  xxxx xxxx
	**		dataSize7 : 0000 001x  xxxx xxxx  xxxx xxxx  xxxx xxxx  xxxx xxxx  xxxx xxxx  xxxx xxxx
	**		dataSize8 : 0000 0001  xxxx xxxx  xxxx xxxx  xxxx xxxx  xxxx xxxx  xxxx xxxx  xxxx xxxx  xxxx xxxx
	** @param @length byteLength of data
	** @return @arrayBuffer 
	 */
	var dataSizeToArrayBuffer = function(dataSize,length){
		var arrayBufferLength = new DataView (numToArrayBuffer(length));
		var lenArrayBufferLength = arrayBufferLength.byteLength;
		var arrayBuffer;
		var dataView;
		if(dataSize){
			arrayBuffer = new ArrayBuffer(dataSize);
			dataView = new DataView(arrayBuffer);
			var delta;
			if(lenArrayBufferLength < arrayBuffer.byteLength){
				delta = arrayBuffer.byteLength - lenArrayBufferLength;
			} else {
				delta = 0
			}
			dataView.setUint8(0,1<<(8-dataSize));
			for(var i=0;i<lenArrayBufferLength;i++){
				if(i==0){
					if(delta){
						dataView.setUint8(i+delta,arrayBufferLength.getUint8(i));
					} else {
						dataView.setUint8(i,arrayBufferLength.getUint8(i) | 1<<(8-dataSize));
					}
				} else {
					dataView.setUint8(i+delta,arrayBufferLength.getUint8(i));
				};
			}
		} else {
			// check overflow
			var overflow;
			if(arrayBufferLength.getUint8(0) < ((1<<(8-lenArrayBufferLength))-1)){
				overflow = false;
			} else {
				overflow = true;
			}
			// generate ArrayBuffer
			if(overflow){
				arrayBuffer = new ArrayBuffer(lenArrayBufferLength+1);
				dataView = new DataView(arrayBuffer);
				dataView.setUint8(0,1<<(8-lenArrayBufferLength-1));
				for(var i=0;i<lenArrayBufferLength;i++){
					dataView.setUint8(i+1,arrayBufferLength.getUint8(i))
				};
			} else {
				arrayBuffer = new ArrayBuffer(lenArrayBufferLength);
				dataView = new DataView(arrayBuffer);
				for(var i=0;i<lenArrayBufferLength;i++){
					if(i==0){
						dataView.setUint8(i,arrayBufferLength.getUint8(i) | 1<<(8-lenArrayBufferLength))
					} else {
						dataView.setUint8(i,arrayBufferLength.getUint8(i))
					};
				};
			};
		};
		return arrayBuffer;
	} 

	/** Update dataSize of EBML before generating Blob object. Its used in initHeaderEBML()
	** @param @json object/array EBML
	** @return void
	*/
	var updateEBMLDataSize = function(json){
		for (var i = json.length-1; i>=0; i--){
			if(typeof json[i].data == 'undefined' && i!=json.length){
				// console.log(i);
				// console.log(json[i]);
				var dataSize = 0;
				var j = i+1;
				while(j<json.length && json[j].level > json[i].level){
					// console.log(json[j]);
					dataSize += json[j].arrayBuffer.id.byteLength + json[j].arrayBuffer.dataSize.byteLength;
					if(json[j].arrayBuffer.data){
						dataSize += json[j].arrayBuffer.data.byteLength;
					};
					// console.log('dataSize: '+dataSize.toString());
					j++;
				};
				var dataSizeClass = json[i].dataSize || 0;
				json[i].arrayBuffer.dataSize = dataSizeToArrayBuffer(dataSizeClass,dataSize);
				switch(json[i].id){
					//dataSize of Segment
					case 0x18538067:
						segmentSize = dataSize;
						break;
					//dataSize of Cluster
					case 0x1f43b675: 
						clusterSize = dataSize;
						break;
				};
			};
		};
	};
	/** Generate Blob object of EBML before write to FileWriter
	** @param @json object/array EBML
	** @return void
	*/
	var generateBlobEBML = function(json){
		var ebml = new Array();
		for(var i in json){
			ebml.push(json[i].arrayBuffer.id);
			ebml.push(json[i].arrayBuffer.dataSize);
			if(json[i].arrayBuffer.data){
				ebml.push(json[i].arrayBuffer.data);
			};
		};
		return new Blob(ebml);
	};
	/** Find byte position of EBML (id/dataSize/data)
	** @param @json object/array EBML
	** @return @pos object of {@duration,@segment}
	**		@duration position of float64 duration value
	**		@segment position of Segment dataSize 
	*/
	var getCustomPosition = function(json){
		var pos = {
			duration: {data:null, position:null}, 
			segment: {data:null, position:null},
			cluster: {data:null, position:null}
		};

		var num = 0;
		for(var i=0;i<json.length;i++){
			num += json[i].arrayBuffer.id.byteLength;
			num += json[i].arrayBuffer.dataSize.byteLength;
			if (json[i].arrayBuffer.data!=undefined){
				num += json[i].arrayBuffer.data.byteLength;
			}
			switch(json[i].id){
				//Duration
				case 0x4489:
					pos.duration.position = num - json[i].arrayBuffer.data.byteLength;
					pos.duration.data = json[i].arrayBuffer.data;
					break;
				//dataSize of Segment
				case 0x18538067:
					pos.segment.position = num - json[i].arrayBuffer.dataSize.byteLength;
					pos.segment.data = json[i].arrayBuffer.dataSize;
					break;
				//dataSize of Cluster
				case 0x1f43b675:
					pos.cluster.position = num - json[i].arrayBuffer.dataSize.byteLength;
					pos.cluster.data = json[i].arrayBuffer.dataSize;
					break;
			}
		};
		// console.log(pos)
		return pos;
	};
	/** Default EBML header element
	** array of {id,level,(opt)dataSize,(opt)data}
	*/
	var EBML = [
		{ // EBML Header
			id: 0x1a45dfa3,
			level: 0
		},
		{ // EBMLVersion
			id: 0x4286,
			level: 1,
			data: 1
		},
		{ // EBMLReadVersion
			id: 0x42f7,
			level: 1,
			data: 1
		},
		{ // EBMLMaxIDLength
			id:0x42f2,
			level: 1,
			data: 4
		},
		{ // EBMLMaxSizeLength
			id: 0x42f3,
			level: 1,
			data: 8
		},
		{ // DocType
			id: 0x4282,
			level: 1,
			data: "webm"
		},
		{ // DocTypeVersion
			id: 0x4287,
			level: 1,
			data: 2
		},
		{ // DocTypeReadVersion
			id: 0x4285,
			level: 1,
			data: 2
		},
		{ // Segment
			id: 0x18538067,
			level: 0,
			dataSize: 8
		},
		{ // SegmentInfo
			id: 0x1549a966,
			level: 1
		},
		{ // TimecodeScale
			id: 0x2ad7b1,
			level: 2,
			data: 1e6
		},
		{ // MixingApp
			id: 0x4d80,
			level: 2,
			data: 'ngisx'
		},
		{ // WritingApp
			id: 0x5741,
			level: 2,
			data: 'ngisx'
		},
		{ // Duration
			id: 0x4489,
			level: 2,
			dataSize: 1,
			data: floatToArrayBuffer(0,'float64') // floatToArrayBuffer(0)
		},
		{ // DateUTC
			id: 0x4461,
			level: 2,
			dataSize: 1,
			data: floatToArrayBuffer(Date.now(),'float64')
		},
		{ // SegmentTracks
			id: 0x1654ae6b,
			level: 1
		},
		{ // TrackEntry For Video Track
			id: 0xae,
			level: 2
		},
		{ // TrackID
			id: 0xd7,
			level: 3,
			data: 1
		},
		{ // TrackUID
			id: 0x73c5,
			level: 3,
			data: 1
		},
		{ // FlagLacing
			id: 0x9c,
			level: 3,
			data: 0
		},
		{ // Language
			id: 0x22b59c,
			level: 3,
			data: 'und' // undetermined
		},
		{ // CodecID
			id: 0x86,
			level: 3,
			data: 'V_VP8'
		},
		{ // CodecName
			id: 0x258688,
			level: 3,
			data: 'VP8'
		},
		{ // TrackType
			id: 0x83,
			level: 3,
			data: 1
		},
		{ // Video
			id: 0xe0,
			level: 3
		},
        { // PixelWidth
            id: 0xb0, 
            level: 4,
            data: config.PixelWidth || 640
        },
        { // PixelHeight
            id: 0xba, 
            level: 4,
            data: config.PixelHeight || 480
        },
        { // TrackEntry For Audio Track
			id: 0xae,
			level: 2
		},
		{ // TrackID
			id: 0xd7,
			level: 3,
			data: 2
		},
		{ // TrackUID
			id: 0x73c5,
			level: 3,
			data: 2
		},
		{ // FlagLacing
			id: 0x9c,
			level: 3,
			data: 0
		},
		{ // Language
			id: 0x22b59c,
			level: 3,
			data: 'und' // undetermined
		},
		{ // CodecID
			id: 0x86,
			level: 3,
			// data: 'A_PCM/FLOAT/IEEE' //using 32bit float IEEE little endian
			data: 'A_PCM/INT/BIG'
		},
		{ // CodecName
			id: 0x258688,
			level: 3,
			data: 'PCM'
		},
		{ // TrackType
			id: 0x83,
			level: 3,
			data: 2
		},
		{ // Audio
			id: 0xe1,
			level: 3
		},
        { // Channel
            id: 0x9f, 
            level: 4,
            data: 1
        },
        { // SamplingFrequency
            id: 0xb5, 
            level: 4,
            data: floatToArrayBuffer(48000,'float64')
            // data: floatToArrayBuffer(44100,'float64')
        },
        { // Bit depth
            id: 0x6264, 
            level: 4,
            data: 16
            // data: 32 //32bit float IEEE little endian
        },
        { // Cluster
        	id:  0x1f43b675,
        	dataSize:8,	
        	level: 1
        },
        { // Cluster Timecode
        	id:  0xe7,
        	level: 2,
        	data: numToArrayBuffer(0,4)
        }
	];
	/** Initiation of EBML
	** @param @json object/array of EBML
	** @return 
	*/
	var initHeaderEBML =  function(json,file){
		var blobEBML;
		for (var i = 0; i < json.length; i++){
			// console.log(i)
			var lenData = undefined;
			var arrayBufferData = undefined;
			var arrayBufferDataSize = undefined;
			var lenArrayBufferData = undefined;
			var arrayBufferId = numToArrayBuffer(json[i].id);
			if(json[i].data!=undefined){
				var data = json[i].data
				if(typeof data == 'number') arrayBufferData = numToArrayBuffer(data);
				if(typeof data == 'string') arrayBufferData = strToArrayBuffer(data);
				if(typeof data == 'object') arrayBufferData = data;
			};
			if(arrayBufferData){
				lenArrayBufferData = arrayBufferData.byteLength;
			} else {
				lenArrayBufferData = 0;
			};
			if(json[i].dataSize){
				arrayBufferDataSize = dataSizeToArrayBuffer(json[i].dataSize, lenArrayBufferData);
			} else{
				if(json[i].data!=undefined){
					arrayBufferDataSize = dataSizeToArrayBuffer(0, lenArrayBufferData);
				};
			};
			json[i].arrayBuffer = {
				id: arrayBufferId,
				dataSize: arrayBufferDataSize,
				data: arrayBufferData
			}
		};
		updateEBMLDataSize(json);
		bytePosition = getCustomPosition(json);
		blobEBML = generateBlobEBML(json);
		// console.log(json);console.log(blobEBML);
		// fileWriter.write(blobEBML);
		fileWriter.truncate(0);
		processWriteFile(0,blobEBML);
	};
	/** Initiation of Ngisx object
	*/
	var initNginX = function(){
		initHeaderEBML(EBML,fileWriter);
	};
	/** Create cluster and insert to frameQuery to write to fileWriter
	** @param @timecode int of time cluster (on nanosecond as timeCodeScale)
	*/
	var createCluster = function(timecode){
		var createBlobClusterTimecode = function(timecode){
			var arrayBufferId = new Int8Array([0xe7]).buffer;
			var arrayBufferData = numToArrayBuffer(timecode,4);
			var arrayBufferDataSize = dataSizeToArrayBuffer(8,arrayBufferData.byteLength);
			var blobClusterTimecode = new Blob([arrayBufferId,arrayBufferDataSize,arrayBufferData]);
			return blobClusterTimecode;
		};
		var blobClusterTimecode = createBlobClusterTimecode(timecode);
		// Cluster Element
		var arrayBufferId = new Uint8Array([0x1f,0x43,0xb6,0x75]).buffer;
		var arrayBufferData = blobClusterTimecode;
		var arrayBufferDataSize = dataSizeToArrayBuffer(8,arrayBufferData.size); 
		var blobCluster = new Blob([arrayBufferId,arrayBufferDataSize,arrayBufferData]);
		// Sync position due to queryInsertFile content
		processWriteFile(0,blobCluster,'addCluster');
	};
	/** Update some parameters on EBML header such as duration, segmentSize, clusterSize, clusterPosition 
	** then inserting to frameQuery
	** @return null
	*/
	var updateEBML = function(){
		// update duration on EBML header
		var arrayBufferDuration = floatToArrayBuffer(currentTime,'float64');
		processWriteFile(
			bytePosition.duration.position,
			new Blob([arrayBufferDuration]),
			'updateDuration'
		);
		
		// dataSize of Segment Cluster Element
		var arrayBufferSegment = dataSizeToArrayBuffer(bytePosition.segment.data.byteLength,segmentSize);
		processWriteFile(
			bytePosition.segment.position,
			new Blob([arrayBufferSegment]),
			'updateSegment'
		);

		// dataSize of Segment Cluster Element
		var arrayBufferSegmentCluster = dataSizeToArrayBuffer(bytePosition.cluster.data.byteLength,clusterSize);
		processWriteFile(
			bytePosition.cluster.position,
			new Blob([arrayBufferSegmentCluster]),
			'updateCluster'
		);	
	};
	/** Update ebml after stop record 
	*/
	var stopRecord = function(){
		queryFrame.push('update');
	};
	/** Process writing frameQuery to fileWriter
	*/
	var processWriteFileFromQuery = function(){ 
		if(queryInsertFile.length){
			var query = queryInsertFile.shift();
			switch(query.job){
				case 'init':
					break;
				case 'clearData':
					break;
				case 'addFrame':
					var blobSimpleBlock = createBlobSimpleBlock(query.data);
					console.log(['duration',query.data.timecode,'clusterTime',clusterTime,'clusterSize',clusterSize,'currentTime',currentTime]);
					fileWriter.seek(fileWriter.length);
					fileWriter.write(blobSimpleBlock);
					currentTime += query.data.timecode;
					clusterTime += query.data.timecode;
					segmentSize += blobSimpleBlock.size;
					clusterSize += blobSimpleBlock.size;
					if(clusterTime > clusterMaxDuration){
						// clusterTime = 0;
						//update duration,cluterSize,segmentSize befor move to new cluster
						updateEBML();
						//create cluster	
						createCluster(currentTime);
					}
					break;
				case 'addCluster':
					console.log(['addCluster',
						'clusterPosition',bytePosition.cluster.position,
						'segmentPosition',bytePosition.segment.position,
						'durationPosition',bytePosition.duration.position
					]);
					bytePosition.cluster.position = fileWriter.length + 4;
					fileWriter.seek(fileWriter.length);
					fileWriter.write(query.data);
					clusterTime = 0;
					clusterSize = query.data.size-12;
					segmentSize += query.data.size;
					break;
				case 'update':
					console.log(['udpateAll',
						'clusterPosition',bytePosition.cluster.position,
						'segmentPosition',bytePosition.segment.position,
						'durationPosition',bytePosition.duration.position
					]);
					updateEBML();
					break;
				case 'updateDuration':
					fileWriter.seek(query.position);
					fileWriter.write(query.data);
					break;
				case 'updateSegment':
					fileWriter.seek(query.position);
					fileWriter.write(query.data);
					break;
				case 'updateCluster':
					fileWriter.seek(query.position);
					fileWriter.write(query.data);
					break;
				default:
					if(query.position){
						fileWriter.seek(fileWriter.length);
					}
					fileWriter.write(query.data);
					break;
			}
		} else {
			if(queryFrame.length){
				var frame = queryFrame.shift()
				if(frame=='update'){
					processWriteFile(0,new Blob([]),'update');
				} else {
					processWriteFile(0,frame,'addFrame');
				}
			}
		};
	};
	/** Process insert data to frameQuery (to sync) before write to fileWriter
	** Query object of {@bytePosition, @data, @job}
	** @param @bytePosition byte offset of FileWriter
	** @param @data Blob object write to file
	** @job list of ['init','clearData','addFrame','addCluster','updateCluster','updateSegment','updateDuration'] 
	*/
	var processWriteFile = function(bytePosition,data,job){
		console.log('push to query '+job);
		queryInsertFile.push({position:bytePosition, data:data, job:job});
		if (fileWriter.readyState==2){
			processWriteFileFromQuery();
		};
	}
	/** Create simpleBlock object
	** @param @data object of {timecode,frame,trackid,flags}
	*/
	var createBlobSimpleBlock = function(data){
		var arrayBufferId = new Int8Array([0xa3]).buffer;
		var arrayBufferTrackId = dataSizeToArrayBuffer(0,data.trackid);
		var arrayBufferTimeCode = numToArrayBuffer(clusterTime,2);
		var arrayBufferFlags = new Uint8Array([data.flags]).buffer;
		var dataSize = arrayBufferTrackId.byteLength + arrayBufferTimeCode.byteLength + arrayBufferFlags.byteLength + (data.frame.length||data.frame.byteLength);
		var arrayBufferDataSize = dataSizeToArrayBuffer(0,dataSize);
		var blobSimpleBlock = new Blob([arrayBufferId,arrayBufferDataSize,arrayBufferTrackId,arrayBufferTimeCode,arrayBufferFlags,data.frame]);
		console.log('createSimpleBlock Finish');
		return blobSimpleBlock;
	};
	/** Add audio/video frame to generate WebM 
	** @param @frame string of audio/video frame
	** @param @type string of ['video','audio']
	** @param @duration duration of each video frame (ignore audio frame duration so set it to 0)
	*/
	var addFrame = function(frame,type,duration){
		var data = new Object();
		data.timecode = duration;
		data.frame = frame;
		switch(type){
			case 'video':
				data.trackid = 1;
				data.flags = 0x80; //keyframe
				break;
			case 'audio':
				data.trackid = 2;
				data.flags = 0x00; 
				break;
		};
		queryFrame.push(data);
		if (fileWriter.readyState==2){
			processWriteFileFromQuery();
		};
	};	
	/** return local variable for analysis
	*/
	var getQuery = function(){
		return queryInsertFile;
	};
	/** Override fileWriter.onwrite eventHandler to process writing queryInssertFile to file WebM
	*/
	fileWriter.onwrite = function(){
		processWriteFileFromQuery();
	};
	/** return local variable for analysis
	*/
	var getLocalVariable = function(){
		return {
			clusterSize:clusterSize, 
			clusterTime:clusterTime, 
			segmentSize:segmentSize, 
			currentTime:currentTime,
			bytePosition:bytePosition
		};
	};
	return {
		init: initNginX,
		add: addFrame,
		// getBlob: null,
		// getQuery: getQuery,
		// getLocalVariable: getLocalVariable,
		stop: stopRecord,
		update: updateEBML,
	};
}