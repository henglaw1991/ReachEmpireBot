(function(){'use strict';
function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});else fn();}
ready(function(){
 var composer=document.getElementById('rebSocialComposer'), text=document.getElementById('rebSocialText');
 if(!composer||!text)return;
 function fit(){text.style.height='auto';var h=Math.max(text.value?82:58,Math.min(text.scrollHeight,220));text.style.height=h+'px';}
 function show(){composer.classList.add('reb-composer-engaged');fit();}
 function hide(){composer.classList.remove('reb-composer-engaged');fit();}
 function sync(){if(text.value.trim().length)show();else hide();fit();}
 text.addEventListener('input',sync);
 text.addEventListener('blur',function(){setTimeout(hide,80);});
 ['rebSocialImageInput','rebSocialVideoInput'].forEach(function(id){var n=document.getElementById(id);if(n)n.addEventListener('change',function(){if(n.files&&n.files.length)show();});});
 if(location.hash==='#composer'){try{history.replaceState(null,'',location.pathname+location.search);}catch(e){} window.scrollTo(0,0);}
 fit(); hide();
 var quick=document.getElementById('rebSocialCompactImage'), picker=document.getElementById('rebSocialPickImage');
 if(quick&&picker)quick.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();picker.click();});
});
})();
