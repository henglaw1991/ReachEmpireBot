/* REB V113 — Dashboard-family Assistive Touch only.
   Adds drag/snap/save-position to the EXISTING floating chat launcher.
   Does not create/remove chat UI and does not touch Message/Chat APIs. */
(function(){
  'use strict';
  if (window.__REB_DASHBOARD_ASSISTIVE_TOUCH_V113__) return;
  window.__REB_DASHBOARD_ASSISTIVE_TOUCH_V113__ = true;

  var SELECTOR = '.reb-customer-chat-launcher,.reb-social-mini-launcher';
  var STORAGE_KEY = 'reb_dashboard_chat_assistive_position_v113';
  var attached = new WeakSet();

  function isMobile(){
    try { return !!(window.matchMedia && window.matchMedia('(max-width:900px)').matches); }
    catch(_e){ return (window.innerWidth || 9999) <= 900; }
  }
  function vp(){
    var vv = window.visualViewport;
    return {
      w: Math.max(1, Math.round(vv && vv.width ? vv.width : (window.innerWidth || document.documentElement.clientWidth || 360))),
      h: Math.max(1, Math.round(vv && vv.height ? vv.height : (window.innerHeight || document.documentElement.clientHeight || 640)))
    };
  }
  function readPos(){
    try { var v = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); return v && typeof v === 'object' ? v : null; }
    catch(_e){ return null; }
  }
  function savePos(v){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); } catch(_e){} }
  function bounds(node){
    var view = vp(), r = node.getBoundingClientRect();
    var w = Math.max(48, Math.round(r.width || 50));
    var h = Math.max(48, Math.round(r.height || 50));
    var margin = 10, top = 10, bottomReserve = 92;
    return {
      vw:view.w, vh:view.h, w:w, h:h,
      minX:margin,
      maxX:Math.max(margin, view.w - w - margin),
      minY:top,
      maxY:Math.max(top, view.h - h - bottomReserve)
    };
  }
  function place(node,x,y,animate){
    var b = bounds(node);
    x = Math.max(b.minX, Math.min(b.maxX, x));
    y = Math.max(b.minY, Math.min(b.maxY, y));
    node.style.setProperty('position','fixed','important');
    node.style.setProperty('left',Math.round(x)+'px','important');
    node.style.setProperty('top',Math.round(y)+'px','important');
    node.style.setProperty('right','auto','important');
    node.style.setProperty('bottom','auto','important');
    node.style.setProperty('animation','none','important');
    node.style.setProperty('transform','none','important');
    node.style.setProperty('touch-action','none','important');
    node.style.setProperty('user-select','none','important');
    node.style.setProperty('-webkit-user-select','none','important');
    node.style.setProperty('transition', animate ? 'left .16s ease, top .16s ease' : 'none','important');
    node.dataset.rebAssistiveV113 = '1';
    return {x:x,y:y,b:b};
  }
  function snapAndSave(node,x,y){
    var b = bounds(node);
    var side = (x + b.w/2) < b.vw/2 ? 'left' : 'right';
    var snapX = side === 'left' ? b.minX : b.maxX;
    var span = Math.max(1, b.maxY - b.minY);
    var ratio = Math.max(0, Math.min(1, (y - b.minY) / span));
    place(node, snapX, y, true);
    savePos({side:side,yRatio:ratio});
  }
  function restore(node){
    if(!isMobile()) return;
    var s = readPos();
    if(!s || !s.side) return;
    requestAnimationFrame(function(){
      if(!node.isConnected) return;
      var b = bounds(node);
      var ratio = Math.max(0,Math.min(1,Number(s.yRatio)||0));
      place(node, s.side === 'left' ? b.minX : b.maxX, b.minY + (b.maxY-b.minY)*ratio, false);
    });
  }
  function clamp(node){
    if(!isMobile() || node.dataset.rebAssistiveV113 !== '1') return;
    var r=node.getBoundingClientRect(), b=bounds(node), s=readPos();
    var side=s&&s.side?s.side:((r.left+r.width/2)<b.vw/2?'left':'right');
    place(node, side==='left'?b.minX:b.maxX, Math.max(b.minY,Math.min(b.maxY,r.top)), false);
  }

  function attach(node){
    if(!node || attached.has(node) || !isMobile()) return;
    attached.add(node);
    node.dataset.rebAssistiveDraggable = 'v113';
    node.style.setProperty('touch-action','none','important');
    var drag = null;

    function begin(id,x,y){
      var r=node.getBoundingClientRect();
      drag={id:id,sx:x,sy:y,ox:r.left,oy:r.top,x:r.left,y:r.top,moved:false};
    }
    function move(id,x,y,ev){
      if(!drag || drag.id!==id || !isMobile()) return;
      var dx=x-drag.sx, dy=y-drag.sy;
      if(!drag.moved && Math.hypot(dx,dy)<7) return;
      drag.moved=true;
      if(ev && ev.cancelable) ev.preventDefault();
      var p=place(node,drag.ox+dx,drag.oy+dy,false);
      drag.x=p.x; drag.y=p.y;
    }
    function end(id){
      if(!drag || drag.id!==id) return;
      var moved=drag.moved, x=drag.x, y=drag.y;
      drag=null;
      if(moved){
        snapAndSave(node,x,y);
        node.__rebAssistiveSuppressUntil = Date.now()+500;
      }
    }

    if(window.PointerEvent){
      node.addEventListener('pointerdown',function(e){
        if(!isMobile() || (typeof e.button==='number' && e.button>0)) return;
        begin(e.pointerId,e.clientX,e.clientY);
        try{node.setPointerCapture(e.pointerId);}catch(_e){}
      },{passive:true});
      node.addEventListener('pointermove',function(e){move(e.pointerId,e.clientX,e.clientY,e);},{passive:false});
      node.addEventListener('pointerup',function(e){try{node.releasePointerCapture(e.pointerId);}catch(_e){} end(e.pointerId);},{passive:true});
      node.addEventListener('pointercancel',function(e){end(e.pointerId);},{passive:true});
    } else {
      node.addEventListener('touchstart',function(e){var t=e.changedTouches&&e.changedTouches[0];if(!t)return;begin(t.identifier,t.clientX,t.clientY);},{passive:true});
      node.addEventListener('touchmove',function(e){var ts=e.changedTouches||[];for(var i=0;i<ts.length;i++){if(drag&&ts[i].identifier===drag.id){move(ts[i].identifier,ts[i].clientX,ts[i].clientY,e);break;}}},{passive:false});
      node.addEventListener('touchend',function(e){var ts=e.changedTouches||[];for(var i=0;i<ts.length;i++){if(drag&&ts[i].identifier===drag.id){end(ts[i].identifier);break;}}},{passive:true});
      node.addEventListener('touchcancel',function(e){if(drag)end(drag.id);},{passive:true});
    }

    node.addEventListener('click',function(e){
      if(node.__rebAssistiveSuppressUntil && Date.now()<node.__rebAssistiveSuppressUntil){
        e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      }
    },true);
    restore(node);
  }

  function scan(root){
    if(!isMobile()) return;
    if(root && root.matches && root.matches(SELECTOR)) attach(root);
    var scope = root && root.querySelectorAll ? root : document;
    Array.prototype.forEach.call(scope.querySelectorAll(SELECTOR),attach);
  }
  function boot(){
    scan(document);
    var mo=new MutationObserver(function(ms){
      ms.forEach(function(m){Array.prototype.forEach.call(m.addedNodes||[],function(n){if(n&&n.nodeType===1)scan(n);});});
    });
    mo.observe(document.documentElement,{childList:true,subtree:true});
    var rt=null;
    function reclamp(){clearTimeout(rt);rt=setTimeout(function(){Array.prototype.forEach.call(document.querySelectorAll(SELECTOR),clamp);},90);}
    window.addEventListener('resize',reclamp,{passive:true});
    window.addEventListener('orientationchange',reclamp,{passive:true});
    if(window.visualViewport) window.visualViewport.addEventListener('resize',reclamp,{passive:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
