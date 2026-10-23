/* D20F9 ReachEmpire Social compact login/logout control */
(function(){'use strict';
function core(){return window.REBClientCore||null}
function signedIn(){var c=core();return !!(c&&c.hasLiveSession&&c.hasLiveSession())}
function icon(){return '<span class="reb-social-auth-icon" aria-hidden="true"><i class="fas fa-right-from-bracket"></i></span>'}
function render(){
  document.querySelectorAll('.reb-social-global-inner').forEach(function(inner){
    inner.querySelectorAll('.reb-social-auth-actions').forEach(function(n){n.remove()});
    var wrap=document.createElement('div');wrap.className='reb-social-auth-actions';wrap.setAttribute('aria-label','Account control');
    var action=document.createElement('a');action.className='reb-social-auth-btn';
    if(signedIn()){
      action.classList.add('reb-social-auth-logout');action.href='/';action.innerHTML=icon()+'<span>Log Out</span>';
      action.addEventListener('click',function(e){e.preventDefault();var c=core();if(c&&c.clearSession)c.clearSession();window.location.href='/';});
    }else{
      action.classList.add('reb-social-auth-login');action.href='/login/';action.innerHTML=icon()+'<span>Log In</span>';
    }
    wrap.appendChild(action);inner.appendChild(wrap);
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
window.addEventListener('reb:auth-changed',render);
})();
