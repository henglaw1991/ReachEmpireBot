(function(){
  'use strict';
  if(window.__REB_LIVE_CHAT_LOADED__) return;
  window.__REB_LIVE_CHAT_LOADED__=true;

  var API_BASE=String(window.REB_API_BASE||localStorage.getItem('REB_API_BASE')||'https://admin.reachempirebot.com').replace(/\/$/,'');
  var TOKEN_KEY='REB_CLIENT_TOKEN', USER_KEY='REB_CLIENT_USER';
  var pollTimer=null, unreadTimer=null, statusTimer=null;
  var mediaRecorder=null, recordStream=null, recordChunks=[], recordHoldActive=false;
  var busy=false, lastMessageId=0, initialLoaded=false, lastKnownUnread=0;
  var objectUrls=[], previewCache=new Map(), ids={};

  function token(){var t=(localStorage.getItem(TOKEN_KEY)||'').trim();return t&&t!=='null'&&t!=='undefined'&&t.indexOf('pending-')!==0?t:'';}
  function authHeaders(extra){var h=extra||{};var t=token();if(t)h.Authorization='Bearer '+t;return h;}
  function userName(){try{var d=JSON.parse(localStorage.getItem(USER_KEY)||'{}')||{},p=d.profile||{};return String(p.name||p.username||d.username||'Account');}catch(e){return 'Account';}}
  function qs(s,r){return (r||document).querySelector(s)}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function formatBytes(n){n=Number(n||0);if(!n)return '0 KB';if(n<1024*1024)return Math.max(1,Math.round(n/1024))+' KB';return (n/1024/1024).toFixed(1)+' MB';}
  function fmtTime(v){if(!v)return '';var d=new Date(v);if(isNaN(d.getTime()))return '';return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}
  function fmtDay(v){if(!v)return '';var d=new Date(v);if(isNaN(d.getTime()))return '';var t=new Date(),y=new Date(t);y.setDate(t.getDate()-1);if(d.toDateString()===t.toDateString())return 'Today';if(d.toDateString()===y.toDateString())return 'Yesterday';return d.toLocaleDateString([],{month:'short',day:'numeric',year:d.getFullYear()===t.getFullYear()?undefined:'numeric'});}
  function setStatus(msg,isError){var e=ids.status;if(!e)return;if(!msg){e.className='reb-chat-status';e.textContent='';return;}e.textContent=msg;e.className='reb-chat-status show'+(isError?' error':'');}
  function setProgress(on){if(ids.progress)ids.progress.classList.toggle('show',!!on);}
  function setBusy(on){busy=!!on;if(ids.send)ids.send.disabled=busy;if(ids.tools){Array.prototype.forEach.call(ids.tools.querySelectorAll('button'),function(b){b.disabled=busy&&!b.classList.contains('reb-chat-mic');});}}
  function badge(n){n=Math.max(0,Number(n||0));lastKnownUnread=n;if(!ids.badge)return;ids.badge.textContent=n>99?'99+':String(n);ids.badge.classList.toggle('show',n>0);}

  function supportIcon(){return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v6H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 1-2Z"/><path d="M20 14h-3v6h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-1-2Z"/><path d="M17 20c-1 1-2.7 1-5 1"/></svg>';}
  function chatIcon(name){
    var common='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
    var d={
      text:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/>',
      image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/>',
      video:'<rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 4-2v8l-4-2z"/>',
      file:'<path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 13h6M9 17h6"/>',
      mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/>',
      send:'<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
      open:'<path d="M14 3h7v7M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>'
    };
    return '<svg '+common+'>'+String(d[name]||d.text)+'</svg>';
  }

  function build(){
    // Remove every legacy Telegram floating launcher. A fresh button prevents old mobile
    // Telegram CSS from taking control of the Customer Service launcher again.
    var legacy=Array.prototype.slice.call(document.querySelectorAll('.reb-floating-chat'));
    var launcher=document.createElement('button');launcher.type='button';launcher.className='reb-customer-chat-launcher';launcher.setAttribute('aria-label','Open ReachEmpireBot Customer Service');
    launcher.innerHTML='<img class="reb-support-launcher-image" src="data:image/png;base64,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" alt="Customer Support">'+'<b class="reb-chat-launcher-badge" aria-label="Unread messages">0</b>';
    if(legacy.length&&legacy[0].parentNode) legacy[0].parentNode.insertBefore(launcher,legacy[0]); else document.body.appendChild(launcher);
    legacy.forEach(function(el){try{el.remove();}catch(e){if(el.parentNode)el.parentNode.removeChild(el);}});
    ids.launcher=launcher;ids.badge=qs('.reb-chat-launcher-badge',launcher);

    var shell=document.createElement('section');shell.className='reb-chat-shell';shell.setAttribute('aria-label','ReachEmpireBot Customer Service Live Chat');
    function isMobileChatClient(){
      var ua=String(navigator.userAgent||'');
      return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || window.innerWidth<=760 || (window.matchMedia&&window.matchMedia('(pointer:coarse)').matches);
    }
    function applyChatFloatingGeometry(){
      if(!isMobileChatClient()){
        ['left','top','right','bottom','width','max-width','min-width','height','max-height','min-height','border-radius'].forEach(function(k){shell.style.removeProperty(k);});
        return;
      }
      shell.style.setProperty('position','fixed','important');
      shell.style.setProperty('left','auto','important');
      shell.style.setProperty('top','auto','important');
      shell.style.setProperty('right','14px','important');
      shell.style.setProperty('bottom','72px','important');
      shell.style.setProperty('width','286px','important');
      shell.style.setProperty('max-width','calc(100vw - 84px)','important');
      shell.style.setProperty('min-width','0','important');
      shell.style.setProperty('height','390px','important');
      shell.style.setProperty('max-height','calc(100dvh - 180px)','important');
      shell.style.setProperty('min-height','0','important');
      shell.style.setProperty('border-radius','20px','important');
    }
    applyChatFloatingGeometry();
    window.addEventListener('resize',applyChatFloatingGeometry,{passive:true});
    window.addEventListener('orientationchange',function(){setTimeout(applyChatFloatingGeometry,120);},{passive:true});

    shell.innerHTML='\
      <header class="reb-chat-header">\
        <div class="reb-chat-avatar">'+supportIcon()+'</div>\
        <div class="reb-chat-headcopy"><strong>ReachEmpireBot Customer Service</strong><span>Live Chat • '+esc(userName())+'</span></div>\
        <button type="button" class="reb-chat-close" aria-label="Close chat">×</button>\
      </header>\
      <div class="reb-chat-progress"></div>\
      <div class="reb-chat-status" role="status" aria-live="polite"></div>\
      <main class="reb-chat-body"></main>\
      <div class="reb-chat-attach-preview"><span></span><button type="button" aria-label="Clear selected attachment">×</button></div>\
      <footer class="reb-chat-composer">\
        <div class="reb-chat-tools">\
          <button type="button" class="reb-chat-tool reb-chat-mic" data-label="Voice" title="Hold to record voice" aria-label="Hold to record voice">'+chatIcon('mic')+'</button>\
          <button type="button" class="reb-chat-tool reb-chat-media-picker" data-label="Photo / Video" title="Upload photo or video" aria-label="Upload photo or video">'+chatIcon('image')+'</button>\
          <button type="button" class="reb-chat-tool reb-chat-file-tool" data-label="File" title="Upload file" aria-label="Upload file">'+chatIcon('file')+'</button>\
          <span class="reb-chat-record-label">Recording… release to send</span>\
        </div>\
        <div class="reb-chat-native-picker-panel reb-chat-media-panel" hidden>\
          <div class="reb-chat-native-picker-head"><strong>Upload Photo / Video</strong><button type="button" class="reb-chat-native-picker-close reb-chat-media-picker-close" aria-label="Close photo or video upload">×</button></div>\
          <label class="reb-chat-native-picker-row"><span>Photo / Video</span><input class="reb-chat-media-input" type="file" accept="image/*,video/*"></label>\
        </div>\
        <div class="reb-chat-native-picker-panel reb-chat-file-panel" hidden>\
          <div class="reb-chat-native-picker-head"><strong>Upload File</strong><button type="button" class="reb-chat-native-picker-close reb-chat-file-picker-close" aria-label="Close file upload">×</button></div>\
          <label class="reb-chat-native-picker-row"><span>File</span><input class="reb-chat-file-input" type="file"></label>\
        </div>\
        <div class="reb-chat-tools reb-chat-tools-spacer" style="display:none">\
          <span class="reb-chat-record-label">Recording… release to send</span>\
        </div>\
        <div class="reb-chat-compose-row"><span class="reb-chat-text-indicator" title="Text message" aria-hidden="true">'+chatIcon('text')+'</span><textarea class="reb-chat-input" rows="1" placeholder="Type a message…" aria-label="Text message"></textarea><button type="button" class="reb-chat-send" aria-label="Send text message">'+chatIcon('send')+'</button></div>\
      </footer>';
    document.body.appendChild(shell);
    ids.shell=shell;ids.body=qs('.reb-chat-body',shell);ids.status=qs('.reb-chat-status',shell);ids.progress=qs('.reb-chat-progress',shell);ids.send=qs('.reb-chat-send',shell);ids.input=qs('.reb-chat-input',shell);ids.tools=qs('.reb-chat-tools',shell);ids.attach=qs('.reb-chat-attach-preview',shell);

    launcher.addEventListener('click',function(){applyChatFloatingGeometry();toggle(true);});
    qs('.reb-chat-close',shell).addEventListener('click',function(){toggle(false);});
    ids.send.addEventListener('click',sendText);
    ids.input.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendText();}});
    var mediaInput=qs('.reb-chat-media-input',shell), fileInput=qs('.reb-chat-file-input',shell);
    var mediaPanel=qs('.reb-chat-media-panel',shell), filePanel=qs('.reb-chat-file-panel',shell);
    var mediaBtn=qs('.reb-chat-media-picker',shell), fileBtn=qs('.reb-chat-file-tool',shell);
    var mediaClose=qs('.reb-chat-media-picker-close',shell), fileClose=qs('.reb-chat-file-picker-close',shell);

    function hideMediaPanel(){if(mediaPanel)mediaPanel.hidden=true;}
    function hideFilePanel(){if(filePanel)filePanel.hidden=true;}

    mediaBtn.addEventListener('click',function(e){
      e.preventDefault();
      hideFilePanel();
      // Keep a visible native picker fallback for older Android browsers, but
      // also open it immediately from this trusted user tap when supported.
      if(mediaPanel)mediaPanel.hidden=false;
      try{mediaInput.click();}catch(_e){}
    });
    fileBtn.addEventListener('click',function(e){
      e.preventDefault();
      hideMediaPanel();
      if(filePanel)filePanel.hidden=false;
      try{fileInput.click();}catch(_e){}
    });
    mediaClose.addEventListener('click',hideMediaPanel);
    fileClose.addEventListener('click',hideFilePanel);

    mediaInput.addEventListener('change',function(){
      var f=this.files&&this.files[0];
      if(f){hideMediaPanel();sendFile(f,this);}
    });
    fileInput.addEventListener('change',function(){
      var f=this.files&&this.files[0];
      if(f){hideFilePanel();sendFile(f,this);}
    });
    qs('button',ids.attach).addEventListener('click',function(){ids.attach.classList.remove('show');});

    var mic=qs('.reb-chat-mic',shell);
    mic.addEventListener('pointerdown',function(e){if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();recordHoldActive=true;try{mic.setPointerCapture(e.pointerId);}catch(_e){}startRecording();});
    mic.addEventListener('pointerup',function(e){e.preventDefault();recordHoldActive=false;stopRecordingAndSend();});
    mic.addEventListener('pointercancel',function(){recordHoldActive=false;cancelRecording();});
    mic.addEventListener('lostpointercapture',function(){if(mediaRecorder&&mediaRecorder.state==='recording')stopRecordingAndSend();});
    mic.addEventListener('contextmenu',function(e){e.preventDefault();});
    renderLoggedOutOrEmpty();
  }

  function isOpen(){return !!(ids.shell&&ids.shell.classList.contains('open'));}
  function toggle(open){if(!ids.shell)return;ids.shell.classList.toggle('open',open!==false);if(open!==false){if(!token()){renderLoggedOutOrEmpty();return;}loadInitial(true);startPolling();}else stopPolling();}
  function renderLoggedOutOrEmpty(){
    if(!ids.body)return;
    var footer=qs('.reb-chat-composer',ids.shell);
    if(!token()){ids.body.innerHTML='<div class="reb-chat-login"><div class="reb-empty-icon">'+supportIcon()+'</div><h4>Customer Service</h4><p>Please log in to your ReachEmpireBot account to start or continue your Live Chat.</p><a href="/login/">Log In</a></div>';if(footer)footer.style.display='none';return;}
    if(footer)footer.style.display='block';
    if(!initialLoaded)ids.body.innerHTML='<div class="reb-chat-empty"><div class="reb-empty-icon">'+supportIcon()+'</div><strong>ReachEmpireBot Customer Service</strong><p>Send text, voice, image, video or files. Web links can be pasted directly into a text message.</p></div>';
  }

  async function api(path,opts){
    opts=opts||{};
    var method=String(opts.method||'GET').toUpperCase();
    // Never let an old Android WebView/browser/CDN reuse a stale chat-history response.
    if(method==='GET')path+=((path.indexOf('?')>=0?'&':'?')+'_rebts='+Date.now());
    opts.headers=authHeaders(opts.headers||{});
    opts.cache='no-store';
    var r=await fetch(API_BASE+path,opts);
    var d=await r.json().catch(function(){return {ok:false,message:'Invalid server response.'};});
    if(r.status===401){initialLoaded=false;renderLoggedOutOrEmpty();throw new Error(d.message||'Please log in again.');}
    if(!r.ok||d.ok===false)throw new Error(d.message||('Request failed ('+r.status+')'));
    return d;
  }

  function maxMessageId(messages){var m=0;(messages||[]).forEach(function(x){m=Math.max(m,Number(x.id||0));});return m;}
  async function loadInitial(markRead){
    if(!token()||busy)return;
    try{setProgress(true);var d=await api('/api/customer-chat/messages?after_id=0');renderMessages(d.messages||[]);lastMessageId=maxMessageId(d.messages||[]);initialLoaded=true;badge(d.unread||0);if(markRead&&Number(d.unread||0)>0){await api('/api/customer-chat/read',{method:'POST'});badge(0);}}
    catch(e){setStatus(e.message,true);}finally{setProgress(false);}
  }
  async function pollNew(){
    if(!isOpen()||!token()||busy)return;
    try{
      var d=await api('/api/customer-chat/messages?after_id='+encodeURIComponent(lastMessageId));
      var msgs=d.messages||[];if(msgs.length){appendMessages(msgs);lastMessageId=Math.max(lastMessageId,maxMessageId(msgs));}
      badge(d.unread||0);if(Number(d.unread||0)>0){await api('/api/customer-chat/read',{method:'POST'});badge(0);}
      if(ids.status&&/Reconnecting/i.test(ids.status.textContent||''))setStatus('');
    }
    catch(_e){setStatus('Reconnecting to Customer Service…',true);}
  }
  async function refreshStatuses(){
    if(!isOpen()||!token()||busy)return;
    try{var d=await api('/api/customer-chat/messages?after_id=0');patchMessageStatuses(d.messages||[]);}catch(_e){}
  }
  function startPolling(){stopPolling();pollTimer=setInterval(pollNew,2200);statusTimer=setInterval(refreshStatuses,12000);}
  function stopPolling(){if(pollTimer){clearInterval(pollTimer);pollTimer=null;}if(statusTimer){clearInterval(statusTimer);statusTimer=null;}}
  async function pollUnread(){if(!token()){badge(0);return;}try{var d=await api('/api/customer-chat/unread');badge(d.unread||0);}catch(_e){}}

  function linkRegex(){return /(?:https?:\/\/|www\.)[^\s<>"']+|(?:\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+(?::\d+)?(?:\/[^\s<>"']*)?)/ig;}
  function cleanUrlToken(v){return String(v||'').replace(/[),.;!?]+$/,'');}
  function normalizeUrl(v){var u=cleanUrlToken(v).trim();if(!u)return '';return /^https?:\/\//i.test(u)?u:'https://'+u;}
  function extractUrls(text){var raw=String(text||''),re=linkRegex(),out=[],m;while((m=re.exec(raw))){var shown=cleanUrlToken(m[0]);if(shown&&shown.indexOf('@')<0)out.push(normalizeUrl(shown));}return out;}
  function linkifyText(text){
    var raw=String(text||''),re=linkRegex(),html='',last=0,m;
    while((m=re.exec(raw))){var shown=m[0],clean=cleanUrlToken(shown),href=normalizeUrl(clean);html+=esc(raw.slice(last,m.index));if(href){html+='<a class="reb-chat-inline-link" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">'+esc(clean)+'</a>';}else{html+=esc(clean);}if(shown.length>clean.length)html+=esc(shown.slice(clean.length));last=m.index+shown.length;}
    html+=esc(raw.slice(last));return html;
  }
  function messageUrls(m){var display=String(m.message_text||m.link_url||'');return extractUrls(display);}

  function renderMessages(messages){
    if(!ids.body)return;
    if(!messages.length){initialLoaded=true;ids.body.innerHTML='<div class="reb-chat-empty"><div class="reb-empty-icon">'+supportIcon()+'</div><strong>ReachEmpireBot Customer Service</strong><p>Send text, voice, image, video or files. Web links can be pasted directly into a text message.</p></div>';return;}
    var html='',lastDay='';messages.forEach(function(m){var day=fmtDay(m.created_at);if(day!==lastDay){html+='<div class="reb-chat-day" data-chat-day="'+esc(day)+'"><span>'+esc(day)+'</span></div>';lastDay=day;}html+=messageHtml(m);});ids.body.innerHTML=html;hydrateNodes(ids.body);ids.body.scrollTop=ids.body.scrollHeight;
  }
  function appendMessages(messages){
    if(!messages.length)return;
    var atBottom=(ids.body.scrollHeight-ids.body.scrollTop-ids.body.clientHeight)<100;
    if(qs('.reb-chat-empty',ids.body))ids.body.innerHTML='';
    messages.forEach(function(m){var day=fmtDay(m.created_at),lastDay=ids.body.querySelector('.reb-chat-day:last-of-type');var dayExists=false;if(lastDay&&lastDay.dataset.chatDay===day)dayExists=true;if(!dayExists){var days=ids.body.querySelectorAll('.reb-chat-day');if(days.length&&days[days.length-1].dataset.chatDay===day)dayExists=true;}if(!dayExists)ids.body.insertAdjacentHTML('beforeend','<div class="reb-chat-day" data-chat-day="'+esc(day)+'"><span>'+esc(day)+'</span></div>');ids.body.insertAdjacentHTML('beforeend',messageHtml(m));var row=ids.body.querySelector('[data-message-id="'+Number(m.id||0)+'"]');if(row)hydrateNodes(row);});
    if(atBottom)ids.body.scrollTop=ids.body.scrollHeight;
  }
  function patchMessageStatuses(messages){(messages||[]).forEach(function(m){if(m.sender_type!=='user')return;var row=ids.body&&ids.body.querySelector('[data-message-id="'+Number(m.id||0)+'"]');if(!row)return;var st=qs('.reb-chat-state',row);if(st)st.textContent=m.read_at?'Read':(m.delivered_at?'Delivered':'Sent');});}

  function messageHtml(m){
    var mine=m.sender_type==='user',att=m.attachment||null,status=mine?(m.read_at?'Read':(m.delivered_at?'Delivered':'Sent')):'',display=String(m.message_text||m.link_url||''),urls=extractUrls(display),content='';
    if(display)content+='<div class="reb-chat-text">'+linkifyText(display)+'</div>';
    if(urls.length===1)content+='<div class="reb-chat-rich-preview" data-link-preview="'+esc(urls[0])+'"><div class="reb-chat-link-skeleton">Loading link preview…</div></div>';
    if(att){if(att.kind==='file')content+=fileCard(att);else content+='<div class="reb-chat-media" data-media-id="'+Number(att.id||0)+'" data-kind="'+esc(att.kind)+'" data-url="'+esc(att.url||'')+'"><div class="reb-chat-media-loading">Loading '+esc(att.kind)+'…</div></div>';}
    var bubbleClass='reb-chat-bubble'+(att?' reb-chat-bubble-media reb-chat-bubble-'+esc(att.kind||'file'):'');return '<div class="reb-chat-row '+(mine?'user':'admin')+'" data-message-id="'+Number(m.id||0)+'"><div class="'+bubbleClass+'"><div class="reb-chat-sender">'+esc(mine?'You':(m.sender_name||'Customer Service'))+'</div>'+content+'<div class="reb-chat-meta"><span>'+esc(fmtTime(m.created_at))+'</span>'+(status?'<span>• <span class="reb-chat-state">'+esc(status)+'</span></span>':'')+'</div></div></div>';
  }
  function fileCard(att){return '<div class="reb-chat-file-card"><span class="reb-chat-file-icon">'+chatIcon('file')+'</span><span class="reb-chat-file-copy"><strong>'+esc(att.original_name||'File')+'</strong><span>'+esc(formatBytes(att.file_size))+'</span></span><button type="button" data-file-view="'+Number(att.id||0)+'" data-file-url="'+esc(att.url||'')+'" data-file-name="'+esc(att.original_name||'file')+'">View</button></div>';}
  function hydrateNodes(root){Array.prototype.forEach.call(root.querySelectorAll('[data-media-id]'),loadMediaNode);Array.prototype.forEach.call(root.querySelectorAll('[data-file-view]'),function(btn){if(btn.dataset.bound)return;btn.dataset.bound='1';btn.addEventListener('click',function(){openProtectedFile(btn.dataset.fileUrl,btn.dataset.fileName);});});Array.prototype.forEach.call(root.querySelectorAll('[data-link-preview]'),loadLinkPreviewNode);}
  async function mediaBlobUrl(rel){var r=await fetch(API_BASE+rel,{headers:authHeaders({})});if(!r.ok)throw new Error('Could not load attachment.');var blob=await r.blob(),u=URL.createObjectURL(blob);objectUrls.push(u);return u;}
  async function loadMediaNode(node){if(node.dataset.loading)return;node.dataset.loading='1';try{var u=await mediaBlobUrl(node.dataset.url),kind=node.dataset.kind;if(kind==='image'){node.innerHTML='<img alt="Chat image">';qs('img',node).src=u;}else if(kind==='video'){node.innerHTML='<video controls playsinline preload="metadata"></video>';qs('video',node).src=u;}else if(kind==='audio'){node.innerHTML='<audio controls preload="metadata"></audio>';qs('audio',node).src=u;}}catch(e){node.innerHTML='<div class="reb-chat-media-loading">Attachment unavailable</div>';}}
  async function openProtectedFile(rel,name){try{setProgress(true);var u=await mediaBlobUrl(rel),w=window.open(u,'_blank');if(!w){var a=document.createElement('a');a.href=u;a.download=name||'file';a.click();}}catch(e){setStatus(e.message,true);}finally{setProgress(false);}}
  async function loadLinkPreviewNode(node){
    if(node.dataset.loading)return;var url=node.dataset.linkPreview;if(!url)return;node.dataset.loading='1';
    try{var p=previewCache.get(url);if(!p){var d=await api('/api/customer-chat/link-preview?url='+encodeURIComponent(url));p=d.preview||{};previewCache.set(url,p);}var href=p.final_url||url,img=p.image_url||p.icon_url||'',thumb=img?'<img src="'+esc(img)+'" alt="Link preview" loading="lazy">':'<span class="reb-chat-preview-thumb-fallback">'+chatIcon('open')+'</span>';node.innerHTML='<a class="reb-chat-preview-card" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">'+thumb+'<span class="reb-chat-preview-copy"><strong>'+esc(p.title||p.domain||url)+'</strong><small>'+esc(p.domain||url)+'</small></span><span class="reb-chat-preview-open">'+chatIcon('open')+'</span></a>';}
    catch(_e){node.innerHTML='';}
  }

  async function sendText(){
    var v=(ids.input.value||'').trim();if(!v||busy||!token())return;ids.input.value='';
    try{setBusy(true);setProgress(true);var d=await api('/api/customer-chat/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:v})});setStatus('');if(d.message){if(qs('.reb-chat-empty',ids.body))ids.body.innerHTML='';appendMessages([d.message]);lastMessageId=Math.max(lastMessageId,Number(d.message.id||0));}else await pollNew();}
    catch(e){ids.input.value=v;setStatus(e.message,true);}finally{setBusy(false);setProgress(false);}
  }
  function uploadChatFile(fd,fileName){
    return new Promise(function(resolve,reject){
      var xhr=new XMLHttpRequest();
      xhr.open('POST',API_BASE+'/api/customer-chat/send',true);
      var t=token();if(t)xhr.setRequestHeader('Authorization','Bearer '+t);
      xhr.timeout=180000;
      xhr.upload.onprogress=function(e){
        if(!e.lengthComputable)return;
        var pct=Math.max(1,Math.min(100,Math.round((e.loaded/e.total)*100)));
        setStatus('Uploading '+fileName+'… '+pct+'%');
      };
      xhr.onerror=function(){reject(new Error('Upload failed. Check your internet connection and try again.'));};
      xhr.ontimeout=function(){reject(new Error('Upload timed out. Please try again on a stable connection.'));};
      xhr.onload=function(){
        var d={};try{d=JSON.parse(xhr.responseText||'{}');}catch(_e){d={ok:false,message:'Invalid server response.'};}
        if(xhr.status===401){initialLoaded=false;renderLoggedOutOrEmpty();reject(new Error(d.message||'Please log in again.'));return;}
        if(xhr.status<200||xhr.status>=300||d.ok===false){reject(new Error(d.message||('Upload failed ('+xhr.status+')')));return;}
        resolve(d);
      };
      xhr.send(fd);
    });
  }
  async function sendFile(file,inputEl,forcedKind){
    if(!file||busy||!token())return;
    var label=qs('span',ids.attach);label.textContent=file.name+' • '+formatBytes(file.size);ids.attach.classList.add('show');
    try{
      setBusy(true);setProgress(true);setStatus('Preparing '+file.name+'…');
      var fd=new FormData();fd.append('file',file,file.name);if(forcedKind)fd.append('attachment_kind',forcedKind);
      var d=await uploadChatFile(fd,file.name);
      ids.attach.classList.remove('show');if(inputEl)inputEl.value='';setStatus('');
      if(d.message){if(qs('.reb-chat-empty',ids.body))ids.body.innerHTML='';appendMessages([d.message]);lastMessageId=Math.max(lastMessageId,Number(d.message.id||0));}
      else await pollNew();
    }
    catch(e){setStatus(e.message,true);}
    finally{setBusy(false);setProgress(false);}
  }

  async function startRecording(){
    var btn=qs('.reb-chat-mic',ids.shell),label=qs('.reb-chat-record-label',ids.shell);if(busy||!token()||(mediaRecorder&&mediaRecorder.state==='recording'))return;if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||typeof MediaRecorder==='undefined'){setStatus('Voice recording is not supported by this browser.',true);return;}
    try{recordStream=await navigator.mediaDevices.getUserMedia({audio:true});if(!recordHoldActive){recordStream.getTracks().forEach(function(t){t.stop();});recordStream=null;return;}recordChunks=[];var mime='';['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus'].some(function(m){if(MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(m)){mime=m;return true;}return false;});mediaRecorder=mime?new MediaRecorder(recordStream,{mimeType:mime}):new MediaRecorder(recordStream);mediaRecorder.ondataavailable=function(e){if(e.data&&e.data.size)recordChunks.push(e.data);};mediaRecorder.onstop=async function(){btn.classList.remove('recording');label.classList.remove('show');if(recordStream)recordStream.getTracks().forEach(function(t){t.stop();});var recorder=mediaRecorder,type=(recorder&&recorder.mimeType)||mime||'audio/webm',chunks=recordChunks.slice();mediaRecorder=null;recordStream=null;recordChunks=[];if(!chunks.length)return;var ext=type.indexOf('mp4')>=0?'m4a':(type.indexOf('ogg')>=0?'ogg':'webm'),blob=new Blob(chunks,{type:type});if(blob.size<300)return;var f=new File([blob],'voice_'+Date.now()+'.'+ext,{type:type});await sendFile(f,null,'audio');};mediaRecorder.start(120);btn.classList.add('recording');label.classList.add('show');setStatus('');}
    catch(e){setStatus('Microphone permission is required for voice messages.',true);if(recordStream)recordStream.getTracks().forEach(function(t){t.stop();});mediaRecorder=null;recordStream=null;recordChunks=[];btn.classList.remove('recording');label.classList.remove('show');}
  }
  function stopRecordingAndSend(){recordHoldActive=false;if(mediaRecorder&&mediaRecorder.state==='recording'){try{mediaRecorder.stop();}catch(e){}}}
  function cancelRecording(){recordHoldActive=false;var btn=qs('.reb-chat-mic',ids.shell),label=qs('.reb-chat-record-label',ids.shell);if(mediaRecorder&&mediaRecorder.state==='recording'){try{mediaRecorder.onstop=null;mediaRecorder.stop();}catch(e){}}if(recordStream)recordStream.getTracks().forEach(function(t){t.stop();});mediaRecorder=null;recordStream=null;recordChunks=[];if(btn)btn.classList.remove('recording');if(label)label.classList.remove('show');}

  function isDedicatedChatPage(){return document.body&&(
    document.body.classList.contains('reb-customer-service-page')||
    document.body.classList.contains('reb-live-chat-page'));
  }
  function activateDedicatedChat(){
    if(!ids.shell)return;
    ids.shell.classList.add('open');
    if(!token()){renderLoggedOutOrEmpty();return;}
    loadInitial(true);
    startPolling();
  }
  function resetForAuth(){
    initialLoaded=false;lastMessageId=0;renderLoggedOutOrEmpty();pollUnread();
    if(isDedicatedChatPage())activateDedicatedChat();
  }
  function resumeChatSync(){
    if(!token()||!ids.shell)return;
    if(isDedicatedChatPage())ids.shell.classList.add('open');
    if(!isOpen())return;
    if(!initialLoaded)loadInitial(true);else pollNew();
    startPolling();
  }
  function init(){
    build();
    if(isDedicatedChatPage())activateDedicatedChat();
    pollUnread();unreadTimer=setInterval(pollUnread,5000);
    window.addEventListener('storage',function(e){if(e.key===TOKEN_KEY||e.key===USER_KEY)resetForAuth();});
    window.addEventListener('reb:auth-changed',resetForAuth);
    window.addEventListener('online',resumeChatSync);
    window.addEventListener('focus',resumeChatSync);
    document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')resumeChatSync();});
    window.addEventListener('beforeunload',function(){stopPolling();objectUrls.forEach(function(u){try{URL.revokeObjectURL(u);}catch(e){}});});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
