/* REB D20F Client Access Control - full website enforcement */
(function(){'use strict';
var CORE=window.REBClientCore, ACCESS=null;
var RULES={
 dashboard:['/dashboard/','/dashboard.html'], ict_signal:['/dashboard/ict-signal/'], ea_control:['/dashboard/ea-control/'],
 social:['/social/'], trading:[], downloads:['/download/','/download.html'], ea_market:['/markets/','/markets.html'], trade_account:['/create-trade-account/','/create-trade-account.html']
};
function norm(p){p=String(p||'/').split('?')[0];if(!p.endsWith('/')&&!/\.[a-z0-9]+$/i.test(p))p+='/';return p;}
function pathFeature(){var p=norm(location.pathname);if(p.indexOf('/dashboard/ict-signal/')===0)return'ict_signal';if(p.indexOf('/dashboard/ea-control/')===0)return'ea_control';if(p.indexOf('/social/')===0)return'social';if(p.indexOf('/download/')===0||p==='/download.html')return'downloads';if(p.indexOf('/markets/')===0||p==='/markets.html')return'ea_market';if(p.indexOf('/create-trade-account/')===0||p==='/create-trade-account.html')return'trade_account';if(p==='/dashboard/'||p==='/dashboard/index.html'||p==='/dashboard.html')return'dashboard';return'';}
function matchesHref(h,key){try{var p=norm(new URL(h,location.origin).pathname);return (RULES[key]||[]).some(function(x){return p.indexOf(x)===0;});}catch(e){return false;}}
function blockedPage(key){document.documentElement.style.visibility='hidden';location.replace('/?access_blocked='+encodeURIComponent(key));}
function hideLinks(key){document.querySelectorAll('a[href]').forEach(function(a){if(matchesHref(a.getAttribute('href'),key)){var li=a.closest('li');(li||a).style.display='none';}});}
function apply(){if(!ACCESS)return;Object.keys(ACCESS).forEach(function(k){if(ACCESS[k]===false)hideLinks(k);});
 // Trading Dashboard is a protected capability inside Client Dashboard, not a separate URL.
 if(ACCESS.trading===false){['webEaTrading','webStartTrading','webStopTrading','webEaCloseBuy','webEaCloseSell','webEaCloseAll'].forEach(function(id){var e=document.getElementById(id);if(e){e.disabled=true;e.style.display='none';}});document.querySelectorAll('a,button').forEach(function(e){if(/trading dashboard|start auto trading|stop auto trading|close buy|close sell|close all/i.test(e.textContent||'')){var box=e.closest('[data-trading-control],li,.reb-card,.reb-panel')||e;e.style.display='none';}});}
 var f=pathFeature();if(f&&ACCESS[f]===false)blockedPage(f);
}
async function load(){CORE=window.REBClientCore||CORE;var token='';try{token=String(localStorage.getItem('REB_CLIENT_TOKEN')||'').trim();}catch(e){}if(!token||/^pending-/i.test(token))return;try{var d;if(CORE&&CORE.json){d=await CORE.json('/api/client-access/me',{timeoutMs:9000,cacheBust:true});}else{var base='https://admin.reachempirebot.com';try{var b=localStorage.getItem('REB_API_BASE');if(/^(localhost|127\.0\.0\.1)$/i.test(location.hostname)&&/^https?:\/\//i.test(b||''))base=String(b).replace(/\/+$/,'');}catch(e){}var r=await fetch(base+'/api/client-access/me?_rebts='+Date.now(),{headers:{Accept:'application/json',Authorization:'Bearer '+token,'X-Mobile-Token':token},cache:'no-store',mode:'cors'});d=await r.json();if(!r.ok||d.ok===false)throw new Error(d.message||d.error||'Access check failed');}ACCESS=d.features||{};window.REBClientAccess=ACCESS;apply();}catch(e){/* fail open only when service is unreachable; backend still enforces protected APIs */}}
function boot(){load();window.addEventListener('reb:auth-changed',load);window.addEventListener('pageshow',function(){if(ACCESS)apply();else load();});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
