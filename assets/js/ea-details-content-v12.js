(function(){
  'use strict';
  var apiBase=(window.REB_API_BASE||'https://admin.reachempirebot.com').replace(/\/$/,'');
  function clean(value){return String(value||'').trim();}
  function parseImages(raw){
    var value=raw;
    if(!value)return [];
    if(typeof value==='string'){
      try{var parsed=JSON.parse(value);if(parsed)value=parsed;}catch(e){value=value.split(/\r?\n|,/);}
    }
    if(!Array.isArray(value))value=[value];
    return value.map(function(entry){return clean(typeof entry==='string'?entry:(entry&&entry.url)||(entry&&entry.image_url)||(entry&&entry.src));}).filter(Boolean);
  }
  function youtubeEmbed(url){
    var s=clean(url),match=s.match(/[?&]v=([^&]+)/)||s.match(/youtu\.be\/([^?&]+)/)||s.match(/embed\/([^?&]+)/)||s.match(/shorts\/([^?&]+)/);
    return match&&match[1]?'https://www.youtube.com/embed/'+encodeURIComponent(match[1])+'?rel=0':'';
  }
  function selectedRaw(items){
    var id=new URLSearchParams(location.search).get('id')||'';
    return items.find(function(x){return String(x.id||x.slug||x.title||'')===id;})||items.find(function(x){return encodeURIComponent(String(x.title||x.name||''))===id;})||items[0]||{};
  }
  function makePanel(id,title){var panel=document.createElement('article');panel.className='info-card ea-content-panel';panel.id=id;var h=document.createElement('h3');h.textContent=title;panel.appendChild(h);return panel;}
  function install(item){
    var overview=document.getElementById('overview');
    if(!overview||document.querySelector('.ea-content-tabs'))return false;
    overview.classList.add('ea-content-panel');
    var overviewTitle=overview.querySelector('h3');if(overviewTitle)overviewTitle.textContent='Overview';
    var nav=document.createElement('nav');nav.className='ea-content-tabs';nav.setAttribute('aria-label','EA information sections');
    [['overview','Overview'],['gallery','EA Gallery']].forEach(function(tab){var a=document.createElement('a');a.href='#'+tab[0];a.dataset.panel=tab[0];a.textContent=tab[1];if(tab[0]==='overview')a.className='active';nav.appendChild(a);});
    overview.parentNode.insertBefore(nav,overview);
    var rawGallery=item.gallery_images||item.ea_gallery||item.gallery||item.images||item.art_history||[];
    var images=parseImages(rawGallery);
    images=images.filter(function(src,index,array){return array.indexOf(src)===index;}).slice(0,10);
    var gallery=makePanel('gallery','EA Gallery');
    if(images.length){var grid=document.createElement('div');grid.className='ea-gallery-grid';images.forEach(function(src,index){var link=document.createElement('a');link.className='ea-gallery-item';link.href=src;link.target='_blank';link.rel='noopener';var img=document.createElement('img');img.src=src;img.alt=(item.title||item.name||'EA Bot')+' gallery image '+(index+1);img.loading='lazy';link.appendChild(img);grid.appendChild(link);});gallery.appendChild(grid);}else{var empty=document.createElement('div');empty.className='ea-media-empty';empty.textContent='More EA gallery images will be available soon.';gallery.appendChild(empty);}
    var youtube=clean(item.youtube_url||item.youtube||item.video_url||''),embed=youtubeEmbed(youtube);
    var videoTitle=document.createElement('h4');videoTitle.className='ea-gallery-video-title';videoTitle.textContent='YouTube Video';gallery.appendChild(videoTitle);
    if(embed){var wrap=document.createElement('div');wrap.className='ea-video-wrap';var frame=document.createElement('iframe');frame.src=embed;frame.title=(item.title||item.name||'EA Bot')+' YouTube video';frame.loading='lazy';frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';frame.allowFullscreen=true;wrap.appendChild(frame);gallery.appendChild(wrap);}else if(youtube){var out=document.createElement('a');out.className='ea-video-link';out.href=youtube;out.target='_blank';out.rel='noopener';out.textContent='Watch on YouTube';gallery.appendChild(out);}else{var noVideo=document.createElement('div');noVideo.className='ea-media-empty ea-youtube-placeholder';noVideo.innerHTML='<strong>YouTube video</strong><span>EA video will be available soon.</span>';gallery.appendChild(noVideo);}
    gallery.hidden=true;
    overview.parentNode.insertBefore(gallery,overview.nextSibling);
    function showPanel(id){overview.hidden=id!=='overview';gallery.hidden=id!=='gallery';Array.prototype.forEach.call(nav.querySelectorAll('a'),function(x){x.classList.toggle('active',x.dataset.panel===id);});}
    Array.prototype.forEach.call(nav.querySelectorAll('a'),function(a){a.addEventListener('click',function(event){event.preventDefault();showPanel(a.dataset.panel);history.replaceState(null,'','#'+a.dataset.panel);});});
    showPanel(location.hash==='#gallery'?'gallery':'overview');
    var sidebarYoutube=document.querySelector('.price-panel [data-youtube-embed]');
    if(sidebarYoutube)sidebarYoutube.remove();
    var lockedDownload=document.querySelector('.price-panel [data-download-locked]');
    if(lockedDownload){var lockedWrap=lockedDownload.closest('.detail-actions');if(lockedWrap)lockedWrap.remove();else lockedDownload.remove();}
    var adminBuy=document.querySelector('.price-panel .support-btn')||document.querySelector('.price-panel .detail-actions.two a[href="/contact/"]');
    if(adminBuy){adminBuy.className='reb-btn buy-with-admin';adminBuy.href='https://t.me/soungsokheng';adminBuy.target='_blank';adminBuy.rel='noopener';adminBuy.innerHTML='<i class="fab fa-telegram-plane"></i><span>Buy with Admin</span>';var adminWrap=adminBuy.closest('.detail-actions');if(adminWrap)adminWrap.className='detail-actions admin-buy-actions';}
    return true;
  }
  function start(){fetch(apiBase+'/api/bot-marketplace/listings?v='+Date.now(),{cache:'no-store',mode:'cors'}).then(function(r){return r.ok?r.json():[];}).then(function(data){var items=Array.isArray(data)?data:(data&&Array.isArray(data.items)?data.items:(data&&Array.isArray(data.bots)?data.bots:[]));var item=selectedRaw(items);var tries=0,timer=setInterval(function(){if(install(item)||++tries>50)clearInterval(timer);},100);}).catch(function(){var tries=0,timer=setInterval(function(){if(install({})||++tries>50)clearInterval(timer);},100);});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
