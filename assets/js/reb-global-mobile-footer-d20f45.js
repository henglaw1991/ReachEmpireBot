(function(){
'use strict';
function norm(p){p=String(p||'/').replace(/index\.html$/i,'').replace(/\/+$/,'');return p||'/';}
function key(){var p=norm(location.pathname);if(p==='/')return'home';if(p==='/social'||p.indexOf('/social/')===0){if(p.indexOf('/social/community')===0)return'community';if(p.indexOf('/social/notifications')===0)return'notifications';if(p.indexOf('/social/profile')===0)return'profile';return'feed';}if(p==='/dashboard'||p.indexOf('/dashboard/')===0)return'trading';return'';}
function html(){return '<a href="/" data-reb-nav="home"><i class="fas fa-home"></i><span>Home</span></a><a href="/social/" data-reb-nav="feed"><i class="fas fa-stream"></i><span>Feed</span></a><a href="/dashboard/" data-reb-nav="trading"><i class="fas fa-chart-line"></i><span>Trading</span></a><a href="/social/community/" data-reb-nav="community"><i class="fas fa-users"></i><span>Community</span></a><a href="/social/notifications/" data-reb-nav="notifications"><i class="far fa-bell"></i><span>Notifications</span><b class="reb-social-bottom-badge" data-social-activity-badge hidden>0</b></a><a href="/social/profile/" data-reb-nav="profile"><i class="far fa-user reb-footer-profile-fallback"></i><img class="reb-footer-profile-photo" alt="Profile" hidden><span>Profile</span></a>';}
function boot(){
 document.querySelectorAll('.reb-main-mobile-bottom').forEach(function(n){n.remove()});
 var nav=document.querySelector('.reb-social-bottom-nav');
 if(!nav){nav=document.createElement('nav');nav.className='reb-social-bottom-nav reb-social-bottom-nav-d20f43 reb-global-mobile-footer-d20f45';nav.setAttribute('aria-label','Mobile navigation');document.body.appendChild(nav);}
 nav.innerHTML=html();
 var k=key();nav.querySelectorAll('[data-reb-nav]').forEach(function(a){var on=a.getAttribute('data-reb-nav')===k;a.classList.toggle('active',on);if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 document.body.classList.add('reb-global-mobile-footer-enabled');
 var core=window.REBClientCore;if(core&&core.hasLiveSession&&core.hasLiveSession&&core.json){core.json('/api/social/profile/me',{method:'GET',timeoutMs:6000}).then(function(d){var p=d&&(d.profile||d.user||d);var u=String(p&&(p.avatar||p.avatar_url||p.profile_photo||p.profile_photo_url)||'').trim();if(!u)return;var img=nav.querySelector('.reb-footer-profile-photo'),ico=nav.querySelector('.reb-footer-profile-fallback');if(img){img.src=u;img.hidden=false;}if(ico)ico.style.display='none';}).catch(function(){});}
 }
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
