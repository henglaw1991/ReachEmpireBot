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
 // R141: Initial direct-entry/reload alignment happens once. Do not repeatedly
 // force scroll-to-top while the user scrolls or while asynchronous posts render.
 // The previous 80ms timer and feed MutationObserver overrode user scrolling.
 top();
})();
