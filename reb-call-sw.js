const REB_CALL_SW_VERSION='V130';
self.addEventListener('push',function(e){
  var d={};try{d=e.data?e.data.json():{}}catch(x){}
  var k=d.call_type==='video'?'Video':'Voice';
  e.waitUntil(Promise.all([
    self.registration.showNotification(d.title||('Incoming '+k+' Call'),{
      body:d.body||((d.caller_name||'ReachEmpire member')+' is calling you'),
      tag:'reb-call-'+String(d.call_id||'incoming'),renotify:true,requireInteraction:true,silent:false,
      vibrate:[350,180,350,180,500],icon:d.icon||'/assets/images/favicon.png',badge:'/assets/images/favicon.png',
      data:{url:d.url||'/social/messages/',call_id:d.call_id||0,call_type:d.call_type||'voice'}
    }),
    clients.matchAll({type:'window',includeUncontrolled:true}).then(function(list){
      list.forEach(function(c){try{c.postMessage({type:'reb-incoming-call',call:d})}catch(_e){}})
    })
  ]))
});
self.addEventListener('notificationclick',function(e){
  e.notification.close();var u=(e.notification.data&&e.notification.data.url)||'/social/messages/';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(function(a){
    for(var i=0;i<a.length;i++){if('focus'in a[i]){try{a[i].navigate(u)}catch(_e){}return a[i].focus()}}
    if(clients.openWindow)return clients.openWindow(u)
  }))
});
