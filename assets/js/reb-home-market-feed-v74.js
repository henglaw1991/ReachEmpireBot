(function(){
'use strict';

var API_BASE=(window.REB_API_BASE||'https://admin.reachempirebot.com').replace(/\/$/,'');
var ticker=document.getElementById('reb-live-ticker');
var tv=document.querySelector('.reb-live-widget');
if(!ticker)return;

var symbols=[
 {group:'Forex',label:'EUR/USD',decimals:5,ids:['FX_IDC:EURUSD','EURUSD']},
 {group:'Forex',label:'GBP/USD',decimals:5,ids:['FX_IDC:GBPUSD','GBPUSD']},
 {group:'Forex',label:'USD/JPY',decimals:3,ids:['FX_IDC:USDJPY','USDJPY']},
 {group:'Crypto',label:'BTC/USD',decimals:2,ids:['BINANCE:BTCUSDT','BTCUSD','BTCUSDT']},
 {group:'Crypto',label:'ETH/USD',decimals:2,ids:['BINANCE:ETHUSDT','ETHUSD','ETHUSDT']},
 {group:'Metal',label:'XAU/USD',decimals:2,ids:['OANDA:XAUUSD','XAUUSD','GOLD']},
 {group:'Metal',label:'XAG/USD',decimals:3,ids:['OANDA:XAGUSD','XAGUSD','SILVER']}
];

var state=symbols.map(function(s){return {group:s.group,label:s.label,decimals:s.decimals,price:null,percent:null,live:false};});

function num(v){var n=Number(v);return isFinite(n)?n:null;}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function srcObj(p){
 if(!p||typeof p!=='object')return null;
 var a=[p.item,p.latest,p.quote,p.market,p.data,p.result,p.payload];
 if(Array.isArray(p.items)&&p.items.length)a.push(p.items[0]);
 if(Array.isArray(p.results)&&p.results.length)a.push(p.results[0]);
 if(Array.isArray(p.data)&&p.data.length)a.push(p.data[0]);
 for(var i=0;i<a.length;i++)if(a[i]&&typeof a[i]==='object'&&!Array.isArray(a[i]))return a[i];
 return p;
}
function priceOf(p){
 var s=srcObj(p); if(!s)return null;
 var f=['price','current_price','market_price','last_price','latest_price','last','close','close_price','bid','ask','entry'];
 for(var i=0;i<f.length;i++){var n=num(s[f[i]]);if(n!==null)return n;}
 if(s.quote&&typeof s.quote==='object')for(var j=0;j<f.length;j++){var q=num(s.quote[f[j]]);if(q!==null)return q;}
 return null;
}
function pctOf(p){
 var s=srcObj(p); if(!s)return 0;
 var f=['change_percent','percent','percent_change','changePercent','change_pct','pct_change'];
 for(var i=0;i<f.length;i++){var n=num(s[f[i]]);if(n!==null)return n;}
 return 0;
}
function art(label){
 var c='viewBox="0 0 32 32" aria-hidden="true"';
 var m={
 'EUR/USD':'<svg '+c+'><circle cx="12" cy="16" r="10" fill="#1746a2"/><circle cx="20" cy="16" r="10" fill="#fff"/><path d="M20 6a10 10 0 0 1 0 20V6z" fill="#c8102e"/></svg>',
 'GBP/USD':'<svg '+c+'><circle cx="12" cy="16" r="10" fill="#15377b"/><path d="m5 10 14 12M19 10 5 22M12 6v20M2 16h20" stroke="#fff" stroke-width="2"/><circle cx="21" cy="16" r="9" fill="#fff"/><path d="M21 7a9 9 0 0 1 0 18V7z" fill="#c8102e"/></svg>',
 'USD/JPY':'<svg '+c+'><circle cx="11" cy="16" r="10" fill="#fff"/><path d="M11 6a10 10 0 0 0 0 20V6z" fill="#244aa5"/><path d="M11 6a10 10 0 0 1 0 20V6z" fill="#c8102e"/><circle cx="22" cy="16" r="9" fill="#fff"/><circle cx="22" cy="16" r="3.3" fill="#bc002d"/></svg>',
 'BTC/USD':'<svg '+c+'><circle cx="16" cy="16" r="15" fill="#f7931a"/><text x="16" y="21" text-anchor="middle" font-size="18" font-weight="700" fill="#fff">₿</text></svg>',
 'ETH/USD':'<svg '+c+'><circle cx="16" cy="16" r="15" fill="#5666b3"/><path d="M16 5 9.5 16 16 19.5 22.5 16 16 5z" fill="#fff"/><path d="m9.5 17.8 6.5 9 6.5-9-6.5 3.7-6.5-3.7z" fill="#cfd5ff"/></svg>',
 'XAU/USD':'<svg '+c+'><circle cx="16" cy="16" r="15" fill="#3a2905"/><path d="m7 20 3-7h12l3 7H7zM11 12l2-5h8l2 5H11z" fill="#f9b51d"/></svg>',
 'XAG/USD':'<svg '+c+'><circle cx="16" cy="16" r="15" fill="#2a2e35"/><path d="m6 21 3-7h14l3 7H6zM10 13l2-5h8l2 5H10z" fill="#bdc4ce"/></svg>'
 };
 return m[label]||'';
}
function fmt(x){
 if(num(x.price)===null)return 'Connecting…';
 try{return Number(x.price).toLocaleString('en-US',{minimumFractionDigits:x.decimals,maximumFractionDigits:x.decimals});}
 catch(e){return Number(x.price).toFixed(x.decimals);}
}
function render(items){
 var repeated=[];for(var r=0;r<4;r++)repeated=repeated.concat(items);
 ticker.innerHTML=repeated.map(function(x){
   var p=num(x.percent); if(p===null)p=0;
   var live=x.live&&num(x.price)!==null;
   return '<li class="reb-market-tick '+(p>=0?'upper':'lower')+'">'+
     '<span class="reb-market-icon reb-market-art">'+art(x.label)+'</span>'+
     '<strong>'+esc(x.group)+' '+esc(x.label)+'</strong><span class="reb-market-dot">-</span>'+
     '<em>'+esc(fmt(x))+'</em>'+
     (live?'<span class="reb-market-change">'+(p>=0?'+':'')+p.toFixed(2)+'%</span>':'<span class="reb-market-status">Live</span>')+
     '</li>';
 }).join('');
}
function anyLive(items){for(var i=0;i<items.length;i++)if(items[i]&&items[i].live&&num(items[i].price)!==null)return true;return false;}
function useCustom(items){
 if(!anyLive(items))return false;
 state=items;render(state);
 document.body.classList.add('reb-market-custom-ready');
 document.body.classList.remove('reb-market-tv-fallback');
 return true;
}
function xhr(url,cb){
 var x=new XMLHttpRequest(),done=false;
 try{
   x.open('GET',url,true);x.timeout=9000;
   try{x.setRequestHeader('Accept','application/json');}catch(e){}
   x.onreadystatechange=function(){if(done||x.readyState!==4)return;done=true;if(x.status>=200&&x.status<300){try{cb(null,JSON.parse(x.responseText||'{}'));}catch(e){cb(e);}}else cb(new Error('HTTP '+x.status));};
   x.onerror=function(){if(!done){done=true;cb(new Error('network'));}};
   x.ontimeout=function(){if(!done){done=true;cb(new Error('timeout'));}};
   x.send(null);
 }catch(e){cb(e);}
}
function aggregate(p){
 if(!p||!Array.isArray(p.items)||!p.items.length)return null;
 return symbols.map(function(c,i){
   var s=p.items[i]||{},pr=priceOf(s);
   return {group:s.group||c.group,label:s.label||c.label,decimals:num(s.decimals)!==null?Number(s.decimals):c.decimals,price:pr,percent:pctOf(s),live:pr!==null&&s.live!==false};
 });
}
function sameOrigin(next){
 xhr('/api/quotes?_rebts='+Date.now(),function(e,p){if(!e){var a=aggregate(p);if(useCustom(a))return;}next();});
}
function one(index,idIndex,cb){
 var c=symbols[index];
 if(idIndex>=c.ids.length){cb(null);return;}
 var u=API_BASE+'/api/market-trends?symbol='+encodeURIComponent(c.ids[idIndex])+'&timeframe=60&limit=1&_rebts='+Date.now();
 xhr(u,function(e,p){
   if(!e){var pr=priceOf(p);if(pr!==null){cb({group:c.group,label:c.label,decimals:c.decimals,price:pr,percent:pctOf(p),live:true});return;}}
   one(index,idIndex+1,cb);
 });
}
function direct(next){
 var left=symbols.length,out=state.slice();
 symbols.forEach(function(c,i){one(i,0,function(v){if(v)out[i]=v;left--;if(left===0){if(useCustom(out))return;next();}});});
}
function ensureTV(){
 if(!tv)return;
 if(tv.querySelector('iframe'))return;
 var host=tv.querySelector('.tradingview-widget-container');if(!host)return;
 var old=host.querySelectorAll('script[src*="embed-widget-ticker-tape"]');for(var i=0;i<old.length;i++)old[i].remove();
 var s=document.createElement('script');s.async=true;s.src='https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
 s.text=JSON.stringify({symbols:[
  {proName:'FX_IDC:EURUSD',title:'Forex EUR/USD'},{proName:'FX_IDC:GBPUSD',title:'Forex GBP/USD'},{proName:'FX_IDC:USDJPY',title:'Forex USD/JPY'},
  {proName:'BINANCE:BTCUSDT',title:'Crypto BTC/USD'},{proName:'BINANCE:ETHUSDT',title:'Crypto ETH/USD'},
  {proName:'OANDA:XAUUSD',title:'Metal XAU/USD'},{proName:'OANDA:XAGUSD',title:'Metal XAG/USD'}
 ],showSymbolLogo:true,isTransparent:false,displayMode:'adaptive',colorTheme:'dark',locale:'en'});
 host.appendChild(s);
}
function tvFallback(){
 ensureTV();
 var n=0,t=setInterval(function(){
   n++;
   if(tv&&tv.querySelector('iframe')){clearInterval(t);document.body.classList.add('reb-market-tv-fallback');document.body.classList.remove('reb-market-custom-ready');}
   else if(n>=14){clearInterval(t);render(state);}
 },500);
}
function refresh(){sameOrigin(function(){direct(tvFallback);});}

render(state);
ensureTV();
refresh();
setInterval(refresh,30000);

setInterval(function(){
 if(!window.matchMedia('(max-width:767px)').matches)return;
 if(document.body.classList.contains('reb-market-tv-fallback'))return;
 var first=ticker.querySelector('li.reb-market-tick');if(!first)return;
 var step=first.getBoundingClientRect().width||ticker.clientWidth||320;
 var max=Math.max(0,ticker.scrollWidth-ticker.clientWidth);
 var next=ticker.scrollLeft+step;if(next>max+4)next=0;
 try{ticker.scrollTo({left:next,behavior:'smooth'});}catch(e){ticker.scrollLeft=next;}
},3200);
})();