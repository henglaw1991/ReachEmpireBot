/* ReachEmpire Social R132: same-page image viewer with per-post gallery navigation.
   Gallery scope: one post media grid or one standalone profile media set.
   Comment photos remain single-photo viewers; no API, upload or post mutation. */
(function(){
  'use strict';
  if(window.__REB_SOCIAL_IMAGE_VIEWER_R130__)return;
  window.__REB_SOCIAL_IMAGE_VIEWER_R130__=true;
  var overlay=null,photo=null,caption=null,closeBtn=null,prevBtn=null,nextBtn=null,counter=null;
  var priorFocus=null,priorOverflow=null,items=[],position=0;
  function ensureViewer(){
    if(overlay)return;
    overlay=document.createElement('div');overlay.className='reb-r130-image-viewer';overlay.hidden=true;
    overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','View social images');
    var inner=document.createElement('div');inner.className='reb-r130-image-viewer-inner';
    closeBtn=document.createElement('button');closeBtn.type='button';closeBtn.className='reb-r130-image-viewer-close';closeBtn.textContent='×';closeBtn.setAttribute('aria-label','Close image viewer');
    prevBtn=document.createElement('button');prevBtn.type='button';prevBtn.className='reb-r130-image-viewer-nav reb-r130-image-viewer-prev';prevBtn.textContent='‹';prevBtn.setAttribute('aria-label','Previous image');
    nextBtn=document.createElement('button');nextBtn.type='button';nextBtn.className='reb-r130-image-viewer-nav reb-r130-image-viewer-next';nextBtn.textContent='›';nextBtn.setAttribute('aria-label','Next image');
    photo=document.createElement('img');photo.className='reb-r130-image-viewer-photo';photo.alt='Social post photo';
    caption=document.createElement('div');caption.className='reb-r130-image-viewer-caption';
    counter=document.createElement('span');counter.className='reb-r130-image-viewer-counter';counter.setAttribute('aria-live','polite');
    inner.appendChild(photo);inner.appendChild(caption);overlay.appendChild(closeBtn);overlay.appendChild(prevBtn);overlay.appendChild(nextBtn);overlay.appendChild(inner);overlay.appendChild(counter);
    closeBtn.addEventListener('click',closeViewer);
    prevBtn.addEventListener('click',function(){step(-1);});nextBtn.addEventListener('click',function(){step(1);});
    overlay.addEventListener('click',function(e){if(e.target===overlay)closeViewer();});
    document.body.appendChild(overlay);
  }
  function validUrl(raw){
    try{var u=new URL(String(raw||''),window.location.href);
      return /^(http:|https:)$/.test(u.protocol)&&u.hostname?u.href:'';
    }catch(_e){return '';}
  }
  function collect(clicked){
    var list=[],index=0,group=null,nodes=[];
    var anchor=clicked.closest('a.reb-social-media-cell, a.reb-social-comment-photo');
    var pic=anchor?anchor.querySelector('img'):clicked.closest('.reb-post-media img');
    if(!pic)return null;
    if(anchor&&anchor.classList.contains('reb-social-media-cell')){
      group=anchor.closest('.reb-social-media-grid');
      nodes=group?Array.prototype.slice.call(group.querySelectorAll('a.reb-social-media-cell')):[anchor];
    }else if(!anchor){
      group=pic.closest('.reb-post-media');
      nodes=group?Array.prototype.slice.call(group.querySelectorAll('img')):[pic];
    }else{nodes=[anchor];}
    nodes.forEach(function(n){
      var img=n.tagName==='IMG'?n:n.querySelector('img');
      if(!img)return;
      var src=validUrl(n.tagName==='A'?n.getAttribute('href'):img.getAttribute('src'));
      if(!src)return;
      if(img===pic)index=list.length;
      list.push({src:src,alt:String(img.getAttribute('alt')||'Social image')});
    });
    if(!list.length)return null;
    return {items:list,index:index};
  }
  function showAt(index){
    if(!items.length||index<0||index>=items.length)return;
    position=index;
    photo.src=items[position].src;photo.alt=items[position].alt;
    caption.textContent=items[position].alt;
    var multi=items.length>1;
    prevBtn.hidden=nextBtn.hidden=counter.hidden=!multi;
    prevBtn.disabled=position===0;nextBtn.disabled=position===items.length-1;
    counter.textContent=multi?String(position+1)+' / '+String(items.length):'';
  }
  function step(delta){if(overlay&&!overlay.hidden)showAt(position+delta);}
  function openViewer(gallery){
    if(!gallery||!gallery.items.length)return;
    ensureViewer();if(!overlay.hidden)closeViewer();
    items=gallery.items;priorFocus=document.activeElement;priorOverflow=document.body.style.overflow;
    showAt(gallery.index);overlay.hidden=false;document.body.style.overflow='hidden';
    try{closeBtn.focus({preventScroll:true});}catch(_e){closeBtn.focus();}
  }
  function closeViewer(){
    if(!overlay||overlay.hidden)return;
    overlay.hidden=true;photo.removeAttribute('src');items=[];
    document.body.style.overflow=priorOverflow===null?'':priorOverflow;
    try{if(priorFocus&&priorFocus.isConnected)priorFocus.focus({preventScroll:true});}catch(_e){}
    priorFocus=null;
  }
  document.addEventListener('keydown',function(e){
    if(!overlay||overlay.hidden)return;
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeViewer();}
    else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
      e.preventDefault();e.stopPropagation();step(e.key==='ArrowLeft'?-1:1);
    }else if(e.key==='Tab'){
      var controls=[closeBtn,prevBtn,nextBtn].filter(function(b){return !b.hidden&&!b.disabled;});
      var idx=controls.indexOf(document.activeElement);
      e.preventDefault();controls[(idx+(e.shiftKey?-1:1)+controls.length)%controls.length].focus();
    }
  });
  document.addEventListener('click',function(e){
    if(e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
    var el=e.target;if(!el||!el.closest)return;
    var target=el.closest('a.reb-social-media-cell, a.reb-social-comment-photo, .reb-post-media img');
    if(!target)return;
    var gallery=collect(target);if(!gallery)return;
    e.preventDefault();e.stopPropagation();openViewer(gallery);
  },true);
})();
