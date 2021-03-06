navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

//DOM
var steamInfo;
try{
  steamInfo = JSON.parse(document.getElementById("steamInfoContainer").value);
}catch(e){
  steamInfo = '';
}
var audio = document.getElementById("audio");
var roomBtn = document.getElementById("newroom");
var calls = [];
var refresh;

//Connections
var socket = io.connect('http://steamvoice.com:80');
var peer = 0;


//Steam friends
var friends = document.getElementById("friends");

if(typeof steamInfo !== 'undefined' && steamInfo !== '' && steamInfo !== null){
  socket.emit('steamReady', { steamID: steamInfo.profile.id, nick: steamInfo.profile.displayName, avatar: steamInfo.profile._json.avatarmedium, profileUrl: steamInfo.profile._json.profileurl});
  if(typeof Peer !== 'undefined' && typeof steamInfo !== 'undefined' && steamInfo !== ''){
    peer = new Peer(steamInfo.profile.id, {host: 'steamvoice.com', port: 444 });
    console.log('peerid, profile: ' + steamInfo.profile.id);
    //Microfone access
    navigator.getUserMedia({video: false, audio: true}, function(stream) {
      window.myStream = stream;
    }, function(err) {
      console.log('Failed to get local stream' ,err);
    });
  }
}




//Functions
var leaveRoom = function(){
  socket.emit('leaveRoom');
  calls.forEach(function(call){
    call.close();
  });
  calls = [];
};

var joinRoom = function(id){
  if(id !== 'no'){
    socket.emit('enterRoom', { roomID: id });
  }
};

var newRoom = function(){
  socket.emit('newRoom');
};

var newFriend = function(data){
  var node = '';
  if(document.getElementById(data.steamid) === null){
    node = document.createElement('div');
    node.innerHTML = '<div class="uk-flex-center" id="' + data.steamid + '" value=' + data.steamid + '>' + data.nick + ((data.room === 'no' || data.room === '')?'':'&nbsp<span onclick="joinRoom(this.parentNode.getAttribute(\'value\'))" class="uk-badge uk-badge-success border">Join</span>') + '<img class="friends-img" src="' + data.avatar + '" /></div><br>';
    friends.appendChild(node);
  }else{
    node = document.getElementById(data.steamid);
    node.innerHTML = '<div class="uk-flex-center" id="' + data.steamid + '" value=' + data.steamid + '>' + data.nick + ((data.room === 'no' || data.room === '')?'':'&nbsp<span onclick="joinRoom(this.parentNode.getAttribute(\'value\'))" class="uk-badge uk-badge-success border">Join</span>') + '<img class="friends-img" src="' + data.avatar + '" /></div><br>';
  }
};



//Errors
socket.on('__error', function(e){
  clearInterval(refresh);
  UIkit.notify(e.msg, { status: 'danger', timeout: 0 });
});


//Socket.io listeners
socket.on('friend', function(data){
  newFriend(data);
});


socket.on('friendDc', function(data){
  var elem = document.getElementById(data.steamid);
  elem.parentNode.removeChild(elem);
});

//My new room id
socket.on('newRoomId', function(data){
  if(data.room != 'no'){
    socket.roomID = data.room;
    console.log('room ' + data.room);
    roomBtn.innerHTML = "Leave room";
    UIkit.notify('Joined room ' + data.room, { status: 'success', timeout: 2000 });
    roomBtn.onclick = function(){
      leaveRoom();
    };
  }else{
    roomBtn.innerHTML = "new room";
    roomBtn.onclick = function(){
      newRoom();
    };
  }
});



//New call
socket.on('call', function(data){
  if(typeof calls[data.targetID] === 'undefined'){
    var call = peer.call(data.targetID, window.myStream, { metadata: steamInfo.profile.id });
    calls[data.targetID] = call;
    call.on('stream', function(remoteStream) {
      UIkit.notify("Call to " + data.targetID, {status:'success', timeout: 300});
      console.log('calling from peer id ' + peer.id);
      console.log('done call from id ' + data.targetID);
      audio.insertAdjacentHTML('beforeend', '<source src="' + URL.createObjectURL(remoteStream) + '">');
    });
    call.on('close', function(){
      var i = calls.indexOf(data.targetID);
      if(i != -1){calls.splice(i, 1);}
    });
  }
});


if(peer !== 0){
  peer.on('call', function(call) {
    if(typeof calls[call.metadata] === 'undefined'){
      calls[call.metadata] = call;
      call.answer(window.myStream); // Answer the call with an A/V stream.
      call.on('stream', function(remoteStream) {
        UIkit.notify("Received call from " + call.options.metadata, {status:'success', timeout: 300});
        audio.insertAdjacentHTML('beforeend', '<source src="' + URL.createObjectURL(remoteStream) + '">');
      });
      call.on('close', function(){
        var i = calls.indexOf(call.metadata);
  			if(i != -1){calls.splice(i, 1);}
      });
    }
  });
}
