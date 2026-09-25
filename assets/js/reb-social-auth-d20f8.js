/* D20F8 ReachEmpire Social shared account controls */
(function(){'use strict';
function esc(v){return String(v==null?'':v)}
function core(){return window.REBClientCore||null}
function signedIn(){var c=core();return !!(c&&c.hasLiveSession&&c.hasLiveSession())}
function username(){var c=core(),u=c&&c.user?c.user():{},p=u&&u.profile||{};return esc(p.username||u.username||(c&&c.displayName?c.displayName():'Account')).trim()||'Account'}
function render(){
  document.querySelectorAll('.reb-social-global-inner').forEach(function(inner){
    var old=inner.querySelector('.reb-social-auth-actions');if(old)old.remove();
    var wrap=document.createElement('div');wrap.className='reb-social-auth-actions';wrap.setAttribute('aria-label','Account controls');
    if(signedIn()){
      var account=document.createElement('a');account.className='reb-social-auth-btn reb-social-auth-account';account.href='/dashboard/';account.textContent=username();account.title=username();
      var logout=document.createElement('a');logout.className='reb-social-auth-btn reb-social-auth-logout';logout.href='/';logout.textContent='Log Out';
      logout.addEventListener('click',function(e){e.preventDefault();var c=core();if(c&&c.clearSession)c.clearSession();window.location.href='/';});
      wrap.appendChild(account);wrap.appendChild(logout);
    }else{
      var signup=document.createElement('a');signup.className='reb-social-auth-btn reb-social-auth-signup';signup.href='/signup/';signup.textContent='Sign Up';
      var login=document.createElement('a');login.className='reb-social-auth-btn reb-social-auth-login';login.href='/login/';login.textContent='Log In';
      wrap.appendChild(signup);wrap.appendChild(login);
    }
    inner.appendChild(wrap);
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
window.addEventListener('reb:auth-changed',render);
})();
