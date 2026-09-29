/* D20F42 — mobile initial Feed refresh lock-to-top until async feed layout is stable. */
(function(){
 'use strict';
 if(!window.matchMedia('(max-width:760px)').matches)return;
 try{if('scrollRestoration' in history)history.scrollRestoration='manual';}catch(e){}
 var path=(location.pathname||'').replace(/\/+$/,'/');
 if(path!=='/social/')return;
 var navReload=false;
 try{var n=performance.getEntriesByType&&performance.getEntriesByType('navigation');navReload=!!(n&&n[0]&&n[0].type==='reload');}catch(e){}
 /* Direct entry and reload both start at top; internal back/forward is left alone. */
 var force=navReload;
 try{if(!force&&performance.navigation)force=performance.navigation.type===1;}catch(e){}
 if(!force && !location.hash) force=true;
 if(!force)return;
 try{if(location.hash)history.replaceState(null,'',location.pathname+location.search);}catch(e){}
 function top(){
   var a=document.activeElement;if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)){try{a.blur();}catch(e){}}
   try{window.scrollTo(0,0);}catch(e){}
   document.documentElement.scrollTop=0;if(document.body)document.body.scrollTop=0;
 }
 top();
 var stopAt=Date.now()+4500;
 var timer=setInterval(function(){top();if(Date.now()>=stopAt)clearInterval(timer);},80);
 function watch(){
   var feed=document.getElementById('rebSocialFeed');if(!feed)return;
   var obs=new MutationObserver(function(){if(Date.now()<stopAt){top();requestAnimationFrame(top);}else obs.disconnect();});
   obs.observe(feed,{childList:true,subtree:true});
   setTimeout(function(){obs.disconnect();top();},4600);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){top();watch();},{once:true});else watch();
 window.addEventListener('load',function(){top();requestAnimationFrame(top);},{once:true});
})();
