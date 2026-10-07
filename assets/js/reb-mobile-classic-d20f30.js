/* D20F68 — working shared mobile public hamburger controller. */
(function(){
  'use strict';
  function buildDrawer(){
    var drawer=document.querySelector('.mobile-menu');
    if(drawer) return drawer;
    drawer=document.createElement('div');
    drawer.className='mobile-menu';
    drawer.setAttribute('aria-hidden','true');
    drawer.innerHTML='<div class="menu-backdrop"></div><div class="menu-box"><div class="close-btn" role="button" tabindex="0" aria-label="Close menu">&times;</div><div class="nav-logo"><a href="/"><img src="/assets/images/logo.png" alt="ReachEmpireBot"></a></div><div class="menu-outer"></div></div>';
    document.body.appendChild(drawer);
    return drawer;
  }
  function init(){
    if(!window.matchMedia('(max-width: 940px)').matches) return;
    var homeInner=document.querySelector('.reb-web-menu-inner');
    var subHeader=document.querySelector('body.reb-subpage header.reb-header');
    var host=homeInner||subHeader;
    if(!host) return;
    var drawer=buildDrawer();

    document.querySelectorAll('.reb-web-mobile-hamburger,.reb-web-mobile-nav-backdrop,.reb-web-mobile-nav-title,.reb-web-mobile-nav-close').forEach(function(n){n.remove();});
    document.body.classList.remove('reb-web-mobile-nav-open');

    var outer=drawer.querySelector('.menu-outer');
    outer.innerHTML='<ul class="navigation clearfix">'+
      '<li><a href="/social/">Social</a></li><li><a href="/">Home</a></li>'+
      '<li><a href="/download/">Download</a></li><li><a href="/markets/">EA Bot Market</a></li>'+
      '<li><a href="/create-trade-account/">Trade Account</a></li><li><a href="/contact/">Contact Us</a></li>'+
      '<li><a href="/about/">About Us</a></li></ul>';
    var path=(location.pathname.replace(/\/+$/,'')||'/');
    outer.querySelectorAll('a').forEach(function(a){
      var p=(new URL(a.href,location.origin).pathname.replace(/\/+$/,'')||'/');
      if(p===path) a.parentElement.classList.add('current');
    });

    var toggle=homeInner ? host.querySelector('.reb-classic-mobile-toggle') : host.querySelector('.reb-mobile-menu-toggle');
    if(!toggle && homeInner){
      toggle=document.createElement('button');
      toggle.type='button'; toggle.className='reb-classic-mobile-toggle';
      toggle.innerHTML='<span class="reb-hamb-line"></span><span class="reb-hamb-line"></span><span class="reb-hamb-line"></span>';
      host.appendChild(toggle);
    }
    if(!toggle) return;
    toggle.removeAttribute('onclick');
    toggle.setAttribute('aria-label','Open menu');
    toggle.setAttribute('aria-expanded','false');

    function set(open){
      document.body.classList.toggle('mobile-menu-visible',open);
      drawer.setAttribute('aria-hidden',open?'false':'true');
      toggle.setAttribute('aria-expanded',open?'true':'false');
      toggle.setAttribute('aria-label',open?'Close menu':'Open menu');
      toggle.classList.toggle('is-open',open);
    }
    toggle.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();set(!document.body.classList.contains('mobile-menu-visible'));});
    var backdrop=drawer.querySelector('.menu-backdrop'), closeBtn=drawer.querySelector('.close-btn');
    if(backdrop) backdrop.addEventListener('click',function(){set(false);});
    if(closeBtn){
      closeBtn.addEventListener('click',function(){set(false);});
      closeBtn.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();set(false);}});
    }
    drawer.querySelectorAll('.navigation a').forEach(function(a){a.addEventListener('click',function(){set(false);});});
    document.addEventListener('keydown',function(e){if(e.key==='Escape') set(false);});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
