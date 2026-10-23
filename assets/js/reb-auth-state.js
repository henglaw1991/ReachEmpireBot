/* REB_MOBILE_PHASE1F_SHARED_AUTH_STATE_20260917 */
(function () {
  'use strict';
  var core=window.REBClientCore||null;
  var API_BASE=core?core.apiBase():String(window.REB_API_BASE||'https://admin.reachempirebot.com').replace(/\/+$/,'');
  var TOKEN_KEY='REB_CLIENT_TOKEN', USER_KEY='REB_CLIENT_USER';
  var rendering=false;

  function storedToken(){return core?core.liveToken():String(localStorage.getItem(TOKEN_KEY)||'').trim();}
  function hasValidSession(){
    if(core)return core.hasLiveSession();
    var value=storedToken(),normalized=value.toLowerCase();
    return Boolean(value&&normalized!=='null'&&normalized!=='undefined'&&normalized!=='false'&&normalized.indexOf('pending-')!==0);
  }
  function userName(){
    if(core)return core.displayName();
    var data={};try{data=JSON.parse(localStorage.getItem(USER_KEY)||'{}')||{};}catch(_e){}
    var profile=data.profile||{};return String(profile.name||profile.username||data.name||data.username||'Account').trim()||'Account';
  }
  function authAreas(){var nodes=Array.prototype.slice.call(document.querySelectorAll('[data-reb-auth-mount="1"], #reb-global-home-header-v35 .reb-v35-auth'));return nodes.filter(function(node,index){return nodes.indexOf(node)===index;});}
  function isMobilePublicPage(){
    var mobile=Math.min(window.innerWidth||9999,document.documentElement.clientWidth||9999)<=767 || /Android|iPhone|Mobile/i.test(navigator.userAgent||'');
    if(!mobile)return false;
    var p=String(location.pathname||'/').replace(/\/+/g,'/').replace(/\/index\.html$/i,'/').replace(/\.html$/i,'/');
    return p==='/' || p==='/download/' || p==='/markets/' || p==='/create-trade-account/' || p==='/contact/' || p==='/about/';
  }
  function hideMobilePublicTopAuth(area){
    clearArea(area);
    area.classList.remove('reb-auth-logged-in');
    area.classList.add('reb-mobile-public-auth-hidden');
    area.style.setProperty('display','none','important');
  }
  function makeLink(text,href,className,action){var link=document.createElement('a');link.href=href;link.textContent=text;link.className=className;link.setAttribute('data-auth-action',action);return link;}
  function clearArea(area){Array.prototype.slice.call(area.querySelectorAll('[data-auth-action], .reb-session-account, .reb-session-logout, a[href="/signup/"], a[href$="/signup"], a[href*="signup.html"], a[href="/login/"], a[href$="/login"], a[href*="login.html"]')).forEach(function(node){node.remove();});}
  function isStandardPublicDesktop(){
    var mobile=Math.min(window.innerWidth||9999,document.documentElement.clientWidth||9999)<=767 || /Android|iPhone|Mobile/i.test(navigator.userAgent||'');
    if(mobile)return false;
    var p=String(location.pathname||'/').replace(/\/+/g,'/').replace(/\/index\.html$/i,'/').replace(/\.html$/i,'/');
    return p==='/' || p==='/download/' || p==='/markets/' || p==='/create-trade-account/' || p==='/contact/' || p==='/about/' || p==='/forex-trading/' || p==='/crypto-trading/' || p==='/metal-trading/';
  }
  function renderArea(area,signedIn){
    if(isMobilePublicPage()){hideMobilePublicTopAuth(area);return;}
    area.classList.remove('reb-mobile-public-auth-hidden');area.style.removeProperty('display');
    clearArea(area);
    area.classList.toggle('reb-auth-logged-in',signedIn);
    if(area.classList.contains('reb-v35-auth')){
      var v35=makeLink('',signedIn?'/':'/login/',signedIn?'reb-v35-logout reb-session-logout':'reb-v35-login',signedIn?'logout':'login');
      v35.setAttribute('aria-label',signedIn?'Log Out':'Log In');
      v35.innerHTML=signedIn?'<svg class="reb-v35-exit-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5v3H3v4h7v3zm9-14H9a2 2 0 0 0-2 2v3h2V5h10v14H9v-3H7v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/></svg><span>Log Out</span>':'<i class="fas fa-sign-in-alt" aria-hidden="true"></i><span>Log In</span>';
      area.appendChild(v35);
      return;
    }
    if(signedIn){
      if(isStandardPublicDesktop()){
        var out=makeLink('','/','reb-session-logout reb-standard-live-logout','logout');
        out.setAttribute('aria-label','Log Out');
        out.innerHTML='<i class="fas fa-sign-out-alt" aria-hidden="true"></i><span>Log Out</span>';
        area.appendChild(out);
      }else{
        area.appendChild(makeLink(userName(),'/dashboard/','theme-btn btn-one mr_10 reb-session-account','dashboard'));
        area.appendChild(makeLink('Log Out','/','theme-btn btn-two reb-session-logout','logout'));
      }
      return;
    }
    if(isStandardPublicDesktop()){
      var login=makeLink('','/login/','reb-standard-live-login','login');
      login.setAttribute('aria-label','Log In');
      login.innerHTML='<i class="fas fa-sign-in-alt" aria-hidden="true"></i><span>Log In</span>';
      area.appendChild(login);
    }else{
      var onlyLogin=makeLink('','/login/','reb-standard-live-login','login');
      onlyLogin.setAttribute('aria-label','Log In');
      onlyLogin.innerHTML='<i class="fas fa-sign-in-alt" aria-hidden="true"></i><span>Log In</span>';
      area.appendChild(onlyLogin);
    }
  }
  function ensurePhoneIcon(){
    if(!isStandardPublicDesktop())return;
    document.querySelectorAll('.main-header .header-top .support-box').forEach(function(box){
      var ib=box.querySelector('.icon-box'); if(!ib)return;
      ib.innerHTML='<svg class="reb-standard-phone-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0-9 9v5a3 3 0 0 0 3 3h3v-8H5a7 7 0 0 1 14 0h-4v8h2a2 2 0 0 1-2 2h-3v2h3a4 4 0 0 0 4-4 3 3 0 0 0 2-3v-5a9 9 0 0 0-9-9z"/></svg>';
    });
  }
  function render(){if(rendering)return;rendering=true;try{var signedIn=hasValidSession();authAreas().forEach(function(area){renderArea(area,signedIn);});ensurePhoneIcon();document.documentElement.classList.toggle('reb-client-logged-in',signedIn);document.documentElement.classList.toggle('reb-client-logged-out',!signedIn);}finally{rendering=false;}}
  function clearSession(){
    if(core){core.clearSession();return;}
    localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(USER_KEY);localStorage.removeItem('REB_CLIENT_LAST_STATUS');localStorage.removeItem('REB_CLIENT_PENDING_SIGNUP');
    try{window.dispatchEvent(new CustomEvent('reb:auth-changed',{detail:{state:'logged_out'}}));}catch(_e){}
  }
  function logout(event){
    var action=event.target.closest('[data-auth-action="logout"], .reb-session-logout');if(!action)return;
    event.preventDefault();
    if(action.dataset.rebLogoutBusy==='1')return;
    action.dataset.rebLogoutBusy='1';
    var currentToken=storedToken();
    /* Clear the local session immediately so every page sees Logged Out without waiting on the network. */
    clearSession();
    try{
      if(currentToken){
        if(core)Promise.resolve(core.request('/api/mobile/logout',{method:'POST',auth:true,cacheBust:false})).catch(function(){});
        else fetch(API_BASE+'/api/mobile/logout',{method:'POST',headers:{Authorization:'Bearer '+currentToken},cache:'no-store',keepalive:true}).catch(function(){});
      }
    }catch(_e){}
    window.location.replace('/');
  }
  function installStandardLogoutStyle(){
    if(document.getElementById('reb-v48-live-logout-style'))return;
    var st=document.createElement('style');st.id='reb-v48-live-logout-style';
    st.textContent='@media (min-width:768px){html body .main-header .header-top .option-block.reb-auth-logged-in{display:flex!important;align-items:center!important;justify-content:flex-end!important;width:auto!important;min-width:0!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important;grid-template-columns:none!important}html body [data-reb-auth-mount="1"]>.reb-standard-live-login,html body [data-reb-auth-mount="1"].reb-auth-logged-in>.reb-standard-live-logout{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;width:auto!important;min-width:0!important;height:auto!important;min-height:0!important;margin:0!important;padding:8px 0!important;border:0!important;border-radius:0!important;background:transparent!important;background-image:none!important;box-shadow:none!important;color:#fff!important;font:800 14px/1 Ubuntu,Arial,sans-serif!important;text-decoration:none!important;cursor:pointer!important;pointer-events:auto!important}html body [data-reb-auth-mount="1"]>.reb-standard-live-login i,html body [data-reb-auth-mount="1"].reb-auth-logged-in>.reb-standard-live-logout i{display:inline-block!important;color:#f5b026!important;font-size:14px!important;line-height:1!important}html body [data-reb-auth-mount="1"]>.reb-standard-live-login span,html body [data-reb-auth-mount="1"].reb-auth-logged-in>.reb-standard-live-logout span{display:inline-block!important;color:#fff!important}html body [data-reb-auth-mount="1"].reb-auth-logged-in>.reb-standard-live-logout:hover span{text-decoration:underline!important}}';
    document.head.appendChild(st);
  }
  function start(){
    installStandardLogoutStyle();
    render();window.addEventListener('load',render,{once:true});document.addEventListener('click',logout);
    window.addEventListener('storage',function(event){if(event.key===TOKEN_KEY||event.key===USER_KEY||event.key==='REB_CLIENT_PENDING_SIGNUP')render();});
    window.addEventListener('reb:auth-changed',render);window.addEventListener('reb:header-mounted',render);window.addEventListener('pageshow',render);
    document.addEventListener('visibilitychange',function(){if(!document.hidden)render();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
