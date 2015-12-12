
var Steam = require('steam-webapi');
var crypto = require('crypto');
var request = require('request');
var passportSocketIo = require('passport.socketio');
var publicKey = "BA2681B8FA62A55A007EAE5E3F279212";
Steam.key = publicKey;
//require('events').EventEmitter.prototype._maxListeners = 100;

var rooms = [];
var steamIDs = [];

module.exports.listen = function (io, console){
	console.log(time().grey + ' ' + "socket.io listening".red);

	function time() {
		var time = new Date();
		return ((time.getHours() < 10)?"0":"") + time.getHours() +":"+ ((time.getMinutes() < 10)?"0":"") + time.getMinutes() +":"+ ((time.getSeconds() < 10)?"0":"") + time.getSeconds();
	};

	function randomString(length) {
		return crypto.randomBytes(20).toString('hex');
	};



	// **********    socket connected
	io.sockets.on('connection', function(socket){
		console.log(time() + ' Socket connected'.blue);
		socket.roomID = 'no';
		socket.steamID = '';
		socket.calls = [];

		socket.on('steamReady',function(dd){
			socket.steam = dd;
			steamIDs[dd.steamID] = socket;
			socket.emit('newRoomId', { room: 'no' });
			getSteamFriends(socket.roomID);
			console.log('steamready');
		});


		function getSteamFriends(rom){
			console.log('typeof');
			console.log(typeof socket.steam.steamID);
			if(typeof socket.steam.steamID !== 'undefined')
			Steam.ready(function(err) {
				if (err) return console.log(time().grey + ' ' + err + '  *1');
				var steam = new Steam();

				data = {};
				data.steamid = socket.steam.steamID;
				data.relationship = "friend";
				console.log('beforefriends');
				steam.getFriendList(data, function (err, data) {
					if(err){
						console.log(err);
						socket.emit('__error', { msg: 'You need to have your steam profile public to see your friends.' });
					}else{
						console.log('steamfriends length: ' + data.friendslist.friends.length);
						data.friendslist.friends.forEach(function(e){
							if(rom === 'disconnect'){
								console.log('disc');
								ss.emit('friendDc', { steamid: socket.steam.steamID });
							}else{
							if(typeof steamIDs[e.steamid] !== 'undefined'){
								console.log('friend');
								var ss = steamIDs[e.steamid];
								socket.emit('friend', { nick: ss.steam.nick, avatar: ss.steam.avatar, steamid: ss.steam.steamID, room: ss.roomID });
								ss.emit('friend', { nick: socket.steam.nick, avatar: socket.steam.avatar, steamid: socket.steam.steamID, room: socket.roomID });
							}
}
						});
					}
				});
			});
		};





		socket.on('newRoom', function(){
			console.log(rooms);
			var roomID = randomString(30);
			rooms[roomID] = [];
			socket.roomID = roomID;
			rooms[roomID].push(socket.steam.steamID);
			socket.emit('newRoomId', { room: socket.roomID });
			getSteamFriends(socket.roomID);
		});


		socket.on('leaveRoom', function(){
			//console.log('leaveRoom');
			if(socket.roomID != ''){
				rooms[socket.roomID].forEach(function(s){
					var sock = steamIDs[s];
					try{sock.calls.splice(sock.calls.indexOf(socket.steamID), 1);}catch(e){console.log(e)};
				});
				if(rooms[socket.roomID].length == 0){
					try{
						rooms.splice(rooms.indexOf(rooms[socket.roomID]), 1);
					}catch(e){
						console.log(time().grey + ' error destroying empty room'.red);
					};
				}
				var o = rooms[socket.roomID].indexOf(socket.steam.steamID);
				if(o != -1){rooms[socket.roomID].splice(o, 1);}
				socket.calls = [];
				socket.emit('newRoomId', { room: 'no' });
				console.log(time().grey + ' ' + 'deleted from room: ' + socket.roomID);
				console.log(rooms);
				socket.roomID = '';
			}
			getSteamFriends(socket.roomID);
		});


		socket.on('enterRoom', function(data){
			if(typeof data !== 'undefined' && typeof rooms[steamIDs[data.roomID].roomID] !== 'undefined'){
				rooms[steamIDs[data.roomID].roomID].forEach(function(el){
					socket.emit('call', { targetID: el });
					socket.calls.push(el);
				});
				rooms[steamIDs[data.roomID].roomID].push(socket.steam.steamID);
				socket.roomID = steamIDs[data.roomID].roomID;
				socket.emit('newRoomId', { room: steamIDs[data.roomID].roomID });
				console.log(time().grey + ' ' + 'joined room ');
				console.log(rooms);
			}else{
				socket.emit('newRoomId', { room: 'no' });
			}
			getSteamFriends(socket.roomID);
		});


		
		socket.on('disconnect',function(){
			console.log(time() + ' Socket disconnect'.blue);
			try{
				getSteamFriends('disconnect');
				rooms[socket.roomID].splice(rooms[socket.roomID].indexOf(socket.steam.steamID),1);
			}catch(e){};

			try{
				if(rooms[socket.roomID].length == 0){
					rooms.splice(rooms.indexOf(rooms[socket.roomID]), 1);
				}
			}catch(e){
				console.log(time().grey + ' error destroying empty room'.red);
			};
		});
	});


	return io;
}
