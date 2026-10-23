(function(){'use strict';
function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});else fn();}
ready(function(){
 var composer=document.getElementById('rebSocialComposer'), text=document.getElementById('rebSocialText');
 if(!composer||!text)return;
 function fit(){text.style.height='auto';var h=Math.max(text.value?82:58,Math.min(text.scrollHeight,220));text.style.height=h+'px';}
 function show(){composer.classList.add('reb-composer-engaged');fit();}
 function hide(){composer.classList.remove('reb-composer-engaged');fit();}
 // R134: A temporary keyboard blur must NOT hide Post while a draft or attachment remains.
 function hasDraft(){
   if(String(text.value||'').trim())return true;
   var box=document.getElementById('rebSocialAttachmentPreview');
   if(box&&!box.hidden&&box.children.length)return true;
   var links=window.REBSocialComposerLinks;
   return !!(links&&typeof links.getUrl==='function'&&links.getUrl());
 }
 function sync(){if(document.activeElement===text||hasDraft())show();else hide();}
 text.addEventListener('focus',show);
 text.addEventListener('click',show);
 text.addEventListener('input',function(){show();});
 // Let focus settle before collapsing; re-entry and existing drafts keep actions visible.
 text.addEventListener('blur',function(){setTimeout(sync,80);});
 ['rebSocialImageInput','rebSocialVideoInput'].forEach(function(id){
   var n=document.getElementById(id);
   if(n)n.addEventListener('change',function(){if(n.files&&n.files.length)show();setTimeout(sync,0);});
 });
 document.addEventListener('reb:social-composer-link-changed',sync);
 var preview=document.getElementById('rebSocialAttachmentPreview');
 if(preview&&window.MutationObserver)new MutationObserver(sync).observe(preview,{childList:true,attributes:true,attributeFilter:['hidden']});
 if(location.hash==='#composer'){try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}window.scrollTo(0,0);}
 // Existing saved draft is restored by the root feed controller; sync after initialization.
 fit();sync();
 var quick=document.getElementById('rebSocialCompactImage'), picker=document.getElementById('rebSocialPickImage');
 if(quick&&picker)quick.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();show();picker.click();});
});
})();
