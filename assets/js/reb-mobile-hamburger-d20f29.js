(function(){
  'use strict';
  function init(){
    var header=document.querySelector('.reb-web-menu');
    if(!header) return;
    var inner=header.querySelector('.reb-web-menu-inner'), nav=header.querySelector('.reb-web-nav');
    if(!inner||!nav||inner.querySelector('.reb-web-mobile-hamburger')) return;
    var btn=document.createElement('button');
    btn.type='button'; btn.className='reb-web-mobile-hamburger'; btn.setAttribute('aria-label','Open menu'); btn.setAttribute('aria-expanded','false');
    btn.innerHTML='<i class="fas fa-bars" aria-hidden="true"></i>';
    var account=inner.querySelector('.reb-web-account'); inner.insertBefore(btn,account||null);
    var title=document.createElement('div'); title.className='reb-web-mobile-nav-title'; title.textContent='ReachEmpireBot'; nav.insertBefore(title,nav.firstChild);
    var close=document.createElement('button'); close.type='button'; close.className='reb-web-mobile-nav-close'; close.setAttribute('aria-label','Close menu'); close.innerHTML='&times;'; nav.appendChild(close);
    var backdrop=document.createElement('button'); backdrop.type='button'; backdrop.className='reb-web-mobile-nav-backdrop'; backdrop.setAttribute('aria-label','Close menu'); document.body.appendChild(backdrop);
    function set(open){document.body.classList.toggle('reb-web-mobile-nav-open',open);btn.classList.toggle('is-open',open);btn.setAttribute('aria-expanded',open?'true':'false');btn.setAttribute('aria-label',open?'Close menu':'Open menu');}
    btn.addEventListener('click',function(){set(!document.body.classList.contains('reb-web-mobile-nav-open'));});
    close.addEventListener('click',function(){set(false);}); backdrop.addEventListener('click',function(){set(false);});
    nav.addEventListener('click',function(e){if(e.target.closest('a'))set(false);});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')set(false);});
    window.addEventListener('resize',function(){if(window.innerWidth>940)set(false);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
