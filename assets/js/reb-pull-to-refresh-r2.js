/* ReachEmpireBot mobile pull-to-refresh R2: visible spinning loader; shared, standalone. */
(function () {
  'use strict';
  if (window.__REB_GLOBAL_PTR_R2__) return;
  window.__REB_GLOBAL_PTR_R2__ = true;
  if (!('ontouchstart' in window) && !(navigator.maxTouchPoints > 0)) return;
  var THRESHOLD = 76, MAX_PULL = 140;
  var active = false, loading = false, sy = 0, sx = 0, pulled = 0;
  var root, ring, message;
  function mount() {
    if (root || !document.body) return;
    var css = document.createElement('style');
    css.id = 'reb-global-ptr-r2-css';
    css.textContent = '@keyframes rebPtrSpinR2{to{transform:rotate(360deg)}}' +
      '#reb-global-ptr-r2{box-sizing:border-box;position:fixed;z-index:2147483000;left:50%;top:calc(env(safe-area-inset-top,0px) + 12px);transform:translate(-50%,-130px);opacity:0;display:flex;align-items:center;gap:10px;padding:11px 15px;border-radius:999px;background:#111a1b;color:white;box-shadow:0 8px 25px rgba(0,0,0,.25);font:600 13px system-ui,-apple-system,sans-serif;pointer-events:none;white-space:nowrap;transition:transform .13s ease,opacity .13s ease}' +
      '#reb-global-ptr-r2 .reb-ptr-ring{box-sizing:border-box;width:20px;height:20px;border:3px solid rgba(255,255,255,.28);border-top-color:#ffba26;border-radius:50%;flex:0 0 auto}' +
      '#reb-global-ptr-r2[data-spin="1"] .reb-ptr-ring{animation:rebPtrSpinR2 .7s linear infinite}' +
      '@media(prefers-reduced-motion:reduce){#reb-global-ptr-r2[data-spin="1"] .reb-ptr-ring{animation-duration:1.7s}}';
    document.head.appendChild(css);
    root = document.createElement('div'); root.id='reb-global-ptr-r2'; root.setAttribute('role','status'); root.setAttribute('aria-live','polite');
    ring=document.createElement('span'); ring.className='reb-ptr-ring'; ring.setAttribute('aria-hidden','true');
    message=document.createElement('span'); message.textContent='Pull to refresh';
    root.appendChild(ring);root.appendChild(message);document.body.appendChild(root);
  }
  function indicator(distance, label, spinning) {
    mount(); if (!root) return;
    root.style.opacity='1';root.style.transform='translate(-50%,'+(Math.min(MAX_PULL,distance)*.5-30)+'px)';
    root.dataset.spin=spinning?'1':'0';message.textContent=label;
  }
  function dismiss() {if(root){root.style.opacity='0';root.style.transform='translate(-50%,-130px)';root.dataset.spin='0';}}
  function isEditable(n) {return !!(n && n.closest && n.closest('input,textarea,select,[contenteditable],[role="textbox"],.CodeMirror,.monaco-editor'));}
  function scrollAtTop(n) {
    if ((window.scrollY||document.documentElement.scrollTop||0)>2) return false;
    for(var el=n&&n.nodeType===1?n:null;el&&el!==document.body;el=el.parentElement){
      if(el.scrollHeight>el.clientHeight+4){var overflow=getComputedStyle(el).overflowY;if(/auto|scroll/.test(overflow)&&el.scrollTop>2)return false;}
    }
    return true;
  }
  function visible(el) {return !!(el.getClientRects().length) && !el.closest('[hidden],[inert]');}
  function hasWork() {
    if (window.REBPullRefresh && typeof window.REBPullRefresh.isBusy==='function') {
      try {if(window.REBPullRefresh.isBusy())return true;} catch(_) {return true;}
    }
    if (document.querySelector('[data-reb-uploading="true"],[data-uploading="true"],.is-uploading'))return true;
    var fields=document.querySelectorAll('textarea,input:not([type="hidden"]),[contenteditable="true"]');
    for(var i=0;i<fields.length;i++){
      var f=fields[i];if(f.disabled||!visible(f))continue;
      if(f.type==='file'&&f.files&&f.files.length)return true;
      if(f.matches('textarea')&&f.value!==f.defaultValue&&f.value.trim())return true;
      if(f.matches('[contenteditable="true"]')&&f.textContent.trim())return true;
      if(f.matches('input')&&!['file','checkbox','radio','button','submit','reset','search'].includes((f.type||'text').toLowerCase())&&f.value!==f.defaultValue&&f.value.trim())return true;
    }
    return false;
  }
  function reset(){active=false;pulled=0;if(!loading)dismiss();}
  document.addEventListener('touchstart',function(e){
    if(loading||e.touches.length!==1||isEditable(e.target)||!scrollAtTop(e.target)){active=false;return;}
    active=true;sx=e.touches[0].clientX;sy=e.touches[0].clientY;pulled=0;
  },{passive:true});
  document.addEventListener('touchmove',function(e){
    if(!active||loading||e.touches.length!==1)return;
    if(!scrollAtTop(e.target)){reset();return;}
    var dx=e.touches[0].clientX-sx,dy=e.touches[0].clientY-sy;
    if(dy<0||Math.abs(dx)>Math.abs(dy)*.8){reset();return;}
    if(dy<8)return;
    pulled=Math.min(MAX_PULL,dy);
    if(e.cancelable)e.preventDefault();
    indicator(pulled,pulled>=THRESHOLD?'Release to refresh':'Pull to refresh',pulled>=THRESHOLD);
  },{passive:false});
  document.addEventListener('touchend',function(){
    if(!active)return;
    var fire=pulled>=THRESHOLD;active=false;pulled=0;
    if(!fire){dismiss();return;}
    if(hasWork()){indicator(THRESHOLD,'Unsaved changes — not refreshed',false);setTimeout(dismiss,1800);return;}
    loading=true;indicator(THRESHOLD,'Refreshing…',true);
    /* Keep spinner visible until the navigation begins; no mutation of app state. */
    setTimeout(function(){window.location.reload();},220);
  },{passive:true});
  document.addEventListener('touchcancel',reset,{passive:true});
  window.addEventListener('pageshow',function(){loading=false;dismiss();});
  window.REBGlobalPullRefreshR2={loaded:true};
})();
