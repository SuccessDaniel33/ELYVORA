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
    document.querySelector("#message-count").textContent=Object.values(state.messages).reduce((n,a)=>n+a.length,0)>0?"2":"0";
    document.querySelector("#demo-banner").hidden=!state.banner;
  }
  function pageHead(kicker,title,desc,actions=""){return '<div class="page-head"><div><p class="eyebrow">'+kicker+'</p><h1>'+title+'</h1><p>'+desc+'</p></div><div class="head-actions">'+actions+"</div></div>";}
  function postCard(p){
    let art=p.art==="city"?'<div class="post-art city"><div class="city-art-copy"><span>THE CITY IS YOURS</span><strong>LAGOS, IN MOTION</strong></div></div>':p.art==="creative"?'<div class="post-art creative"><div class="creative-shape"></div></div>':p.art==="community"?'<div class="post-art community"><div class="community-art">BETTER<br>TOGETHER<small>COMMUNITY IS EVERYTHING</small></div></div>':p.image?'<div class="post-art custom-image" style="background-image:url(\''+safe(p.image)+'\');background-size:cover;background-position:center"></div>':'';
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
      state.posts.map(postCard).join("")+
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
    const filtered=exploreItems.filter(x=>(discoverFilter==="All"||x.type===discoverFilter)&&(!discoverQuery||[x.title,x.desc,x.type].join(" ").toLowerCase().includes(discoverQuery.toLowerCase())));
    return pageHead("FIND YOUR PEOPLE","Discover something new.","Explore communities, people, opportunities and places across the ELYVORA world.")+
    '<div class="main-column"><section class="discovery-hero"><p class="eyebrow">THE WORLD IS BIGGER TOGETHER</p><h2>Follow your curiosity.</h2><p>Find the people, places and ideas that make your world feel a little bigger.</p><div style="margin-top:18px"><input class="search-field" id="discover-search" value="'+safe(discoverQuery)+'" placeholder="Search communities, places or opportunities..."></div><div class="chips">'+["All","Community","Place","Career"].map(x=>'<button class="filter-chip '+(discoverFilter===x?"active":"")+'" data-filter="'+x+'">'+x+'</button>').join("")+'</div></section><div class="section-label"><span>Explore ELYVORA</span><span class="tag">'+filtered.length+' suggestions</span></div><div class="three-col">'+filtered.map(x=>'<article class="card feature-card"><div class="feature-icon">'+x.icon+'</div><span class="tag">'+x.type.toUpperCase()+'</span><h3>'+safe(x.title)+'</h3><p>'+safe(x.desc)+'</p><div class="card-title"><small class="muted-copy">'+safe(x.members)+'</small><button class="subtle-link" data-action="explore-item" data-name="'+safe(x.title)+'">Open ↗</button></div></article>').join("")+'</div>'+(filtered.length?"":'<div class="card empty-state"><div class="empty-icon">⌕</div><h3>No matches just yet</h3><p>Try another search or choose a different category.</p></div>')+'</div>';
  }
  function worldView(){
    return pageHead("A WORLD TO EXPLORE","Your world. Without borders.","Explore destinations, discover experiences and find your next place to belong.",'<span class="tag accent">WORLD PREVIEW</span>')+
    '<div class="main-column"><section class="world-hero"><div class="world-overlay"><b>ELYVORA WORLD</b><small>ONE PLANET · MANY STORIES</small></div><div class="world-orbit"></div><div class="world-orbit two"></div><div class="world-globe"></div><span class="world-pin p1"></span><span class="world-label l1">Lagos</span><span class="world-pin p2"></span><span class="world-label l2">London</span><span class="world-pin p3"></span><span class="world-label l3">Tokyo</span><div class="world-bottom"><span>◉ Interactive world concept</span><span>Map experience is a visual prototype · 3 destinations</span></div></section><div class="callout">This is an original visual concept for ELYVORA’s world map. Live maps, geolocation, navigation and real location data will be connected in a later build.</div><div class="section-label"><span>Featured destinations</span><span class="tag">EXPLORE PLACES</span></div><div class="three-col">'+[
      ["lagos","Lagos","Nigeria","Culture, coastline, creativity and endless city energy."],
      ["london","London","United Kingdom","Neighbourhoods, history, art and global connections."],
      ["tokyo","Tokyo","Japan","A vibrant meeting of tradition, design and technology."]
    ].map(x=>'<article class="card location-card"><div class="location-visual '+x[0]+'"><span>'+x[1]+'</span></div><div class="location-info"><span class="tag">'+x[2].toUpperCase()+'</span><p style="margin-top:9px">'+x[3]+'</p><button class="button-quiet" data-action="visit-place" data-name="'+x[1]+'">Explore destination ↗</button></div></article>').join("")+'</div></div>';
  }
  function chatList(){
    return '<div class="inbox-list" id="inbox-list"><div class="inbox-top"><h3>Your conversations</h3><input id="chat-search" class="search-field" placeholder="Search conversations..."></div>'+[
      ["tobi","Tobi Adebayo","T","That sounds exciting. We should exchange ideas sometime!","10:28"],
      ["nia","Nia Williams","N","The art spaces have been amazing.","Yesterday"]
    ].map(x=>'<button class="contact-row '+(state.activeChat===x[0]?"active":"")+'" data-chat="'+x[0]+'">'+avatar(x[2])+'<span class="contact-copy"><b>'+x[1]+'</b><small>'+safe((state.messages[x[0]]||[]).slice(-1)[0]?.text||x[3])+'</small></span><span class="contact-time">'+x[4]+'</span></button>').join("")+'</div>';
  }
  function messagesView(){
    const id=state.activeChat||"tobi", person=id==="nia"?{name:"Nia Williams",letter:"N",handle:"@niaaroundtheworld"}:{name:"Tobi Adebayo",letter:"T",handle:"@tobithecreator"};
    const msgs=state.messages[id]||[];
    return pageHead("STAY IN THE LOOP","Conversations.","Keep in touch with your people. Messaging here is a local interactive demo.",'<button class="button-quiet" data-action="new-chat">＋ New message</button>')+
    '<div class="card inbox">'+chatList()+'<section class="chat-pane"><div class="chat-heading">'+avatar(person.letter)+'<div><b>'+person.name+'</b><small>'+person.handle+' · ELYVORA member</small></div><div class="chat-tools"><button data-action="voice-call">♬ Voice</button><button data-action="video-call">▣ Video</button></div></div><div class="callout" style="margin:12px 14px 0">Prototype chat: messages below stay on this device. Real-time delivery, voice notes and audio/video calls require the live communication backend.</div><div class="chat-messages" id="chat-messages"><div class="chat-day">TODAY</div>'+msgs.map(m=>'<div class="message-bubble '+(m.mine?"mine":"")+'">'+safe(m.text)+'<small>'+safe(m.time)+'</small></div>').join("")+'</div><form class="chat-compose" id="chat-form"><button type="button" class="button-quiet" style="padding:8px" data-action="voice-note" aria-label="Voice note">◖</button><input id="chat-input" placeholder="Write a message..." autocomplete="off" aria-label="Message"><button type="submit">Send ↗</button></form></section></div>';
  }
  const jobs=[
    {id:"community",icon:"✧",title:"Community host",org:"ELYVORA COMMUNITY",desc:"Welcome new members, nurture conversations and help communities thrive.",pay:180,skill:"Communication"},
    {id:"creator",icon:"▧",title:"Digital creator",org:"CREATOR NETWORK",desc:"Create useful stories, short videos and visual content for a growing audience.",pay:220,skill:"Creativity"},
    {id:"guide",icon:"⌖",title:"Local experience guide",org:"WORLD EXPLORERS",desc:"Share local recommendations and help people discover new destinations.",pay:160,skill:"Local knowledge"},
    {id:"builder",icon:"⌘",title:"Product assistant",org:"BUILDERS STUDIO",desc:"Help a small team test ideas, organize feedback and shape better experiences.",pay:250,skill:"Problem solving"}
  ];
  function careersView(){
    return pageHead("GROW YOUR POTENTIAL","Build a career that moves you.","Explore skill paths, take on demo opportunities and grow your professional profile.",'<span class="tag accent">CAREER LAB · DEMO</span>')+
    '<div class="main-column"><section class="card card-pad"><div class="card-title"><h3>Your career snapshot</h3><span class="tag">LEVEL 01 · EXPLORER</span></div><div class="two-col"><div><p class="eyebrow">EXPERIENCE POINTS</p><div class="balance-value">240 <small>XP</small></div><div class="progress-track"><span style="width:24%"></span></div><small class="muted-copy">240 / 1,000 XP to your next level</small></div><div><p class="eyebrow">COMPLETED ACTIVITIES</p><div class="balance-value">'+state.jobsDone.length+' <small>JOBS</small></div><small class="muted-copy">Every activity builds your demo career record.</small></div></div></section><div class="section-label"><span>Opportunities for you</span><span class="tag">4 OPEN ROLES</span></div><div class="two-col">'+jobs.map(j=>'<article class="card feature-card career-card"><div class="feature-icon">'+j.icon+'</div><p class="eyebrow" style="margin-top:13px">'+j.org+'</p><h3>'+j.title+'</h3><p>'+j.desc+'</p><span class="tag">'+j.skill+'</span><div class="career-reward"><span>◈ '+money(j.pay)+' demo credits</span><span>+80 XP</span></div><button class="button-primary" data-action="career" data-id="'+j.id+'" '+(state.jobsDone.includes(j.id)?"disabled":"")+'>'+(state.jobsDone.includes(j.id)?"Completed ✓":"Take on activity ↗")+'</button></article>').join("")+'</div><div class="callout">These are simulated in-app activities and rewards for the prototype, not real job vacancies or guaranteed income. Verified employment and real payments will require a separate opportunity and payout system.</div></div>';
  }
  const properties=[
    {id:"studio",name:"City studio",place:"Lagos · Creative District",price:900,desc:"A compact starter space for your next chapter."},
    {id:"loft",name:"Skyline loft",place:"London · Riverside",price:1800,desc:"A bright virtual home with a view of the city."},
    {id:"retreat",name:"Garden retreat",place:"Tokyo · East Gardens",price:1350,desc:"A peaceful place to reset and create."}
  ];
  function economyView(){
    return pageHead("YOUR DIGITAL ASSETS","A world of possibility.","Manage your virtual credits, explore properties and shape your simulated life.",'<span class="tag accent">SIMULATED ECONOMY</span>')+
    '<div class="main-column"><section class="card economy-balance"><div class="balance-row"><div><p class="eyebrow" style="color:#c7ef9b">ELYVORA CREDITS · DEMO</p><div class="balance-value">◈ '+money(state.balance)+'</div><div class="balance-note">A simulated balance for exploring the prototype.</div></div><div class="feature-icon" style="width:55px;height:55px;font-size:25px;background:rgba(196,242,138,.12);color:#d2f6a2">◈</div></div><div class="divider" style="background:rgba(255,255,255,.14)"></div><div class="balance-row"><span class="balance-note">Virtual economy · Not redeemable for cash</span><span class="tag">LEVEL 01</span></div></section><div class="section-label"><span>Find your place</span><span class="tag">'+state.owned.length+' OWNED</span></div><div class="three-col">'+properties.map(x=>'<article class="card property-card"><div class="property-art"></div><div class="property-meta"><h3>'+x.name+'</h3><p>'+x.place+'<br>'+x.desc+'</p><div class="property-price"><b>◈ '+money(x.price)+'</b><button class="button-quiet" data-action="buy-property" data-id="'+x.id+'" '+(state.owned.includes(x.id)?"disabled":"")+'>'+(state.owned.includes(x.id)?"Owned ✓":"Acquire")+'</button></div></div></article>').join("")+'</div><section class="card card-pad"><div class="card-title"><h3>Recent activity</h3><span class="tag">LOCAL DEMO LEDGER</span></div><div class="transaction-list">'+state.transactions.slice(0,8).map(t=>'<div class="transaction-row"><span class="transaction-icon">'+(t.type==="in"?"↙":"↗")+'</span><span><b>'+safe(t.label)+'</b><small>'+safe(t.detail)+' · '+safe(t.time)+'</small></span><strong class="'+(t.type==="in"?"positive":"negative")+'">'+(t.type==="in"?"+":"−")+'◈ '+money(t.amount)+'</strong></div>').join("")+'</div></section><div class="callout">ELYVORA credits and property are simulated local demo data. They are not cryptocurrency, deposits, investments or real estate ownership. Real financial features need legal, security and compliance design before launch.</div></div>';
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
    openModal("Share with your world",'<form id="post-form"><div class="form-group"><label>WHAT'S ON YOUR MIND?</label><textarea class="form-control textarea" name="text" maxlength="700" placeholder="Share an idea, a moment or something you discovered..." required></textarea></div><div class="form-row"><div class="form-group"><label>POST STYLE</label><select class="form-control" name="art"><option value="city">City moment</option><option value="creative">Creative thought</option><option value="community">Community note</option><option value="none">Text only</option></select></div><div class="form-group"><label>IMAGE URL (OPTIONAL)</label><input class="form-control" name="image" type="url" placeholder="https://..."></div></div><div class="callout">Your post will be added to this device's demo feed. Public community publishing will be enabled when accounts and backend storage are connected.</div><div class="modal-footer"><button class="button-quiet" type="button" data-action="close-modal">Cancel</button><button class="button-primary" type="submit">Publish post ↗</button></div></form>');
  }
  function addTransaction(label,amount,type,detail){
    state.transactions.unshift({label,amount,type,detail,time:"Just now"});
  }
  document.addEventListener("click",e=>{
    const v=e.target.closest("[data-view]");
    if(v){e.preventDefault();go(v.dataset.view);return;}
    const f=e.target.closest("[data-filter]");
    if(f){discoverFilter=f.dataset.filter;render();return;}
    const chat=e.target.closest("[data-chat]");
    if(chat){state.activeChat=chat.dataset.chat;save();render();return;}
    const b=e.target.closest("[data-action]");
    if(!b)return;
    const a=b.dataset.action,id=b.dataset.id;
    if(a==="create-post")createPost();
    else if(a==="edit-profile")editProfile();
    else if(a==="close-modal")closeModal();
    else if(a==="dismiss-banner"){state.banner=false;save();setHeader();}
    else if(a==="like"){const p=state.posts.find(x=>x.id===id);if(p){p.liked=!p.liked;p.likes+=p.liked?1:-1;save();render();}}
    else if(a==="comment")toast("Comments will be enabled with shared conversations in the next stage.");
    else if(a==="share"){if(navigator.clipboard?.writeText)navigator.clipboard.writeText(location.origin).then(()=>toast("ELYVORA link copied.")).catch(()=>toast("Share link: "+location.href));else toast("Share ELYVORA with your friends.");}
    else if(a==="post-options")toast("Post controls will expand with full member accounts.");
    else if(a==="story")toast("Opening "+b.dataset.name+"'s story — story playback is coming soon.");
    else if(a==="video-post")toast("Video uploads are planned for the media release. This prototype currently supports text and image URLs.");
    else if(a==="voice-note")toast("Voice notes need microphone capture and secure media storage. They are on the communication roadmap.");
    else if(a==="voice-call")toast("Audio calling is planned. Live calls need the real-time calling service and user permissions.");
    else if(a==="video-call")toast("Video calling is planned. Live calls need the real-time calling service and user permissions.");
    else if(a==="notifications")toast("You're all caught up. Notifications will appear here.");
    else if(a==="new-chat")toast("New conversations will open when live member search is connected.");
    else if(a==="explore-item")toast("Opening "+b.dataset.name+" — discovery details are being built.");
    else if(a==="visit-place")toast("Welcome to the "+b.dataset.name+" destination preview.");
    else if(a==="career"){
      const j=jobs.find(x=>x.id===id);if(j&&!state.jobsDone.includes(id)){state.jobsDone.push(id);state.balance+=j.pay;addTransaction(j.title,j.pay,"in","Career activity reward");save();render();toast("Activity completed! "+j.pay+" demo credits added.");}
    }
    else if(a==="buy-property"){
      const p=properties.find(x=>x.id===id);
      if(!p)return;
      if(state.owned.includes(id))toast("You already own this virtual property.");
      else if(state.balance<p.price)toast("You need "+money(p.price-state.balance)+" more demo credits.",true);
      else{state.balance-=p.price;state.owned.push(id);addTransaction("Acquired "+p.name,p.price,"out","Virtual property · "+p.place);save();render();toast(p.name+" added to your virtual portfolio.");}
    }
  });
  document.addEventListener("submit",e=>{
    if(e.target.id==="post-form"){
      e.preventDefault();const fd=new FormData(e.target),text=(fd.get("text")||"").trim();if(!text)return;
      state.posts.unshift({id:"p"+Date.now(),name:state.profile.name,handle:"@"+state.profile.handle,time:"Just now",text,art:fd.get("art"),image:(fd.get("image")||"").trim(),likes:0,comments:0,liked:false});
      save();closeModal();go(currentView==="profile"?"profile":"home");toast("Your post is now in your local demo feed.");
    }else if(e.target.id==="profile-form"){
      e.preventDefault();const fd=new FormData(e.target);state.profile={...state.profile,name:String(fd.get("name")).trim(),handle:String(fd.get("handle")).trim().replace(/^@/,"").replace(/[^a-zA-Z0-9_.]/g,""),bio:String(fd.get("bio")).trim(),location:String(fd.get("location")).trim(),role:String(fd.get("role")).trim()};
      state.posts.forEach(p=>{if(p.handle.startsWith("@")&&p.handle.slice(1)===state.profile.handle){p.name=state.profile.name;}});
      save();closeModal();render();toast("Your profile has been updated on this device.");
    }else if(e.target.id==="chat-form"){
      e.preventDefault();const input=document.querySelector("#chat-input"),text=input.value.trim();if(!text)return;
      const id=state.activeChat||"tobi",now=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
      state.messages[id]=state.messages[id]||[];state.messages[id].push({mine:true,text,time:now});save();render();
    }
  });
  document.addEventListener("input",e=>{
    if(e.target.id==="discover-search"){const pos=e.target.selectionStart;discoverQuery=e.target.value;const view=discoverView();root.innerHTML=view;const next=document.querySelector("#discover-search");next?.focus();next?.setSelectionRange(pos,pos);}
    if(e.target.id==="global-search"){const value=e.target.value.trim();if(value.length>1){discoverQuery=value;go("discover");}}
    if(e.target.id==="chat-search"){const q=e.target.value.toLowerCase();document.querySelectorAll(".contact-row").forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(q));}
  });
  document.querySelector("#mobile-menu").addEventListener("click",()=>document.querySelector("#sidebar").classList.toggle("open"));
  document.addEventListener("keydown",e=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();document.querySelector("#global-search").focus();}
    if(e.key==="Escape"&&!modal.hidden)closeModal();
  });
  modal.addEventListener("click",e=>{if(e.target===modal)closeModal();});
  render();
})();