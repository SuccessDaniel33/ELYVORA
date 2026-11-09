(() => {
  "use strict";
  const STORE = "elyvora.prototype.v1";
  const starter = {
    profile:{name:"Amara Okafor",handle:"amarainmotion",bio:"Curious by nature. Building a life full of stories, meaningful connections and new possibilities.",location:"Lagos, Nigeria",role:"Creative entrepreneur",avatar:"A"},
    balance:2450,
    posts:[
      {id:"p1",name:"Amara Okafor",handle:"@amarainmotion",time:"12 min ago",text:"A new city always has a new story waiting. Spent the afternoon discovering little corners of Lagos that remind me why I love being here. Where should I explore next? ✨",art:"city",likes:28,comments:6,liked:false},
      {id:"p2",name:"Tobi Adebayo",handle:"@tobithecreator",time:"38 min ago",text:"Creativity grows when we share what we're learning. Working on something new with a few brilliant people this week. More soon. 🚀",art:"creative",likes:46,comments:11,liked:false},
      {id:"p3",name:"Nia Williams",handle:"@niaaroundtheworld",time:"1 hr ago",text:"The best communities are built one genuine conversation at a time. Excited to meet more curious minds from around the world here.",art:"community",likes:19,comments:4,liked:false}
    ],
    messages:{
      "tobi":[{mine:false,text:"Hey Amara! Welcome to ELYVORA. What are you building these days?",time:"10:24"},{mine:true,text:"I'm exploring new creative projects and meeting people to collaborate with.",time:"10:26"},{mine:false,text:"That sounds exciting. We should exchange ideas sometime!",time:"10:28"}],
      "nia":[{mine:false,text:"Hi! I saw your post about exploring Lagos. Any favourite spots?",time:"Yesterday"},{mine:true,text:"Still discovering, but the art spaces have been amazing.",time:"Yesterday"}]
    },
    activeChat:"tobi",
    transactions:[{label:"Welcome credits",detail:"ELYVORA starter balance",amount:2450,type:"in",time:"Today"}],
    owned:[],
    jobsDone:[],
    banner:true
  };
  let state = load();
  let authUser = null;
  let remoteFeedLoaded = false;
  let remoteEconomy = null;
  let remoteJobs = null;
  let remoteUsers = [];
  let remoteConversations = null;
  let remoteMessages = [];
  let activeConversationId = null;
  let chatSocket = null;
  let chatSocketConversationId = null;
  let callState = null;
  let incomingCall = null;
  let recordingState = null;
  let currentView = "home";
  let discoverFilter = "All";
  let discoverQuery = "";
  let toastTimer;
  const root = document.querySelector("#view-root");
  const modal = document.querySelector("#modal");
  const modalContent = document.querySelector("#modal-content");
  const safe = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function load(){
    try{
      const saved=JSON.parse(localStorage.getItem(STORE)||"null");
      return saved?{...structuredClone(starter),...saved,profile:{...starter.profile,...saved.profile},messages:{...starter.messages,...saved.messages}}:structuredClone(starter);
    }catch{return structuredClone(starter);}
  }
  function save(){try{localStorage.setItem(STORE,JSON.stringify(state));}catch{}}
  async function apiRequest(path, options={}){
    const isFormData=typeof FormData!=="undefined"&&options.body instanceof FormData;
    const headers={"Accept":"application/json",...(options.body&&!isFormData?{"Content-Type":"application/json"}:{}),...(options.headers||{})};
    const response=await fetch(path,{credentials:"same-origin",...options,headers});
    let data={};try{data=await response.json();}catch{}
    if(!response.ok)throw new Error(data.error?.message||"The request could not be completed.");
    return data;
  }
  function applyUser(user){
    authUser=user;
    state.profile={...state.profile,name:user.displayName||state.profile.name,handle:user.username||state.profile.handle,bio:user.bio||"",location:user.location||"",role:user.role||""};
    save();
  }
  function relativeTime(seconds){
    const age=Math.max(0,Math.floor(Date.now()/1000-Number(seconds||0)));
    if(age<60)return "Just now";if(age<3600)return Math.floor(age/60)+" min ago";if(age<86400)return Math.floor(age/3600)+" hr ago";return Math.floor(age/86400)+" d ago";
  }
  async function refreshFeed(){
    const data=await apiRequest("/api/feed");
    remoteFeedLoaded=true;
    state.posts=(data.posts||[]).map(p=>({id:p.id,name:p.author?.name||p.display_name,handle:"@"+(p.author?.username||p.username),time:relativeTime(p.created_at),text:p.body,art:"none",image:p.media_url||"",mediaType:p.media_type||null,likes:Number(p.likes||0),comments:Number(p.comments||0),liked:Boolean(p.liked),remote:true}));
  }
  async function refreshEconomy(){
    if(!authUser){remoteEconomy=null;return;}
    remoteEconomy=await apiRequest("/api/economy");
    state.balance=remoteEconomy.balance;
  }
  async function refreshJobs(){
    const data=await apiRequest("/api/careers");
    remoteJobs=data.jobs||[];
  }
  async function refreshMessages(conversationId){
    if(!conversationId){remoteMessages=[];return;}
    const data=await apiRequest("/api/conversations/"+encodeURIComponent(conversationId)+"/messages");
    remoteMessages=data.messages||[];
  }
  async function refreshConversations(){
    if(!authUser){remoteConversations=null;remoteMessages=[];activeConversationId=null;return;}
    const data=await apiRequest("/api/conversations");
    remoteConversations=data.conversations||[];
    if(!activeConversationId||!remoteConversations.some(c=>c.id===activeConversationId)){
      activeConversationId=remoteConversations[0]?.id||null;
    }
    await refreshMessages(activeConversationId);
  }
  function disconnectChatSocket(){
    const socket=chatSocket;
    chatSocket=null;
    chatSocketConversationId=null;
    if(socket&&socket.readyState<2){try{socket.close(1000,"Conversation changed");}catch{}}
  }
  function connectChatSocket(conversationId){
    if(!authUser||!conversationId){disconnectChatSocket();return;}
    if(chatSocket&&chatSocketConversationId===conversationId&&chatSocket.readyState<2)return;
    disconnectChatSocket();
    const protocol=location.protocol==="https:"?"wss:":"ws:";
    const socket=new WebSocket(protocol+"//"+location.host+"/api/conversations/"+encodeURIComponent(conversationId)+"/live");
    chatSocket=socket;
    chatSocketConversationId=conversationId;
    socket.addEventListener("message",event=>{
      if(chatSocket!==socket||chatSocketConversationId!==conversationId)return;
      try{
        const data=JSON.parse(event.data);
        if(data.type==="message"&&activeConversationId===conversationId){
          refreshMessages(conversationId).then(()=>{if(currentView==="messages")render();}).catch(error=>console.warn("Could not refresh live chat:",error));
        }else if(data.type&&data.type.startsWith("call-")){
          handleCallSignal(data).catch(error=>console.warn("ELYVORA call signal error:",error));
        }
      }catch{}
    });
    socket.addEventListener("close",()=>{
      if(chatSocket===socket){chatSocket=null;chatSocketConversationId=null;}
    });
    socket.addEventListener("error",()=>{
      if(chatSocket===socket)console.warn("ELYVORA live chat connection interrupted.");
    });
  }
  function activeChatPartner(){
    return (remoteConversations||[]).find(c=>c.id===activeConversationId)||null;
  }
  function waitForChatSocket(){
    if(chatSocket?.readyState===WebSocket.OPEN)return Promise.resolve(chatSocket);
    if(!chatSocket&&activeConversationId)connectChatSocket(activeConversationId);
    const socket=chatSocket;
    if(!socket)return Promise.reject(new Error("Open a conversation before starting a call."));
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error("The chat connection is taking too long. Try again.")),8000);
      socket.addEventListener("open",()=>{clearTimeout(timer);resolve(socket);},{once:true});
      socket.addEventListener("error",()=>{clearTimeout(timer);reject(new Error("Could not connect to the conversation."));},{once:true});
      socket.addEventListener("close",()=>{clearTimeout(timer);reject(new Error("The conversation connection closed."));},{once:true});
    });
  }
  function sendCallSignal(payload){
    if(!chatSocket||chatSocket.readyState!==WebSocket.OPEN)throw new Error("The live conversation connection is not ready.");
    const target=payload.targetUserId||callState?.targetUserId||incomingCall?.fromUserId;
    chatSocket.send(JSON.stringify({...payload,targetUserId:target}));
  }
  function openCallModal(statusText){
    if(!callState)return;
    const isVideo=callState.kind==="video";
    const title=isVideo?"ELYVORA video call":"ELYVORA voice call";
    openModal(title,'<div class="call-modal"><div class="call-stage '+(isVideo?"video":"voice")+'"><video id="remote-video" autoplay playsinline '+(isVideo?"":"hidden")+'></video><div class="voice-call-avatar" id="voice-call-avatar">'+safe(initials(callState.remoteName||"Member"))+'</div><video id="local-video" autoplay muted playsinline '+(isVideo?"":"hidden")+'></video><audio id="remote-audio" autoplay></audio><div class="call-stage-label"><b>'+safe(callState.remoteName||"ELYVORA member")+'</b><small id="call-status">'+safe(statusText)+'</small></div></div><div class="call-controls"><button class="call-control" data-action="toggle-mic">◖<small>Mute</small></button>'+(isVideo?'<button class="call-control" data-action="toggle-camera">▣<small>Camera</small></button>':'')+'<button class="call-control end" data-action="end-call">×<small>End call</small></button></div><p class="call-disclaimer">Private 1-to-1 peer connection · Use a stable internet connection</p></div>',"ELYVORA CONNECT");
    attachCallMedia();
  }
  function attachCallMedia(){
    if(!callState)return;
    const remoteVideo=document.querySelector("#remote-video");
    const remoteAudio=document.querySelector("#remote-audio");
    const localVideo=document.querySelector("#local-video");
    if(remoteVideo&&callState.remoteStream){remoteVideo.srcObject=callState.remoteStream;remoteVideo.play().catch(()=>{});}
    if(remoteAudio&&callState.remoteStream){remoteAudio.srcObject=callState.remoteStream;remoteAudio.play().catch(()=>{});}
    if(localVideo&&callState.localStream){localVideo.srcObject=callState.localStream;localVideo.play().catch(()=>{});}
  }
  function updateCallStatus(text){
    const el=document.querySelector("#call-status");if(el)el.textContent=text;
  }
  function createCallPeer(){
    const peer=new RTCPeerConnection({iceServers:[
      {urls:"stun:stun.l.google.com:19302"},
      {urls:"stun:stun1.l.google.com:19302"}
    ]});
    callState.peer=peer;
    callState.remoteStream=new MediaStream();
    peer.ontrack=event=>{
      const streams=event.streams||[];
      if(streams[0]){
        for(const track of streams[0].getTracks()){
          if(!callState.remoteStream.getTracks().some(t=>t.id===track.id))callState.remoteStream.addTrack(track);
        }
      }else if(event.track&&!callState.remoteStream.getTracks().some(t=>t.id===event.track.id)){
        callState.remoteStream.addTrack(event.track);
      }
      attachCallMedia();
      updateCallStatus("Connected");
    };
    peer.onicecandidate=event=>{
      if(event.candidate&&callState){try{sendCallSignal({type:"call-ice",callId:callState.callId,candidate:event.candidate.toJSON()});}catch(error){console.warn(error);}}
    };
    peer.onconnectionstatechange=()=>{
      if(!callState||callState.peer!==peer)return;
      if(peer.connectionState==="connected")updateCallStatus("Connected");
      if(peer.connectionState==="failed")updateCallStatus("Connection failed · try again");
      if(peer.connectionState==="disconnected")updateCallStatus("Connection interrupted…");
    };
    return peer;
  }
  async function startCall(kind){
    if(!authUser){authModal("signin");toast("Sign in to make calls.");return;}
    if(!activeConversationId){toast("Open a private conversation before calling.",true);return;}
    if(callState||incomingCall){toast("Finish the current call first.",true);return;}
    if(!navigator.mediaDevices?.getUserMedia){toast("This browser does not support microphone or camera access.",true);return;}
    const partner=activeChatPartner();
    if(!partner?.other_user_id){toast("This conversation does not have another member yet.",true);return;}
    try{
      await waitForChatSocket();
      const localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:kind==="video"});
      callState={callId:crypto.randomUUID(),kind,role:"caller",targetUserId:partner.other_user_id,remoteName:partner.other_user_name||"ELYVORA member",localStream,remoteStream:new MediaStream(),pendingCandidates:[],peer:null};
      const peer=createCallPeer();
      for(const track of localStream.getTracks())peer.addTrack(track,localStream);
      openCallModal("Calling… waiting for the other member");
      const offer=await peer.createOffer();
      await peer.setLocalDescription(offer);
      sendCallSignal({type:"call-offer",callId:callState.callId,kind,description:peer.localDescription,targetUserId:partner.other_user_id});
    }catch(error){
      closeCall(false);
      toast(error.message||"Could not start the call. Check microphone and camera permissions.",true);
    }
  }
  function showIncomingCall(data){
    if(!authUser||currentView!=="messages"||data.fromUserId===authUser.id)return;
    if(callState||incomingCall){
      try{sendCallSignal({type:"call-busy",callId:data.callId,targetUserId:data.fromUserId});}catch{}
      return;
    }
    incomingCall=data;
    const name=activeChatPartner()?.other_user_name||"ELYVORA member";
    openModal(data.kind==="video"?"Incoming video call":"Incoming voice call",'<div class="incoming-call"><div class="incoming-call-avatar">'+safe(initials(name))+'</div><h3>'+safe(name)+'</h3><p>is calling you on ELYVORA</p><div class="call-controls"><button class="call-control accept" data-action="accept-call">✓<small>Accept</small></button><button class="call-control end" data-action="reject-call">×<small>Decline</small></button></div></div>',"INCOMING CALL");
  }
  async function acceptCall(){
    if(!incomingCall)return;
    const data=incomingCall;
    try{
      await waitForChatSocket();
      const localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:data.kind==="video"});
      callState={callId:data.callId,kind:data.kind,role:"receiver",targetUserId:data.fromUserId,remoteName:activeChatPartner()?.other_user_name||"ELYVORA member",localStream,remoteStream:new MediaStream(),pendingCandidates:[],peer:null};
      const peer=createCallPeer();
      for(const track of localStream.getTracks())peer.addTrack(track,localStream);
      await peer.setRemoteDescription(new RTCSessionDescription(data.description));
      for(const candidate of callState.pendingCandidates.splice(0)){try{await peer.addIceCandidate(new RTCIceCandidate(candidate));}catch{}}
      incomingCall=null;
      const answer=await peer.createAnswer();
      await peer.setLocalDescription(answer);
      openCallModal("Connecting…");
      sendCallSignal({type:"call-answer",callId:callState.callId,description:peer.localDescription,targetUserId:callState.targetUserId});
    }catch(error){
      incomingCall=null;
      closeCall(false);
      toast(error.message||"Could not accept the call. Check microphone and camera permissions.",true);
    }
  }
  async function handleCallSignal(data){
    if(data.type==="call-offer"){showIncomingCall(data);return;}
    if(!callState||data.callId!==callState.callId)return;
    if(data.type==="call-answer"&&callState.role==="caller"){
      try{
        await callState.peer.setRemoteDescription(new RTCSessionDescription(data.description));
        for(const candidate of callState.pendingCandidates.splice(0)){try{await callState.peer.addIceCandidate(new RTCIceCandidate(candidate));}catch{}}
        updateCallStatus("Connecting…");
      }catch(error){toast("The call could not connect.",true);closeCall(false);}
    }else if(data.type==="call-ice"&&data.candidate){
      if(callState.peer?.remoteDescription){try{await callState.peer.addIceCandidate(new RTCIceCandidate(data.candidate));}catch(error){console.warn("Could not add call network candidate:",error);}}
      else callState.pendingCandidates.push(data.candidate);
    }else if(["call-reject","call-hangup","call-busy"].includes(data.type)){
      const message=data.type==="call-busy"?"The other member is busy.":data.type==="call-reject"?"The call was declined.":"The other member ended the call.";
      closeCall(false);toast(message);
    }
  }
  function closeCall(notify=true){
    const stateToClose=callState;
    if(notify&&stateToClose&&chatSocket?.readyState===WebSocket.OPEN){try{sendCallSignal({type:"call-hangup",callId:stateToClose.callId,targetUserId:stateToClose.targetUserId});}catch{}}
    callState=null;incomingCall=null;
    if(stateToClose){
      for(const track of stateToClose.localStream?.getTracks()||[])track.stop();
      try{stateToClose.peer?.close();}catch{}
    }
    if(!modal.hidden)closeModal();
  }
  async function rejectCall(){
    if(incomingCall&&chatSocket?.readyState===WebSocket.OPEN){try{sendCallSignal({type:"call-reject",callId:incomingCall.callId,targetUserId:incomingCall.fromUserId});}catch{}}
    incomingCall=null;closeModal();
  }
  function toggleCallMic(){
    if(!callState)return;
    const tracks=callState.localStream?.getAudioTracks()||[];
    if(!tracks.length)return;
    const enabled=!tracks[0].enabled;tracks.forEach(t=>t.enabled=enabled);
    const button=modalContent.querySelector('[data-action="toggle-mic"] small');if(button)button.textContent=enabled?"Mute":"Unmute";
  }
  function toggleCallCamera(){
    if(!callState)return;
    const tracks=callState.localStream?.getVideoTracks()||[];
    if(!tracks.length)return;
    const enabled=!tracks[0].enabled;tracks.forEach(t=>t.enabled=enabled);
    const button=modalContent.querySelector('[data-action="toggle-camera"] small');if(button)button.textContent=enabled?"Camera off":"Camera on";
  }
  async function openConversation(conversationId){
    activeConversationId=conversationId;
    await refreshMessages(conversationId);
    connectChatSocket(conversationId);
    render();
  }
  async function beginConversation(recipientId){
    try{
      const result=await apiRequest("/api/conversations",{method:"POST",body:JSON.stringify({recipientId})});
      activeConversationId=result.conversationId;
      await refreshConversations();
      if(result.conversationId)activeConversationId=result.conversationId;
      await refreshMessages(activeConversationId);
      connectChatSocket(activeConversationId);
      closeModal();go("messages");render();
      toast(result.existing?"Conversation opened.":"Conversation started.");
    }catch(error){toast(error.message,true);}
  }
  async function searchMembers(query){
    const target=document.querySelector("#member-results");
    if(!target)return;
    const q=query.trim();
    if(q.length<2){target.innerHTML='<p class="muted-copy">Enter at least two characters to find ELYVORA members.</p>';return;}
    try{
      const data=await apiRequest("/api/users?q="+encodeURIComponent(q));
      if(!target.isConnected)return;
      const users=data.users||[];
      target.innerHTML=users.length?users.map(u=>'<div class="mini-row" style="padding:10px 0;border-bottom:1px solid var(--line)">'+avatar(initials(u.display_name))+'<span><b>'+safe(u.display_name)+'</b><small>@'+safe(u.username)+' · '+safe(u.location||"ELYVORA member")+'</small></span><button class="button-quiet" data-action="start-chat" data-id="'+safe(u.id)+'">Message</button></div>').join(""):'<p class="muted-copy">No members found for that search.</p>';
    }catch(error){if(target.isConnected)target.innerHTML='<p class="muted-copy">'+safe(error.message)+'</p>';}
  }
  async function searchDiscoverMembers(query){
    if(!authUser){remoteUsers=[];return;}
    const q=String(query||"").trim();
    if(q.length<2){remoteUsers=[];return;}
    const data=await apiRequest("/api/users?q="+encodeURIComponent(q));
    remoteUsers=data.users||[];
  }
  function newChatModal(){
    if(!authUser){authModal("signin");return;}
    openModal("Find an ELYVORA member",'<div class="form-group"><label>SEARCH MEMBERS</label><input class="form-control" id="new-chat-search" placeholder="Search by name or username..." autocomplete="off"></div><div id="member-results" class="mini-list"><p class="muted-copy">Search for someone to start a private conversation.</p></div>',"ELYVORA CONNECT");
  }
  async function initRemote(){
    try{
      await apiRequest("/api/health");
      const me=await apiRequest("/api/me");
      if(me.user){applyUser(me.user);await Promise.all([refreshFeed(),refreshEconomy(),refreshJobs(),refreshConversations()]);}
      else{await refreshJobs();}
      if(currentView==="messages"&&authUser)connectChatSocket(activeConversationId);
      render();
    }catch(error){console.warn("ELYVORA remote services are not ready:",error.message);}
  }
  function authModal(mode="signin"){
    const signup=mode==="signup";
    const fields=signup?'<div class="form-group"><label>YOUR NAME</label><input class="form-control" name="displayName" required minlength="2" maxlength="50" placeholder="Your full name"></div><div class="form-group"><label>USERNAME</label><input class="form-control" name="username" required minlength="3" maxlength="24" pattern="[A-Za-z0-9_.]+" placeholder="yourname"></div><div class="form-group"><label>EMAIL ADDRESS</label><input class="form-control" type="email" name="email" required maxlength="254" placeholder="you@example.com"></div>':'<div class="form-group"><label>EMAIL OR USERNAME</label><input class="form-control" name="identifier" required autocomplete="username" placeholder="Email address or username"></div>';
    openModal(signup?"Create your ELYVORA account":"Welcome back",'<form id="auth-form" data-mode="'+mode+'">'+fields+'<div class="form-group"><label>PASSWORD</label><input class="form-control" type="password" name="password" required minlength="'+(signup?"10":"1")+'" maxlength="128" autocomplete="'+(signup?"new-password":"current-password")+'" placeholder="'+(signup?"At least 10 characters":"Your password")+'"></div><div class="callout">'+(signup?"Your account will be saved securely on ELYVORA. Add a working email address; email verification and recovery are part of the next release.":"Your private session is protected by an HttpOnly cookie.")+'</div><div class="modal-footer"><button class="button-quiet" type="button" data-action="auth-switch" data-mode="'+(signup?"signin":"signup")+'">'+(signup?"Already a member? Sign in":"New to ELYVORA? Create account")+'</button><button class="button-primary" type="submit">'+(signup?"Create account":"Sign in")+'</button></div></form>',"ELYVORA ACCOUNT");
  }
  async function submitAuth(form){
    const mode=form.dataset.mode,fd=new FormData(form);
    const payload=mode==="signup"?{displayName:fd.get("displayName"),username:fd.get("username"),email:fd.get("email"),password:fd.get("password")}:{identifier:fd.get("identifier"),password:fd.get("password")};
    const button=form.querySelector('button[type="submit"]');if(button){button.disabled=true;button.textContent="Please wait…";}
    try{
      const result=await apiRequest(mode==="signup"?"/api/auth/register":"/api/auth/login",{method:"POST",body:JSON.stringify(payload)});
      applyUser(result.user);await Promise.all([refreshFeed(),refreshEconomy(),refreshJobs(),refreshConversations()]);closeModal();if(currentView==="messages")connectChatSocket(activeConversationId);render();toast(mode==="signup"?"Your ELYVORA account is ready.":"Welcome back to ELYVORA.");
    }catch(error){toast(error.message,true);if(button){button.disabled=false;button.textContent=mode==="signup"?"Create account":"Sign in";}}
  }
  async function logout(){
    try{await apiRequest("/api/auth/logout",{method:"POST",body:"{}"});}catch{}
    disconnectChatSocket();authUser=null;remoteEconomy=null;remoteJobs=null;remoteConversations=null;remoteMessages=[];activeConversationId=null;remoteFeedLoaded=false;state.posts=structuredClone(starter.posts);state.profile=structuredClone(starter.profile);state.balance=starter.balance;save();closeModal();render();toast("You have signed out.");
  }
  function money(n){return new Intl.NumberFormat("en-US").format(n);}
  function avatar(letter, extra=""){return '<span class="avatar '+extra+'">'+safe(letter||"E")+"</span>";}
  function initials(name){return (name||"E").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();}
  function setHeader(){
    const names={home:"Home",discover:"Discover",world:"World",messages:"Messages",careers:"Careers",economy:"Economy",profile:"My profile"};
    document.querySelector("#page-title").textContent=names[currentView]||"Home";
    document.querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===currentView));
    document.querySelector("#side-name").textContent=state.profile.name;
    document.querySelector("#side-handle").textContent="@"+state.profile.handle;
    document.querySelector("#side-avatar").textContent=initials(state.profile.name);
    document.querySelector("#top-avatar").textContent=initials(state.profile.name);
    const accountButton=document.querySelector("#account-button");
    if(accountButton)accountButton.textContent=authUser?"Sign out":"Sign in";
    document.querySelector("#message-count").textContent=Object.values(state.messages).reduce((n,a)=>n+a.length,0)>0?"2":"0";
    document.querySelector("#demo-banner").hidden=!state.banner;
  }
  function pageHead(kicker,title,desc,actions=""){return '<div class="page-head"><div><p class="eyebrow">'+kicker+'</p><h1>'+title+'</h1><p>'+desc+'</p></div><div class="head-actions">'+actions+"</div></div>";}
  function postCard(p){
    let art=p.mediaType==="video"&&p.image?'<div class="post-art media-video"><video class="post-media-video" src="'+safe(p.image)+'" controls playsinline preload="metadata"></video></div>':p.mediaType==="image"&&p.image?'<div class="post-art media-image"><img class="post-media-image" src="'+safe(p.image)+'" alt="Shared post media" loading="lazy"></div>':p.art==="city"?'<div class="post-art city"><div class="city-art-copy"><span>THE CITY IS YOURS</span><strong>LAGOS, IN MOTION</strong></div></div>':p.art==="creative"?'<div class="post-art creative"><div class="creative-shape"></div></div>':p.art==="community"?'<div class="post-art community"><div class="community-art">BETTER<br>TOGETHER<small>COMMUNITY IS EVERYTHING</small></div></div>':p.image?'<div class="post-art custom-image" style="background-image:url(\''+safe(p.image)+'\');background-size:cover;background-position:center"></div>':'';
    return '<article class="card post-card" data-post="'+safe(p.id)+'"><div class="post-head">'+avatar(initials(p.name))+'<div class="post-user"><b>'+safe(p.name)+' <span class="tag">MEMBER</span></b><small>'+safe(p.handle)+' · '+safe(p.time)+'</small></div><button class="post-menu" aria-label="More post options" data-action="post-options" data-id="'+safe(p.id)+'">···</button></div><div class="post-body">'+safe(p.text)+'</div>'+art+'<div class="post-foot"><div class="post-stats"><span>♡ '+money(p.likes)+' appreciations</span><span>'+p.comments+' comments · Share</span></div><div class="post-actions"><button class="'+(p.liked?"liked":"")+'" data-action="like" data-id="'+safe(p.id)+'">'+(p.liked?"♥":"♡")+' Appreciate</button><button data-action="comment" data-id="'+safe(p.id)+'">◌ Comment</button><button data-action="share" data-id="'+safe(p.id)+'">↗ Share</button></div></div></article>';
  }
  function homeView(){
    const p=state.profile;
    return pageHead("MONDAY, YOUR WORLD IS OPEN","Good afternoon, "+safe(p.name.split(" ")[0])+" ✦","There’s always something new to discover, someone to meet and a next step to take.",'<button class="button-quiet" data-action="edit-profile">Edit profile ↗</button>')+
    '<div class="layout-grid"><div class="main-column">'+
      '<section class="card greeting-banner"><p class="eyebrow">A WORLD OF POSSIBILITY</p><h2>Your next chapter starts here.</h2><p>Meet people, discover places, share your story and create new opportunities in one connected world.</p><div class="greeting-actions"><button class="button-primary" data-view="world">Explore the world ↗</button><button class="button-outline-light" data-action="create-post">Share a moment ＋</button></div></section>'+
      '<section class="card card-pad"><div class="card-title"><h3>People you may know</h3><a href="#" data-view="discover">Find more ↗</a></div><div class="stories"><button class="story add" data-action="create-post"><div class="story-ring"><div class="story-face">＋</div></div><small>Your story</small></button>'+[['Tobi','T'],['Nia','N'],['David','D'],['Zara','Z']].map(x=>'<button class="story" data-action="story" data-name="'+x[0]+'"><div class="story-ring"><div class="story-face">'+x[1]+'</div></div><small>'+x[0]+'</small></button>').join("")+'</div></section>'+
      '<section class="card composer"><span class="avatar avatar-you">'+initials(p.name)+'</span><button class="composer-entry" data-action="create-post">What’s happening in your world, '+safe(p.name.split(" ")[0])+'?</button><div class="composer-actions"><button title="Add image" data-action="create-post">▧</button><button title="Add video" data-action="video-post">▷</button><button title="Voice note" data-action="voice-note">◖</button></div></section>'+
      '<div class="section-label"><span>Your feed</span><a class="subtle-link" data-view="discover">Explore communities →</a></div>'+
      (remoteFeedLoaded&&!state.posts.length?'<div class="card empty-state"><div class="empty-icon">✧</div><h3>Your feed is ready for your story</h3><p>Follow people and publish your first update to start building your ELYVORA community.</p><button class="button-primary" data-action="create-post">Create your first post</button></div>':"")+state.posts.map(postCard).join("")+
    '</div><aside class="right-column">'+
      '<section class="card card-pad"><div class="card-title"><h3>Your profile</h3><a href="#" data-view="profile">View ↗</a></div><div class="profile-mini">'+avatar(initials(p.name),"avatar-you")+'<span><b>'+safe(p.name)+'</b><small>@'+safe(p.handle)+'</small></span></div><p class="muted-copy">'+safe(p.bio)+'</p><div class="divider"></div><div class="mini-list"><div class="mini-row"><span>✧</span><span><b>Profile strength</b><small>Add details to stand out</small></span><strong>65%</strong></div><div class="progress-track"><span style="width:65%"></span></div></div></section>'+
      '<section class="wallet-card card"><div class="wallet-label">YOUR ELYVORA BALANCE · DEMO</div><div class="wallet-amount">◈ '+money(state.balance)+'</div><div class="wallet-caption">Virtual credits · Not real money</div><div class="wallet-meta"><span>Starter balance</span><b>View economy ↗</b></div><button class="button-outline-light" style="margin-top:13px" data-view="economy">Open wallet</button></section>'+
      '<section class="card card-pad"><div class="card-title"><h3>Make your next move</h3></div><div class="quick-grid"><button class="quick-tile" data-view="careers"><span>▥</span><b>Find work</b><small>Build your path</small></button><button class="quick-tile" data-view="world"><span>◎</span><b>Explore</b><small>Visit somewhere new</small></button><button class="quick-tile" data-view="messages"><span>▤</span><b>Connect</b><small>Meet your people</small></button><button class="quick-tile" data-view="economy"><span>◈</span><b>Build wealth</b><small>Virtual economy</small></button></div></section>'+
      '<section class="card card-pad"><div class="card-title"><h3>Trending on ELYVORA</h3><a data-view="discover">Explore</a></div><div class="mini-list"><div class="mini-row"><span class="mini-icon">#</span><span><b>#CreativeLagos</b><small>2.4k conversations</small></span></div><div class="mini-row"><span class="mini-icon">#</span><span><b>#BuildInPublic</b><small>1.8k conversations</small></span></div><div class="mini-row"><span class="mini-icon">#</span><span><b>#WorldExplorers</b><small>960 conversations</small></span></div></div></section>'+
    '</aside></div>';
  }
  const exploreItems=[
    {type:"Community",icon:"✳",title:"Creative minds",desc:"A space for designers, artists, storytellers and people who love making things.",members:"1,240 members"},
    {type:"Community",icon:"⌘",title:"Founders & builders",desc:"Share ideas, find collaborators and grow projects with curious people.",members:"860 members"},
    {type:"Place",icon:"◎",title:"Lagos Island",desc:"Explore waterfront views, culture, food and the energy of the city.",members:"Lagos, Nigeria"},
    {type:"Career",icon:"▥",title:"Digital opportunities",desc:"Discover creative, technology and remote-friendly career paths.",members:"24 opportunities"},
    {type:"Community",icon:"◇",title:"World explorers",desc:"Travel stories, local guides and recommendations from around the world.",members:"3,400 members"},
    {type:"Place",icon:"⌖",title:"Tokyo at night",desc:"Discover neighbourhoods, culture, food and experiences in Tokyo.",members:"Tokyo, Japan"}
  ];
  function discoverView(){
    const peopleMode=discoverFilter==="People";
    const filtered=exploreItems.filter(x=>(discoverFilter==="All"||x.type===discoverFilter)&&(!discoverQuery||[x.title,x.desc,x.type].join(" ").toLowerCase().includes(discoverQuery.toLowerCase())));
    const peopleCards=(remoteUsers||[]).map(u=>'<article class="card feature-card"><div class="profile-mini">'+avatar(initials(u.display_name))+'<span><b>'+safe(u.display_name)+'</b><small>@'+safe(u.username)+'</small></span></div><p>'+safe(u.bio||"An ELYVORA member building their world.")+'</p><span class="tag">'+safe(u.role||"MEMBER")+'</span><p class="muted-copy" style="margin-top:10px">⌖ '+safe(u.location||"Location not shared")+'</p><button class="button-primary" style="width:100%" data-action="follow-user" data-id="'+safe(u.id)+'">＋ Follow member</button></article>').join("");
    const placeCards=filtered.map(x=>'<article class="card feature-card"><div class="feature-icon">'+x.icon+'</div><span class="tag">'+x.type.toUpperCase()+'</span><h3>'+safe(x.title)+'</h3><p>'+safe(x.desc)+'</p><div class="card-title"><small class="muted-copy">'+safe(x.members)+'</small><button class="subtle-link" data-action="explore-item" data-name="'+safe(x.title)+'">Open ↗</button></div></article>').join("");
    let emptyState="";
    if(peopleMode&&!authUser)emptyState='<div class="card empty-state"><div class="empty-icon">◉</div><h3>Meet the community</h3><p>Sign in to search ELYVORA members and build your network.</p><button class="button-primary" data-action="account">Sign in</button></div>';
    else if(peopleMode&&discoverQuery.trim().length<2)emptyState='<div class="card empty-state"><div class="empty-icon">⌕</div><h3>Find your people</h3><p>Search by name or username. Enter at least two characters to find members.</p></div>';
    else if(peopleMode&&!remoteUsers.length)emptyState='<div class="card empty-state"><div class="empty-icon">⌕</div><h3>No members found</h3><p>Try another name or username.</p></div>';
    else if(!peopleMode&&!filtered.length)emptyState='<div class="card empty-state"><div class="empty-icon">⌕</div><h3>No matches just yet</h3><p>Try another search or choose a different category.</p></div>';
    return pageHead("FIND YOUR PEOPLE","Discover something new.","Explore communities, people, opportunities and places across the ELYVORA world.")+
    '<div class="main-column"><section class="discovery-hero"><p class="eyebrow">THE WORLD IS BIGGER TOGETHER</p><h2>Follow your curiosity.</h2><p>Find the people, places and ideas that make your world feel a little bigger.</p><div style="margin-top:18px"><input class="search-field" id="discover-search" value="'+safe(discoverQuery)+'" placeholder="'+(peopleMode?"Search members by name or username...":"Search communities, places or opportunities...")+'"></div><div class="chips">'+["All","Community","Place","Career","People"].map(x=>'<button class="filter-chip '+(discoverFilter===x?"active":"")+'" data-filter="'+x+'">'+x+'</button>').join("")+'</div></section><div class="section-label"><span>'+(peopleMode?"People on ELYVORA":"Explore ELYVORA")+'</span><span class="tag">'+(peopleMode?(remoteUsers||[]).length:filtered.length)+' '+(peopleMode?"members":"suggestions")+'</span></div>'+(peopleMode?'<div class="three-col">'+peopleCards+'</div>':'<div class="three-col">'+placeCards+'</div>')+emptyState+'</div>';
  }
  function worldView(){
    const districts=[
      {id:"yaba",name:"Yaba Exchange",area:"Mainland",icon:"⌘",desc:"A busy creative district for founders, makers, students and new ideas.",status:"COMMUNITY HUB"},
      {id:"surulere",name:"Surulere",area:"Mainland",icon:"✦",desc:"Neighbourhood culture, food, sport and everyday stories.",status:"CULTURE DISTRICT"},
      {id:"victoria",name:"Victoria Island",area:"Island",icon:"▤",desc:"Business towers, waterfront spaces and professional connections.",status:"BUSINESS DISTRICT"},
      {id:"lekki",name:"Lekki Gardens",area:"Island",icon:"⌂",desc:"Homes, green spaces and places to slow down.",status:"RESIDENTIAL DISTRICT"}
    ];
    return pageHead("EXPLORE ELYVORA","A city that feels alive.","Start in Lagos. Meet people, visit neighbourhoods and discover opportunities across the ELYVORA world.",'<span class="tag accent">CITY MAP · LAGOS EDITION</span>')+
    '<div class="main-column"><section class="city-map-panel"><img class="city-map-image" src="/city-map.svg" alt="Illustrated ELYVORA Lagos-inspired city map showing Yaba, Surulere, Victoria Island and Lekki" loading="eager"><div class="city-map-top"><span class="map-live"><i></i> ELYVORA CITY GUIDE</span><span class="tag">MAINLAND ↔ ISLAND</span></div><div class="city-map-footer"><div><p class="eyebrow">YOUR NEXT STOP</p><h2>There is always somewhere to go.</h2><p>Pick a district below to explore its people, places and possibilities.</p></div><button class="button-primary" data-action="visit-place" data-name="Yaba Exchange">Start exploring ↗</button></div></section><div class="city-stats-row"><div class="card city-stat"><b>04</b><small>Featured districts</small></div><div class="card city-stat"><b>12</b><small>Places to discover</small></div><div class="card city-stat"><b>∞</b><small>Stories to create</small></div></div><div class="section-label"><span>Choose your neighbourhood</span><span class="tag">LAGOS · NIGERIA</span></div><div class="two-col">'+districts.map(d=>'<article class="card district-card"><div class="district-icon">'+d.icon+'</div><div class="district-main"><span class="eyebrow">'+d.status+'</span><h3>'+d.name+'</h3><small>'+d.area+'</small><p>'+d.desc+'</p><button class="button-quiet" data-action="visit-place" data-name="'+d.name+'">Explore district ↗</button></div></article>').join("")+'</div><div class="callout">This is ELYVORA’s original illustrated city map and first destination layer. Live street maps, real-time geolocation, routing and fully walkable 3D environments are separate development stages.</div></div>';
  }
  function chatList(){
    return '<div class="inbox-list" id="inbox-list"><div class="inbox-top"><h3>Your conversations</h3><input id="chat-search" class="search-field" placeholder="Search conversations..."></div>'+[
      ["tobi","Tobi Adebayo","T","That sounds exciting. We should exchange ideas sometime!","10:28"],
      ["nia","Nia Williams","N","The art spaces have been amazing.","Yesterday"]
    ].map(x=>'<button class="contact-row '+(state.activeChat===x[0]?"active":"")+'" data-chat="'+x[0]+'">'+avatar(x[2])+'<span class="contact-copy"><b>'+x[1]+'</b><small>'+safe((state.messages[x[0]]||[]).slice(-1)[0]?.text||x[3])+'</small></span><span class="contact-time">'+x[4]+'</span></button>').join("")+'</div>';
  }
  function messagesView(){
    if(authUser){
      const conversations=remoteConversations||[];
      const active=conversations.find(c=>c.id===activeConversationId)||null;
      const list=conversations.map(c=>'<button class="contact-row '+(active&&active.id===c.id?"active":"")+'" data-conversation="'+safe(c.id)+'">'+avatar(initials(c.other_user_name||c.title||"Member"))+'<span class="contact-copy"><b>'+safe(c.other_user_name||c.title||"ELYVORA conversation")+'</b><small>'+safe(c.last_message||"Start a conversation")+'</small></span><span class="contact-time">'+(c.last_message_at?relativeTime(c.last_message_at):"New")+'</span></button>').join("");
      const messages=remoteMessages.map(m=>{
        const media=m.message_type==="image"&&m.media_url?'<img class="chat-attachment-image" src="'+safe(m.media_url)+'" alt="Shared image" loading="lazy">':m.message_type==="video"&&m.media_url?'<video class="chat-attachment-video" src="'+safe(m.media_url)+'" controls playsinline preload="metadata"></video>':m.message_type==="voice"&&m.media_url?'<audio class="chat-attachment-audio" src="'+safe(m.media_url)+'" controls></audio>':"";
        return '<div class="message-bubble '+(m.sender_id===authUser.id?"mine":"")+'">'+(m.body?safe(m.body):"") +media+'<small>'+relativeTime(m.created_at)+'</small></div>';
      }).join("");
      const chatPane=active?'<div class="chat-heading">'+avatar(initials(active.other_user_name||active.title||"Member"))+'<div><b>'+safe(active.other_user_name||active.title||"ELYVORA conversation")+'</b><small>'+(active.other_username?"@"+safe(active.other_username):"Private conversation")+'</small></div><div class="chat-tools"><button data-action="voice-call">♬ Voice</button><button data-action="video-call">▣ Video</button></div></div><div class="callout" style="margin:12px 14px 0">Text messages are stored in your ELYVORA account. Voice notes and audio/video calls are still under development.</div><div class="chat-messages" id="chat-messages"><div class="chat-day">PRIVATE CONVERSATION</div>'+messages+'</div><form class="chat-compose" id="chat-form"><button type="button" class="button-quiet" style="padding:8px" data-action="voice-note" aria-label="Voice note">◖</button><input id="chat-input" placeholder="Write a message..." autocomplete="off" aria-label="Message"><button type="submit">Send ↗</button></form>':'<div class="chat-pane"><div class="empty-state"><div class="empty-icon">▤</div><h3>Your conversations start here</h3><p>Find another ELYVORA member and start a private conversation. Messages are saved to your account.</p><button class="button-primary" data-action="new-chat">＋ New message</button></div></div>';
      return pageHead("STAY IN THE LOOP","Conversations.","Private messages between ELYVORA members.",'<button class="button-quiet" data-action="new-chat">＋ New message</button>')+
        '<div class="card inbox"><div class="inbox-list show-all" id="inbox-list"><div class="inbox-top"><h3>Your conversations</h3><span class="tag">ACCOUNT MESSAGES</span></div>'+list+'</div>'+chatPane+'</div>';
    }
    const id=state.activeChat||"tobi", person=id==="nia"?{name:"Nia Williams",letter:"N",handle:"@niaaroundtheworld"}:{name:"Tobi Adebayo",letter:"T",handle:"@tobithecreator"};
    const msgs=state.messages[id]||[];
    return pageHead("STAY IN THE LOOP","Conversations.","Explore the local messaging demo. Sign in to start conversations with other members.",'<button class="button-quiet" data-action="account">Sign in</button>')+
    '<div class="card inbox">'+chatList()+'<section class="chat-pane"><div class="chat-heading">'+avatar(person.letter)+'<div><b>'+person.name+'</b><small>'+person.handle+' · Sample member</small></div><div class="chat-tools"><button data-action="voice-call">♬ Voice</button><button data-action="video-call">▣ Video</button></div></div><div class="callout" style="margin:12px 14px 0">This is a local demonstration conversation. Sign in to send persistent messages to real ELYVORA members. Voice notes and calls are not live yet.</div><div class="chat-messages" id="chat-messages"><div class="chat-day">TODAY</div>'+msgs.map(m=>'<div class="message-bubble '+(m.mine?"mine":"")+'">'+safe(m.text)+'<small>'+safe(m.time)+'</small></div>').join("")+'</div><form class="chat-compose" id="chat-form"><button type="button" class="button-quiet" style="padding:8px" data-action="voice-note" aria-label="Voice note">◖</button><input id="chat-input" placeholder="Write a demo message..." autocomplete="off" aria-label="Message"><button type="submit">Send ↗</button></form></section></div>';
  }
  const jobs=[
    {id:"community",icon:"✧",title:"Community host",org:"ELYVORA COMMUNITY",desc:"Welcome new members, nurture conversations and help communities thrive.",pay:180,skill:"Communication"},
    {id:"creator",icon:"▧",title:"Digital creator",org:"CREATOR NETWORK",desc:"Create useful stories, short videos and visual content for a growing audience.",pay:220,skill:"Creativity"},
    {id:"guide",icon:"⌖",title:"Local experience guide",org:"WORLD EXPLORERS",desc:"Share local recommendations and help people discover new destinations.",pay:160,skill:"Local knowledge"},
    {id:"builder",icon:"⌘",title:"Product assistant",org:"BUILDERS STUDIO",desc:"Help a small team test ideas, organize feedback and shape better experiences.",pay:250,skill:"Problem solving"}
  ];
  function careersView(){
    const careerItems=remoteJobs?.length?remoteJobs.map(j=>({id:j.id,icon:"✧",title:j.title,org:j.organization,desc:j.description,skill:j.category,compensation_label:j.compensation_label,remote:true,application_status:j.application_status})):jobs;
    const appliedCount=careerItems.filter(j=>j.application_status||state.jobsDone.includes(j.id)).length;
    return pageHead("GROW YOUR POTENTIAL","Build a career that moves you.","Explore professional opportunities and build your career profile.",'<span class="tag accent">CAREER HUB</span>')+
    '<div class="main-column"><section class="card card-pad"><div class="card-title"><h3>Your career snapshot</h3><span class="tag">EXPLORER</span></div><div class="two-col"><div><p class="eyebrow">EXPERIENCE POINTS</p><div class="balance-value">240 <small>XP</small></div><div class="progress-track"><span style="width:24%"></span></div><small class="muted-copy">Your career journey is just beginning.</small></div><div><p class="eyebrow">APPLICATIONS</p><div class="balance-value">'+appliedCount+' <small>SUBMITTED</small></div><small class="muted-copy">Opportunities you have applied for.</small></div></div></section><div class="section-label"><span>Opportunities for you</span><span class="tag">'+careerItems.length+' OPEN ROLES</span></div><div class="two-col">'+careerItems.map(j=>'<article class="card feature-card career-card"><div class="feature-icon">'+j.icon+'</div><p class="eyebrow" style="margin-top:13px">'+safe(j.org)+'</p><h3>'+safe(j.title)+'</h3><p>'+safe(j.desc)+'</p><span class="tag">'+safe(j.skill)+'</span><div class="career-reward"><span>'+(j.remote?safe(j.compensation_label):'◈ '+money(j.pay)+' demo credits')+'</span><span>'+(j.application_status?"Application "+safe(j.application_status):j.remote?"Verified status pending":"+80 XP")+'</span></div><button class="button-primary" data-action="career" data-id="'+safe(j.id)+'" '+(j.application_status||state.jobsDone.includes(j.id)?"disabled":"")+'>'+(j.application_status?"Application submitted ✓":state.jobsDone.includes(j.id)?"Completed ✓":j.remote?"Apply for opportunity ↗":"Take on demo activity ↗")+'</button></article>').join("")+'</div><div class="callout">Career listings are currently starter opportunities for the platform. Employer verification, contracts, real compensation and secure payouts must be implemented before any role is treated as a real paid job.</div></div>';
  }
  const properties=[
    {id:"lagos-studio",name:"City studio",place:"Lagos · Creative District",price:900,desc:"A compact starter space for your next chapter."},
    {id:"london-loft",name:"Skyline loft",place:"London · Riverside",price:1800,desc:"A bright virtual home with a view of the city."},
    {id:"tokyo-retreat",name:"Garden retreat",place:"Tokyo · East Gardens",price:1350,desc:"A peaceful place to reset and create."}
  ];
  function economyView(){
    const economyProperties=remoteEconomy?remoteEconomy.properties.map(p=>({id:p.id,name:p.name,place:p.city+" · "+p.country,price:Number(p.price),desc:p.description})):properties;
    const ownedIds=remoteEconomy?remoteEconomy.owned.map(p=>p.property_id):state.owned;
    const ledger=remoteEconomy?remoteEconomy.transactions.map(t=>({label:t.description,detail:t.reference_type||"Virtual economy",amount:t.amount,type:t.kind==="credit"?"in":"out",time:relativeTime(t.created_at)})):state.transactions;
    return pageHead("YOUR DIGITAL ASSETS","A world of possibility.","Manage your virtual credits, explore properties and shape your simulated life.",'<span class="tag accent">SIMULATED ECONOMY</span>')+
    '<div class="main-column"><section class="card economy-balance"><div class="balance-row"><div><p class="eyebrow" style="color:#c7ef9b">ELYVORA CREDITS · DEMO</p><div class="balance-value">◈ '+money(state.balance)+'</div><div class="balance-note">Virtual credits · no cash value or redemption.</div></div><div class="feature-icon" style="width:55px;height:55px;font-size:25px;background:rgba(196,242,138,.12);color:#d2f6a2">◈</div></div><div class="divider" style="background:rgba(255,255,255,.14)"></div><div class="balance-row"><span class="balance-note">A persistent simulated balance for signed-in members</span><span class="tag">LEVEL 01</span></div></section><div class="section-label"><span>Find your place</span><span class="tag">'+ownedIds.length+' OWNED</span></div><div class="three-col">'+economyProperties.map(x=>'<article class="card property-card"><div class="property-art"></div><div class="property-meta"><h3>'+safe(x.name)+'</h3><p>'+safe(x.place)+'<br>'+safe(x.desc)+'</p><div class="property-price"><b>◈ '+money(x.price)+'</b><button class="button-quiet" data-action="buy-property" data-id="'+safe(x.id)+'" '+(ownedIds.includes(x.id)?"disabled":"")+'>'+(ownedIds.includes(x.id)?"Owned ✓":"Acquire")+'</button></div></div></article>').join("")+'</div><section class="card card-pad"><div class="card-title"><h3>Recent activity</h3><span class="tag">'+(remoteEconomy?"ACCOUNT LEDGER":"LOCAL DEMO LEDGER")+'</span></div><div class="transaction-list">'+ledger.slice(0,8).map(t=>'<div class="transaction-row"><span class="transaction-icon">'+(t.type==="in"?"↙":"↗")+'</span><span><b>'+safe(t.label)+'</b><small>'+safe(t.detail)+' · '+safe(t.time)+'</small></span><strong class="'+(t.type==="in"?"positive":"negative")+'">'+(t.type==="in"?"+":"−")+'◈ '+money(t.amount)+'</strong></div>').join("")+'</div></section><div class="callout">ELYVORA credits and property are simulated in-app data only. They are not cryptocurrency, deposits, investments or real estate ownership, and cannot be redeemed for cash.</div></div>';
  }
  function profileView(){
    const p=state.profile, mine=state.posts.filter(x=>x.handle==="@"+p.handle);
    return pageHead("YOUR IDENTITY","Your profile.","Your story, your interests and the connections you're building.",'<button class="button-primary" data-action="edit-profile">Edit profile ↗</button>')+
    '<div class="layout-grid"><div class="main-column"><section class="card" style="overflow:hidden"><div class="profile-cover"></div><div class="profile-summary">'+avatar(initials(p.name),"avatar-you")+'<div class="profile-copy"><h2>'+safe(p.name)+'</h2><p>@'+safe(p.handle)+' · '+safe(p.location)+'</p><span class="tag">'+safe(p.role)+'</span></div></div><div class="profile-bio">'+safe(p.bio)+'</div><div class="profile-stats"><div><b>'+mine.length+'</b><small>Posts</small></div><div><b>128</b><small>Followers · demo</small></div><div><b>96</b><small>Following · demo</small></div><div><b>01</b><small>Level</small></div></div></section><div class="section-label"><span>Your posts</span><button class="subtle-link" data-action="create-post">＋ Create post</button></div>'+(mine.length?mine.map(postCard).join(""):'<div class="card empty-state"><div class="empty-icon">✧</div><h3>Your story starts here</h3><p>Share a thought, an image or a moment with the ELYVORA community.</p><button class="button-primary" data-action="create-post">Create your first post</button></div>')+'</div><aside class="right-column"><section class="card card-pad"><div class="card-title"><h3>About you</h3><a data-action="edit-profile">Edit</a></div><div class="mini-list"><div class="mini-row"><span class="mini-icon">⌖</span><span><b>Based in</b><small>'+safe(p.location)+'</small></span></div><div class="mini-row"><span class="mini-icon">✧</span><span><b>Doing</b><small>'+safe(p.role)+'</small></span></div><div class="mini-row"><span class="mini-icon">◈</span><span><b>Virtual balance</b><small>◈ '+money(state.balance)+' demo credits</small></span></div></div></section><section class="card card-pad"><div class="card-title"><h3>Your journey</h3></div><div class="mini-list"><div class="mini-row"><span class="mini-icon">✦</span><span><b>Joined ELYVORA</b><small>Explorer · starter profile</small></span></div><div class="mini-row"><span class="mini-icon">▥</span><span><b>Career activities</b><small>'+state.jobsDone.length+' completed</small></span></div><div class="mini-row"><span class="mini-icon">⌂</span><span><b>Virtual properties</b><small>'+state.owned.length+' acquired</small></span></div></div></section></aside></div>';
  }
  function render(){
    setHeader();
    const views={home:homeView,discover:discoverView,world:worldView,messages:messagesView,careers:careersView,economy:economyView,profile:profileView};
    root.innerHTML=(views[currentView]||homeView)();
    if(currentView==="messages")requestAnimationFrame(()=>{const el=document.querySelector("#chat-messages");if(el)el.scrollTop=el.scrollHeight;});
  }
  function go(view){
    if(!["home","discover","world","messages","careers","economy","profile"].includes(view))return;
    currentView=view;document.querySelector("#sidebar").classList.remove("open");render();window.scrollTo({top:0,behavior:"smooth"});
    if(view==="messages"&&authUser){refreshConversations().then(()=>{connectChatSocket(activeConversationId);render();}).catch(err=>toast(err.message,true));}
    else if(view!=="messages")disconnectChatSocket();
  }
  function toast(text,warn=false){
    const region=document.querySelector("#toast-region"),el=document.createElement("div");
    el.className="toast"+(warn?" warn":"");el.textContent=text;region.append(el);
    setTimeout(()=>el.remove(),3400);
  }
  function openModal(title,content,eyebrow="ELYVORA STUDIO"){
    document.querySelector("#modal-title").textContent=title;document.querySelector("#modal-eyebrow").textContent=eyebrow;modalContent.innerHTML=content;modal.hidden=false;
    setTimeout(()=>modalContent.querySelector("input,textarea")?.focus(),50);
  }
  function closeModal(){modal.hidden=true;modalContent.innerHTML="";}
  function editProfile(){
    openModal("Shape your profile",'<form id="profile-form"><div class="form-group"><label>DISPLAY NAME</label><input class="form-control" name="name" maxlength="50" required value="'+safe(state.profile.name)+'"></div><div class="form-group"><label>USERNAME</label><input class="form-control" name="handle" maxlength="24" required value="'+safe(state.profile.handle)+'"></div><div class="form-group"><label>YOUR BIO</label><textarea class="form-control textarea" name="bio" maxlength="220">'+safe(state.profile.bio)+'</textarea></div><div class="form-row"><div class="form-group"><label>LOCATION</label><input class="form-control" name="location" maxlength="60" value="'+safe(state.profile.location)+'"></div><div class="form-group"><label>WHAT YOU DO</label><input class="form-control" name="role" maxlength="60" value="'+safe(state.profile.role)+'"></div></div><div class="modal-footer"><button class="button-quiet" type="button" data-action="close-modal">Cancel</button><button class="button-primary" type="submit">Save profile</button></div></form>');
  }
  function createPost(){
    const guidance=authUser?"Paste a direct HTTPS link to an image or video already hosted elsewhere. Direct file uploads are coming when ELYVORA media storage is enabled.":"This is a local demo post. Add a public HTTPS media link if you want to preview an image or video on this device.";
    openModal("Share with your world",'<form id="post-form"><div class="form-group"><label>WHAT&#39;S ON YOUR MIND?</label><textarea class="form-control textarea" name="text" maxlength="700" placeholder="Share an idea, a moment or something you discovered..." required></textarea></div><div class="form-row"><div class="form-group"><label>MEDIA TYPE</label><select class="form-control" name="mediaType"><option value="image">Image</option><option value="video">Video</option></select></div><div class="form-group"><label>PUBLIC HTTPS MEDIA URL (OPTIONAL)</label><input class="form-control" name="mediaUrl" type="url" placeholder="https://..."></div></div><div class="callout">'+safe(guidance)+'</div><div class="modal-footer"><button class="button-quiet" type="button" data-action="close-modal">Cancel</button><button class="button-primary" type="submit">Publish post ↗</button></div></form>');
  }
  async function openNotifications(){
    if(!authUser){authModal("signin");toast("Sign in to view your notifications.");return;}
    try{
      const data=await apiRequest("/api/notifications");
      const items=data.notifications||[];
      const content=items.length?items.map(n=>'<div class="mini-row" style="align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--line)"><span class="mini-icon">'+(n.kind==="follow"?"◉":"✦")+'</span><span><b>'+safe(n.body)+'</b><small>'+relativeTime(n.created_at)+'</small></span>'+(n.read_at?'<span class="tag">READ</span>':'<button class="button-quiet" data-action="mark-notification" data-id="'+safe(n.id)+'">Mark read</button>')+'</div>').join(""):'<div class="empty-state"><div class="empty-icon">♧</div><h3>You are all caught up</h3><p>New activity and updates from your ELYVORA network will appear here.</p></div>';
      openModal("Notifications",'<div class="mini-list">'+content+'</div>',"YOUR ACTIVITY");
    }catch(error){toast(error.message,true);}
  }
  async function openComments(postId){
    const post=state.posts.find(p=>p.id===postId);
    if(!post)return;
    let comments=[];
    if(post.remote){
      try{const data=await apiRequest("/api/posts/"+encodeURIComponent(postId)+"/comments");comments=data.comments||[];}
      catch(error){toast(error.message,true);return;}
    }
    const list=comments.length?comments.map(c=>'<div class="mini-row" style="align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--line)">'+avatar(initials(c.display_name||c.author?.name))+'<span><b>'+safe(c.display_name||c.author?.name||"Member")+'</b><small>'+safe(c.body||"")+' · '+relativeTime(c.created_at)+'</small></span></div>').join(""):'<p class="muted-copy">No comments yet. Start a thoughtful conversation.</p>';
    const composer=authUser&&post.remote?'<form id="comment-form" data-post="'+safe(postId)+'"><div class="form-group"><label>ADD A COMMENT</label><textarea class="form-control" name="body" rows="3" maxlength="1500" placeholder="Write something kind and useful..." required></textarea></div><div class="modal-footer"><button class="button-primary" type="submit">Post comment ↗</button></div></form>':post.remote?'<div class="callout">Sign in to join the conversation on this post.</div><div class="modal-footer"><button class="button-primary" data-action="account">Sign in</button></div>':'<div class="callout">Comments for local demo posts are not shared with other members yet.</div>';
    openModal("Conversation",'<div class="muted-copy" style="margin-bottom:13px">'+safe(post.text)+'</div><div id="comment-list">'+list+'</div><div class="divider"></div>'+composer,"POST COMMENTS");
  }
  function addTransaction(label,amount,type,detail){
    state.transactions.unshift({label,amount,type,detail,time:"Just now"});
  }
  document.addEventListener("click",e=>{
    const v=e.target.closest("[data-view]");
    if(v){e.preventDefault();go(v.dataset.view);return;}
    const f=e.target.closest("[data-filter]");
    if(f){discoverFilter=f.dataset.filter;remoteUsers=[];render();if(discoverFilter==="People"&&authUser&&discoverQuery.trim().length>=2)searchDiscoverMembers(discoverQuery).then(render).catch(err=>toast(err.message,true));return;}
    const chat=e.target.closest("[data-chat]");
    if(chat){state.activeChat=chat.dataset.chat;save();render();return;}
    const conversation=e.target.closest("[data-conversation]");
    if(conversation){openConversation(conversation.dataset.conversation).catch(err=>toast(err.message,true));return;}
    const b=e.target.closest("[data-action]");
    if(!b)return;
    const a=b.dataset.action,id=b.dataset.id;
    if(a==="create-post")createPost();
    else if(a==="account"){if(authUser){openModal("Sign out of ELYVORA",'<p class="muted-copy">You are signed in as <b>'+safe(authUser.email)+'</b>.</p><div class="modal-footer"><button class="button-quiet" data-action="close-modal">Stay signed in</button><button class="button-primary" data-action="logout">Sign out</button></div>');}else authModal("signin");}
    else if(a==="logout")logout();
    else if(a==="auth-switch")authModal(b.dataset.mode);
    else if(a==="edit-profile")editProfile();
    else if(a==="close-modal")closeModal();
    else if(a==="dismiss-banner"){state.banner=false;save();setHeader();}
    else if(a==="like"){const p=state.posts.find(x=>x.id===id);if(p){if(p.remote&&authUser){apiRequest("/api/posts/"+encodeURIComponent(id)+"/like",{method:"POST",body:"{}"}).then(refreshFeed).then(render).catch(err=>toast(err.message,true));}else{p.liked=!p.liked;p.likes+=p.liked?1:-1;save();render();}}}
    else if(a==="comment")openComments(id);
    else if(a==="share"){if(navigator.clipboard?.writeText)navigator.clipboard.writeText(location.origin).then(()=>toast("ELYVORA link copied.")).catch(()=>toast("Share link: "+location.href));else toast("Share ELYVORA with your friends.");}
    else if(a==="post-options")toast("Post controls will expand with full member accounts.");
    else if(a==="story")toast("Opening "+b.dataset.name+"'s story — story playback is coming soon.");
    else if(a==="video-post"){createPost();const mediaType=modalContent.querySelector('select[name="mediaType"]');if(mediaType)mediaType.value="video";}
    else if(a==="voice-note")toast("Voice notes need microphone capture and secure media storage. They are on the communication roadmap.");
    else if(a==="voice-call")startCall("audio");
    else if(a==="video-call")startCall("video");
    else if(a==="accept-call")acceptCall();
    else if(a==="reject-call")rejectCall();
    else if(a==="end-call")closeCall(true);
    else if(a==="toggle-mic")toggleCallMic();
    else if(a==="toggle-camera")toggleCallCamera();
    else if(a==="notifications")openNotifications();
    else if(a==="mark-notification"){
      if(!authUser)return;
      apiRequest("/api/notifications/"+encodeURIComponent(id)+"/read",{method:"POST",body:"{}"}).then(openNotifications).catch(err=>toast(err.message,true));
    }
    else if(a==="new-chat")newChatModal();
    else if(a==="start-chat")beginConversation(id);
    else if(a==="explore-item")toast("Opening "+b.dataset.name+" — discovery details are being built.");
    else if(a==="follow-user"){
      if(!authUser){authModal("signin");return;}
      apiRequest("/api/users/"+encodeURIComponent(id)+"/follow",{method:"POST",body:"{}"}).then(()=>{toast("You're now following this member.");b.textContent="Following ✓";b.disabled=true;}).catch(err=>toast(err.message,true));
    }
    else if(a==="visit-place")toast("Welcome to the "+b.dataset.name+" destination preview.");
    else if(a==="career"){
      const remoteJob=(remoteJobs||[]).find(x=>x.id===id);
      if(remoteJob){if(!authUser){authModal("signin");toast("Sign in to apply for opportunities.");return;}apiRequest("/api/careers/"+encodeURIComponent(id)+"/apply",{method:"POST",body:JSON.stringify({message:"I would like to be considered for this opportunity."})}).then(refreshJobs).then(()=>{render();toast("Your application has been submitted.");}).catch(err=>toast(err.message,true));}
      else{const j=jobs.find(x=>x.id===id);if(j&&!state.jobsDone.includes(id)){state.jobsDone.push(id);state.balance+=j.pay;addTransaction(j.title,j.pay,"in","Career activity reward");save();render();toast("Activity completed! "+j.pay+" demo credits added.");}}
    }
    else if(a==="buy-property"){
      if(remoteEconomy&&authUser){apiRequest("/api/economy/properties/"+encodeURIComponent(id)+"/purchase",{method:"POST",body:"{}"}).then(refreshEconomy).then(()=>{render();toast("Virtual property added to your portfolio.");}).catch(err=>toast(err.message,true));return;}
      const p=properties.find(x=>x.id===id);
      if(!p)return;
      if(state.owned.includes(id))toast("You already own this virtual property.");
      else if(state.balance<p.price)toast("You need "+money(p.price-state.balance)+" more demo credits.",true);
      else{state.balance-=p.price;state.owned.push(id);addTransaction("Acquired "+p.name,p.price,"out","Virtual property · "+p.place);save();render();toast(p.name+" added to your virtual portfolio.");}
    }
  });
  document.addEventListener("submit",e=>{
    if(e.target.id==="auth-form"){
      e.preventDefault();submitAuth(e.target);
    }else if(e.target.id==="comment-form"){
      e.preventDefault();
      if(!authUser){authModal("signin");return;}
      const form=e.target,postId=form.dataset.post,body=String(new FormData(form).get("body")||"").trim();
      if(!body)return;
      apiRequest("/api/posts/"+encodeURIComponent(postId)+"/comments",{method:"POST",body:JSON.stringify({body})})
        .then(()=>refreshFeed()).then(()=>openComments(postId)).catch(err=>toast(err.message,true));
    }else if(e.target.id==="post-form"){
      e.preventDefault();const fd=new FormData(e.target),text=(fd.get("text")||"").trim();if(!text)return;
      const mediaUrl=String(fd.get("mediaUrl")||"").trim(),mediaType=fd.get("mediaType")==="video"?"video":"image";
      if(mediaUrl){try{const parsed=new URL(mediaUrl);if(parsed.protocol!=="https:"){toast("Media links must use HTTPS.",true);return;}}catch{toast("Enter a valid media URL.",true);return;}}
      if(authUser){
        apiRequest("/api/posts",{method:"POST",body:JSON.stringify({body:text,visibility:"public",mediaUrl:mediaUrl||null,mediaType})}).then(refreshFeed).then(()=>{closeModal();go(currentView==="profile"?"profile":"home");toast("Your post is now published on ELYVORA.");}).catch(err=>toast(err.message,true));
      }else{
        state.posts.unshift({id:"p"+Date.now(),name:state.profile.name,handle:"@"+state.profile.handle,time:"Just now",text,art:mediaUrl?"none":fd.get("art"),image:mediaUrl,mediaType:mediaUrl?mediaType:null,likes:0,comments:0,liked:false});
        save();closeModal();go(currentView==="profile"?"profile":"home");toast("Your post is saved in this device's demo feed. Sign in to publish globally.");
      }
    }else if(e.target.id==="profile-form"){
      e.preventDefault();const fd=new FormData(e.target),previousHandle=state.profile.handle;
      const nextProfile={...state.profile,name:String(fd.get("name")).trim(),handle:String(fd.get("handle")).trim().replace(/^@/,"").replace(/[^a-zA-Z0-9_.]/g,""),bio:String(fd.get("bio")).trim(),location:String(fd.get("location")).trim(),role:String(fd.get("role")).trim()};
      if(authUser){
        apiRequest("/api/profile",{method:"POST",body:JSON.stringify({displayName:nextProfile.name,username:nextProfile.handle,bio:nextProfile.bio,location:nextProfile.location,role:nextProfile.role})}).then(result=>{applyUser(result.user);save();closeModal();render();toast("Your profile has been updated.");}).catch(err=>toast(err.message,true));
      }else{
        state.profile=nextProfile;state.posts.forEach(p=>{if(p.handle==="@"+previousHandle){p.handle="@"+state.profile.handle;p.name=state.profile.name;}});
        save();closeModal();render();toast("Your profile has been updated on this device.");
      }
    }else if(e.target.id==="chat-form"){
      e.preventDefault();const input=document.querySelector("#chat-input"),text=input.value.trim();if(!text)return;
      if(authUser&&activeConversationId){
        apiRequest("/api/conversations/"+encodeURIComponent(activeConversationId)+"/messages",{method:"POST",body:JSON.stringify({body:text})})
          .then(()=>refreshMessages(activeConversationId)).then(render).catch(err=>toast(err.message,true));
      }else{
        const id=state.activeChat||"tobi",now=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
        state.messages[id]=state.messages[id]||[];state.messages[id].push({mine:true,text,time:now});save();render();
      }
    }
  });
  document.addEventListener("input",e=>{
    if(e.target.id==="discover-search"){
      const pos=e.target.selectionStart;discoverQuery=e.target.value;root.innerHTML=discoverView();
      const next=document.querySelector("#discover-search");next?.focus();next?.setSelectionRange(pos,pos);
      if(discoverFilter==="People"&&authUser){
        const query=discoverQuery;
        searchDiscoverMembers(query).then(()=>{if(currentView==="discover"&&discoverFilter==="People"&&discoverQuery===query){const caret=document.querySelector("#discover-search")?.selectionStart??query.length;root.innerHTML=discoverView();const field=document.querySelector("#discover-search");field?.focus();field?.setSelectionRange(caret,caret);}}).catch(err=>toast(err.message,true));
      }
    }
    if(e.target.id==="global-search"){const value=e.target.value.trim();if(value.length>1){discoverQuery=value;go("discover");}}
    if(e.target.id==="chat-search"){const q=e.target.value.toLowerCase();document.querySelectorAll(".contact-row").forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(q));}
    if(e.target.id==="new-chat-search")searchMembers(e.target.value);
  });
  document.querySelector("#mobile-menu").addEventListener("click",()=>document.querySelector("#sidebar").classList.toggle("open"));
  document.addEventListener("keydown",e=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();document.querySelector("#global-search").focus();}
    if(e.key==="Escape"&&!modal.hidden)closeModal();
  });
  modal.addEventListener("click",e=>{if(e.target===modal)closeModal();});
  render();
  initRemote();
})();