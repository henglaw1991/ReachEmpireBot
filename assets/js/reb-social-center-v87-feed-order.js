/* ReachEmpire Social Center — V87 Desktop Feed newest-first order fix; mobile behavior preserved */
(function(){
  'use strict';

  var core=window.REBClientCore||null;
  var communityMode=!!(document.body&&document.body.dataset&&document.body.dataset.communityGroup==='1');
  var rebV82DesktopFast=!(window.matchMedia&&window.matchMedia('(max-width:767px)').matches);
  var draftKey=communityMode?'REB_SOCIAL_COMMUNITY_DRAFT_V1':'REB_SOCIAL_DRAFT_V1';
  var currentFeed='all';
  var feedCursor=null;
  var feedHasMore=false;
  var feedLoading=false;
  var selectedFiles=[];
  var me=null;
  var toastTimer=null;
  var initialDeepLinkHandled=false;
  var activeShareMenu=null;
  var activePostReactionWrap=null;
  var els={};

  function q(id){return document.getElementById(id);}
  function signedIn(){return !!(core&&core.hasLiveSession&&core.hasLiveSession());}
  function displayName(){return core&&core.displayName?core.displayName():'Account';}
  function initials(name){
    var parts=String(name||'R').trim().split(/\s+/).filter(Boolean).slice(0,2);
    return (parts.map(function(p){return p.charAt(0).toUpperCase();}).join('')||'R').slice(0,2);
  }
  function setMentionText(node,value){
    var raw=String(value||''),re=/(?<![A-Za-z0-9_.-])@([A-Za-z0-9_][A-Za-z0-9_.-]{0,63})/g,last=0,m;
    while((m=re.exec(raw))){if(m.index>last)node.appendChild(document.createTextNode(raw.slice(last,m.index)));var a=document.createElement('a');a.className='reb-social-mention-link';a.href='/social/profile/?user='+encodeURIComponent(m[1]);a.textContent=m[0];a.addEventListener('click',function(e){e.stopPropagation()});node.appendChild(a);last=re.lastIndex;}if(last<raw.length)node.appendChild(document.createTextNode(raw.slice(last)));
  }
  function safeLocalGet(key){try{return localStorage.getItem(key)||'';}catch(_e){return '';}}
  function safeLocalSet(key,value){try{localStorage.setItem(key,value);}catch(_e){}}
  function safeLocalRemove(key){try{localStorage.removeItem(key);}catch(_e){}}
  function feedCacheKey(){
    var user=safeLocalGet('REB_CLIENT_USER')||'guest';
    return 'REB_SOCIAL_FEED_CACHE_V87_'+(communityMode?'community':'feed')+'_'+currentFeed+'_'+user;
  }
  function readFeedCache(){
    try{
      var key=feedCacheKey(),raw=sessionStorage.getItem(key)||localStorage.getItem(key);if(!raw)return null;
      var d=JSON.parse(raw);if(!d||!d.saved||Date.now()-Number(d.saved)>86400000||!Array.isArray(d.posts))return null;
      return d;
    }catch(_e){return null;}
  }
  function writeFeedCache(posts,data){
    try{
      var key=feedCacheKey(),raw=JSON.stringify({saved:Date.now(),posts:posts||[],next_cursor:(data&&data.next_cursor)||null,has_more:!!(data&&data.has_more)});
      sessionStorage.setItem(key,raw);localStorage.setItem(key,raw);
    }catch(_e){}
  }
  function scheduleSecondaryLoads(){
    var run=function(){loadUnread();loadMessageUnread();loadMe().then(function(){renderAccount();});};
    if(window.requestIdleCallback)window.requestIdleCallback(run,{timeout:1200});else window.setTimeout(run,350);
  }
  function normalizeList(data){
    if(Array.isArray(data))return data;
    if(data&&Array.isArray(data.posts))return data.posts;
    if(data&&data.data&&Array.isArray(data.data.posts))return data.data.posts;
    if(data&&Array.isArray(data.items))return data.items;
    return [];
  }
  function feedPostTimeMs(post){
    if(!post)return 0;
    var raw=post.created_at||post.createdAt||post.published_at||post.publishedAt||post.time||post.timestamp||'';
    var parsed=Date.parse(String(raw||''));
    if(Number.isFinite(parsed))return parsed;
    var id=Number(post.id||post.post_id||0);
    return Number.isFinite(id)?id:0;
  }
  function newestPostsFirst(posts){
    return (Array.isArray(posts)?posts.slice():[]).sort(function(a,b){
      var delta=feedPostTimeMs(b)-feedPostTimeMs(a);
      if(delta)return delta;
      return Number(b&&(+b.id||+b.post_id)||0)-Number(a&&(+a.id||+a.post_id)||0);
    });
  }
  function backendUnavailable(err){
    var s=Number(err&&err.status||0);
    return s===404||s===405||s===501||s===0;
  }
  function makeError(message,status,data){var e=new Error(message||'Request failed');e.status=Number(status||0);e.data=data||{};return e;}
  async function requestBodyJson(path,options){
    if(!core||!core.request)throw makeError('Social client core is unavailable.',0);
    var result=await core.request(path,options||{});
    var data=result.data||{};
    if(!result.response.ok||data.ok===false)throw makeError(data.message||data.error||('Request failed ('+result.response.status+')'),result.response.status,data);
    return data;
  }
  function dateText(value){
    if(!value)return 'Just now';
    var d=new Date(value);if(Number.isNaN(d.getTime()))return String(value);
    try{return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(d);}catch(_e){return d.toLocaleString();}
  }
  function formatBytes(value){
    var n=Number(value||0);if(!n)return '';
    if(n<1024)return n+' B';
    if(n<1024*1024)return (n/1024).toFixed(n<10240?1:0)+' KB';
    return (n/1024/1024).toFixed(n<10*1024*1024?1:0)+' MB';
  }
  function safeMediaUrl(value){
    var raw=String(value||'').trim();if(!raw)return '';
    try{
      var api=(core&&core.apiBase)?String(core.apiBase()||'').trim():'';
      var base=(raw.charAt(0)==='/'&&api)?api:window.location.origin;
      var u=new URL(raw,base);
      if(!/^https?:$/.test(u.protocol))return '';
      /* Social media URLs may have been saved with an older localhost/domain.
         Re-anchor known backend media paths to the current API base. */
      if(api&&/^\/(?:api\/social\/(?:media|uploads?)|uploads?\/social|social[_-]?uploads?|media\/social)\//i.test(u.pathname)){
        return new URL(u.pathname+u.search+u.hash,api).href;
      }
      return u.href;
    }catch(_e){}
    return '';
  }
  function showToast(message){
    if(!els.toast)return;
    els.toast.textContent=String(message||'');
    els.toast.hidden=false;
    if(toastTimer)window.clearTimeout(toastTimer);
    toastTimer=window.setTimeout(function(){els.toast.hidden=true;},3400);
  }
  function button(label,className){
    var b=document.createElement('button');b.type='button';b.className=className||'';b.textContent=label;return b;
  }
  function empty(node){while(node&&node.firstChild)node.removeChild(node.firstChild);}
  function isEdited(post){
    if(!post||!post.created_at||!post.updated_at)return false;
    return String(post.created_at)!==String(post.updated_at);
  }

  function isVerified(person){if(!person)return false;var vals=[person.is_verified,person.verified,person.blue_verified,person.blue_tick,person.verification_status,person.verified_status];return vals.some(function(v){return v===true||v===1||v==='1'||String(v||'').toLowerCase()==='true'||String(v||'').toLowerCase()==='verified'||String(v||'').toLowerCase()==='active';});}

  function setAvatar(node,person,nameOverride){
    if(!node)return;
    empty(node);
    var name=String(nameOverride||(person&&(person.display_name||person.name||person.username))||'ReachEmpire Member');
    var url=safeMediaUrl(person&&person.avatar);
    function initialsFallback(){empty(node);node.textContent=initials(name);}
    function brandFallback(){
      empty(node);
      var fb=document.createElement('img');fb.alt=name+' default avatar';fb.loading='lazy';fb.className='reb-default-avatar-image';fb.src='/assets/images/resource/reb-robot.png';
      fb.addEventListener('error',initialsFallback,{once:true});node.appendChild(fb);
    }
    if(!url){brandFallback();return;}
    var img=document.createElement('img');img.alt=name+' avatar';img.loading='lazy';img.src=url;
    img.addEventListener('error',brandFallback,{once:true});node.appendChild(img);
  }

  function renderAccount(){
    var yes=signedIn();
    var profile=me||{};
    var name=yes?String(profile.display_name||displayName()):'Guest';
    setAvatar(els.avatar,yes?profile:null,name);
    els.displayName.textContent=name;
    els.accountStatus.textContent=yes?'ReachEmpire Social member':'Log in to join the trading community';
    els.accountAction.textContent=yes?'Dashboard':'Log In';
    els.accountAction.href=yes?'/dashboard/':'/login/';
    els.composer.hidden=!yes;
    els.guest.hidden=yes;
    if(yes){
      var draft=safeLocalGet(draftKey);
      if(draft&&!els.text.value)els.text.value=draft;
    }
    updateCount();
  }

  async function loadMe(){
    me=null;
    renderAccount();
    if(!signedIn()||!core||!core.json)return null;
    try{
      var data=await core.json('/api/social/profile/me',{method:'GET',timeoutMs:10000});
      me=data.profile||null;
      renderAccount();
      return me;
    }catch(_e){return null;}
  }

  function updateCount(){
    var n=els.text?els.text.value.length:0;
    if(els.charCount)els.charCount.textContent=n+' / 1500';
    if(els.publish)els.publish.disabled=!signedIn()||n>1500||(n===0&&selectedFiles.length===0);
  }

  function setFeedState(message,hidden){
    els.feedState.textContent=message||'';
    els.feedState.hidden=!!hidden;
  }

  function attachmentKey(file){return [file.name,file.size,file.lastModified].join('|');}
  function classifyLocalFile(file,preferred){
    var name=String(file&&file.name||'').toLowerCase();
    var ext=name.indexOf('.')>=0?name.split('.').pop():'';
    var type=String(file&&file.type||'').toLowerCase();
    var kind=preferred;
    if(!kind){
      if(type.indexOf('image/')===0||['png','jpg','jpeg','webp'].indexOf(ext)>=0)kind='image';
      else if(type.indexOf('video/')===0||['mp4','webm','mov','m4v'].indexOf(ext)>=0)kind='video';
      else kind='file';
    }
    var max=kind==='image'?12*1024*1024:(kind==='video'?60*1024*1024:25*1024*1024);
    if(Number(file.size||0)<=0)throw new Error('Empty files cannot be attached.');
    if(Number(file.size||0)>max)throw new Error((file.name||'Attachment')+' is too large. Maximum '+Math.round(max/1024/1024)+' MB.');
    if(kind==='image'&&['png','jpg','jpeg','webp'].indexOf(ext)<0)throw new Error('Images must be PNG, JPG, JPEG or WEBP.');
    if(kind==='video'&&['mp4','webm','mov','m4v'].indexOf(ext)<0)throw new Error('Videos must be MP4, WEBM, MOV or M4V.');
    if(kind==='file'&&['pdf','txt','csv','doc','docx','xls','xlsx','zip'].indexOf(ext)<0)throw new Error('Unsupported file attachment type.');
    return kind;
  }
  function addLocalFiles(kind,fileList){
    var files=Array.prototype.slice.call(fileList||[]);
    try{
      files.forEach(function(file){
        var finalKind=classifyLocalFile(file,kind);
        if(selectedFiles.length>=8)throw new Error('A post can contain up to 8 attachments.');
        if(finalKind==='video'&&selectedFiles.some(function(x){return x.kind==='video';}))throw new Error('A post can contain only one video.');
        var key=attachmentKey(file);
        if(selectedFiles.some(function(x){return x.key===key;}))return;
        var preview='';
        if((finalKind==='image'||finalKind==='video')&&window.URL&&URL.createObjectURL)preview=URL.createObjectURL(file);
        selectedFiles.push({file:file,kind:finalKind,key:key,preview:preview});
      });
      renderAttachmentPreview();updateCount();
    }catch(err){showToast(err.message||'Unable to attach file.');}
  }
  function clearSelectedFiles(){
    selectedFiles.forEach(function(item){if(item.preview&&window.URL&&URL.revokeObjectURL)try{URL.revokeObjectURL(item.preview);}catch(_e){}});
    selectedFiles=[];renderAttachmentPreview();updateCount();
    if(els.imageInput)els.imageInput.value='';if(els.videoInput)els.videoInput.value='';if(els.fileInput)els.fileInput.value='';
  }
  function removeSelectedFile(index){
    var item=selectedFiles[index];
    if(item&&item.preview&&window.URL&&URL.revokeObjectURL)try{URL.revokeObjectURL(item.preview);}catch(_e){}
    selectedFiles.splice(index,1);renderAttachmentPreview();updateCount();
  }
  function renderAttachmentPreview(){
    if(!els.attachmentPreview)return;
    empty(els.attachmentPreview);
    els.attachmentPreview.hidden=selectedFiles.length===0;
    selectedFiles.forEach(function(item,index){
      var card=document.createElement('div');card.className='reb-social-selected-attachment';
      var visual=document.createElement('div');visual.className='reb-social-selected-visual';
      if(item.kind==='image'&&item.preview){var img=document.createElement('img');img.src=item.preview;img.alt='Selected image';visual.appendChild(img);}
      else if(item.kind==='video'&&item.preview){var previewVideo=document.createElement('video');previewVideo.src=item.preview;previewVideo.muted=true;previewVideo.playsInline=true;previewVideo.preload='metadata';previewVideo.setAttribute('aria-label','Selected video preview');visual.appendChild(previewVideo);}
      else{var icon=document.createElement('i');icon.className=item.kind==='video'?'fas fa-video':'fas fa-file-alt';visual.appendChild(icon);}
      var copy=document.createElement('div');copy.className='reb-social-selected-copy';
      var strong=document.createElement('strong');strong.textContent=item.file.name;
      var meta=document.createElement('span');meta.textContent=item.kind.toUpperCase()+' · '+formatBytes(item.file.size);
      copy.appendChild(strong);copy.appendChild(meta);
      var remove=button('×','reb-social-selected-remove');remove.setAttribute('aria-label','Remove '+item.file.name);remove.addEventListener('click',function(){removeSelectedFile(index);});
      card.appendChild(visual);card.appendChild(copy);card.appendChild(remove);els.attachmentPreview.appendChild(card);
    });
  }

  function formatSocialCount(n){n=Math.max(0,Number(n||0));if(n>=1000000)return (n/1000000).toFixed(n>=10000000?0:1).replace(/\.0$/,'')+'M';if(n>=1000)return (n/1000).toFixed(n>=10000?0:1).replace(/\.0$/,'')+'K';return String(n);}

  function postButton(label,icon,count,active){
    var b=document.createElement('button');b.type='button';
    if(active)b.className='is-active';
    var i=document.createElement('i');i.className=icon;i.setAttribute('aria-hidden','true');
    var s=document.createElement('span');s.textContent=' '+label+(Number(count)>0?' '+Number(count):'');
    b.appendChild(i);b.appendChild(s);return b;
  }


  var POST_REACTIONS=[
    {code:'LIKE',emoji:'👍',label:'Like'},
    {code:'LOVE',emoji:'❤️',label:'Love'},
    {code:'HAHA',emoji:'😂',label:'Haha'},
    {code:'WOW',emoji:'😮',label:'Wow'},
    {code:'SAD',emoji:'😢',label:'Sad'},
    {code:'PRAY',emoji:'🙏',label:'Pray'}
  ];

  function normalizePostReaction(code){
    code=String(code||'').trim().toUpperCase();
    var aliases={'👍':'LIKE','❤️':'LOVE','❤':'LOVE','😂':'HAHA','😮':'WOW','😢':'SAD','🙏':'PRAY'};
    code=aliases[code]||code;
    return POST_REACTIONS.some(function(item){return item.code===code;})?code:'';
  }

  function postReactionMeta(code){
    code=normalizePostReaction(code);
    return POST_REACTIONS.find(function(item){return item.code===code;})||POST_REACTIONS[0];
  }

  function updatePostReactionButton(post,buttonEl){
    if(!buttonEl)return;
    var code=normalizePostReaction(post&&post.viewer_reaction||(post&&post.viewer_reacted?'LIKE':''));
    var count=Math.max(0,Number(post&&post.reaction_count||0));
    var meta=postReactionMeta(code||'LIKE');
    var icon=buttonEl.querySelector('i');
    var emoji=buttonEl.querySelector('.reb-social-reaction-emoji');
    // D20-C7: keep the action row clean. Reaction emoji belongs only in the
    // summary/picker; the Like action itself uses the single thumbs-up icon.
    if(icon)icon.hidden=false;
    if(emoji){emoji.hidden=true;emoji.textContent='';}
    var label=buttonEl.querySelector('.reb-social-reaction-label')||buttonEl.querySelector('span:not(.reb-social-reaction-emoji)');
    if(label){label.classList.add('reb-social-reaction-label');label.textContent=' '+(code?meta.label:'Like');}
    buttonEl.classList.toggle('is-active',!!code);
    buttonEl.dataset.reaction=code;
    buttonEl.setAttribute('aria-label',code?(meta.label+' reaction. '+count+' total reactions'):'Like this post. Hold or hover for more reactions');
  }

  function updatePostReactionSummary(post,summaryEl){
    if(!summaryEl)return;
    var counts=(post&&post.reaction_counts&&typeof post.reaction_counts==='object')?post.reaction_counts:{};
    var total=Math.max(0,Number(post&&post.reaction_count||0));
    var used=[];
    POST_REACTIONS.forEach(function(item){if(Number(counts[item.code]||0)>0)used.push(item);});
    if(!used.length&&total>0)used.push(postReactionMeta(post&&post.viewer_reaction||'LIKE'));
    summaryEl.hidden=total<=0;
    if(total<=0){summaryEl.innerHTML='';return;}
    var icons=document.createElement('span');icons.className='reb-social-reaction-summary-icons';
    used.slice(0,3).forEach(function(item){var e=document.createElement('span');e.textContent=item.emoji;e.title=item.label;icons.appendChild(e);});
    summaryEl.innerHTML='';summaryEl.appendChild(icons);
    var article=summaryEl.closest('.reb-social-post');
    if(article){var stat=article.querySelector('[data-engagement="reactions"]');if(stat){stat.querySelector('span').textContent=formatSocialCount(total);stat.hidden=total<=0;}}
  }

  function createPostReactionControl(post,summaryEl){
    var wrap=document.createElement('div');wrap.className='reb-social-reaction-wrap';
    var count=Math.max(0,Number(post&&post.reaction_count||post&&post.reactions_count||post&&post.likes||0));
    post.reaction_count=count;
    if(!post.reaction_counts||typeof post.reaction_counts!=='object')post.reaction_counts=count>0?{LIKE:count}:{};
    post.viewer_reaction=normalizePostReaction(post.viewer_reaction||(post.viewer_reacted?'LIKE':''));
    post.viewer_reacted=!!post.viewer_reaction;

    var main=postButton('Like','far fa-thumbs-up',count,!!post.viewer_reaction);
    main.classList.add('reb-social-reaction-main');main.dataset.action='like';
    updatePostReactionButton(post,main);

    var picker=document.createElement('div');picker.className='reb-social-reaction-picker';picker.setAttribute('role','menu');picker.setAttribute('aria-label','Choose a reaction');
    POST_REACTIONS.forEach(function(item){
      var rb=document.createElement('button');rb.type='button';rb.className='reb-social-reaction-choice';rb.dataset.reactionCode=item.code;rb.title=item.label;rb.setAttribute('aria-label',item.label);rb.textContent=item.emoji;
      rb.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();closePicker();reactToPost(post,main,item.code);});
      picker.appendChild(rb);
    });
    wrap.appendChild(main);wrap.appendChild(picker);

    var hoverTimer=null,closeTimer=null,holdTimer=null,heldOpen=false;
    function markChoice(){picker.querySelectorAll('[data-reaction-code]').forEach(function(btn){btn.classList.toggle('is-selected',btn.dataset.reactionCode===normalizePostReaction(post.viewer_reaction));});}
    function openPicker(){
      if(!signedIn())return;
      if(activePostReactionWrap&&activePostReactionWrap!==wrap)activePostReactionWrap.classList.remove('is-open');
      activePostReactionWrap=wrap;markChoice();wrap.classList.add('is-open');
    }
    function closePicker(){wrap.classList.remove('is-open');if(activePostReactionWrap===wrap)activePostReactionWrap=null;}
    wrap.addEventListener('mouseenter',function(){clearTimeout(closeTimer);hoverTimer=setTimeout(openPicker,180);});
    wrap.addEventListener('mouseleave',function(){clearTimeout(hoverTimer);closeTimer=setTimeout(closePicker,260);});
    main.addEventListener('pointerdown',function(event){
      if(event.pointerType==='touch'||event.pointerType==='pen'){
        heldOpen=false;clearTimeout(holdTimer);holdTimer=setTimeout(function(){heldOpen=true;openPicker();},430);
      }
    });
    ['pointerup','pointercancel','pointerleave'].forEach(function(type){main.addEventListener(type,function(){clearTimeout(holdTimer);});});
    main.addEventListener('click',function(event){
      event.preventDefault();event.stopPropagation();
      if(heldOpen){heldOpen=false;return;}
      reactToPost(post,main,normalizePostReaction(post.viewer_reaction)||'LIKE');
    });
    wrap._refreshReactionPicker=markChoice;
    wrap._closeReactionPicker=closePicker;
    return wrap;
  }

  function postMediaList(post){
    var list=[];
    if(post&&Array.isArray(post.media))list=post.media;
    else if(post&&Array.isArray(post.attachments))list=post.attachments;
    if(list.length)return list;
    var image=safeMediaUrl(post&&post.image_url);
    if(image)return [{media_type:'image',type:'image',url:image,original_name:'Post media'}];
    var fallback=safeMediaUrl(post&&post.media_url);
    if(fallback&&String(post&&post.post_type||'').toLowerCase()==='video')return [{media_type:'video',type:'video',url:fallback,original_name:'Post video'}];
    return [];
  }

  function renderPostMedia(post){
    var list=postMediaList(post);if(!list.length)return null;
    var wrap=document.createElement('div');wrap.className='reb-social-post-media-wrap';
    var images=list.filter(function(x){return String(x.media_type||x.type||'').toLowerCase()==='image'&&safeMediaUrl(x.url);});
    if(images.length){
      var grid=document.createElement('div');grid.className='reb-social-media-grid reb-social-media-count-'+Math.min(images.length,4);
      images.forEach(function(item){
        var cell=document.createElement('a');cell.className='reb-social-media-cell';cell.href=safeMediaUrl(item.url);cell.target='_blank';cell.rel='noopener';
        var img=document.createElement('img');img.className='reb-social-post-media';img.loading='lazy';img.alt=String(item.original_name||'Post image');img.src=safeMediaUrl(item.url);
        img.addEventListener('error',function(){cell.remove();if(!grid.children.length)grid.remove();},{once:true});
        cell.appendChild(img);grid.appendChild(cell);
      });
      wrap.appendChild(grid);
    }
    list.filter(function(x){return String(x.media_type||x.type||'').toLowerCase()==='video';}).forEach(function(item){
      var url=safeMediaUrl(item.url);if(!url)return;
      var video=document.createElement('video');video.className='reb-social-post-video';video.controls=true;video.preload='metadata';video.playsInline=true;video.src=url;
      video.addEventListener('error',function(){video.remove();},{once:true});wrap.appendChild(video);
    });
    var files=list.filter(function(x){return String(x.media_type||x.type||'').toLowerCase()==='file';});
    if(files.length){
      var fileList=document.createElement('div');fileList.className='reb-social-post-files';
      files.forEach(function(item){
        var url=safeMediaUrl(item.url);if(!url)return;
        var a=document.createElement('a');a.className='reb-social-file-card';a.href=url;a.target='_blank';a.rel='noopener';
        var icon=document.createElement('i');icon.className='fas fa-file-download';
        var copy=document.createElement('span');var strong=document.createElement('strong');strong.textContent=String(item.original_name||item.filename||'Attachment');
        var small=document.createElement('small');small.textContent=formatBytes(item.file_size)||'Open attachment';copy.appendChild(strong);copy.appendChild(small);
        a.appendChild(icon);a.appendChild(copy);fileList.appendChild(a);
      });
      wrap.appendChild(fileList);
    }
    return wrap.children.length?wrap:null;
  }

  function syncFollowButtons(userId,following){
    document.querySelectorAll('[data-follow-user-id="'+String(userId)+'"]').forEach(function(btn){
      btn.dataset.following=following?'1':'0';btn.textContent=following?'Following':'Follow';btn.classList.toggle('is-following',following);
    });
  }
  async function toggleFollow(userId,buttonEl){
    if(!signedIn()){window.location.href='/login/';return;}
    if(!userId)return;
    var following=String(buttonEl&&buttonEl.dataset.following||'0')==='1';
    if(buttonEl)buttonEl.disabled=true;
    try{
      var data=await core.json('/api/social/users/'+encodeURIComponent(userId)+'/follow',{method:following?'DELETE':'POST',timeoutMs:10000});
      syncFollowButtons(userId,!!data.following);
      showToast(data.following?'Following this member.':'Unfollowed.');
    }catch(err){showToast(err.message||'Unable to update follow.');}
    finally{if(buttonEl)buttonEl.disabled=false;}
  }

  function renderSharedPostCard(shared){
    shared=shared||{};
    var originalId=shared.id||shared.post_id;
    var box=document.createElement('div');box.className='reb-social-shared-post';
    var head=document.createElement('div');head.className='reb-social-shared-post-head';
    var author=shared.author||{};
    var name=String(author.display_name||author.name||author.username||'ReachEmpire Member');
    var av=document.createElement('button');av.type='button';av.className='reb-social-shared-avatar reb-social-avatar-button';setAvatar(av,author,name);
    var copy=document.createElement('div');copy.className='reb-social-shared-author';
    var strong=document.createElement('button');strong.type='button';strong.className='reb-social-shared-author-link';strong.textContent=name;
    var time=document.createElement('span');time.textContent=dateText(shared.created_at||shared.createdAt||shared.time);
    copy.appendChild(strong);copy.appendChild(time);head.appendChild(av);head.appendChild(copy);box.appendChild(head);
    function openAuthor(){if(author.username)openProfile(author.username);else if(author.user_id)openProfileById(author.user_id);}
    av.addEventListener('click',openAuthor);strong.addEventListener('click',openAuthor);
    var text=String(shared.text||shared.content||shared.body||'').trim();
    if(text){var p=document.createElement('p');p.className='reb-social-shared-text';p.textContent=text;box.appendChild(p);}
    var mediaNode=renderPostMedia(shared);if(mediaNode)box.appendChild(mediaNode);
    if(originalId){
      var view=button('View original post','reb-social-view-original');
      view.addEventListener('click',function(){openPostDetail(originalId);});
      box.appendChild(view);
    }
    return box;
  }

  function renderSharedUnavailable(){
    var box=document.createElement('div');box.className='reb-social-shared-post is-unavailable';
    var msg=document.createElement('div');msg.className='reb-social-shared-unavailable';msg.textContent='Original post is no longer available.';box.appendChild(msg);return box;
  }

  var activePostOptionsMenu=null;

  function positionPostOptionsMenu(menu,trigger){
    if(!menu||!trigger||!trigger.getBoundingClientRect)return;
    var rect=trigger.getBoundingClientRect();
    var width=Math.min(290,Math.max(240,window.innerWidth-24));
    menu.style.width=width+'px';
    menu.style.left='0px';menu.style.top='0px';
    var measured=menu.getBoundingClientRect();
    var left=Math.min(window.innerWidth-width-10,Math.max(10,rect.right-width));
    var top=rect.bottom+8;
    if(top+measured.height>window.innerHeight-10)top=Math.max(10,rect.top-measured.height-8);
    menu.style.left=Math.round(left)+'px';menu.style.top=Math.round(top)+'px';
  }

  function closePostOptionMenus(except){
    if(activePostOptionsMenu&&activePostOptionsMenu!==except){
      var oldTrigger=activePostOptionsMenu.__trigger;
      if(oldTrigger)oldTrigger.setAttribute('aria-expanded','false');
      if(activePostOptionsMenu.parentNode)activePostOptionsMenu.parentNode.removeChild(activePostOptionsMenu);
      activePostOptionsMenu=null;
    }
  }

  function postOptionItem(icon,label,extra){
    var b=button('', 'reb-social-post-option'+(extra?' '+extra:''));b.setAttribute('role','menuitem');
    var iconWrap=document.createElement('span');iconWrap.className='reb-social-post-option-icon';var i=document.createElement('i');i.className=icon;i.setAttribute('aria-hidden','true');iconWrap.appendChild(i);
    var copy=document.createElement('span');copy.className='reb-social-post-option-copy';var strong=document.createElement('strong');strong.textContent=String(label||'');copy.appendChild(strong);b.append(iconWrap,copy);return b;
  }

  async function deleteOwnedPost(post){
    var postId=post&&(post.id||post.post_id);if(!postId)return;
    if(!window.confirm('Delete this post? This cannot be undone.'))return;
    try{await core.json('/api/social/posts/'+encodeURIComponent(postId),{method:'DELETE',timeoutMs:12000});showToast('Post deleted.');await loadFeed(true);}
    catch(err){showToast(err.message||'Unable to delete post.');}
  }

  async function togglePinnedPost(post,item){
    var postId=post&&(post.id||post.post_id);if(!postId)return;
    var pinning=!post.is_pinned;item.disabled=true;
    try{
      var data=await core.json('/api/social/posts/'+encodeURIComponent(postId)+'/pin',{method:pinning?'POST':'DELETE',timeoutMs:12000});
      post.is_pinned=!!data.pinned;post.pinned_at=(data.post&&data.post.pinned_at)||null;
      showToast(post.is_pinned?'Post pinned to your Profile timeline.':'Post unpinned from your Profile timeline.');
      closePostOptionMenus();await loadFeed(true);
    }catch(err){showToast(err.message||'Unable to update pinned post.');}
    finally{item.disabled=false;}
  }

  function openPostOptions(post,trigger){
    if(!post||!trigger)return;
    if(activePostOptionsMenu&&activePostOptionsMenu.__trigger===trigger){closePostOptionMenus();return;}
    closePostOptionMenus();
    var menu=document.createElement('div');menu.className='reb-social-post-options is-open';menu.__trigger=trigger;menu.setAttribute('role','menu');menu.setAttribute('aria-label','Post actions');
    if(post.viewer_is_author){
      if(!post.community_id){
        var pin=postOptionItem('fas fa-thumbtack',post.is_pinned?'Unpin post':'Pin post');
        var sub=document.createElement('span');sub.className='reb-social-post-option-note';sub.textContent=post.is_pinned?'Remove from the top of your Profile timeline':'Keep this post at the top of your Profile timeline · max 5';pin.querySelector('.reb-social-post-option-copy').appendChild(sub);
        pin.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();togglePinnedPost(post,pin);});menu.appendChild(pin);
      }
      var edit=postOptionItem('fas fa-pen','Edit post');edit.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();closePostOptionMenus();openManagePost(post);});menu.appendChild(edit);
      var del=postOptionItem('far fa-trash-alt','Delete post','is-danger');del.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();closePostOptionMenus();deleteOwnedPost(post);});menu.appendChild(del);
    }else{
      var report=postOptionItem('far fa-flag','Report post');report.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();closePostOptionMenus();openReportPost(post);});menu.appendChild(report);
    }
    document.body.appendChild(menu);activePostOptionsMenu=menu;trigger.setAttribute('aria-expanded','true');
    positionPostOptionsMenu(menu,trigger);
    window.requestAnimationFrame(function(){positionPostOptionsMenu(menu,trigger);});
  }

  if(!window.__REB_SOCIAL_POST_MENU_BOUND__){
    window.__REB_SOCIAL_POST_MENU_BOUND__=true;
    document.addEventListener('click',function(e){if(!e.target.closest('.reb-social-post-more')&&!e.target.closest('.reb-social-post-options'))closePostOptionMenus();});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')closePostOptionMenus();});
    window.addEventListener('resize',function(){if(activePostOptionsMenu)positionPostOptionsMenu(activePostOptionsMenu,activePostOptionsMenu.__trigger);});
    window.addEventListener('scroll',function(){if(activePostOptionsMenu)closePostOptionMenus();},true);
  }

  function renderPost(post){
    post=post||{};
    var postId=post.id||post.post_id;
    var node=document.createElement('article');node.className='reb-social-post';if(postId)node.dataset.postId=String(postId);
    var head=document.createElement('div');head.className='reb-social-post-head';
    var authorObj=post.author||post.user||{};
    var name=String(authorObj.display_name||authorObj.name||authorObj.username||post.author_name||'ReachEmpire Member');
    var av=document.createElement('button');av.type='button';av.className='reb-social-post-avatar reb-social-avatar-button';setAvatar(av,authorObj,name);
    var ac=document.createElement('div');ac.className='reb-social-post-author';
    var authorRow=document.createElement('div');authorRow.className='reb-social-post-author-row';
    var strong=document.createElement('button');strong.type='button';strong.className='reb-social-author-link';strong.textContent=name;
    var authorId=Number(authorObj.user_id||post.user_id||0);
    var username=String(authorObj.username||'');
    function openAuthor(){if(username)openProfile(username);else if(authorId)openProfileById(authorId);}
    av.addEventListener('click',openAuthor);strong.addEventListener('click',openAuthor);authorRow.appendChild(strong);if(isVerified(authorObj)){var vt=document.createElement('span');vt.className='reb-blue-verified';vt.title='Verified account';vt.setAttribute('aria-label','Verified account');vt.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="#1d9bf0"><circle cx="12" cy="5" r="4.6"/><circle cx="17" cy="7" r="4.6"/><circle cx="19" cy="12" r="4.6"/><circle cx="17" cy="17" r="4.6"/><circle cx="12" cy="19" r="4.6"/><circle cx="7" cy="17" r="4.6"/><circle cx="5" cy="12" r="4.6"/><circle cx="7" cy="7" r="4.6"/><circle cx="12" cy="12" r="6.5"/></g><path d="M7.5 12.2l3 3.05 6.25-6.5" fill="none" stroke="#fff" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round"/></svg>';authorRow.appendChild(vt);}
    if(signedIn()&&!post.viewer_is_author&&authorId){
      var follow=button(post.viewer_following_author?'Following':'Follow','reb-social-follow-mini');follow.dataset.followUserId=String(authorId);follow.dataset.following=post.viewer_following_author?'1':'0';follow.classList.toggle('is-following',!!post.viewer_following_author);follow.addEventListener('click',function(){toggleFollow(authorId,follow);});authorRow.appendChild(follow);
    }
    var meta=document.createElement('span');meta.className='reb-social-post-meta';meta.appendChild(document.createTextNode(dateText(post.created_at||post.createdAt||post.time)+(isEdited(post)?' · Edited':'')));if(post.is_pinned){var pinned=document.createElement('span');pinned.className='reb-social-post-pinned';pinned.innerHTML='<i class="fas fa-thumbtack" aria-hidden="true"></i><span>Pinned</span>';meta.appendChild(pinned);}var privacy=document.createElement('span');privacy.className='reb-social-post-privacy';if(post.community&&post.community.name){privacy.innerHTML='<i class="fas fa-users" aria-hidden="true"></i><span>'+esc(String(post.community.name))+'</span>';}else{privacy.innerHTML='<i class="fas fa-globe-americas" aria-hidden="true"></i><span>Public</span>';}meta.appendChild(privacy);
    ac.appendChild(authorRow);ac.appendChild(meta);head.appendChild(av);head.appendChild(ac);
    if(post.viewer_is_author){
      var more=button('','reb-social-post-more');more.innerHTML='<i class="fas fa-ellipsis-h" aria-hidden="true"></i>';more.setAttribute('aria-label','Post options');more.setAttribute('aria-haspopup','menu');more.setAttribute('aria-expanded','false');more.addEventListener('click',function(event){event.stopPropagation();openPostOptions(post,more);});head.appendChild(more);
    }else if(signedIn()&&postId){
      var reportMore=button('','reb-social-post-more');reportMore.innerHTML='<i class="fas fa-ellipsis-h" aria-hidden="true"></i>';reportMore.setAttribute('aria-label','Post options');reportMore.setAttribute('aria-haspopup','menu');reportMore.setAttribute('aria-expanded','false');reportMore.addEventListener('click',function(event){event.stopPropagation();openPostOptions(post,reportMore);});head.appendChild(reportMore);
    }
    node.appendChild(head);

    var text=String(post.text||post.content||post.body||'').trim();
    if(text){var p=document.createElement('p');p.className='reb-social-post-text';setMentionText(p,text);node.appendChild(p);}
    if(post.shared_post_id){
      node.appendChild(post.shared_post?renderSharedPostCard(post.shared_post):renderSharedUnavailable());
    }else{
      var mediaNode=renderPostMedia(post);if(mediaNode)node.appendChild(mediaNode);
    }

    var reactionCount=post.reaction_count||post.reactions_count||post.likes||0;
    var commentCount=post.comment_count||post.comments_count||0;
    var shareCount=post.share_count||post.shares_count||0;
    var reactionSummary=document.createElement('div');reactionSummary.className='reb-social-reaction-summary reb-social-reaction-summary-fb';
    var engagementLeft=document.createElement('div');engagementLeft.className='reb-social-engagement-left reb-social-engagement-counts';
    function countStat(kind,icon,count,title){
      var el=document.createElement(kind==='comments'?'button':'span');if(kind==='comments')el.type='button';
      el.className='reb-social-engagement-stat reb-social-engagement-icon-stat';el.dataset.engagement=kind;el.title=title;
      var i=document.createElement('i');i.className=icon;i.setAttribute('aria-hidden','true');
      var n=document.createElement('span');n.textContent=formatSocialCount(Math.max(0,Number(count||0)));
      el.append(i,n);el.hidden=Number(count||0)<=0;return el;
    }
    var reactionStat=countStat('reactions','far fa-thumbs-up',reactionCount,'Reactions');
    var commentStat=countStat('comments','far fa-comment',commentCount,'Comments');commentStat.onclick=function(){focusInlineDiscussion(node,postId);};
    var shareStat=countStat('shares','fas fa-share',shareCount,'Shares');
    engagementLeft.append(reactionStat,commentStat,shareStat);
    var engagementRight=document.createElement('div');engagementRight.className='reb-social-engagement-right reb-social-engagement-reactions';
    var reactionIcons=document.createElement('div');reactionIcons.className='reb-social-reaction-icons-host';engagementRight.appendChild(reactionIcons);
    reactionSummary.append(engagementLeft,engagementRight);
    post.reaction_count=Number(reactionCount||0);updatePostReactionSummary(post,reactionIcons);node.appendChild(reactionSummary);
    var actions=document.createElement('div');actions.className='reb-social-post-actions';
    var reactionControl=createPostReactionControl(post,reactionIcons);
    var comment=postButton('Comment','far fa-comment',0,false);comment.dataset.action='comment';comment.querySelector('span').textContent=' Comment';
    comment.addEventListener('click',function(){focusInlineDiscussion(node,postId);});
    var share=postButton('Share','fas fa-share',0,!!post.viewer_shared);share.dataset.action='share';share.querySelector('span').textContent=' Share';
    share.addEventListener('click',function(event){event.stopPropagation();openShareMenu(post,share);});
    actions.appendChild(reactionControl);actions.appendChild(comment);actions.appendChild(share);node.appendChild(actions);
    if(postId)node.appendChild(createInlineDiscussion(postId,Number(commentCount||0)));
    return node;
  }

  async function reactToPost(post,buttonEl,reactionType){
    if(!signedIn()){window.location.href='/login/';return;}
    var id=post.id||post.post_id;if(!id){showToast('This post does not expose a post ID.');return;}
    reactionType=normalizePostReaction(reactionType)||'LIKE';
    buttonEl.disabled=true;
    try{
      var data=await core.json('/api/social/posts/'+encodeURIComponent(id)+'/react',{method:'POST',json:{reaction_type:reactionType},timeoutMs:12000});
      post.viewer_reaction=normalizePostReaction(data.viewer_reaction||data.reaction_type||(data.reacted?reactionType:''));
      post.viewer_reacted=!!post.viewer_reaction;
      post.reaction_count=Math.max(0,Number(data.reaction_count||0));
      if(data.reaction_counts&&typeof data.reaction_counts==='object')post.reaction_counts=data.reaction_counts;
      else if(post.reaction_count<=0)post.reaction_counts={};
      updatePostReactionButton(post,buttonEl);
      var article=buttonEl.closest('.reb-social-post');
      if(article){
        updatePostReactionSummary(post,article.querySelector('.reb-social-reaction-summary'));
        var wrap=buttonEl.closest('.reb-social-reaction-wrap');if(wrap&&wrap._refreshReactionPicker)wrap._refreshReactionPicker();
      }
    }catch(err){showToast(err.message||'Unable to react right now.');}
    finally{buttonEl.disabled=false;}
  }


  function updateCommentCount(postId,count){
    count=Math.max(0,Number(count||0));
    document.querySelectorAll('[data-post-id="'+String(postId)+'"] [data-action="comment"] span').forEach(function(span){span.textContent=' Comment';});document.querySelectorAll('[data-post-id="'+String(postId)+'"] [data-engagement="comments"]').forEach(function(stat){var n=stat.querySelector('span');if(n)n.textContent=formatSocialCount(count);stat.hidden=count<=0;});
    document.querySelectorAll('[data-comments-post-id="'+String(postId)+'"] [data-comment-toggle]').forEach(function(btn){
      btn.dataset.count=String(count);btn.textContent=count>0?('View '+count+' comment'+(count===1?'':'s')):'No comments yet';btn.hidden=count<=0;
    });
  }

  function postShareUrl(post){
    var id=post&&(post.id||post.post_id);
    var url=String(post&&post.share_url||'');
    if(!url&&id)url='https://reachempirebot.com/social/?post='+encodeURIComponent(id);
    return url||window.location.href;
  }

  function closeShareMenu(){
    if(activeShareMenu&&activeShareMenu.parentNode)activeShareMenu.parentNode.removeChild(activeShareMenu);
    activeShareMenu=null;
    document.body.classList.remove('reb-social-share-open');
  }

  async function copyPostLink(post){
    var url=postShareUrl(post);
    try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(url);showToast('Post link copied.');return;}}catch(_e){}
    var input=document.createElement('input');input.value=url;document.body.appendChild(input);input.select();try{document.execCommand('copy');showToast('Post link copied.');}catch(_e){showToast(url);}input.remove();
  }

  async function shareOutside(post){
    var url=postShareUrl(post);
    if(navigator.share){
      try{await navigator.share({title:'ReachEmpire Social',text:String(post&&post.content||'').slice(0,120),url:url});return;}catch(err){if(err&&err.name==='AbortError')return;}
    }
    await copyPostLink(post);
  }

  function externalShare(post,platform){
    var url=postShareUrl(post);
    var text=String(post&&post.content||'').trim().slice(0,180);
    var target='';
    if(platform==='facebook')target='https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(url);
    else if(platform==='whatsapp')target='https://wa.me/?text='+encodeURIComponent((text?text+'\n':'')+url);
    else if(platform==='x')target='https://twitter.com/intent/tweet?text='+encodeURIComponent(text)+'&url='+encodeURIComponent(url);
    else if(platform==='telegram')target='https://t.me/share/url?url='+encodeURIComponent(url)+'&text='+encodeURIComponent(text);
    if(target){window.open(target,'_blank','noopener,noreferrer,width=720,height=720');return;}
    shareOutside(post);
  }

  async function shareToProfile(post,buttonEl,caption){
    if(!signedIn()){window.location.href='/login/';return;}
    var targetId=post&&(post.share_target_id||post.shared_post_id||post.id||post.post_id);
    if(!targetId){showToast('This post does not expose a share target.');return;}
    if(buttonEl)buttonEl.disabled=true;
    try{
      var data=await core.json('/api/social/posts/'+encodeURIComponent(targetId)+'/share',{method:'POST',json:{content:String(caption||'').trim()},timeoutMs:15000});
      post.viewer_shared=true;
      post.share_count=Number(data.share_count||post.share_count||0);
      closeShareMenu();
      showToast('Shared to your ReachEmpire profile.');
      await loadFeed(true);
    }catch(err){showToast(err.message||'Unable to share this post to your profile.');}
    finally{if(buttonEl)buttonEl.disabled=false;}
  }

  function shareShortcut(icon,label,className){
    var b=button('','reb-social-share-shortcut '+(className||''));
    var circle=document.createElement('span');circle.className='reb-social-share-shortcut-icon';circle.innerHTML='<i class="'+icon+'" aria-hidden="true"></i>';
    var text=document.createElement('span');text.textContent=label;b.appendChild(circle);b.appendChild(text);return b;
  }

  function sharePreview(post){
    var source=(post&&post.shared_post_id&&post.shared_post)?post.shared_post:(post||{});
    var box=document.createElement('div');box.className='reb-social-share-preview';
    var author=source.author||source.user||{};
    var name=String(author.display_name||author.name||author.username||'ReachEmpire Member');
    var head=document.createElement('div');head.className='reb-social-share-preview-head';
    var av=document.createElement('span');av.className='reb-social-share-preview-avatar';setAvatar(av,author,name);
    var meta=document.createElement('div');var strong=document.createElement('strong');strong.textContent=name;var small=document.createElement('span');small.textContent=dateText(source.created_at||source.time);meta.appendChild(strong);meta.appendChild(small);head.appendChild(av);head.appendChild(meta);box.appendChild(head);
    var body=String(source.content||source.text||'').trim();if(body){var p=document.createElement('p');p.textContent=body.length>220?body.slice(0,217)+'…':body;box.appendChild(p);}
    var media=postMediaList(source);
    if(media.length){
      var first=media[0];var type=String(first.media_type||first.type||'').toLowerCase();var url=safeMediaUrl(first.url);var mediaBox=document.createElement('div');mediaBox.className='reb-social-share-preview-media reb-social-share-preview-media-'+(type||'file');
      if(type==='image'&&url){var img=document.createElement('img');img.src=url;img.alt='Post preview';mediaBox.appendChild(img);}
      else if(type==='video'&&url){var video=document.createElement('video');video.src=url;video.muted=true;video.playsInline=true;video.preload='metadata';video.setAttribute('aria-label','Video post preview');mediaBox.appendChild(video);var videoTag=document.createElement('span');videoTag.className='reb-social-share-preview-video-tag';videoTag.innerHTML='<i class="fas fa-video" aria-hidden="true"></i> Video';mediaBox.appendChild(videoTag);}
      else{var fileCard=document.createElement('div');fileCard.className='reb-social-share-preview-file';var icon=document.createElement('i');icon.className='fas fa-paperclip';var label=document.createElement('span');label.textContent=String(first.original_name||'Attachment');fileCard.appendChild(icon);fileCard.appendChild(label);mediaBox.appendChild(fileCard);}
      if(media.length>1){var count=document.createElement('span');count.className='reb-social-share-preview-count';count.textContent='+'+(media.length-1);mediaBox.appendChild(count);}
      box.appendChild(mediaBox);
    }
    return box;
  }

  function openShareMenu(post,_anchorButton){
    closeShareMenu();
    var overlay=document.createElement('div');overlay.className='reb-social-share-modal-overlay';overlay.dataset.postId=String(post&&(post.id||post.post_id)||'');overlay.setAttribute('role','presentation');
    var modal=document.createElement('section');modal.className='reb-social-share-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Share post');modal.addEventListener('click',function(event){event.stopPropagation();});
    overlay.appendChild(modal);

    var header=document.createElement('div');header.className='reb-social-share-modal-head';var title=document.createElement('h3');title.textContent='Share';var close=button('×','reb-social-share-modal-close');close.setAttribute('aria-label','Close share');close.addEventListener('click',closeShareMenu);header.appendChild(title);header.appendChild(close);modal.appendChild(header);

    var account=document.createElement('div');account.className='reb-social-share-account';var avatar=document.createElement('span');avatar.className='reb-social-share-account-avatar';var person=me||{};var myName=String(person.display_name||displayName()||'ReachEmpire Member');setAvatar(avatar,person,myName);var accountCopy=document.createElement('div');var name=document.createElement('strong');name.textContent=myName;var chips=document.createElement('div');chips.className='reb-social-share-chips';var feedChip=document.createElement('span');feedChip.textContent='Feed';var privacy=document.createElement('span');privacy.innerHTML='<i class="fas fa-globe-asia" aria-hidden="true"></i> Public';chips.appendChild(feedChip);chips.appendChild(privacy);accountCopy.appendChild(name);accountCopy.appendChild(chips);account.appendChild(avatar);account.appendChild(accountCopy);modal.appendChild(account);

    var caption=document.createElement('textarea');caption.className='reb-social-share-caption';caption.maxLength=1500;caption.rows=3;caption.placeholder='Say something about this…';modal.appendChild(caption);
    var previewLabel=document.createElement('div');previewLabel.className='reb-social-share-preview-label';previewLabel.textContent='Original post';modal.appendChild(previewLabel);
    modal.appendChild(sharePreview(post));

    var primaryRow=document.createElement('div');primaryRow.className='reb-social-share-primary-row';var shareNow=button('Share now','reb-social-share-now');shareNow.addEventListener('click',function(){shareToProfile(post,shareNow,caption.value);});primaryRow.appendChild(shareNow);modal.appendChild(primaryRow);

    var divider=document.createElement('div');divider.className='reb-social-share-section-title';divider.textContent='Share to';modal.appendChild(divider);
    var shortcuts=document.createElement('div');shortcuts.className='reb-social-share-shortcuts';
    var copy=shareShortcut('fas fa-link','Copy link');copy.addEventListener('click',function(){copyPostLink(post);});
    var fb=shareShortcut('fab fa-facebook-f','Facebook','is-facebook');fb.addEventListener('click',function(){externalShare(post,'facebook');});
    var wa=shareShortcut('fab fa-whatsapp','WhatsApp','is-whatsapp');wa.addEventListener('click',function(){externalShare(post,'whatsapp');});
    var tg=shareShortcut('fab fa-telegram-plane','Telegram','is-telegram');tg.addEventListener('click',function(){externalShare(post,'telegram');});
    var x=shareShortcut('fab fa-twitter','X','is-x');x.addEventListener('click',function(){externalShare(post,'x');});
    var more=shareShortcut('fas fa-ellipsis-h','More');more.addEventListener('click',function(){shareOutside(post);});
    [copy,fb,wa,tg,x,more].forEach(function(item){shortcuts.appendChild(item);});modal.appendChild(shortcuts);

    overlay.addEventListener('click',function(event){if(event.target===overlay)closeShareMenu();});
    document.body.appendChild(overlay);activeShareMenu=overlay;document.body.classList.add('reb-social-share-open');
    window.setTimeout(function(){caption.focus();},40);
  }


  async function loadFeedDesktopFast(reset){
    if(feedLoading)return;
    if(!core||!core.json){setFeedState('Social client core is unavailable. Refresh the page.',false);return;}
    feedLoading=true;
    var cached=null,showingCache=false;
    if(reset!==false){
      feedCursor=null;feedHasMore=false;
      cached=readFeedCache();
      if(cached&&cached.posts.length){
        els.feed.innerHTML='';newestPostsFirst(cached.posts).forEach(function(post){els.feed.appendChild(renderPost(post));});
        feedCursor=cached.next_cursor||null;feedHasMore=!!cached.has_more;els.loadMore.hidden=!feedHasMore;setFeedState('',true);showingCache=true;
      }else{els.feed.innerHTML='';setFeedState('Loading latest posts…',false);els.loadMore.hidden=true;}
    }else{els.loadMore.disabled=true;els.loadMore.textContent='Loading…';}
    var path=communityMode?'/api/social/community/feed?limit=6&sort=newest&order=desc':('/api/social/feed?scope='+encodeURIComponent(currentFeed)+'&mode='+encodeURIComponent(currentFeed)+'&limit=6&sort=newest&order=desc');
    if(reset===false&&feedCursor)path+='&cursor='+encodeURIComponent(feedCursor);
    try{
      var data=await core.json(path,{method:'GET',timeoutMs:12000});
      var posts=newestPostsFirst(normalizeList(data));
      if(reset!==false)els.feed.innerHTML='';
      if((reset!==false)&&!posts.length){setFeedState(communityMode?'No community posts yet. Be the first member to post.':'No posts yet. Be the first ReachEmpire member to share.',false);}
      else{setFeedState('',true);posts.forEach(function(post){els.feed.appendChild(renderPost(post));});}
      feedCursor=data.next_cursor||null;feedHasMore=!!data.has_more;els.loadMore.hidden=!feedHasMore;
      if(reset!==false)writeFeedCache(posts,data);
    }catch(err){
      if(showingCache){setFeedState('',true);}
      else if(backendUnavailable(err))setFeedState('Social Feed API is unavailable on the Backend.',false);
      else if(Number(err&&err.status)===401)setFeedState('Log in to load your Following feed.',false);
      else {var detail=String((err&&err.message)||'').trim();if(/<!doctype|<html|internal server error|traceback/i.test(detail))detail='';setFeedState('Unable to load Social feed right now.'+(detail?(' '+detail):''),false);}
    }finally{feedLoading=false;els.loadMore.disabled=false;els.loadMore.textContent='Load more';}
  }

  async function loadFeedLegacy(reset){
    if(feedLoading)return;
    if(!core||!core.json){setFeedState('Social client core is unavailable. Refresh the page.',false);return;}
    feedLoading=true;
    if(reset!==false){feedCursor=null;feedHasMore=false;els.feed.innerHTML='';setFeedState('Loading latest posts…',false);els.loadMore.hidden=true;}
    else{els.loadMore.disabled=true;els.loadMore.textContent='Loading…';}
    var path=communityMode?'/api/social/community/feed?limit=20':('/api/social/feed?mode='+encodeURIComponent(currentFeed)+'&limit=20');
    if(reset===false&&feedCursor)path+='&cursor='+encodeURIComponent(feedCursor);
    try{
      var data=await core.json(path,{method:'GET',timeoutMs:15000});
      var posts=normalizeList(data);
      if((reset!==false)&&!posts.length){setFeedState(communityMode?'No community posts yet. Be the first member to post.':'No posts yet. Be the first ReachEmpire member to share.',false);}
      else{setFeedState('',true);posts.forEach(function(post){els.feed.appendChild(renderPost(post));});}
      feedCursor=data.next_cursor||null;feedHasMore=!!data.has_more;els.loadMore.hidden=!feedHasMore;
    }catch(err){
      if(backendUnavailable(err))setFeedState('Social Feed API is unavailable on the Backend.',false);
      else if(Number(err&&err.status)===401)setFeedState('Log in to load your Following feed.',false);
      else {var detail=String((err&&err.message)||'').trim();if(/<!doctype|<html|internal server error|traceback/i.test(detail))detail='';setFeedState('Unable to load Social feed right now.'+(detail?(' '+detail):''),false);}
    }finally{feedLoading=false;els.loadMore.disabled=false;els.loadMore.textContent='Load more';}
  }

  function loadFeed(reset){return rebV82DesktopFast?loadFeedDesktopFast(reset):loadFeedLegacy(reset);}

  async function cancelStagedUpload(uploadId){
    if(!uploadId||!core||!core.json)return;
    try{await core.json('/api/social/uploads/'+encodeURIComponent(uploadId),{method:'DELETE',timeoutMs:8000});}catch(_e){}
  }

  async function stageUploadItem(item,fileIndex,fileTotal){
    var file=item.file;
    var init=await core.json('/api/social/uploads/init',{method:'POST',json:{filename:file.name,mime_type:file.type||'',size:Number(file.size||0),media_type:item.kind},timeoutMs:15000});
    var uploadId=String(init.upload_id||'');if(!uploadId)throw makeError('Backend did not create an upload session.',500,init);
    var chunkSize=Math.max(256*1024,Math.min(Number(init.chunk_size||3*1024*1024),3*1024*1024));
    var offset=0;
    try{
      while(offset<file.size){
        var end=Math.min(file.size,offset+chunkSize);
        var blob=file.slice(offset,end);
        var percent=Math.max(1,Math.min(99,Math.round((end/file.size)*100)));
        els.publishState.textContent='Uploading '+(fileIndex+1)+'/'+fileTotal+' · '+percent+'%';
        var chunkResult=await requestBodyJson('/api/social/uploads/'+encodeURIComponent(uploadId)+'/chunk?offset='+encodeURIComponent(offset),{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:blob,timeoutMs:90000});
        var received=Number(chunkResult.received_size||end);
        if(received<=offset)throw makeError('Upload did not advance. Please try again.',409,chunkResult);
        offset=received;
      }
      await core.json('/api/social/uploads/'+encodeURIComponent(uploadId)+'/complete',{method:'POST',json:{},timeoutMs:15000});
      return uploadId;
    }catch(err){await cancelStagedUpload(uploadId);throw err;}
  }

  async function stageCommentPhoto(file){
    var init=await core.json('/api/social/uploads/init',{method:'POST',json:{filename:file.name,mime_type:file.type||'',size:Number(file.size||0),media_type:'image'},timeoutMs:15000});
    var uploadId=String(init.upload_id||'');if(!uploadId)throw makeError('Backend did not create an upload session.',500,init);
    var chunkSize=Math.max(256*1024,Math.min(Number(init.chunk_size||3*1024*1024),3*1024*1024));
    var offset=0;
    try{
      while(offset<file.size){
        var end=Math.min(file.size,offset+chunkSize),blob=file.slice(offset,end);
        var result=await requestBodyJson('/api/social/uploads/'+encodeURIComponent(uploadId)+'/chunk?offset='+encodeURIComponent(offset),{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:blob,timeoutMs:90000});
        var received=Number(result.received_size||end);if(received<=offset)throw makeError('Upload did not advance. Please try again.',409,result);offset=received;
      }
      await core.json('/api/social/uploads/'+encodeURIComponent(uploadId)+'/complete',{method:'POST',json:{},timeoutMs:15000});
      return uploadId;
    }catch(err){await cancelStagedUpload(uploadId);throw err;}
  }

  function uploadErrorMessage(err){
    var message=String(err&&err.message||'Unable to publish post.');
    if(message==='Failed to fetch'||Number(err&&err.status||0)===0)return 'Upload could not reach the Backend. Please confirm the latest Social Backend is deployed and try again.';
    return message;
  }

  async function publishPost(){
    if(!signedIn()){window.location.href='/login/';return;}
    var text=String(els.text.value||'').trim();
    if(!text&&!selectedFiles.length)return;
    els.publish.disabled=true;els.publishState.textContent=selectedFiles.length?'Preparing upload…':'Posting…';
    var stagedIds=[];
    try{
      var data;
      var totalBytes=selectedFiles.reduce(function(sum,item){return sum+Number(item.file&&item.file.size||0);},0);
      var useChunkUpload=selectedFiles.some(function(item){return item.kind==='video';})||totalBytes>6*1024*1024;
      if(selectedFiles.length&&useChunkUpload){
        for(var i=0;i<selectedFiles.length;i++)stagedIds.push(await stageUploadItem(selectedFiles[i],i,selectedFiles.length));
        els.publishState.textContent='Publishing…';
        data=await core.json(communityMode?'/api/social/community/posts':'/api/social/posts',{method:'POST',json:{content:text,visibility:'public',staged_uploads:stagedIds},timeoutMs:30000});
      }else if(selectedFiles.length){
        var form=new FormData();form.append('content',text);form.append('visibility','public');
        selectedFiles.forEach(function(item){form.append(item.kind==='image'?'images':(item.kind==='video'?'video':'files'),item.file,item.file.name);});
        data=await requestBodyJson(communityMode?'/api/social/community/posts':'/api/social/posts',{method:'POST',body:form,timeoutMs:90000});
      }else{
        data=await core.json(communityMode?'/api/social/community/posts':'/api/social/posts',{method:'POST',json:{content:text,visibility:'public'},timeoutMs:15000});
      }
      safeLocalRemove(draftKey);els.text.value='';clearSelectedFiles();updateCount();els.publishState.textContent='Posted';showToast(communityMode?'Posted to ReachEmpire Community.':'Post published.');
      await loadFeed(true);
      if(data&&data.post){/* Feed refresh is canonical. */}
    }catch(err){
      for(var j=0;j<stagedIds.length;j++)await cancelStagedUpload(stagedIds[j]);
      els.publishState.textContent='Post failed';showToast(uploadErrorMessage(err));
    }finally{updateCount();window.setTimeout(function(){els.publishState.textContent='';},4200);}
  }

  function openPanel(title){
    els.panelTitle.textContent=String(title||'Social');empty(els.panelBody);els.panelBody.className='reb-social-panel-body';els.overlay.hidden=false;document.body.classList.add('reb-social-panel-open');
    els.panelBack.hidden=true;return els.panelBody;
  }
  function closePanel(){els.overlay.hidden=true;empty(els.panelBody);els.panelBody.className='reb-social-panel-body';document.body.classList.remove('reb-social-panel-open');}
  function panelLoading(title){var body=openPanel(title);var state=document.createElement('div');state.className='reb-social-panel-state';state.textContent='Loading…';body.appendChild(state);return body;}
  function panelError(body,message){empty(body);var state=document.createElement('div');state.className='reb-social-panel-state is-error';state.textContent=message||'Unable to load.';body.appendChild(state);}

  function commentAuthorName(comment){
    return String(comment&&comment.author&&(comment.author.display_name||comment.author.username)||'Member');
  }


  function desktopCommentFilterEnabled(){
    return !!(window.matchMedia&&window.matchMedia('(min-width:1200px)').matches);
  }

  function commentCreatedAtMs(comment){
    var raw=comment&&(comment.created_at||comment.updated_at)||'';var parsed=Date.parse(String(raw||''));return Number.isFinite(parsed)?parsed:0;
  }

  function commentReactionTotal(comment){
    var direct=Number(comment&&(comment.reaction_count||comment.reactions_count||comment.like_count||comment.likes)||0);if(Number.isFinite(direct)&&direct>0)return direct;
    var counts=comment&&comment.reaction_counts;if(counts&&typeof counts==='object')return Object.keys(counts).reduce(function(sum,key){var value=Number(counts[key]||0);return sum+(Number.isFinite(value)?value:0);},0);
    return 0;
  }

  function commentReplyTotal(comment){
    var replies=Array.isArray(comment&&comment.replies)?comment.replies.length:0;
    var direct=Number(comment&&(comment.reply_count||comment.replies_count||comment.children_count)||0);
    return Math.max(replies,Number.isFinite(direct)?direct:0);
  }

  function sortInlineComments(comments,mode){
    var list=Array.isArray(comments)?comments.slice():[];
    if(mode==='newest')return list.sort(function(a,b){return commentCreatedAtMs(b)-commentCreatedAtMs(a);});
    if(mode==='relevant')return list.sort(function(a,b){
      var aScore=(commentReactionTotal(a)*4)+(commentReplyTotal(a)*3);var bScore=(commentReactionTotal(b)*4)+(commentReplyTotal(b)*3);
      if(bScore!==aScore)return bScore-aScore;
      return commentCreatedAtMs(b)-commentCreatedAtMs(a);
    });
    return list;
  }

  function commentFilterLabel(mode){return mode==='newest'?'Newest':(mode==='all'?'All comments':'Most relevant');}

  function renderStoredInlineComments(section,postId){
    var list=section&&section.querySelector('.reb-social-inline-comments-list');if(!list)return;
    var comments=Array.isArray(section._rebComments)?section._rebComments:[];var mode=section.dataset.commentSort||'all';var display=sortInlineComments(comments,mode);
    empty(list);
    if(!display.length){var none=document.createElement('div');none.className='reb-social-inline-comment-state';none.textContent='Be the first to comment.';list.appendChild(none);return;}
    display.forEach(function(item){list.appendChild(renderInlineComment(item,postId,section,false));});
  }

  function createCommentFilter(section,postId){
    if(!desktopCommentFilterEnabled())return null;
    section.dataset.commentSort='relevant';
    var wrap=document.createElement('div');wrap.className='reb-social-comment-filter';wrap.dataset.commentFilter='1';wrap.hidden=true;
    var trigger=button('','reb-social-comment-filter-btn');trigger.type='button';trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');
    var label=document.createElement('span');label.textContent=commentFilterLabel(section.dataset.commentSort);var chevron=document.createElement('i');chevron.className='fas fa-caret-down';chevron.setAttribute('aria-hidden','true');trigger.append(label,chevron);
    var menu=document.createElement('div');menu.className='reb-social-comment-filter-menu';menu.setAttribute('role','menu');menu.hidden=true;
    [
      ['relevant','Most relevant',"Show comments with the most engagement first."],
      ['newest','Newest','Show the newest comments first.'],
      ['all','All comments','Show all comments.']
    ].forEach(function(item){
      var option=button('','reb-social-comment-filter-option');option.type='button';option.dataset.mode=item[0];option.setAttribute('role','menuitem');
      var title=document.createElement('strong');title.textContent=item[1];var note=document.createElement('small');note.textContent=item[2];option.append(title,note);menu.appendChild(option);
      option.addEventListener('click',function(){section.dataset.commentSort=item[0];label.textContent=item[1];menu.hidden=true;trigger.setAttribute('aria-expanded','false');wrap.classList.remove('is-open');renderStoredInlineComments(section,postId);});
    });
    function closeMenu(){menu.hidden=true;trigger.setAttribute('aria-expanded','false');wrap.classList.remove('is-open');}
    trigger.addEventListener('click',function(){var opening=menu.hidden;menu.hidden=!opening;trigger.setAttribute('aria-expanded',opening?'true':'false');wrap.classList.toggle('is-open',opening);});
    wrap.addEventListener('focusout',function(){window.setTimeout(function(){if(!wrap.contains(document.activeElement))closeMenu();},0);});
    wrap.addEventListener('keydown',function(event){if(event.key==='Escape'){event.preventDefault();closeMenu();trigger.focus();}});
    wrap.append(trigger,menu);return wrap;
  }

  var COMMENT_EMOJIS=['👍','❤️','😂','😍','😮','😢','🙏','🔥','👏','🎉','💯','😊'];

  function insertEmoji(textarea,emoji){
    var start=Number(textarea.selectionStart||textarea.value.length),end=Number(textarea.selectionEnd||start);
    textarea.value=textarea.value.slice(0,start)+emoji+textarea.value.slice(end);
    var next=start+emoji.length;try{textarea.setSelectionRange(next,next);}catch(_e){}textarea.focus();
    textarea.dispatchEvent(new Event('input',{bubbles:true}));
  }

  function commentMediaNode(comment){
    var media=Array.isArray(comment&&comment.media)?comment.media:[];if(!media.length)return null;
    var item=media[0]||{},url=safeMediaUrl(item.url||item.media_url||'');if(!url)return null;
    var a=document.createElement('a');a.className='reb-social-comment-photo';a.href=url;a.target='_blank';a.rel='noopener';
    var img=document.createElement('img');img.src=url;img.alt=item.original_name||'Comment photo';img.loading='lazy';a.appendChild(img);return a;
  }

  function buildCommentComposer(postId,section,parentComment,onCancel){
    var isReply=!!parentComment;
    var shell=document.createElement('div');shell.className=isReply?'reb-social-reply-composer reb-social-comment-composer-v2':'reb-social-comment-composer-v2';
    var preview=document.createElement('div');preview.className='reb-social-comment-photo-preview';preview.hidden=true;
    var inputRow=document.createElement('div');inputRow.className='reb-social-comment-input-row';
    var ta=document.createElement('textarea');ta.maxLength=1000;ta.rows=1;ta.placeholder=isReply?('Reply to '+commentAuthorName(parentComment)+'…'):'Write a comment…';ta.dataset.inlineCommentInput='1';
    var tools=document.createElement('div');tools.className='reb-social-comment-composer-tools';
    var emojiBtn=button('','reb-social-comment-tool');emojiBtn.innerHTML='<i class="far fa-smile" aria-hidden="true"></i>';emojiBtn.setAttribute('aria-label','Add emoji');
    var photoBtn=button('','reb-social-comment-tool');photoBtn.innerHTML='<i class="far fa-image" aria-hidden="true"></i>';photoBtn.setAttribute('aria-label','Add photo');
    var send=button('','reb-social-comment-send');send.innerHTML='<i class="fas fa-paper-plane" aria-hidden="true"></i>';send.setAttribute('aria-label',isReply?'Send reply':'Send comment');send.hidden=true;
    var file=document.createElement('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.hidden=true;
    var picker=document.createElement('div');picker.className='reb-social-comment-emoji-picker';picker.hidden=true;
    COMMENT_EMOJIS.forEach(function(emoji){var b=button(emoji,'reb-social-comment-emoji');b.setAttribute('aria-label','Emoji '+emoji);b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();insertEmoji(ta,emoji);picker.hidden=true;emojiBtn.setAttribute('aria-expanded','false');});picker.appendChild(b);});
    var selectedPhoto=null,previewUrl='';
    function clearPhoto(){selectedPhoto=null;if(previewUrl){try{URL.revokeObjectURL(previewUrl);}catch(_e){}previewUrl='';}empty(preview);preview.hidden=true;file.value='';refreshSend();}
    function renderPhoto(){empty(preview);if(!selectedPhoto){preview.hidden=true;return;}preview.hidden=false;previewUrl=URL.createObjectURL(selectedPhoto);var img=document.createElement('img');img.src=previewUrl;img.alt='Selected comment photo';var rm=button('','reb-social-comment-photo-remove');rm.innerHTML='<i class="fas fa-times"></i>';rm.setAttribute('aria-label','Remove photo');rm.addEventListener('click',clearPhoto);preview.append(img,rm);}
    function refreshSend(){send.hidden=!(String(ta.value||'').trim()||selectedPhoto);}
    emojiBtn.setAttribute('aria-haspopup','true');emojiBtn.setAttribute('aria-expanded','false');
    emojiBtn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();picker.hidden=!picker.hidden;emojiBtn.setAttribute('aria-expanded',picker.hidden?'false':'true');});
    photoBtn.addEventListener('click',function(){file.click();});
    file.addEventListener('change',function(){var f=this.files&&this.files[0];if(!f)return;if(!/^image\//i.test(f.type||'')){showToast('Please choose an image file.');this.value='';return;}selectedPhoto=f;renderPhoto();refreshSend();});
    ta.addEventListener('input',refreshSend);
    async function sendNow(){
      var value=String(ta.value||'').trim();if(!value&&!selectedPhoto)return;
      send.disabled=true;ta.disabled=true;photoBtn.disabled=true;emojiBtn.disabled=true;var uploadId='';
      try{
        if(selectedPhoto)uploadId=await stageCommentPhoto(selectedPhoto);
        var payload={content:value};if(parentComment)payload.parent_comment_id=parentComment.id||parentComment.comment_id;if(uploadId)payload.staged_uploads=[uploadId];
        var created=await core.json('/api/social/posts/'+encodeURIComponent(postId)+'/comments',{method:'POST',json:payload,timeoutMs:30000});
        ta.value='';clearPhoto();updateCommentCount(postId,Number(created.comment_count||0));if(typeof onCancel==='function')onCancel();await loadInlineDiscussion(section,postId,true,true);showToast(parentComment?'Reply posted.':'Comment posted.');
      }catch(err){if(uploadId)await cancelStagedUpload(uploadId);showToast(err.message||(parentComment?'Unable to post reply.':'Unable to post comment.'));}
      finally{send.disabled=false;ta.disabled=false;photoBtn.disabled=false;emojiBtn.disabled=false;refreshSend();if(document.body.contains(ta))ta.focus();}
    }
    send.addEventListener('click',sendNow);
    ta.addEventListener('keydown',function(event){if(event.key==='Enter'&&!event.shiftKey&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();sendNow();}});
    tools.append(emojiBtn,photoBtn,picker,file);inputRow.append(ta,tools,send);shell.append(preview,inputRow);
    if(isReply){var foot=document.createElement('div');foot.className='reb-social-reply-composer-footer';var cancel=button('Cancel','reb-social-text-action');cancel.addEventListener('click',function(){if(typeof onCancel==='function')onCancel();});foot.appendChild(cancel);shell.appendChild(foot);}
    document.addEventListener('click',function closePickerOnce(e){if(!shell.contains(e.target)){picker.hidden=true;emojiBtn.setAttribute('aria-expanded','false');}}, {once:true});
    window.setTimeout(function(){ta.focus();},0);return shell;
  }

  function makeReplyComposer(postId,parentComment,section,slot){
    empty(slot);function close(){empty(slot);}slot.appendChild(buildCommentComposer(postId,section,parentComment,close));
  }

  function renderInlineComment(comment,postId,section,isReply,depth){
    depth=Number(depth||0);
    var wrapper=document.createElement('div');wrapper.className='reb-social-comment-thread-item'+(isReply?' is-reply':'');wrapper.dataset.depth=String(Math.min(depth,8));
    var row=document.createElement('div');row.className='reb-social-comment'+(isReply?' is-reply':'');
    var av=document.createElement('div');av.className='reb-social-comment-avatar';setAvatar(av,comment.author);
    var main=document.createElement('div');main.className='reb-social-comment-main';
    var top=document.createElement('div');top.className='reb-social-comment-top';
    var author=document.createElement('strong');author.textContent=commentAuthorName(comment);
    var time=document.createElement('span');time.textContent=dateText(comment.created_at);top.appendChild(author);if(isVerified(comment.author)){var cv=document.createElement('span');cv.className='reb-blue-verified';cv.title='Verified account';cv.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="#1d9bf0"><circle cx="12" cy="5" r="4.6"/><circle cx="17" cy="7" r="4.6"/><circle cx="19" cy="12" r="4.6"/><circle cx="17" cy="17" r="4.6"/><circle cx="12" cy="19" r="4.6"/><circle cx="7" cy="17" r="4.6"/><circle cx="5" cy="12" r="4.6"/><circle cx="7" cy="7" r="4.6"/><circle cx="12" cy="12" r="6.5"/></g><path d="M7.5 12.2l3 3.05 6.25-6.5" fill="none" stroke="#fff" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round"/></svg>';top.appendChild(cv);}top.appendChild(time);main.appendChild(top);
    var text=document.createElement('p');var commentText=String(comment.content||'');if(commentText){setMentionText(text,commentText);main.appendChild(text);}
    var mediaNode=commentMediaNode(comment);if(mediaNode)main.appendChild(mediaNode);
    if(comment.is_hidden){wrapper.classList.add('is-hidden-comment');var hiddenBadge=document.createElement('span');hiddenBadge.className='reb-social-hidden-comment-badge';hiddenBadge.innerHTML='<i class="fas fa-eye-slash" aria-hidden="true"></i> Hidden comment';main.insertBefore(hiddenBadge,main.children[1]||null);}
    var tools=document.createElement('div');tools.className='reb-social-inline-tools';
    var replySlot=document.createElement('div');replySlot.className='reb-social-reply-compose-slot';
    if(signedIn()){
      var reply=button('Reply','reb-social-text-action');tools.appendChild(reply);reply.addEventListener('click',function(){makeReplyComposer(postId,comment,section,replySlot);});
    }
    if(desktopCommentFilterEnabled()&&comment.viewer_can_moderate){
      var visibility=button(comment.is_hidden?'Unhide':'Hide','reb-social-text-action reb-social-comment-visibility-action');tools.appendChild(visibility);
      visibility.addEventListener('click',async function(){var nextHidden=!comment.is_hidden;visibility.disabled=true;try{var result=await core.json('/api/social/comments/'+encodeURIComponent(comment.id||comment.comment_id)+'/visibility',{method:'POST',json:{hidden:nextHidden},timeoutMs:10000});comment=result.comment||comment;updateCommentCount(postId,Number(result.comment_count||0));await loadInlineDiscussion(section,postId,true,true);showToast(nextHidden?'Comment hidden from other viewers.':'Comment is visible again.');}catch(err){showToast(err.message||'Unable to update comment visibility.');}finally{visibility.disabled=false;}});
    }
    if(comment.viewer_is_author){
      var edit=button('Edit','reb-social-text-action');var del=button('Delete','reb-social-text-action is-danger');tools.append(edit,del);
      edit.addEventListener('click',function(){var editor=document.createElement('textarea');editor.maxLength=1000;editor.value=String(comment.content||'');editor.className='reb-social-inline-editor';var actions=document.createElement('div');actions.className='reb-social-inline-editor-actions';var save=button('Save','reb-social-primary-btn');var cancel=button('Cancel','reb-social-secondary-btn');actions.append(cancel,save);if(text.parentNode)text.replaceWith(editor);else main.insertBefore(editor,tools);tools.replaceWith(actions);editor.focus();cancel.addEventListener('click',function(){if(editor.parentNode)editor.replaceWith(text);actions.replaceWith(tools);});save.addEventListener('click',async function(){var value=editor.value.trim();save.disabled=true;try{var data=await core.json('/api/social/comments/'+encodeURIComponent(comment.id||comment.comment_id),{method:'PATCH',json:{content:value},timeoutMs:10000});comment=data.comment||comment;text.innerHTML='';setMentionText(text,comment.content||value);if(editor.parentNode)editor.replaceWith(text);actions.replaceWith(tools);showToast('Comment updated.');}catch(err){showToast(err.message||'Unable to edit comment.');}finally{save.disabled=false;}});});
      del.addEventListener('click',async function(){if(!window.confirm(isReply?'Delete this reply and its replies?':'Delete this comment and its replies?'))return;del.disabled=true;try{var deleted=await core.json('/api/social/comments/'+encodeURIComponent(comment.id||comment.comment_id),{method:'DELETE',timeoutMs:10000});updateCommentCount(postId,Number(deleted.comment_count||0));await loadInlineDiscussion(section,postId,true,true);showToast(isReply?'Reply deleted.':'Comment deleted.');}catch(err){showToast(err.message||'Unable to delete comment.');}finally{del.disabled=false;}});
    }
    if(tools.childNodes.length)main.appendChild(tools);main.appendChild(replySlot);row.append(av,main);wrapper.appendChild(row);
    if(Array.isArray(comment.replies)&&comment.replies.length){var replies=document.createElement('div');replies.className='reb-social-replies';comment.replies.forEach(function(item){replies.appendChild(renderInlineComment(item,postId,section,true,depth+1));});wrapper.appendChild(replies);}
    return wrapper;
  }

  function createMainCommentComposer(postId,section){
    var composer=document.createElement('div');composer.className='reb-social-inline-comment-composer';
    if(signedIn()){
      var av=document.createElement('div');av.className='reb-social-inline-composer-avatar';setAvatar(av,me||{},displayName());composer.append(av,buildCommentComposer(postId,section,null,null));
    }else{var login=document.createElement('a');login.className='reb-social-inline-login';login.href='/login/';login.textContent='Log in to comment';composer.appendChild(login);}
    return composer;
  }

  function createInlineDiscussion(postId,initialCount){
    var section=document.createElement('section');section.className='reb-social-inline-comments';section.dataset.commentsPostId=String(postId);section.dataset.loaded='0';section.dataset.open='0';
    var top=document.createElement('div');top.className='reb-social-inline-comments-top';
    var toggle=button('','reb-social-comment-toggle');toggle.dataset.commentToggle='1';toggle.dataset.count=String(initialCount||0);toggle.textContent=initialCount>0?('View '+initialCount+' comment'+(initialCount===1?'':'s')):'No comments yet';toggle.hidden=initialCount<=0;top.appendChild(toggle);
    var filter=createCommentFilter(section,postId);if(filter)top.appendChild(filter);section.appendChild(top);
    var list=document.createElement('div');list.className='reb-social-inline-comments-list';list.hidden=true;section.appendChild(list);
    section.appendChild(createMainCommentComposer(postId,section));
    toggle.addEventListener('click',function(){
      if(section.dataset.open==='1'){
        section.dataset.open='0';list.hidden=true;toggle.textContent='View '+String(toggle.dataset.count||0)+' comment'+(Number(toggle.dataset.count||0)===1?'':'s');if(filter)filter.hidden=true;
      }else loadInlineDiscussion(section,postId,true,false);
    });
    return section;
  }

  async function loadInlineDiscussion(section,postId,open,forceReload){
    if(!section)return;
    var list=section.querySelector('.reb-social-inline-comments-list');var toggle=section.querySelector('[data-comment-toggle]');var filter=section.querySelector('[data-comment-filter]');
    if(open){section.dataset.open='1';list.hidden=false;}
    if(section.dataset.loaded==='1'&&!forceReload){
      if(toggle)toggle.textContent='Collapse comments';
      if(filter)filter.hidden=!(section.dataset.open==='1'&&Number(toggle&&toggle.dataset.count||0)>0);
      renderStoredInlineComments(section,postId);return;
    }
    list.hidden=false;empty(list);var loading=document.createElement('div');loading.className='reb-social-inline-comment-state';loading.textContent='Loading comments…';list.appendChild(loading);
    try{
      var data=await core.json('/api/social/posts/'+encodeURIComponent(postId)+'/comments?limit=100',{method:'GET',timeoutMs:12000});
      var comments=Array.isArray(data.comments)?data.comments:[];var count=Number(data.comment_count!=null?data.comment_count:(data.count!=null?data.count:comments.length));
      section._rebComments=comments;updateCommentCount(postId,count);section.dataset.loaded='1';renderStoredInlineComments(section,postId);
      if(toggle){toggle.hidden=count<=0;toggle.textContent=section.dataset.open==='1'?'Collapse comments':('View '+count+' comment'+(count===1?'':'s'));}
      if(filter)filter.hidden=!(section.dataset.open==='1'&&count>0);
    }catch(err){empty(list);var fail=document.createElement('div');fail.className='reb-social-inline-comment-state is-error';fail.textContent=err.message||'Unable to load comments.';list.appendChild(fail);if(filter)filter.hidden=true;}
  }

  function focusInlineDiscussion(postNode,postId){
    if(!postNode||!postId)return;
    var section=postNode.querySelector('[data-comments-post-id="'+String(postId)+'"]');if(!section)return;
    var count=Number((section.querySelector('[data-comment-toggle]')||{}).dataset&&section.querySelector('[data-comment-toggle]').dataset.count||0);
    if(count>0)loadInlineDiscussion(section,postId,true,false);
    var input=section.querySelector('[data-inline-comment-input]');if(input){input.focus();input.scrollIntoView({behavior:'smooth',block:'center'});}else section.scrollIntoView({behavior:'smooth',block:'center'});
  }

  async function openComments(postId){
    if(!postId)return;
    var postNode=document.querySelector('[data-post-id="'+String(postId)+'"]');
    if(postNode){focusInlineDiscussion(postNode,postId);return;}
    await openPostDetail(postId);
  }

  async function openPostDetail(postId){
    if(!postId)return;var body=panelLoading('Post');
    try{
      var data=await core.json('/api/social/posts/'+encodeURIComponent(postId),{method:'GET',timeoutMs:12000});
      empty(body);var node=renderPost(data.post||{});body.appendChild(node);var section=node.querySelector('[data-comments-post-id="'+String(postId)+'"]');if(section)await loadInlineDiscussion(section,postId,true,false);
    }catch(err){panelError(body,err.message||'Unable to load post.');}
  }

  function openReportPost(post){
    var postId=post&&(post.id||post.post_id);if(!postId)return;
    var body=openPanel('Report Post');
    var intro=document.createElement('p');intro.className='reb-social-panel-note';intro.textContent='Choose a reason for reporting this post.';
    var select=document.createElement('select');select.className='reb-social-edit-post-text';
    [['spam','Spam'],['harassment','Harassment'],['scam','Scam or fraud'],['impersonation','Impersonation'],['inappropriate','Inappropriate content'],['other','Other']].forEach(function(x){var o=document.createElement('option');o.value=x[0];o.textContent=x[1];select.appendChild(o)});
    var details=document.createElement('textarea');details.className='reb-social-edit-post-text';details.maxLength=1000;details.placeholder='Additional details (optional)';
    var actions=document.createElement('div');actions.className='reb-social-manage-actions';var cancel=button('Cancel','reb-social-secondary-btn');var send=button('Submit Report','reb-social-primary-btn');actions.append(cancel,send);body.append(intro,select,details,actions);cancel.onclick=closePanel;send.onclick=async function(){send.disabled=true;try{await core.json('/api/social/reports',{method:'POST',json:{target_type:'post',target_id:postId,reason:select.value,details:details.value.trim()},timeoutMs:10000});showToast('Report submitted.');closePanel()}catch(e){showToast(e.message||'Unable to submit report.')}finally{send.disabled=false}};
  }

  async function openManagePost(post){
    var postId=post&&(post.id||post.post_id);if(!postId)return;
    var body=openPanel('Edit Post');
    var ta=document.createElement('textarea');ta.className='reb-social-edit-post-text';ta.maxLength=1500;ta.value=String(post.content||'');body.appendChild(ta);
    var media=postMediaList(post);
    if(media.length){
      var mediaBox=document.createElement('div');mediaBox.className='reb-social-edit-media-list';body.appendChild(mediaBox);
      media.forEach(function(item){
        var row=document.createElement('div');row.className='reb-social-edit-media-row';var name=document.createElement('span');name.textContent=String(item.original_name||item.filename||item.media_type||'Attachment');row.appendChild(name);
        if(item.media_id||item.id){var rem=button('Remove','reb-social-text-action is-danger');row.appendChild(rem);rem.addEventListener('click',async function(){if(!window.confirm('Remove this attachment?'))return;rem.disabled=true;try{var data=await core.json('/api/social/posts/'+encodeURIComponent(postId)+'/media/'+encodeURIComponent(item.media_id||item.id),{method:'DELETE',timeoutMs:12000});post=data.post||post;row.remove();showToast('Attachment removed.');await loadFeed(true);}catch(err){showToast(err.message||'Unable to remove attachment.');}finally{rem.disabled=false;}});}
        mediaBox.appendChild(row);
      });
    }
    var actions=document.createElement('div');actions.className='reb-social-manage-actions';
    var cancel=button('Cancel','reb-social-secondary-btn');var save=button('Save Changes','reb-social-primary-btn');actions.appendChild(cancel);actions.appendChild(save);body.appendChild(actions);
    cancel.addEventListener('click',closePanel);
    save.addEventListener('click',async function(){save.disabled=true;try{var data=await core.json('/api/social/posts/'+encodeURIComponent(postId),{method:'PATCH',json:{content:ta.value},timeoutMs:12000});showToast('Post updated.');closePanel();await loadFeed(true);post=data.post||post;}catch(err){showToast(err.message||'Unable to update post.');}finally{save.disabled=false;}});
  }

  function profileCoverUrl(profile){return safeMediaUrl(profile&&profile.cover_photo);}
  function profileHeader(profile){
    var hero=document.createElement('section');hero.className='reb-social-profile-hero';
    var cover=document.createElement('div');cover.className='reb-social-profile-cover';var coverUrl=profileCoverUrl(profile);
    if(coverUrl){var coverImg=document.createElement('img');coverImg.src=coverUrl;coverImg.alt=String(profile.display_name||profile.username||'Member')+' cover';coverImg.addEventListener('error',function(){coverImg.remove();cover.classList.add('is-fallback');},{once:true});cover.appendChild(coverImg);}else cover.classList.add('is-fallback');
    var identity=document.createElement('div');identity.className='reb-social-profile-identity';
    var av=document.createElement('div');av.className='reb-social-profile-avatar reb-social-profile-avatar-large';setAvatar(av,profile);
    var copy=document.createElement('div');copy.className='reb-social-profile-copy reb-social-profile-copy-large';
    var line=document.createElement('div');line.className='reb-social-profile-name-line';var h=document.createElement('h3');h.textContent=String(profile.display_name||profile.username||'Member');var badge=document.createElement('span');badge.className='reb-social-profile-public-badge';badge.innerHTML='<i class="fas fa-globe-asia" aria-hidden="true"></i><span>Public</span>';line.appendChild(h);line.appendChild(badge);
    var u=document.createElement('span');u.textContent='@'+String(profile.username||'member');var bio=document.createElement('p');bio.textContent=String(profile.bio||'No bio yet.');
    copy.appendChild(line);copy.appendChild(u);copy.appendChild(bio);identity.appendChild(av);identity.appendChild(copy);hero.appendChild(cover);hero.appendChild(identity);return hero;
  }
  function profileLink(profile){return String(profile&&profile.profile_url||('https://reachempirebot.com/social/profile/?user='+encodeURIComponent(profile&&profile.username||'')));}
  function copyText(value){
    var text=String(value||'');if(!text)return Promise.reject(new Error('Nothing to copy.'));
    if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(text);
    return new Promise(function(resolve,reject){try{var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.focus();ta.select();document.execCommand('copy');ta.remove();resolve();}catch(e){reject(e);}});
  }
  function profilePageUrl(username){return '/social/profile/'+(username?('?user='+encodeURIComponent(username)):'');}
  async function openProfile(username){window.location.href=profilePageUrl(username);}
  async function openProfileById(userId){
    try{var data=await core.json('/api/social/users/'+encodeURIComponent(userId)+'/posts?limit=1',{method:'GET',timeoutMs:12000});var p=data.profile||{};window.location.href=profilePageUrl(p.username||'');}
    catch(_err){showToast('Unable to open profile.');}
  }
  async function openMyProfile(){if(!signedIn()){window.location.href='/login/';return;}window.location.href=profilePageUrl(me&&me.username||'');}
  function renderProfile(body,profile){
    empty(body);body.classList.add('reb-social-profile-panel-body');body.appendChild(profileHeader(profile));
    var stats=document.createElement('div');stats.className='reb-social-profile-stats reb-social-profile-stats-3';
    var postsStat=button(String(Number(profile.posts_count||0))+' Posts','reb-social-stat-btn');var followers=button(String(Number(profile.followers_count||0))+' Followers','reb-social-stat-btn');var following=button(String(Number(profile.following_count||0))+' Following','reb-social-stat-btn');stats.appendChild(postsStat);stats.appendChild(followers);stats.appendChild(following);body.appendChild(stats);
    followers.addEventListener('click',function(){openUserList(profile.user_id,'followers');});following.addEventListener('click',function(){openUserList(profile.user_id,'following');});
    var actions=document.createElement('div');actions.className='reb-social-profile-actions reb-social-profile-actions-row';
    if(profile.viewer_is_self){var edit=button('Edit Profile','reb-social-primary-btn');actions.appendChild(edit);edit.addEventListener('click',function(){renderProfileEditor(body,profile);});}
    else if(signedIn()&&profile.user_id){var follow=button(profile.viewer_following?'Following':'Follow','reb-social-primary-btn');follow.dataset.followUserId=String(profile.user_id);follow.dataset.following=profile.viewer_following?'1':'0';follow.classList.toggle('is-following',!!profile.viewer_following);actions.appendChild(follow);follow.addEventListener('click',async function(){await toggleFollow(profile.user_id,follow);profile.viewer_following=String(follow.dataset.following)==='1';});}
    var shareProfile=button('Copy Profile Link','reb-social-secondary-btn');shareProfile.addEventListener('click',function(){copyText(profileLink(profile)).then(function(){showToast('Profile link copied.');}).catch(function(){showToast('Unable to copy profile link.');});});actions.appendChild(shareProfile);body.appendChild(actions);
    var tabs=document.createElement('div');tabs.className='reb-social-profile-tabs';
    [['posts','Posts'],['media','Media'],['reposts','Reposts']].forEach(function(pair){var b=button(pair[1],'reb-social-profile-tab'+(pair[0]==='posts'?' active':''));b.dataset.profileTab=pair[0];b.addEventListener('click',function(){tabs.querySelectorAll('.reb-social-profile-tab').forEach(function(x){x.classList.toggle('active',x===b);});loadProfilePosts(profile,posts,b.dataset.profileTab);});tabs.appendChild(b);});body.appendChild(tabs);
    var posts=document.createElement('div');posts.className='reb-social-profile-posts';body.appendChild(posts);loadProfilePosts(profile,posts,'posts');
    postsStat.addEventListener('click',function(){var first=tabs.querySelector('[data-profile-tab="posts"]');if(first)first.click();posts.scrollIntoView({behavior:'smooth',block:'start'});});
  }
  async function loadProfilePosts(profile,container,tab,cursor,append){
    cursor=Number(cursor||0);append=!!append;
    var oldMore=container.querySelector('.reb-social-profile-load-more');if(oldMore)oldMore.remove();
    if(!append){empty(container);var state=document.createElement('div');state.className='reb-social-panel-state';state.textContent='Loading '+(tab==='media'?'media':(tab==='reposts'?'reposts':'posts'))+'…';container.appendChild(state);}
    try{var path='/api/social/users/'+encodeURIComponent(profile.user_id)+'/posts?limit=20&tab='+encodeURIComponent(tab)+(cursor?'&cursor='+encodeURIComponent(cursor):'');var data=await core.json(path,{method:'GET',timeoutMs:12000});if(!append)empty(container);var list=normalizeList(data);if(!list.length&&!append){var none=document.createElement('div');none.className='reb-social-panel-state';none.textContent=tab==='media'?'No media posts yet.':(tab==='reposts'?'No reposts yet.':'No posts yet.');container.appendChild(none);}else list.forEach(function(post){container.appendChild(renderPost(post));});if(data&&data.has_more&&data.next_cursor){var more=button('Load more','reb-social-load-more reb-social-profile-load-more');more.addEventListener('click',function(){more.disabled=true;loadProfilePosts(profile,container,tab,data.next_cursor,true);});container.appendChild(more);}}
    catch(err){if(append)showToast(err.message||'Unable to load more posts.');else panelError(container,err.message||'Unable to load profile posts.');}
  }
  function renderProfileEditor(body,profile){
    empty(body);body.classList.add('reb-social-profile-panel-body');body.appendChild(profileHeader(profile));
    var form=document.createElement('div');form.className='reb-social-profile-editor';
    var coverLabel=document.createElement('label');coverLabel.textContent='Cover photo';var coverInput=document.createElement('input');coverInput.type='file';coverInput.accept='image/png,image/jpeg,image/webp';coverLabel.appendChild(coverInput);
    var avatarLabel=document.createElement('label');avatarLabel.textContent='Profile photo';var avatarInput=document.createElement('input');avatarInput.type='file';avatarInput.accept='image/png,image/jpeg,image/webp';avatarLabel.appendChild(avatarInput);
    var nameLabel=document.createElement('label');nameLabel.textContent='Display name';var name=document.createElement('input');name.type='text';name.maxLength=80;name.value=String(profile.display_name||'');nameLabel.appendChild(name);
    var bioLabel=document.createElement('label');bioLabel.textContent='Bio';var bio=document.createElement('textarea');bio.maxLength=500;bio.value=String(profile.bio||'');bioLabel.appendChild(bio);
    var visibility=document.createElement('div');visibility.className='reb-social-profile-visibility-note';visibility.innerHTML='<i class="fas fa-globe-asia" aria-hidden="true"></i><div><strong>Public Profile</strong><span>Your Social profile is visible to ReachEmpire community members.</span></div>';
    var actions=document.createElement('div');actions.className='reb-social-manage-actions';var cancel=button('Cancel','reb-social-secondary-btn');var save=button('Save Profile','reb-social-primary-btn');actions.appendChild(cancel);actions.appendChild(save);
    form.appendChild(coverLabel);form.appendChild(avatarLabel);form.appendChild(nameLabel);form.appendChild(bioLabel);form.appendChild(visibility);form.appendChild(actions);body.appendChild(form);
    cancel.addEventListener('click',function(){renderProfile(body,profile);});
    save.addEventListener('click',async function(){
      save.disabled=true;
      try{
        var updated=await core.json('/api/social/profile/me',{method:'PATCH',json:{display_name:name.value.trim(),bio:bio.value.trim(),profile_visibility:'public'},timeoutMs:12000});profile=updated.profile||profile;
        if(avatarInput.files&&avatarInput.files[0]){var fd=new FormData();fd.append('avatar',avatarInput.files[0],avatarInput.files[0].name);var avatarData=await requestBodyJson('/api/social/profile/me/avatar',{method:'POST',body:fd,timeoutMs:45000});profile=avatarData.profile||profile;}
        if(coverInput.files&&coverInput.files[0]){var cfd=new FormData();cfd.append('cover',coverInput.files[0],coverInput.files[0].name);var coverData=await requestBodyJson('/api/social/profile/me/cover',{method:'POST',body:cfd,timeoutMs:45000});profile=coverData.profile||profile;}
        me=profile;renderAccount();showToast('Profile updated.');renderProfile(body,profile);await loadFeed(true);
      }catch(err){showToast(err.message||'Unable to update profile.');}finally{save.disabled=false;}
    });
  }
  function communityMemberRow(profile){
    var row=document.createElement('article');row.className='reb-social-community-member';
    var av=document.createElement('button');av.type='button';av.className='reb-social-community-avatar';setAvatar(av,profile);
    var copy=document.createElement('button');copy.type='button';copy.className='reb-social-community-copy';var strong=document.createElement('strong');strong.textContent=String(profile.display_name||profile.username||'Member');var user=document.createElement('span');user.textContent='@'+String(profile.username||'');var metrics=document.createElement('small');metrics.textContent=String(Number(profile.followers_count||0))+' followers · '+String(Number(profile.posts_count||0))+' posts';copy.appendChild(strong);copy.appendChild(user);copy.appendChild(metrics);row.appendChild(av);row.appendChild(copy);
    function go(){if(profile.username)openProfile(profile.username);else if(profile.user_id)openProfileById(profile.user_id);}av.addEventListener('click',go);copy.addEventListener('click',go);
    if(signedIn()&&!profile.viewer_is_self&&profile.user_id){var f=button(profile.viewer_following?'Following':'Follow','reb-social-follow-mini');f.dataset.followUserId=String(profile.user_id);f.dataset.following=profile.viewer_following?'1':'0';f.classList.toggle('is-following',!!profile.viewer_following);f.addEventListener('click',function(){toggleFollow(profile.user_id,f);});row.appendChild(f);}return row;
  }
  async function openCommunity(){if(communityMode){window.scrollTo({top:0,behavior:'smooth'});return;}window.location.href='/social/community/';return;
    var body=openPanel('Community');body.classList.add('reb-social-community-panel');
    var intro=document.createElement('section');intro.className='reb-social-community-intro';var h=document.createElement('h3');h.textContent='ReachEmpire Community';var p=document.createElement('p');p.textContent='Find traders, open public profiles, follow members, and discover recent community activity.';intro.appendChild(h);intro.appendChild(p);body.appendChild(intro);
    var search=document.createElement('div');search.className='reb-social-community-search';var icon=document.createElement('i');icon.className='fas fa-search';icon.setAttribute('aria-hidden','true');var input=document.createElement('input');input.type='search';input.maxLength=80;input.placeholder='Search username or display name';input.setAttribute('aria-label','Search community members');var clear=button('×','reb-social-community-clear');clear.setAttribute('aria-label','Clear search');search.appendChild(icon);search.appendChild(input);search.appendChild(clear);body.appendChild(search);
    var meta=document.createElement('div');meta.className='reb-social-community-meta';var label=document.createElement('strong');label.textContent='Community members';meta.appendChild(label);body.appendChild(meta);
    var list=document.createElement('div');list.className='reb-social-community-list';body.appendChild(list);var more=button('Load more members','reb-social-load-more reb-social-community-load-more');more.hidden=true;body.appendChild(more);
    var timer=null,activeQuery='',nextOffset=0;async function load(query,append){query=String(query||'').trim();append=!!append;if(!append){activeQuery=query;nextOffset=0;empty(list);var loading=document.createElement('div');loading.className='reb-social-panel-state';loading.textContent=query?'Searching community…':'Loading members…';list.appendChild(loading);}more.hidden=true;try{var offset=append?nextOffset:0;var path=query?('/api/social/users/search?q='+encodeURIComponent(query)+'&limit=30&offset='+encodeURIComponent(offset)):('/api/social/community/members?limit=30&offset='+encodeURIComponent(offset));var data=await core.json(path,{method:'GET',timeoutMs:12000});if(!append)empty(list);var users=Array.isArray(data.users)?data.users:[];var totalShown=list.querySelectorAll('.reb-social-community-member').length+users.length;label.textContent=query?('Search results · '+String(totalShown)):('Community members'+(data.total!=null?' · '+String(data.total):''));if(!users.length&&!append){var none=document.createElement('div');none.className='reb-social-panel-state';none.textContent=query?'No members match your search.':'No community members found.';list.appendChild(none);}else users.forEach(function(profile){list.appendChild(communityMemberRow(profile));});nextOffset=Number(data.next_offset||0);more.hidden=!(data&&data.has_more&&nextOffset>0);}catch(err){if(append)showToast(err.message||'Unable to load more members.');else panelError(list,err.message||'Unable to load community members.');}}
    input.addEventListener('input',function(){var qv=input.value.trim();if(timer)window.clearTimeout(timer);timer=window.setTimeout(function(){load(qv,false);},280);});clear.addEventListener('click',function(){input.value='';input.focus();load('',false);});more.addEventListener('click',function(){more.disabled=true;load(activeQuery,true).finally(function(){more.disabled=false;});});load('',false);
  }
  async function openUserList(userId,type){
    var title=type==='followers'?'Followers':'Following';var body=panelLoading(title);
    try{
      var data=await core.json('/api/social/users/'+encodeURIComponent(userId)+'/'+type+'?limit=100',{method:'GET',timeoutMs:12000});empty(body);var users=Array.isArray(data.users)?data.users:[];
      if(!users.length){var none=document.createElement('div');none.className='reb-social-panel-state';none.textContent='No '+title.toLowerCase()+' yet.';body.appendChild(none);return;}
      users.forEach(function(profile){body.appendChild(communityMemberRow(profile));});
    }catch(err){panelError(body,err.message||'Unable to load '+title.toLowerCase()+'.');}
  }

  async function loadMessageUnread(){if(!els.msgUnread)return;if(!signedIn()||!core||!core.json){els.msgUnread.hidden=true;return;}try{var data=await core.json('/api/social/messages/unread',{method:'GET',timeoutMs:8000});var n=Number(data.unread||0)||0;els.msgUnread.textContent=n>99?'99+':String(n);els.msgUnread.hidden=n<=0;}catch(_e){els.msgUnread.hidden=true;}}
  async function loadUnread(){
    if(!els.unread)return;
    if(!signedIn()||!core||!core.json){els.unread.hidden=true;return;}
    try{var data=await core.json('/api/social/activity/unread',{method:'GET',timeoutMs:8000});var n=Number(data.total_unread!=null?data.total_unread:(data.unread!=null?data.unread:0))||0;els.unread.textContent=n>99?'99+':String(n);els.unread.hidden=n<=0;}
    catch(_e){els.unread.hidden=true;}
  }
  async function openNotifications(){
    if(!signedIn()){window.location.href='/login/';return;}
    var body=panelLoading('Notifications');
    try{
      var data=await core.json('/api/social/notifications?limit=80',{method:'GET',timeoutMs:12000});empty(body);var items=Array.isArray(data.notifications)?data.notifications:[];
      if(!items.length){var none=document.createElement('div');none.className='reb-social-panel-state';none.textContent='No notifications yet.';body.appendChild(none);}else{
        items.forEach(function(item){
          var row=button('','reb-social-notification'+(item.is_read?'':' is-unread'));var av=document.createElement('div');av.className='reb-social-notification-avatar';setAvatar(av,item.actor);var copy=document.createElement('span');copy.className='reb-social-notification-copy';var text=document.createElement('strong');text.textContent=String(item.message||'Social update');var time=document.createElement('small');time.textContent=dateText(item.created_at);copy.appendChild(text);copy.appendChild(time);row.appendChild(av);row.appendChild(copy);body.appendChild(row);
          row.addEventListener('click',async function(){try{await core.json('/api/social/notifications/read',{method:'POST',json:{notification_id:item.id||item.notification_id},timeoutMs:8000});}catch(_e){}if(item.entity_type==='post'&&item.entity_id)openPostDetail(item.entity_id);else if(item.actor&&item.actor.username)openProfile(item.actor.username);});
        });
      }
      try{await core.json('/api/social/notifications/read',{method:'POST',json:{},timeoutMs:8000});els.unread.hidden=true;}catch(_e){}
    }catch(err){panelError(body,err.message||'Unable to load notifications.');}
  }

  async function handleDeepLink(){
    if(initialDeepLinkHandled)return;initialDeepLinkHandled=true;
    try{var params=new URLSearchParams(window.location.search);var profile=params.get('profile');var id=params.get('post');if(profile){window.location.replace(profilePageUrl(profile));return;}if(id&&/^\d+$/.test(id))await openPostDetail(id);}catch(_e){}
  }

  function wire(){
    els.avatar=q('rebSocialAvatar');els.displayName=q('rebSocialDisplayName');els.accountStatus=q('rebSocialAccountStatus');els.accountAction=q('rebSocialAccountAction');
    els.composer=q('rebSocialComposer');els.guest=q('rebSocialGuestCard');els.text=q('rebSocialText');els.charCount=q('rebSocialCharCount');els.publish=q('rebSocialPublish');els.publishState=q('rebSocialPublishState');
    els.feed=q('rebSocialFeed');els.feedState=q('rebSocialFeedState');els.loadMore=q('rebSocialLoadMore');els.unread=q('rebSocialUnread');els.msgUnread=q('rebSocialMessagesUnread');els.toast=q('rebSocialToast');
    els.attachmentPreview=q('rebSocialAttachmentPreview');els.imageInput=q('rebSocialImageInput');els.videoInput=q('rebSocialVideoInput');els.fileInput=q('rebSocialFileInput');
    els.overlay=q('rebSocialOverlay');els.panelTitle=q('rebSocialPanelTitle');els.panelBody=q('rebSocialPanelBody');els.panelClose=q('rebSocialPanelClose');els.panelBack=q('rebSocialPanelBack');

    if(rebV82DesktopFast){renderAccount();loadFeed(true);handleDeepLink();scheduleSecondaryLoads();}else{renderAccount();loadMe().then(function(){loadFeed(true);loadUnread();loadMessageUnread();handleDeepLink();});}
    els.text.addEventListener('input',function(){safeLocalSet(draftKey,els.text.value);updateCount();});
    els.publish.addEventListener('click',publishPost);
    q('rebSocialPickImage').addEventListener('click',function(){els.imageInput.click();});
    q('rebSocialPickVideo').addEventListener('click',function(){els.videoInput.click();});
    var pickFile=q('rebSocialPickFile');if(pickFile&&els.fileInput)pickFile.addEventListener('click',function(){els.fileInput.click();});
    els.imageInput.addEventListener('change',function(){addLocalFiles('image',els.imageInput.files);els.imageInput.value='';});
    els.videoInput.addEventListener('change',function(){addLocalFiles('video',els.videoInput.files);els.videoInput.value='';});
    els.fileInput.addEventListener('change',function(){addLocalFiles('file',els.fileInput.files);els.fileInput.value='';});
    els.loadMore.addEventListener('click',function(){if(feedHasMore)loadFeed(false);});
    var refreshControl=q('rebSocialRefresh');if(refreshControl)refreshControl.addEventListener('click',function(){loadMe();loadFeed(true);loadUnread();loadMessageUnread();showToast('Social Center refreshed.');});
    var notificationControl=q('rebSocialNotifications');if(notificationControl)notificationControl.addEventListener('click',function(){if(!signedIn()){window.location.href='/login/';return;}window.location.href='/social/notifications/';});
    q('rebSocialQuickPost').addEventListener('click',function(){if(!signedIn()){window.location.href='/login/';return;}els.composer.scrollIntoView({behavior:'smooth',block:'start'});els.text.focus();});
    q('rebSocialCommunityButton').addEventListener('click',openCommunity);
    q('rebSocialProfileButton').addEventListener('click',openMyProfile);
    if(els.avatar){els.avatar.classList.add('is-clickable');els.avatar.addEventListener('click',openMyProfile);}
    if(els.displayName){els.displayName.classList.add('is-clickable');els.displayName.addEventListener('click',openMyProfile);}
    els.panelClose.addEventListener('click',closePanel);
    els.overlay.addEventListener('click',function(event){if(event.target===els.overlay)closePanel();});
    document.addEventListener('click',function(){closeShareMenu();});
    document.addEventListener('keydown',function(event){if(event.key==='Escape'){closeShareMenu();if(!els.overlay.hidden)closePanel();}});
    document.querySelectorAll('[data-coming]').forEach(function(btn){btn.addEventListener('click',function(){showToast(btn.getAttribute('data-coming'));});});
    document.querySelectorAll('[data-feed]').forEach(function(btn){btn.addEventListener('click',function(){document.querySelectorAll('[data-feed]').forEach(function(x){x.classList.toggle('active',x===btn);x.setAttribute('aria-selected',x===btn?'true':'false');});currentFeed=btn.getAttribute('data-feed')||'all';loadFeed(true);});});
    window.addEventListener('reb:auth-changed',function(){me=null;clearSelectedFiles();loadMe().then(function(){loadFeed(true);loadUnread();loadMessageUnread();});});
    window.addEventListener('focus',function(){loadUnread();loadMessageUnread();});
    document.addEventListener('visibilitychange',function(){if(!document.hidden){loadUnread();loadMessageUnread();}});
    window.setInterval(function(){if(!document.hidden){loadUnread();loadMessageUnread();}},30000);
  }

  window.REBSocialReloadFeed=function(){return loadFeed(true);};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
