/* REB Social Post Link Preview V1: progressive enhancement, not a feed replacement.
   No raw HTML from URLs/API goes into innerHTML. Works on Desktop & Mobile. */
(function(){'use strict';
  var urlRE=/https?:\/\/[^\s<>"'`]+/i;
  var lookupCache=new Map();
  function firstUrl(text){
    var m=String(text||'').match(urlRE);if(!m)return '';
    var v=m[0].replace(/[),.;!?\]}]+$/g,'');
    try{var u=new URL(v);return (/^https?:$/.test(u.protocol)&&!u.username&&!u.password)?u.href:'';}catch(_e){return '';}
  }
  function youtubeId(url){
    try{var u=new URL(url),h=u.hostname.toLowerCase().replace(/^www\./,'');var id='';
      if(h==='youtu.be')id=u.pathname.split('/')[1]||'';
      else if(['youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com'].includes(h)){
        if(u.pathname==='/watch')id=u.searchParams.get('v')||'';
        else{var m=u.pathname.match(/^\/(?:shorts|live|embed)\/([^/]+)/);if(m)id=m[1];}
      }
      return /^[A-Za-z0-9_-]{11}$/.test(id)?id:'';
    }catch(_e){return '';}
  }
  function node(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;}
  function card(link,title,description,imageUrl){
    var a=node('a','reb-social-link-preview');a.href=link;a.target='_blank';a.rel='noopener noreferrer';
    if(imageUrl){var img=node('img','reb-social-link-preview-image');img.src=imageUrl;img.alt='Link thumbnail';img.loading='lazy';img.referrerPolicy='no-referrer';img.addEventListener('error',function(){img.remove();},{once:true});a.appendChild(img);}
    var info=node('div','reb-social-link-preview-info');info.appendChild(node('strong','',String(title||new URL(link).hostname).slice(0,180)));
    if(description)info.appendChild(node('span','',String(description).slice(0,230)));
    info.appendChild(node('small','',new URL(link).hostname));a.appendChild(info);return a;
  }
  function authenticated(){var c=window.REBClientCore;return !!(c&&c.hasLiveSession&&c.hasLiveSession()&&c.json);}
  function getMetadata(url){
    if(lookupCache.has(url))return lookupCache.get(url);
    var c=window.REBClientCore;
    var result=c.json('/api/social/link-preview?url='+encodeURIComponent(url),{method:'GET',timeoutMs:8500})
      .then(function(x){return x&&x.preview||null;}).catch(function(){return null;});
    if(lookupCache.size>100)lookupCache.clear();lookupCache.set(url,result);return result;
  }
  // Uploaded images/video take priority. Text URLs remain clickable but get no
  // extra thumbnail card; file-only posts may still show a link preview.
  function hasPrimaryMedia(host){
    return !!host.querySelector('.reb-social-post-media-wrap img.reb-social-post-media, .reb-social-post-media-wrap video.reb-social-post-video, .reb-post-media > img, .reb-post-media > video');
  }
  function enhance(el){
    var host=el.closest('.reb-social-post,.reb-post-card,.reb-social-shared-post,.reb-shared-card');
    if(!host)return;
    if(hasPrimaryMedia(host)){
      if(el._rebLinkPreviewCard){el._rebLinkPreviewCard.remove();el._rebLinkPreviewCard=null;}
      el.dataset.rebLinkPreview='';return;
    }
    if(el.dataset.rebLinkPreview==='1')return;
    var url=firstUrl(el.textContent);if(!url)return;
    var video=youtubeId(url),domain='';try{domain=new URL(url).hostname;}catch(_e){return;}
    el.dataset.rebLinkPreview='1';
    var preview=card(url,video?'YouTube video':domain,video?'Watch on YouTube':'Open external link',video?'https://i.ytimg.com/vi/'+video+'/hqdefault.jpg':'');
    el._rebLinkPreviewCard=preview;
    el.insertAdjacentElement('afterend',preview);
    if(video||!authenticated())return;
    getMetadata(url).then(function(meta){
      if(!meta||!preview.isConnected)return;
      if(meta.title){var title=preview.querySelector('strong');if(title)title.textContent=String(meta.title).slice(0,180);}
      if(meta.description){var desc=preview.querySelector('span');if(desc)desc.textContent=String(meta.description).slice(0,230);}
      if(meta.image_url){try{var imgUrl=new URL(meta.image_url);if(!/^https?:$/.test(imgUrl.protocol))return;
        var img=node('img','reb-social-link-preview-image');img.src=imgUrl.href;img.alt='Link thumbnail';img.loading='lazy';img.referrerPolicy='no-referrer';img.addEventListener('error',function(){img.remove();},{once:true});preview.prepend(img);
      }catch(_e){}}
    });
  }
  var working=false;
  function scan(){working=false;document.querySelectorAll('.reb-social-post-text,.reb-social-shared-text,.reb-post-card .reb-post-content,.reb-shared-card .reb-post-content').forEach(enhance);}
  function schedule(){if(working)return;working=true;queueMicrotask(scan);}
  function setup(){schedule();var target=document.getElementById('rebSocialFeed')||document.body;
    new MutationObserver(function(mutations){for(var i=0;i<mutations.length;i++){
      if(mutations[i].addedNodes.length){schedule();break;}
    }}).observe(target,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
