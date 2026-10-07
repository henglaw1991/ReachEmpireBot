/* D20F10 ReachEmpire Social top-row login/logout control */
(function(){'use strict';
function core(){return window.REBClientCore||null}
function signedIn(){var c=core();return !!(c&&c.hasLiveSession&&c.hasLiveSession())}
function icon(isOut){return '<span class="reb-social-auth-icon" aria-hidden="true"><i class="fas '+(isOut?'fa-right-from-bracket':'fa-right-to-bracket')+'"></i></span>'}
function render(){
  document.querySelectorAll('.reb-social-global-topbar').forEach(function(header){
    header.querySelectorAll('.reb-social-auth-toprow').forEach(function(n){n.remove()});
    var row=document.createElement('div');row.className='reb-social-auth-toprow';row.setAttribute('aria-label','Account');
    var wrap=document.createElement('div');wrap.className='reb-social-auth-actions';
    var action=document.createElement('a');action.className='reb-social-auth-btn';
    if(signedIn()){
      action.classList.add('reb-social-auth-logout');action.href='/';action.innerHTML=icon(true)+'<span>Log Out</span>';
      action.addEventListener('click',function(e){e.preventDefault();var c=core();if(c&&c.clearSession)c.clearSession();window.location.href='/';});
    }else{
      action.classList.add('reb-social-auth-login');action.href='/login/';action.innerHTML=icon(false)+'<span>Log In</span>';
    }
    wrap.appendChild(action);row.appendChild(wrap);header.insertBefore(row,header.firstChild);
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
window.addEventListener('reb:auth-changed',render);
})();
