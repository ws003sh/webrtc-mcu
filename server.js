/*
 * (C) Copyright 2014-2015 Kurento (http://kurento.org/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
var v720 = 'file:///home/lijianjun/movie/1.mp4'
var vHLS = 'http://ivi.bupt.edu.cn/hls/cctv1hd.m3u8'
var v1080 = 'file:///home/lijianjun/movie/Fate\ Stay\ Night\ Heaven\'s\ Feel\ II.\ Lost\ Butterfly\ \(2019\)\ \(1080p\ BluRay\ x265\ SAMPA\).mkv'
var path = require('path');
var url = require('url');
var express = require('express');
var minimist = require('minimist');
var ws = require('ws');
var kurento = require('kurento-client');
var fs    = require('fs');
var https = require('https');

var argv = minimist(process.argv.slice(2), {
    default: {
        as_uri: 'https://localhost:8443/',
        ws_uri: 'ws://localhost:8888/kurento'
    }
});

var options = {
  key:  fs.readFileSync('keys/server.key'),
  cert: fs.readFileSync('keys/server.crt')
};

var app = express();

/*
 * Definition of global variables.
 */
var idCounter = 0;
var candidatesQueue = {};
var kurentoClient = null;
var presenter = null;
var viewers = [];
var noPresenterMessage = 'No active presenter. Try again later...';

/*
 * Server startup
 */
var asUrl = url.parse(argv.as_uri);
var port = asUrl.port;
var server = https.createServer(options, app).listen(port, function() {
    console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>> Kurento Tutorial started <<<<<<<<<<<<<<<<<<<<<<<<<<');
    console.log('Open ' + url.format(asUrl) + ' with a WebRTC capable browser');
});

var wss = new ws.Server({
    server : server,
    path : '/one2many'
});

function nextUniqueId() {
	idCounter++;
	return idCounter.toString();
}

/*
 * Management of WebSocket messages
 */
wss.on('connection', function(ws) {

	var sessionId = nextUniqueId();
	console.log('Connection received with sessionId ' + sessionId);

    ws.on('error', function(error) {
        console.log('Connection ' + sessionId + ' error');
        stop(sessionId);
    });

    ws.on('close', function() {
        console.log('Connection ' + sessionId + ' closed');
        stop(sessionId);
	});
	
    ws.on('message', function(_message) {
        var message = JSON.parse(_message);
        console.log('Connection ' + sessionId + ' received message ', message);

        switch (message.id) {
        case 'viewer':
				startTest(sessionId, ws, message.sdpOffer, function(error, sdpAnswer) {
					if (error) {
						return ws.send(JSON.stringify({
							id : 'viewerResponse',
							response : 'rejected',
							message : error
						}));
					}
	
					ws.send(JSON.stringify({
						id : 'viewerResponse',
						response : 'accepted',
						sdpAnswer : sdpAnswer
					}));
				});
			break;

        case 'stop':
            stop(sessionId);
            break;

        case 'onIceCandidate':
            onIceCandidate(sessionId, message.candidate);
            break;

        default:
            ws.send(JSON.stringify({
                id : 'error',
                message : 'Invalid message ' + message
            }));
            break;
        }
    });
});

/*
 * Definition of functions
 */

// Recover kurentoClient for the first time.
function getKurentoClient(callback) {
    if (kurentoClient !== null) {
        return callback(null, kurentoClient);
    }

    kurento(argv.ws_uri, function(error, _kurentoClient) {
        if (error) {
            console.log("Could not find media server at address " + argv.ws_uri);
            return callback("Could not find media server at address" + argv.ws_uri
                    + ". Exiting with error " + error);
        }

        kurentoClient = _kurentoClient;
        callback(null, kurentoClient);
    });
}

function startTest(sessionId, ws, sdpOffer, callback) {

	if(sessionId > 1) {
		clearCandidatesQueue(sessionId);

		if (presenter === null) {
			stop(sessionId);
			return callback(noPresenterMessage);
		}

		presenter.pipeline.create('WebRtcEndpoint', function(error, webRtcEndpoint) {
			if (error) {
				stop(sessionId);
				return callback(error);
			}
			viewers[sessionId] = {
				"webRtcEndpoint" : webRtcEndpoint,
				"ws" : ws
			}

			if (presenter === null) {
				stop(sessionId);
				return callback(noPresenterMessage);
			}

			presenter.pipeline.create('PlayerEndpoint', {uri: v1080}, (err, playerEndpoint) => {
				if(err) {
					console.error('error at create PlayerEndpoint');
					pipeline.release();
					return callback(err);
				}

				playerEndpoint.connect(webRtcEndpoint)
				playerEndpoint.getUri(function(error, result) {
					if(error) {
						console.log('getUriError: ' , error)
					}
					console.log(' ---------- successfully get URI ---------');
					console.log('getUri: ' , result)
				})
				playerEndpoint.getName(function(error, result) {
					if(error) {
						console.log('getNameError: ' , error)
					}
					console.log(' ---------- getName ---------');
					console.log('getName: ' , result)
				})
				playerEndpoint.play(function(error, result) {
					if(error) {
						console.log('playError: ' , error)
					}
					console.log(' ---------- play ---------');
					console.log('play: ' , result)
				})

				playerEndpoint.getState(function(error, result) {
					if(error) {
						console.log('getStateError: ' , error)
					}
					console.log(' ---------- play ---------');
					console.log('getState: ' , result)
				})
				console.log(' ---------- successfully connect playerEndpoint ---------');
			})

			if (candidatesQueue[sessionId]) {
				while(candidatesQueue[sessionId].length) {
					var candidate = candidatesQueue[sessionId].shift();
					webRtcEndpoint.addIceCandidate(candidate);
				}
			}

			webRtcEndpoint.on('OnIceCandidate', function(event) {
				var candidate = kurento.getComplexType('IceCandidate')(event.candidate);
				ws.send(JSON.stringify({
					id : 'iceCandidate',
					candidate : candidate
				}));
			});

			webRtcEndpoint.processOffer(sdpOffer, function(error, sdpAnswer) {
				if (error) {
					stop(sessionId);
					return callback(error);
				}
				if (presenter === null) {
					stop(sessionId);
					return callback(noPresenterMessage);
				}
				callback(null, sdpAnswer);

				
			});

			webRtcEndpoint.gatherCandidates(function(error) {
				if (error) {
					stop(sessionId);
					return callback(error);
				}
			});
		});

		return
	} else {
		presenter = {
			id : sessionId,
			pipeline : null,
			webRtcEndpoint : null
		}
	}
	
	
	getKurentoClient(function(error, kurentoClient) {
		if (error) {
			stop(sessionId);
			return callback(error);
		}

		if (presenter === null) {
			stop(sessionId);
			return callback(noPresenterMessage);
		}
		
		kurentoClient.create('MediaPipeline', function(error, pipeline) {
			if (error) {
				stop(sessionId);
				return callback(error);
			}

			if (presenter === null) {
				stop(sessionId);
				return callback(noPresenterMessage);
			}

			presenter.pipeline = pipeline;
			pipeline.create('WebRtcEndpoint', function(error, webRtcEndpoint) {
				if (error) {
					stop(sessionId);
					return callback(error);
				}

				if (presenter === null) {
					stop(sessionId);
					return callback(noPresenterMessage);
				}

				presenter.webRtcEndpoint = webRtcEndpoint;
				pipeline.create('PlayerEndpoint', {uri: v1080}, (err, playerEndpoint) => {
					if(err) {
						console.error('error at create PlayerEndpoint');
						pipeline.release();
						return callback(err);
					}

					playerEndpoint.connect(presenter.webRtcEndpoint)

					console.log(' ---------- successfully connect playerEndpoint ---------');

					playerEndpoint.getUri(function(error, result) {
						if(error) {
							console.log('getUriError: ' , error)
						}
						console.log(' ---------- successfully get URI ---------');
						console.log('getUri: ' , result)
					})

					playerEndpoint.getVideoInfo(function(error, result) {
						if(error) {
							console.log('getVideoInfoError: ' , error)
						}
						console.log(' ---------- getVideoInfo ---------');
						console.log('getVideoInfo: ' , result)
					})

					playerEndpoint.getName(function(error, result) {
						if(error) {
							console.log('getNameError: ' , error)
						}
						console.log(' ---------- getName ---------');
						console.log('getName: ' , result)
					})

					playerEndpoint.play(function(error, result) {
						if(error) {
							console.log('playError: ' , error)
						}
						console.log(' ---------- play ---------');
						console.log('play: ' , result)
					})

					playerEndpoint.getState(function(error, result) {
						if(error) {
							console.log('getStateError: ' , error)
						}
						console.log(' ---------- play ---------');
						console.log('getState: ' , result)
					})
				})

			if (candidatesQueue[sessionId]) {
				while(candidatesQueue[sessionId].length) {
					var candidate = candidatesQueue[sessionId].shift();
					webRtcEndpoint.addIceCandidate(candidate);
				}
			}

			webRtcEndpoint.on('OnIceCandidate', function(event) {
				var candidate = kurento.getComplexType('IceCandidate')(event.candidate);
				ws.send(JSON.stringify({
					id : 'iceCandidate',
					candidate : candidate
				}));
			});
			
			webRtcEndpoint.processOffer(sdpOffer, function(error, sdpAnswer) {
				if (error) {
					stop(sessionId);
					return callback(error);
				}

				if (presenter === null) {
					stop(sessionId);
					return callback(noPresenterMessage);
				}

				callback(null, sdpAnswer);
			});

			webRtcEndpoint.gatherCandidates(function(error) {
				if (error) {
					stop(sessionId);
					return callback(error);
				}
			});

		});
	});
	});
}

function clearCandidatesQueue(sessionId) {
	if (candidatesQueue[sessionId]) {
		delete candidatesQueue[sessionId];
	}
}

function stop(sessionId) {
	if (presenter !== null && presenter.id == sessionId) {
		console.log('stopCommunication and release')
		for (var i in viewers) {
			var viewer = viewers[i];
			if (viewer.ws) {
				viewer.ws.send(JSON.stringify({
					id : 'stopCommunication'
				}));
			}
		}
		presenter.pipeline.release();
		presenter = null;
		viewers = [];

	} else if (viewers[sessionId]) {
		viewers[sessionId].webRtcEndpoint.release();
		console.log('webRtcEndpoint release')

		delete viewers[sessionId];
	}

	clearCandidatesQueue(sessionId);

	if (viewers.length === 1) {
        console.log('Closing kurento client');
        kurentoClient.close();
        kurentoClient = null;
    }
}

function onIceCandidate(sessionId, _candidate) {
    var candidate = kurento.getComplexType('IceCandidate')(_candidate);

    if (presenter && presenter.id === sessionId && presenter.webRtcEndpoint) {
        console.info('Sending presenter candidate');
        presenter.webRtcEndpoint.addIceCandidate(candidate);
    }
    else if (viewers[sessionId] && viewers[sessionId].webRtcEndpoint) {
        console.info('Sending viewer candidate');
        viewers[sessionId].webRtcEndpoint.addIceCandidate(candidate);
    } else {
        console.info('Queueing candidate');
        if (!candidatesQueue[sessionId]) {
            candidatesQueue[sessionId] = [];
        }
        candidatesQueue[sessionId].push(candidate);
    }
}

app.use(express.static(path.join(__dirname, 'static')));
