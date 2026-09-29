/* D20F40 — mobile Feed refresh always opens at the top; never restore a stale bottom position. */
(function(){
  if(!window.matchMedia('(max-width:760px)').matches)return;
  try{if('scrollRestoration' in history)history.scrollRestoration='manual';}catch(_e){}
  function topNow(){
    if(location.hash && location.hash!=='#composer'){
      try{history.replaceState(null,'',location.pathname+location.search);}catch(_e){}
    }
    window.scrollTo(0,0);
    document.documentElement.scrollTop=0;
    document.body.scrollTop=0;
  }
  topNow();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',topNow,{once:true});
  window.addEventListener('load',function(){topNow();setTimeout(topNow,60);setTimeout(topNow,300);},{once:true});
  window.addEventListener('pageshow',function(e){if(e.persisted)topNow();});
})();
