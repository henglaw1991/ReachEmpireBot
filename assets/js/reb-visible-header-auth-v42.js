(function(){
'use strict';
function apply(){
 if(matchMedia('(max-width:767px)').matches)return;
 var headers=document.querySelectorAll('.main-header');
 headers.forEach(function(h){
   var phone=h.querySelector('.support-box');
   if(phone){
     var box=phone.querySelector('.icon-box');
     if(box){box.innerHTML='<i class="fas fa-headset" aria-hidden="true"></i>';box.style.display='inline-flex';box.style.alignItems='center';box.style.justifyContent='center';box.style.color='#f5b026';box.style.marginRight='9px';}
   }
   var opt=h.querySelector('.option-block');
   if(opt){
     opt.innerHTML='<a class="reb-visible-logout" href="#" aria-label="Log Out"><i class="fas fa-right-from-bracket" aria-hidden="true"></i><span>Log Out</span></a>';
     var lo=opt.querySelector('.reb-visible-logout');
     lo.style.cssText='display:inline-flex;align-items:center;gap:9px;color:#fff!important;font-weight:700;text-decoration:none;font-size:16px';
     var ic=lo.querySelector('i'); if(ic)ic.style.color='#f5b026';
     lo.onclick=function(e){e.preventDefault();try{var c=window.REBClientCore;if(c&&c.logout){Promise.resolve(c.logout()).finally(function(){location.href="/login/"});return}}catch(_){} try{localStorage.clear();sessionStorage.clear()}catch(_){} location.href='/login/'};
   }
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
setTimeout(apply,50);setTimeout(apply,300);setTimeout(apply,1000);
window.addEventListener('reb:client-core-ready',apply);
})();