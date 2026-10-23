/* ReachEmpire Social identity v127: scoped cached presentation; no auth or DB changes. */
(function(w){'use strict';
  var PREFIX='REB_SOCIAL_IDENTITY_V127_';
  function val(x){return String(x==null?'':x).trim();}
  function coreUser(){var c=w.REBClientCore;try{return c&&c.user?c.user()||{}:{}}catch(_e){return {};}}
  function handle(){var u=coreUser();return val(u.username||(u.profile&&u.profile.username)).toLowerCase();}
  function usable(x,h){var s=val(x);return s&&s.toLowerCase()!==h&&!/^(reach.?empire member|guest|account)$/i.test(s)?s:'';}
  function names(p,h){p=p||{};var both=[val(p.first_name),val(p.last_name)].filter(Boolean).join(' ');
    return usable(p.display_name,h)||usable(p.full_name,h)||usable(both,h)||usable(p.name,h)||'';
  }
  function photo(p){p=p||{};return val(p.avatar||p.avatar_url||p.profile_photo||p.profile_photo_url||p.profile_image||p.profile_image_url||p.photo||p.photo_url);}
  function cached(){var h=handle();if(!h)return null;try{var c=JSON.parse(localStorage.getItem(PREFIX+h)||'null');
    if(!c||c.username!==h||!usable(c.name,h)||Date.now()-Number(c.saved||0)>30*86400000)return null;return c;
  }catch(_e){return null;}}
  function resolve(profile){var u=coreUser(),h=handle(),up=u.profile||{},p=profile||{};
    var name=names(p,h)||names(up,h)||names(u,h),avatar=photo(p)||photo(up)||photo(u);
    var cache=cached();if(!name&&cache)name=cache.name;if(!avatar&&cache)avatar=cache.avatar||'';
    return {name:name||'',avatar:avatar||'',username:h,ready:!!name};
  }
  function remember(p){if(!p||typeof p!=='object')return;var h=handle();if(!h)return;
    if(val(p.username)&&val(p.username).toLowerCase()!==h)return;
    var n=names(p,h);if(!n)return;
    var c=cached()||{};
    var obj={username:h,name:n,avatar:photo(p)||c.avatar||'',saved:Date.now()};
    try{localStorage.setItem(PREFIX+h,JSON.stringify(obj));}catch(_e){}
  }
  w.REBSocialIdentity={resolve:resolve,remember:remember};
})(window);
