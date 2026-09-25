/* REB_MOBILE_PHASE1F_SHARED_CLIENT_CORE_20260917 */
(function (window) {
  'use strict';
  if (window.REBClientCore && window.REBClientCore.version === '20260917-phase1f') return;

  var DEFAULT_API = 'https://admin.reachempirebot.com';
  var KEYS = Object.freeze({
    token: 'REB_CLIENT_TOKEN',
    user: 'REB_CLIENT_USER',
    status: 'REB_CLIENT_LAST_STATUS',
    pending: 'REB_CLIENT_PENDING_SIGNUP',
    apiBase: 'REB_API_BASE',
    machine: 'REB_MACHINE_ID'
  });

  function safeStorage() {
    try { return window.localStorage; } catch (_e) { return null; }
  }
  function get(key) {
    var s=safeStorage();
    if(!s) return '';
    try { return s.getItem(key) || ''; } catch(_e) { return ''; }
  }
  function set(key,value) {
    var s=safeStorage();
    if(!s) return;
    try { s.setItem(key,value); } catch(_e) {}
  }
  function remove(key) {
    var s=safeStorage();
    if(!s) return;
    try { s.removeItem(key); } catch(_e) {}
  }
  function jsonGet(key,fallback) {
    try { return JSON.parse(get(key) || '') || fallback; } catch(_e) { return fallback; }
  }
  function cleanToken(value) {
    var t=String(value == null ? '' : value).trim();
    var n=t.toLowerCase();
    if(!t || n==='null' || n==='undefined' || n==='false') return '';
    return t;
  }
  function isPendingToken(value) {
    return /^pending-/i.test(cleanToken(value));
  }
  function rawToken() { return cleanToken(get(KEYS.token)); }
  function liveToken() {
    var t=rawToken();
    return t && !isPendingToken(t) ? t : '';
  }
  function pendingToken() {
    var t=rawToken();
    return isPendingToken(t) ? t : '';
  }
  function hasLiveSession() { return Boolean(liveToken()); }
  function hasPendingSession() {
    return Boolean(pendingToken() || (!rawToken() && String((jsonGet(KEYS.pending,{})||{}).status||'').toLowerCase()==='pending'));
  }
  function user() { return jsonGet(KEYS.user,{}); }
  function pendingUser() { return jsonGet(KEYS.pending,{}); }
  function lastStatus() { return jsonGet(KEYS.status,{}); }
  function displayName() {
    var d=user()||{}, p=d.profile||{};
    return String(p.name || p.username || d.name || d.username || 'Account').trim() || 'Account';
  }
  function isLocalHost() {
    return /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(String(window.location.hostname||''));
  }
  function normalizeBase(v) { return String(v||'').trim().replace(/\/+$/,''); }
  function apiBase() {
    var base='';
    if(isLocalHost()) {
      try {
        var param=new URLSearchParams(window.location.search).get('api');
        if(param && /^https?:\/\//i.test(param)) { set(KEYS.apiBase,param); base=param; }
        else base=get(KEYS.apiBase);
      } catch(_e) { base=get(KEYS.apiBase); }
    } else {
      // Production must never accept a query/localStorage API override.
      remove(KEYS.apiBase);
    }
    base=normalizeBase(base || DEFAULT_API);
    if(!/^https?:\/\//i.test(base)) base=DEFAULT_API;
    return base;
  }
  function machineId() {
    var id=String(get(KEYS.machine)||'').trim();
    if(id) return id;
    try { id='WEB-'+(window.crypto&&crypto.randomUUID?crypto.randomUUID():(Date.now()+'-'+Math.random().toString(16).slice(2))); }
    catch(_e) { id='WEB-'+Date.now()+'-'+Math.random().toString(16).slice(2); }
    set(KEYS.machine,id);
    return id;
  }
  function emit(name,detail) {
    try { window.dispatchEvent(new CustomEvent(name,{detail:detail||{}})); } catch(_e) {}
  }
  function saveSession(tokenValue,userValue,statusValue) {
    var t=cleanToken(tokenValue);
    if(!t || isPendingToken(t)) throw new Error('A live session token is required.');
    set(KEYS.token,t);
    if(userValue) set(KEYS.user,JSON.stringify(userValue));
    if(statusValue) set(KEYS.status,JSON.stringify(statusValue));
    // A successful real login/approval must not remain blocked by stale pending signup state.
    remove(KEYS.pending);
    emit('reb:auth-changed',{state:'authenticated'});
  }
  function savePendingSession(tokenValue,pendingValue,userValue,statusValue) {
    var t=cleanToken(tokenValue);
    if(!isPendingToken(t)) t='PENDING-'+(t || Date.now());
    set(KEYS.token,t);
    if(pendingValue) set(KEYS.pending,JSON.stringify(pendingValue));
    if(userValue) set(KEYS.user,JSON.stringify(userValue));
    if(statusValue) set(KEYS.status,JSON.stringify(statusValue));
    emit('reb:auth-changed',{state:'pending'});
  }
  function clearSession(options) {
    options=options||{};
    remove(KEYS.token);
    remove(KEYS.user);
    remove(KEYS.status);
    if(!options.keepPending) remove(KEYS.pending);
    emit('reb:auth-changed',{state:'logged_out'});
  }
  function authHeaders(extra,options) {
    var h={};
    Object.keys(extra||{}).forEach(function(k){h[k]=extra[k];});
    if(!h.Accept) h.Accept='application/json';
    options=options||{};
    var t=options.allowPending ? rawToken() : liveToken();
    if(t) {
      h.Authorization='Bearer '+t;
      if(!h['X-Mobile-Token']) h['X-Mobile-Token']=t;
    }
    return h;
  }
  function cacheBustUrl(url) {
    try {
      var u=new URL(url,window.location.href);
      u.searchParams.set('_rebts',String(Date.now()));
      return u.href;
    } catch(_e) {
      return url + (String(url).indexOf('?')>=0?'&':'?') + '_rebts=' + Date.now();
    }
  }
  function extractToken(data,response) {
    var header='';
    try { header=response && (response.headers.get('X-Mobile-Token') || response.headers.get('Authorization')) || ''; } catch(_e) {}
    if(header) return cleanToken(String(header).replace(/^Bearer\s+/i,''));
    var seen=[];
    function scan(value,depth) {
      if(!value || typeof value!=='object' || depth>5 || seen.indexOf(value)>=0) return '';
      seen.push(value);
      var keys=Object.keys(value), i, child, found;
      for(i=0;i<keys.length;i++) {
        child=value[keys[i]];
        if(/^(token|mobile_token|access_token|session_token|auth_token)$/i.test(keys[i]) && typeof child==='string' && child.trim()) return cleanToken(child);
      }
      for(i=0;i<keys.length;i++) { found=scan(value[keys[i]],depth+1); if(found) return found; }
      return '';
    }
    return scan(data,0);
  }
  async function request(path,options) {
    options=options||{};
    var method=String(options.method||'GET').toUpperCase();
    var absolute=/^https?:\/\//i.test(String(path||''));
    var url=absolute?String(path):apiBase()+String(path||'');
    var cacheBust=options.cacheBust;
    if(cacheBust===undefined) cacheBust=false; // no-store already guarantees fresh API reads; avoid unique URL per poll
    if(cacheBust) url=cacheBustUrl(url);

    var headers=authHeaders(options.headers||{}, {allowPending:!!options.allowPending});
    var init={method:method,headers:headers,mode:options.mode||'cors',cache:'no-store'};
    if(options.signal) init.signal=options.signal;
    if(options.body!==undefined) init.body=options.body;
    if(options.json!==undefined) {
      headers['Content-Type']=headers['Content-Type']||'application/json';
      init.body=JSON.stringify(options.json);
    }

    var controller=null, timer=null;
    if(!init.signal && options.timeoutMs && window.AbortController) {
      controller=new AbortController();init.signal=controller.signal;
      timer=setTimeout(function(){controller.abort();},Math.max(1000,Number(options.timeoutMs)||15000));
    }
    try {
      var response=await window.fetch(url,init);
      var text='';
      try { text=await response.text(); } catch(_e) {}
      var data={};
      if(text) { try { data=JSON.parse(text); } catch(_e) { data={message:text.slice(0,300)}; } }
      if(response.status===401) emit('reb:auth-invalid',{path:path,status:401});
      return {response:response,data:data,text:text,url:url};
    } finally { if(timer) clearTimeout(timer); }
  }
  async function json(path,options) {
    var result=await request(path,options);
    if(!result.response.ok || (result.data && result.data.ok===false)) {
      var e=new Error((result.data&&(result.data.message||result.data.error))||('Request failed ('+result.response.status+')'));
      e.status=result.response.status;e.data=result.data;throw e;
    }
    return result.data||{};
  }

  // Repair invalid/stale auth state once, before page-specific scripts read it.
  var initialRaw=rawToken();
  if(!initialRaw) remove(KEYS.token);
  if(initialRaw && !isPendingToken(initialRaw)) remove(KEYS.pending);

  var core={
    version:'20260917-phase1f', DEFAULT_API:DEFAULT_API, KEYS:KEYS,
    apiBase:apiBase, rawToken:rawToken, liveToken:liveToken, pendingToken:pendingToken,
    isPendingToken:isPendingToken, hasLiveSession:hasLiveSession, hasPendingSession:hasPendingSession,
    user:user, pendingUser:pendingUser, lastStatus:lastStatus, displayName:displayName,
    machineId:machineId, authHeaders:authHeaders, saveSession:saveSession,
    savePendingSession:savePendingSession, clearSession:clearSession,
    extractToken:extractToken, request:request, json:json, emit:emit
  };
  window.REBClientCore=core;
  window.REB_API_BASE=apiBase();
})(window);
