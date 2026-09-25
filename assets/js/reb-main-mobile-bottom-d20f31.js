(function(){
 'use strict';
 function norm(p){p=(p||'/').replace(/index\.html$/,'').replace(/\/+$/,'');return p||'/'}
 function init(){
   if(document.querySelector('.reb-main-mobile-bottom')) return;
   var nav=document.createElement('nav'); nav.className='reb-main-mobile-bottom'; nav.setAttribute('aria-label','Main mobile navigation');
   nav.innerHTML='<a data-route="/" href="/"><i class="fas fa-home" aria-hidden="true"></i><span>Home</span></a>'+
    '<a data-route="/download" href="/download/"><i class="fas fa-download" aria-hidden="true"></i><span>Download</span></a>'+
    '<a class="reb-main-social" data-route="/social" href="/social/" aria-label="Open ReachEmpire Social"><i class="fas fa-users" aria-hidden="true"></i><span>Social</span></a>'+
    '<a data-route="/markets" href="/markets/"><i class="fas fa-shopping-cart" aria-hidden="true"></i><span>EA Market</span></a>'+
    '<a data-route="/dashboard" href="/dashboard/"><i class="far fa-user" aria-hidden="true"></i><span>Profile</span></a>';
   var p=norm(location.pathname);
   nav.querySelectorAll('[data-route]').forEach(function(a){var r=a.getAttribute('data-route'); if((r==='/'&&p==='/')||(r!=='/'&&(p===r||p.indexOf(r+'/')===0))){a.classList.add('active');a.setAttribute('aria-current','page')}});
   document.body.appendChild(nav); document.body.classList.add('reb-main-bottom-enabled');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
