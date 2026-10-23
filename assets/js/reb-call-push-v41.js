(function(){
'use strict';
if(window.__REB_CALL_PUSH_V42__)return;window.__REB_CALL_PUSH_V42__=true;
var core=window.REBClientCore;
if(!core)return;
var registration=null,config=null,working=false;
function supported(){return 'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window}
function isIOS(){return /iPad|iPhone|iPod/i.test(navigator.userAgent||'')}
function standalone(){return !!(navigator.standalone||(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches))}
function decodeKey(s){var p='='.repeat((4-s.length%4)%4),raw=atob((s+p).replace(/-/g,'+').replace(/_/g,'/')),out=new Uint8Array(raw.length);for(var i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
function panel(){return document.getElementById('rebCallPushR142')}
function paint(message,kind){
 var el=panel();if(!el)return;
 var status=el.querySelector('[data-reb-call-alert-status]');if(status)status.textContent=message;
 var button=el.querySelector('[data-reb-call-alert-enable]');
 if(button){var hide=(kind==='enabled'||kind==='blocked'||kind==='unsupported'||kind==='install'||kind==='unavailable');button.hidden=hide;button.style.display=hide?'none':'block';button.disabled=working}
 el.hidden=(kind==='enabled');
}
function ensurePanel(){
 if(!/^\/social\/messages\/?$/.test(location.pathname)||panel())return;
 var target=document.querySelector('.reb-msg-list-title');if(!target)return;
 var el=document.createElement('div');el.id='rebCallPushR142';el.setAttribute('role','group');el.setAttribute('aria-label','Incoming call alerts');
 el.style.cssText='margin:8px 10px 12px;padding:10px 12px;border:1px solid #dfdfe4;border-radius:12px;background:#fff;color:#272727;font:13px/1.45 system-ui,sans-serif;';
 el.innerHTML='<strong style="display:block;margin-bottom:3px">Incoming call alerts</strong><span data-reb-call-alert-status>Checking call notifications…</span><button type="button" data-reb-call-alert-enable style="display:block;margin-top:9px;padding:8px 12px;border:0;border-radius:8px;background:#ecaa20;color:#111;font-weight:700;cursor:pointer">Enable lock-screen call alerts</button>';
 target.parentNode.insertBefore(el,target);
 el.querySelector('button').addEventListener('click',enableFromGesture);
}
async function register(){
 if(!registration){registration=await navigator.serviceWorker.register('/reb-call-sw.js',{scope:'/',updateViaCache:'none'});try{await registration.update()}catch(e){}}
 return registration;
}
async function getConfig(){
 if(!config)config=await core.json('/api/social/push/config',{method:'GET',timeoutMs:8000});
 return config;
}
async function subscribe(){
 var r=await register(),cfg=await getConfig();
 if(!cfg.enabled||!cfg.public_key){paint('Call Push is not enabled on the server.','unavailable');return false}
 var sub=await r.pushManager.getSubscription();
 if(!sub)sub=await r.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(cfg.public_key)});
 await core.json('/api/social/push/subscribe',{method:'POST',json:sub.toJSON(),timeoutMs:10000});
 paint('Call alerts enabled on this device.','enabled');return true;
}
async function enableFromGesture(){
 if(working)return;
 // iOS requires a Home Screen web app; never request permission from a Safari tab.
 if(isIOS()&&!standalone()){paint('On iPhone: Safari → Share → Add to Home Screen. Open ReachEmpire from its icon, then enable alerts.','install');return}
 if(!supported()){paint('Push notifications are unavailable in this browser/app.','unsupported');return}
 // Permission request is synchronous with this user click (before any await).
 var permission=Notification.permission;
 var pending=null;
 if(permission==='default')try{pending=Notification.requestPermission()}catch(e){paint('Cannot request notification permission on this device.','blocked');return}
 working=true;paint('Enabling call alerts…','pending');
 try{
   if(pending)permission=await pending;
   if(permission!=='granted'){paint('Notifications are blocked. Allow them in device/browser settings.','blocked');return}
   await subscribe();
 }catch(e){paint('Could not enable call alerts. Check connection and notification settings.','error');console.warn('ReachEmpire call push enable',e)}
 finally{working=false;var b=panel()&&panel().querySelector('[data-reb-call-alert-enable]');if(b)b.disabled=false}
}
async function setup(){
 if(!core.hasLiveSession||!core.hasLiveSession())return;
 ensurePanel();
 if(!supported()){paint('Call Push is unavailable in this browser/app.','unsupported');return}
 if(isIOS()&&!standalone()){paint('On iPhone: Add ReachEmpire to Home Screen, open its icon, then enable Call Alerts.','install');return}
 try{
   await register();var cfg=await getConfig();
   if(!cfg.enabled||!cfg.public_key){paint('Call Push is not enabled on the server.','unavailable');return}
   if(Notification.permission==='granted'){
     // Restore/register an already-authorized subscription after login or a page reload.
     try{await subscribe()}catch(e){paint('Call alerts need reconnection. Tap Enable to retry.','error')}
   }else if(Notification.permission==='denied')paint('Notifications blocked in device/browser settings.','blocked');
   else paint('Enable alerts to receive incoming calls when this page is closed.','ready');
 }catch(e){paint('Could not check call alerts. Retry when online.','error');console.warn('ReachEmpire push setup',e)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
window.addEventListener('reb:auth-changed',function(){config=null;setup()});
window.REBCallPush={enable:enableFromGesture,refresh:setup};
})();
