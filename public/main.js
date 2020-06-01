let getElem = (elem)=>{
    return document.getElementById(elem);
}
let divSelectRoom = getElem('selectRoom');
let divConsultingRoom = getElem('consultingRoom');
let inputRoomNumber = getElem('roomNumber');
let btnGoRoom = getElem('goRoom');
let localVideo = getElem('localVideo');
let remoteVideo = getElem('remoteVideo');

let roomNumber, localStream, remoteStream, rtcPeerConnection, isCaller;

const iceServers = {
    'iceServer':[
        {'urls':'stun:stun.services.mozilla.com'},
        {'urls':'stun:stun.l.google.com:19302'}
    ]
};

const streamConstrains = {
    audio: false,
    video: true
};



const socket = io();



btnGoRoom.onclick = ()=>{
    if(inputRoomNumber.value == ''){
        alert('please include room number')
        return;
    }

    roomNumber = inputRoomNumber.value;
    socket.emit('joinTheRoom', roomNumber);
    divSelectRoom.style = 'display:none';
    divConsultingRoom.style = 'display:block';
}



socket.on('created', room=>{
    navigator.mediaDevices.getUserMedia(streamConstrains)
    .then(stream=>{
        localStream = stream;
        localVideo.srcObject = stream;
        isCaller = true;
    }).catch(error=>{
        console.log('An error occured', error);  
    });
});




socket.on('joined', room=>{
    navigator.mediaDevices.getUserMedia(streamConstrains)
    .then(stream=>{
        localStream = stream;
        localVideo.srcObject = stream;
        socket.emit('ready', roomNumber)
    }).catch(error=>{
        console.log('An error occured', error);
        
    });
});



socket.on('ready', ()=>{
    if(isCaller){
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.ontrack = onAddStream;
        rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
        // rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
        rtcPeerConnection.createOffer()
        .then(sessionDescription=>{
            rtcPeerConnection.setLocalDescription(sessionDescription).
            then(()=>{
                console.log('sending offer', sessionDescription);
                socket.emit('offer',{
                    type:'offer',
                    sdp: sessionDescription,
                    room: roomNumber
                });
            });
        })
        .catch(error=>{
            console.log(error);
        });
    }
});



socket.on('offer', (event)=>{
    if(!isCaller){
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.ontrack = onAddStream;
        rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
        // rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
        console.log('reccived offer', event);
        
        rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
        rtcPeerConnection.createAnswer()
        .then(sessionDescription=>{
            console.log('sending the answer',sessionDescription);
            rtcPeerConnection.setLocalDescription(sessionDescription);
           
            
            socket.emit('answer',{
                type:'answer',
                sdp: sessionDescription,
                room: roomNumber
            })
            
        })
        .catch(error=>{
            console.log(error);
        });
    }
});


socket.on('answer', event=>{
    console.log('reccived answer', event);
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
});




function onAddStream(event){
    remoteVideo.srcObject = event.streams[0];
    remoteStream = event.streams[0];
};


function onIceCandidate(event){
    console.log('ice candidate');
    
    if(event.candidate){
        console.log('sending ice candidate', event.candidate);
        
        socket.emit('candidate',{
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate,
            room: roomNumber
        });
    }
}



socket.on('candidate', event=>{
    console.log('candidate');
    
    const candidate = new RTCIceCandidate({
        sdpMLineIndex: event.label,
        candidate:event.candidate
    });
    console.log('reccived candidated', candidate);
    
    rtcPeerConnection.addIceCandidate(candidate);
})