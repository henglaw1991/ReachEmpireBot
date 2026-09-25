/* D20F71 — single authoritative mobile public hamburger controller. */
(function(){
'use strict';
function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});else fn();}
ready(function(){
 if(!window.matchMedia('(max-width: 940px)').matches)return;
 var home=document.querySelector('.reb-web-menu-inner');
 var sub=document.querySelector('body.reb-subpage header.reb-header');
 var host=home||sub;if(!host)return;
 var old=home?host.querySelector('.reb-classic-mobile-toggle'):host.querySelector('.reb-mobile-menu-toggle');
 if(!old&&home){old=document.createElement('button');old.type='button';old.className='reb-classic-mobile-toggle';old.innerHTML='<span class="reb-hamb-line"></span><span class="reb-hamb-line"></span><span class="reb-hamb-line"></span>';host.appendChild(old);}
 if(!old)return;
 /* clone strips every listener previously attached by legacy scripts */
 var toggle=old.cloneNode(true);old.replaceWith(toggle);toggle.removeAttribute('onclick');
 var drawer=document.querySelector('.mobile-menu');
 if(!drawer){drawer=document.createElement('div');drawer.className='mobile-menu';document.body.appendChild(drawer);}
 drawer.innerHTML='<div class="menu-backdrop"></div><div class="menu-box"><div class="close-btn" role="button" tabindex="0" aria-label="Close menu">&times;</div><div class="nav-logo reb-drawer-brand"><a href="/" aria-label="ReachEmpireBot Home" style="display:flex;align-items:center;gap:11px;text-decoration:none"><img class="reb-drawer-robot" src="/assets/images/resource/reb-robot.png" alt=""><span><span class="reb-drawer-wordmark"><span class="reb-word-reach">Reach</span><span class="reb-word-empire">EmpireBot</span></span><span class="reb-drawer-tagline">Auto Trading Software</span></span></a></div><div class="menu-outer"><ul class="navigation clearfix"><li><a href="/">Home</a></li><li><a href="/download/">Download</a></li><li><a href="/markets/">EA Bot Market</a></li><li><a href="/create-trade-account/">Trade Account</a></li><li><a href="/contact/">Contact Us</a></li><li><a href="/about/">About Us</a></li></ul></div></div>';
 drawer.setAttribute('aria-hidden','true');
 var path=(location.pathname.replace(/\/+$/,'')||'/');drawer.querySelectorAll('a').forEach(function(a){var p=(new URL(a.href,location.origin).pathname.replace(/\/+$/,'')||'/');if(p===path)a.parentElement.classList.add('current');});
 function set(open){document.body.classList.toggle('mobile-menu-visible',open);drawer.setAttribute('aria-hidden',open?'false':'true');toggle.setAttribute('aria-expanded',open?'true':'false');toggle.setAttribute('aria-label',open?'Close menu':'Open menu');toggle.classList.toggle('is-open',open);}
 set(false);
 toggle.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();set(!document.body.classList.contains('mobile-menu-visible'));});
 drawer.querySelector('.menu-backdrop').addEventListener('click',function(){set(false)});
 var close=drawer.querySelector('.close-btn');close.addEventListener('click',function(){set(false)});close.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();set(false)}});
 drawer.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){set(false)})});
 document.addEventListener('keydown',function(e){if(e.key==='Escape')set(false)});
});
})();
