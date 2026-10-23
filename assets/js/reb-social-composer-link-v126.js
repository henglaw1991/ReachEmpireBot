/* REB SOCIAL Composer Link Preview v126. Page-local attachment only.
 * The existing post content API stores the canonical URL as a clickable link.
 * No post tables, upload logic, or auth/session logic are changed. */
(function(){'use strict';
  var active='',pending=0, timer=null, root=null, source=null, holder=null, currentMeta=null;
  var rx=/https?:\/\/[^\s<>"'`]+/gi;
  function extract(text){var m;rx.lastIndex=0;while((m=rx.exec(String(text||'')))){
    var raw=m[0].replace(/[),.;!?\]}]+$/g,'');try{var u=new URL(raw);
      if(/^https?:$/.test(u.protocol)&&!u.username&&!u.password&&u.hostname)return u.href;
    }catch(_e){}
  }return '';}
  function yt(url){try{var u=new URL(url),h=u.hostname.toLowerCase().replace(/^www\./,'');var id='';
    if(h==='youtu.be')id=u.pathname.split('/')[1]||'';
    else if(['youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com'].indexOf(h)>=0){
      if(u.pathname==='/watch')id=u.searchParams.get('v')||'';
      else{var x=u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/);if(x)id=x[1];}}
    return /^[A-Za-z0-9_-]{11}$/.test(id)?id:'';
  }catch(_e){return '';}}
  function el(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=String(text);return n;}
  function hasPrimaryMedia(){
    var selected=root&&root.querySelector('#rebSocialAttachmentPreview');
    return !!(selected&&selected.querySelector('.reb-social-selected-visual img, .reb-social-selected-visual video'));
  }
  function paint(meta){if(!holder||!active)return;currentMeta=meta||currentMeta;holder.replaceChildren();holder.hidden=false;
    var media=hasPrimaryMedia();
    var top=el('div','reb-composer-link-heading');top.append(el('span','',media?'Attached source link':'Attached link preview'));
    var remove=el('button','reb-composer-link-remove',media?'Remove link':'Remove preview');remove.type='button';remove.setAttribute('aria-label','Remove attached source link');
    remove.addEventListener('click',function(){pending++;active='';currentMeta=null;holder.replaceChildren();holder.hidden=true;announce();});top.append(remove);holder.append(top);
    if(media){
      // The original source is retained and clickable, but a second thumbnail
      // is never shown alongside locally attached images/videos.
      var plain=el('a','reb-composer-source-link',active);plain.href=active;plain.target='_blank';plain.rel='noopener noreferrer';holder.append(plain);return;
    }
    var a=el('a','reb-social-link-preview');a.href=active;a.target='_blank';a.rel='noopener noreferrer';
    var image=String(meta&&meta.image_url||''),name=String(meta&&meta.title||'').trim(),desc=String(meta&&meta.description||'').trim();
    try{var origin=new URL(active).hostname;if(!name)name=origin;}catch(_e){}
    if(image){try{var imgUrl=new URL(image);if(/^https?:$/.test(imgUrl.protocol)){
       var img=el('img','reb-social-link-preview-image');img.src=imgUrl.href;img.alt='Preview thumbnail';img.loading='lazy';img.referrerPolicy='no-referrer';img.addEventListener('error',function(){img.remove();},{once:true});a.append(img);
    }}catch(_e){}}
    var info=el('div','reb-social-link-preview-info');info.append(el('strong','',name.slice(0,180)));
    if(desc)info.append(el('span','',desc.slice(0,230)));info.append(el('small','',active));a.append(info);holder.append(a);
  }
  function announce(){try{document.dispatchEvent(new CustomEvent('reb:social-composer-link-changed'));}catch(_e){}}
  function attach(url){active=url;currentMeta=null;var seq=++pending;
    var id=yt(url),domain='';try{domain=new URL(url).hostname;}catch(_e){}
    paint({title:id?'YouTube video':domain,description:id?'Watch on YouTube':'Open original source',image_url:id?'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg':''});announce();
    if(id)return;
    var c=window.REBClientCore;if(!c||!c.json||!c.hasLiveSession||!c.hasLiveSession())return;
    c.json('/api/social/link-preview?url='+encodeURIComponent(url),{method:'GET',timeoutMs:8500}).then(function(d){
      if(seq===pending&&url===active&&d&&d.preview)paint(d.preview);
    }).catch(function(){/* Keep the clickable fallback card when remote metadata is unavailable. */});
  }
  function detect(){timer=null;if(active||!source)return;var found=extract(source.value);if(found)attach(found);}
  function mergedText(){var current=String(source&&source.value||'').trim();if(!active)return current;
    // The post API only has content/media fields. Store the attached original link
    // as a normal URL in content so it survives feed refresh, share and editing.
    var urls=String(current).match(rx)||[];for(var i=0;i<urls.length;i++){
      try{if(new URL(urls[i].replace(/[),.;!?\]}]+$/g,'')).href===active)return current;}catch(_e){}
    }
    return current+(current?'\n':'')+active;
  }
  function reset(){active='';currentMeta=null;pending++;if(timer)clearTimeout(timer);if(holder){holder.hidden=true;holder.replaceChildren();}announce();}
  window.REBSocialComposerLinks={getUrl:function(){return active;},mergedText:mergedText,reset:reset,extract:extract};
  function mount(){source=document.getElementById('rebSocialText');root=document.getElementById('rebSocialComposer');if(!source||!root)return;
    holder=el('div','reb-composer-link-preview');holder.id='rebComposerLinkPreview';holder.hidden=true;
    var after=root.querySelector('.reb-social-composer-meta');if(after)after.insertAdjacentElement('afterend',holder);else source.insertAdjacentElement('afterend',holder);
    source.addEventListener('input',function(){if(active)return;if(timer)clearTimeout(timer);timer=setTimeout(detect,170);});
    source.addEventListener('paste',function(){if(!active){if(timer)clearTimeout(timer);timer=setTimeout(detect,45);}});
    // Existing attachment rendering replaces the children of this container.
    // Observe only that container; never rerender feed or change upload state.
    var attachmentBox=root.querySelector('#rebSocialAttachmentPreview');
    if(attachmentBox&&window.MutationObserver){new MutationObserver(function(){if(active)paint(currentMeta);})
      .observe(attachmentBox,{childList:true,subtree:false});}
    detect();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
