/* D20F40 — mobile Profile ... menu below cover, unclipped and viewport-safe. */
(function(){
  var originalParent=null;
  function placeDropdown(box){
    if(!box||!window.matchMedia('(max-width:760px)').matches)return;
    var btn=box.querySelector('.reb-social-account-trigger');
    var dd=box.querySelector('.reb-social-account-dropdown');
    if(!btn||!dd)return;
    var r=btn.getBoundingClientRect();
    var gap=7, margin=14;
    var top=r.bottom+gap;
    var maxH=Math.max(180,window.innerHeight-top-margin);
    dd.style.setProperty('top',top+'px','important');
    dd.style.setProperty('right',margin+'px','important');
    dd.style.setProperty('left','auto','important');
    dd.style.setProperty('max-height',maxH+'px','important');
  }
  function apply(){
    var box=document.querySelector('.reb-social-global-topbar .reb-social-account-control, #rebProfileMoreSlot .reb-social-account-control');
    var slot=document.getElementById('rebProfileMoreSlot');
    var inner=document.querySelector('.reb-social-global-topbar .reb-social-global-inner');
    if(!slot||!inner||!box)return;
    if(!originalParent)originalParent=inner;
    if(window.matchMedia('(max-width:760px)').matches){
      if(box.parentNode!==slot)slot.appendChild(box);
      var btn=box.querySelector('.reb-social-account-trigger');
      if(btn){
        btn.innerHTML='<i class="fas fa-ellipsis-h" aria-hidden="true"></i>';
        btn.setAttribute('aria-label','Open profile menu');
        if(!btn.dataset.rebD20f40){
          btn.dataset.rebD20f40='1';
          btn.addEventListener('click',function(){requestAnimationFrame(function(){placeDropdown(box);});});
        }
      }
      placeDropdown(box);
    }else if(box.parentNode!==inner){location.reload();}
  }
  var mo=new MutationObserver(function(){apply();});
  function start(){
    var h=document.querySelector('.reb-social-global-topbar');
    if(h)mo.observe(h,{childList:true,subtree:true});
    apply();setTimeout(apply,250);setTimeout(apply,900);
    window.addEventListener('resize',apply,{passive:true});
    window.addEventListener('scroll',function(){
      var box=document.querySelector('#rebProfileMoreSlot .reb-social-account-control');
      if(box)placeDropdown(box);
    },{passive:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
