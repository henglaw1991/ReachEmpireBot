(function(){'use strict';
 function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});else fn();}
 ready(function(){
   var composer=document.getElementById('rebSocialComposer'), text=document.getElementById('rebSocialText');
   if(composer&&text){
     function fit(){text.style.height='auto';var h=Math.max(text.value?82:58,Math.min(text.scrollHeight,220));text.style.height=h+'px';}
     function engage(){composer.classList.add('reb-composer-engaged');fit();}
     text.addEventListener('focus',engage);text.addEventListener('click',engage);text.addEventListener('input',function(){engage();fit();});
     ['rebSocialImageInput','rebSocialVideoInput','rebSocialFileInput'].forEach(function(id){var n=document.getElementById(id);if(n)n.addEventListener('change',function(){if(n.files&&n.files.length)engage();});});
     if(location.hash==='#composer'){engage();setTimeout(function(){text.focus();},50);}
   }
 });
})();


/* D20F39 compact image shortcut */
(function(){
  function bindCompactImage(){
    var quick=document.getElementById('rebSocialCompactImage');
    var picker=document.getElementById('rebSocialPickImage');
    if(!quick||!picker||quick.dataset.bound==='1')return;
    quick.dataset.bound='1';
    quick.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var c=document.getElementById('rebSocialComposer');if(c)c.classList.add('reb-composer-engaged');picker.click();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindCompactImage);else bindCompactImage();
})();
