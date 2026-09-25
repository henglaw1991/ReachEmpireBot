(function(){
'use strict';

var core=window.REBClientCore||null;
var currentCommunity={};
var memberPage=1,memberPageSize=10,memberQuery='',memberStatus='active',memberLoading=false;
var adminPostPage=1,adminPostStatus='active',adminLoading=false;
var COMMUNITY_DEFAULT_AVATAR='/assets/images/resource/reb-robot.png';

function q(id){return document.getElementById(id);}
function esc(v){return String(v==null?'':v);}
function initials(name){return String(name||'R').trim().split(/\s+/).filter(Boolean).slice(0,2).map(function(x){return x[0].toUpperCase();}).join('')||'R';}
function mediaUrl(value){
  var raw=String(value||'').trim();if(!raw)return'';
  try{
    var api=core&&core.apiBase?String(core.apiBase()||''):'';
    var u=new URL(raw,raw.charAt(0)==='/'&&api?api:location.origin);
    if(api&&/^\/(?:uploads?\/social|api\/social\/)/i.test(u.pathname))return new URL(u.pathname+u.search,api).href;
    return u.href;
  }catch(_e){return'';}
}
function setAvatar(node,profile){
  node.textContent='';node.classList.remove('is-initials');
  var name=profile&&(profile.display_name||profile.username)||'Member';
  var raw=profile&&(profile.avatar||profile.avatar_url||profile.profile_photo||profile.profile_image||profile.photo_url)||'';
  var url=mediaUrl(raw);
  function fallback(){node.textContent=initials(name);node.classList.add('is-initials');}
  if(!url){fallback();return;}
  var img=document.createElement('img');
  img.alt=name;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';img.src=url;
  img.onerror=function(){img.remove();fallback();};
  node.appendChild(img);
}
function fmtDate(value){
  if(!value)return'—';
  try{
    var d=new Date(value);
    if(isNaN(d.getTime()))return esc(value);
    return d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
  }catch(_e){return esc(value);}
}
function toast(message){
  var el=q('rebSocialToast');
  if(!el){window.alert(message);return;}
  el.textContent=message;el.hidden=false;
  clearTimeout(toast._t);toast._t=setTimeout(function(){el.hidden=true;},2600);
}
async function request(path,opts){
  if(!core||!core.json)throw new Error('Social client core unavailable');
  opts=opts||{};
  if(!opts.timeoutMs)opts.timeoutMs=15000;
  return core.json(path,opts);
}
async function get(path){return request(path,{method:'GET',timeoutMs:12000});}

function renderCommunityMedia(c){
  c=c||{};
  var avatar=mediaUrl(c.avatar||'');
  var cover=mediaUrl(c.cover_photo||'');
  var avatarImg=q('rebCommunityAvatarImage');
  if(avatarImg){
    avatarImg.onerror=function(){avatarImg.onerror=null;avatarImg.src=COMMUNITY_DEFAULT_AVATAR;};
    avatarImg.src=avatar||COMMUNITY_DEFAULT_AVATAR;
  }
  var coverImg=q('rebCommunityCoverPhoto'),copy=q('rebCommunityCoverDefaultCopy'),robot=q('rebCommunityCoverDefaultRobot');
  if(coverImg){
    if(cover){
      coverImg.hidden=false;coverImg.src=cover;
      coverImg.onerror=function(){coverImg.hidden=true;coverImg.removeAttribute('src');if(copy)copy.hidden=false;if(robot)robot.hidden=false;};
      if(copy)copy.hidden=true;if(robot)robot.hidden=true;
    }else{
      coverImg.hidden=true;coverImg.removeAttribute('src');if(copy)copy.hidden=false;if(robot)robot.hidden=false;
    }
  }
  var adminAvatar=q('rebCommunityAdminAvatarPreview');
  if(adminAvatar){
    adminAvatar.textContent='';var ai=document.createElement('img');ai.alt='Community profile preview';ai.src=avatar||COMMUNITY_DEFAULT_AVATAR;ai.onerror=function(){ai.onerror=null;ai.src=COMMUNITY_DEFAULT_AVATAR;};adminAvatar.appendChild(ai);
  }
  var adminCover=q('rebCommunityAdminCoverPreview');
  if(adminCover){
    adminCover.textContent='';
    if(cover){var ci=document.createElement('img');ci.alt='Community cover preview';ci.src=cover;ci.onerror=function(){adminCover.textContent='No custom cover';};adminCover.appendChild(ci);}
    else{var s=document.createElement('span');s.textContent='No custom cover';adminCover.appendChild(s);}
  }
}
function setCommunityPhotoControls(canManage){
  ['rebCommunityChangeCoverHero','rebCommunityChangeAvatarHero'].forEach(function(id){var n=q(id);if(n)n.hidden=!canManage;});
  ['rebCommunityChangeAvatarAdmin','rebCommunityChangeCoverAdmin'].forEach(function(id){var n=q(id);if(n)n.disabled=!canManage;});
}
async function uploadCommunityImage(file,kind){
  if(!file)return;
  var max=kind==='avatar'?8*1024*1024:12*1024*1024;
  if(!/^image\/(?:png|jpeg|webp)$/i.test(String(file.type||'')))throw new Error('Please choose a PNG, JPG, or WebP image.');
  if(file.size>max)throw new Error('Image must be '+(kind==='avatar'?'8':'12')+' MB or smaller.');
  var state=q('rebCommunityPhotoUploadState');if(state)state.textContent='Uploading '+(kind==='avatar'?'profile':'cover')+' photo…';
  var init=await request('/api/social/uploads/init',{method:'POST',json:{filename:file.name,mime_type:file.type,size:file.size,media_type:'image'},timeoutMs:12000});
  var id=init.upload_id,chunk=Number(init.chunk_size||786432),off=0;
  try{
    while(off<file.size){
      var blob=file.slice(off,Math.min(file.size,off+chunk));
      var r=await core.request('/api/social/uploads/'+encodeURIComponent(id)+'/chunk?offset='+off,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:blob,timeoutMs:90000});
      if(!r.response.ok||r.data.ok===false)throw new Error(r.data.message||'Upload failed.');
      off=Number(r.data.received_size||off+blob.size);
      if(state)state.textContent='Uploading… '+Math.min(99,Math.round(off/file.size*100))+'%';
    }
    await request('/api/social/uploads/'+encodeURIComponent(id)+'/complete',{method:'POST',timeoutMs:12000});
    var d=await request('/api/social/community/'+kind+'/staged',{method:'POST',json:{upload_id:id},timeoutMs:30000});
    if(d.community)applyCommunity(d.community);
    if(state)state.textContent=kind==='avatar'?'Community profile photo updated.':'Community cover photo updated.';
    toast(d.message||(kind==='avatar'?'Community profile photo updated.':'Community cover photo updated.'));
    loadAdminHistory();
  }catch(e){
    try{await request('/api/social/uploads/'+encodeURIComponent(id),{method:'DELETE',timeoutMs:8000});}catch(_e){}
    if(state)state.textContent=e.message||'Unable to upload photo.';
    throw e;
  }
}
function chooseCommunityPhoto(kind){
  var input=q(kind==='avatar'?'rebCommunityAvatarInput':'rebCommunityCoverInput');if(input)input.click();
}

function applyCommunity(c){
  c=c||{};currentCommunity=c;
  if(q('rebCommunityName'))q('rebCommunityName').textContent=esc(c.name||'ReachEmpire Community');
  if(q('rebCommunityMemberCount'))q('rebCommunityMemberCount').textContent=Number(c.member_count||0).toLocaleString();
  if(q('rebCommunityPostCount'))q('rebCommunityPostCount').textContent=Number(c.post_count||0).toLocaleString();
  if(q('rebCommunityOnlineCount'))q('rebCommunityOnlineCount').textContent=Number(c.online_count||0).toLocaleString();
  [q('rebCommunityDescription'),q('rebCommunityAboutDescription')].forEach(function(n){
    if(n)n.textContent=esc(c.description||'A public trading community for ReachEmpire members to share ideas, strategies, media and discussions.');
  });
  var canManage=!!c.viewer_can_manage;
  var adminTab=q('rebCommunityAdminTab');if(adminTab)adminTab.hidden=!canManage;
  var statusWrap=q('rebCommunityMemberStatusWrap');if(statusWrap)statusWrap.hidden=!canManage;
  if(q('rebCommunityAdminMembers'))q('rebCommunityAdminMembers').textContent=Number(c.member_count||0).toLocaleString();
  if(q('rebCommunityAdminAdmins'))q('rebCommunityAdminAdmins').textContent=Number(c.admin_count||0).toLocaleString();
  if(q('rebCommunityAdminPosts'))q('rebCommunityAdminPosts').textContent=Number(c.post_count||0).toLocaleString();
  if(q('rebCommunityAdminBanned'))q('rebCommunityAdminBanned').textContent=Number(c.banned_member_count||0).toLocaleString();
  if(q('rebCommunityAdminRemoved'))q('rebCommunityAdminRemoved').textContent=Number(c.removed_post_count||0).toLocaleString();
  if(q('rebCommunityAdminName')&&!q('rebCommunityAdminName').matches(':focus'))q('rebCommunityAdminName').value=esc(c.name||'ReachEmpire Community');
  if(q('rebCommunityAdminDescription')&&!q('rebCommunityAdminDescription').matches(':focus'))q('rebCommunityAdminDescription').value=esc(c.description||'');
  renderCommunityMedia(c);setCommunityPhotoControls(canManage);
}

function previewMembers(users){
  var box=q('rebCommunityMemberPreview');if(!box)return;
  box.textContent='';
  (users||[]).slice(0,7).forEach(function(p){
    var a=document.createElement('a');a.className='reb-community-preview-avatar';
    a.href='/social/profile/?user='+encodeURIComponent(p.username||'');
    a.title=p.display_name||p.username||'Member';
    setAvatar(a,p);box.appendChild(a);
  });
  if(!box.children.length){var s=document.createElement('span');s.textContent='No members yet.';box.appendChild(s);}
}

function roleLabel(role){
  role=String(role||'member').toLowerCase();
  return role==='owner'?'Owner':role==='admin'?'Admin':'Member';
}
function button(text,cls,fn){
  var b=document.createElement('button');b.type='button';b.className=cls||'';b.textContent=text;
  if(fn)b.addEventListener('click',fn);return b;
}
function memberActionButton(text,kind,fn){
  return button(text,'reb-community-member-action '+(kind||''),fn);
}
function closeMemberMenus(){document.querySelectorAll('.reb-community-member-menu.is-open').forEach(function(m){m.classList.remove('is-open');});}
function memberMenuButton(label,icon,kind,fn){
  var b=document.createElement('button');b.type='button';b.className='reb-community-member-menu-item '+(kind||'');
  b.innerHTML=(icon?'<i class="'+icon+'"></i> ':'')+'<span>'+label+'</span>';
  b.addEventListener('click',function(ev){ev.stopPropagation();closeMemberMenus();fn();});return b;
}
function memberManageMenu(p,viewerRole,targetRole,status){
  var wrap=document.createElement('div');wrap.className='reb-community-member-menu-wrap';
  var trigger=button('Manage','reb-community-member-manage');trigger.innerHTML='<i class="fas fa-ellipsis-h"></i><span>Manage</span>';
  var menu=document.createElement('div');menu.className='reb-community-member-menu';
  var view=document.createElement('a');view.className='reb-community-member-menu-item';view.href='/social/profile/?user='+encodeURIComponent(p.username||'');view.innerHTML='<i class="far fa-user"></i><span>View profile</span>';menu.appendChild(view);
  if(status==='banned'){
    menu.appendChild(memberMenuButton('Unban member','fas fa-user-check','is-success',function(){updateMemberStatus(p.user_id,'unban');}));
  }else if(status==='removed'){
    menu.appendChild(memberMenuButton('Restore member','fas fa-undo','is-success',function(){updateMemberStatus(p.user_id,'restore');}));
    menu.appendChild(memberMenuButton('Ban member','fas fa-ban','is-danger',function(){updateMemberStatus(p.user_id,'ban');}));
  }else{
    if(viewerRole==='owner'){
      if(targetRole==='admin')menu.appendChild(memberMenuButton('Remove Admin','fas fa-user-minus','',function(){updateMemberRole(p.user_id,'member');}));
      else menu.appendChild(memberMenuButton('Make Admin','fas fa-user-shield','',function(){updateMemberRole(p.user_id,'admin');}));
    }
    if(targetRole!=='admin'||viewerRole==='owner'){
      menu.appendChild(memberMenuButton('Remove member','fas fa-user-times','is-danger',function(){updateMemberStatus(p.user_id,'remove');}));
      menu.appendChild(memberMenuButton('Ban member','fas fa-ban','is-danger',function(){updateMemberStatus(p.user_id,'ban');}));
    }
  }
  trigger.addEventListener('click',function(ev){ev.stopPropagation();var open=menu.classList.contains('is-open');closeMemberMenus();if(!open)menu.classList.add('is-open');});
  wrap.append(trigger,menu);return wrap;
}
async function updateMemberRole(userId,role){
  if(!window.confirm(role==='admin'?'Make this member a Community Admin?':'Remove Community Admin role from this member?'))return;
  try{
    var d=await request('/api/social/community/members/'+encodeURIComponent(userId)+'/role',{method:'POST',json:{role:role}});
    toast(d.message||'Member role updated.');await loadMembers();await loadOverview();loadAdminHistory();
  }catch(e){toast(e.message||'Unable to update member role.');}
}
async function updateMemberStatus(userId,action){
  var msg='Update this Community member?';var payload={action:action};
  if(action==='remove')msg='Remove this member from the Community? They will lose Community posting/chat access until restored.';
  else if(action==='restore')msg='Restore this member to the Community?';
  else if(action==='ban'){msg='Ban this member from the Community? They will lose Community posting/chat access until unbanned.';var reason=window.prompt('Optional ban reason:','');if(reason===null)return;payload.reason=String(reason||'').trim();}
  else if(action==='unban')msg='Unban and restore this member to the Community?';
  if(!window.confirm(msg))return;
  try{
    var d=await request('/api/social/community/members/'+encodeURIComponent(userId)+'/status',{method:'POST',json:payload});
    toast(d.message||'Member updated.');await loadMembers();await loadOverview();loadAdminHistory();
  }catch(e){toast(e.message||'Unable to update member.');}
}

function memberRow(p){
  var row=document.createElement('div');row.className='reb-community-member-list-row';row.setAttribute('role','row');
  if(String(p.community_member_status||'active')==='removed')row.classList.add('is-removed');

  var member=document.createElement('div');member.className='reb-community-member-main';member.setAttribute('role','cell');
  var av=document.createElement('a');av.className='reb-community-member-avatar';av.href='/social/profile/?user='+encodeURIComponent(p.username||'');setAvatar(av,p);
  var copy=document.createElement('div');copy.className='reb-community-member-copy';
  var name=document.createElement('a');name.className='reb-community-member-name';name.href=av.href;name.textContent=p.display_name||p.username||'Member';
  var user=document.createElement('span');user.textContent='@'+String(p.username||'member');
  copy.append(name,user);member.append(av,copy);

  var opened=document.createElement('div');opened.className='reb-community-member-date';opened.setAttribute('role','cell');opened.innerHTML='<span class="reb-community-mobile-label">Account opened</span><strong>'+(p.account_opened_at?fmtDate(p.account_opened_at):'Not recorded')+'</strong>';
  var joined=document.createElement('div');joined.className='reb-community-member-date';joined.setAttribute('role','cell');joined.innerHTML='<span class="reb-community-mobile-label">Joined Community</span><strong>'+fmtDate(p.community_joined_at)+'</strong>';

  var role=document.createElement('div');role.className='reb-community-member-role-cell';role.setAttribute('role','cell');
  var badge=document.createElement('span');badge.className='reb-community-role-badge is-'+String(p.community_role||'member').toLowerCase();badge.textContent=roleLabel(p.community_role);
  if(String(p.community_member_status||'active')==='removed'){badge.className='reb-community-role-badge is-removed';badge.textContent='Removed';}
  role.appendChild(badge);

  var actions=document.createElement('div');actions.className='reb-community-member-actions';actions.setAttribute('role','cell');
  var canManage=!!(p.viewer_can_manage_member||currentCommunity.viewer_can_manage);
  var viewerRole=String(p.viewer_community_role||currentCommunity.viewer_role||'member').toLowerCase();
  var targetRole=String(p.community_role||'member').toLowerCase();
  var status=String(p.community_member_status||'active').toLowerCase();
  if(status==='banned'){badge.className='reb-community-role-badge is-banned';badge.textContent='Banned';}
  if(canManage){
    if(targetRole==='owner'){
      var viewOwner=document.createElement('a');viewOwner.className='reb-community-member-view';viewOwner.href=av.href;viewOwner.textContent='View profile';actions.appendChild(viewOwner);
      var protectedLabel=document.createElement('span');protectedLabel.className='reb-community-protected-label';protectedLabel.textContent='Owner protected';actions.appendChild(protectedLabel);
    }else actions.appendChild(memberManageMenu(p,viewerRole,targetRole,status));
  }else{
    var view=document.createElement('a');view.className='reb-community-member-view';view.href=av.href;view.textContent='View profile';actions.appendChild(view);
  }
  row.append(member,opened,joined,role,actions);
  return row;
}

function pageItems(current,total){
  if(total<=7){var a=[];for(var i=1;i<=total;i++)a.push(i);return a;}
  var out=[1],start=Math.max(2,current-1),end=Math.min(total-1,current+1);
  if(current<=4){start=2;end=5;}
  if(current>=total-3){start=total-4;end=total-1;}
  if(start>2)out.push('…');
  for(var n=start;n<=end;n++)out.push(n);
  if(end<total-1)out.push('…');
  out.push(total);return out;
}
function renderPagination(node,current,total,onPage){
  if(!node)return;node.textContent='';
  if(total<=1)return;
  var prev=button('Previous','reb-community-page-btn',function(){if(current>1)onPage(current-1);});prev.disabled=current<=1;node.appendChild(prev);
  pageItems(current,total).forEach(function(item){
    if(item==='…'){var dots=document.createElement('span');dots.className='reb-community-page-dots';dots.textContent='…';node.appendChild(dots);return;}
    var b=button(String(item),'reb-community-page-btn'+(Number(item)===Number(current)?' active':''),function(){onPage(Number(item));});
    node.appendChild(b);
  });
  var next=button('Next','reb-community-page-btn',function(){if(current<total)onPage(current+1);});next.disabled=current>=total;node.appendChild(next);
}

async function loadMembers(){
  if(memberLoading)return;memberLoading=true;
  var list=q('rebCommunityMembersList'),state=q('rebCommunityMembersState'),summary=q('rebCommunityMembersSummary');
  if(list)list.textContent='';if(state){state.hidden=false;state.textContent='Loading members…';}
  try{
    var path='/api/social/community/members?page='+memberPage+'&limit='+memberPageSize+'&status='+encodeURIComponent(memberStatus)+(memberQuery?'&q='+encodeURIComponent(memberQuery):'');
    var d=await get(path),users=Array.isArray(d.users)?d.users:[];
    if(d.community)applyCommunity(d.community);
    memberPage=Number(d.page||1);
    if(list)users.forEach(function(p){list.appendChild(memberRow(p));});
    if(state){state.hidden=users.length>0;state.textContent=memberQuery?'No members match your search.':'No community members yet.';}
    var first=d.total?((memberPage-1)*Number(d.page_size||memberPageSize)+1):0;
    var last=d.total?Math.min(Number(d.total),first+users.length-1):0;
    if(summary)summary.textContent=(d.total?('Showing '+first+'–'+last+' of '+Number(d.total).toLocaleString()+' members'):'No members')+(memberQuery?' matching “'+memberQuery+'”':'');
    renderPagination(q('rebCommunityMembersPagination'),Number(d.page||1),Number(d.total_pages||1),function(page){memberPage=page;loadMembers();});
  }catch(e){
    if(state){state.hidden=false;state.textContent=e.message||'Unable to load members.';}
  }finally{memberLoading=false;}
}

function showTab(name){
  document.querySelectorAll('[data-community-tab]').forEach(function(b){
    if(b.tagName==='BUTTON')b.classList.toggle('active',b.dataset.communityTab===name);
  });
  ['posts','members','about','admin'].forEach(function(x){
    var n=q('rebCommunity'+x.charAt(0).toUpperCase()+x.slice(1)+'View');if(n)n.hidden=x!==name;
  });
  if(name==='members')loadMembers();
  if(name==='admin'&&currentCommunity.viewer_can_manage)loadAdmin();
  var hero=document.querySelector('.reb-community-hero');if(hero)window.scrollTo({top:hero.offsetTop,behavior:'smooth'});
}

async function loadOverview(){
  try{
    var d=await get('/api/social/community/overview');applyCommunity(d.community||{});
    var m=await get('/api/social/community/members?limit=7&offset=0&status=active');previewMembers(m.users||[]);
  }catch(_e){}
}

async function saveAdminSettings(){
  var btn=q('rebCommunityAdminSaveSettings'),state=q('rebCommunityAdminSettingsState');
  if(btn)btn.disabled=true;if(state)state.textContent='Saving…';
  try{
    var d=await request('/api/social/community/settings',{method:'PATCH',json:{name:q('rebCommunityAdminName').value.trim(),description:q('rebCommunityAdminDescription').value.trim()}});
    if(d.community)applyCommunity(d.community);if(state)state.textContent='Saved.';toast(d.message||'Community settings saved.');loadAdminHistory();
  }catch(e){if(state)state.textContent=e.message||'Unable to save.';toast(e.message||'Unable to save Community settings.');}
  finally{if(btn)btn.disabled=false;}
}

function adminPostItem(p){
  var row=document.createElement('div');row.className='reb-community-admin-post';
  var main=document.createElement('div');main.className='reb-community-admin-post-main';
  var author=p.author||{};var title=document.createElement('strong');title.textContent=author.display_name||author.username||'Member';
  var meta=document.createElement('span');meta.textContent=fmtDate(p.created_at)+' · '+String(p.post_type||'post')+' · '+Number(p.reaction_count||0)+' reactions · '+Number(p.comment_count||0)+' comments · '+Number(p.share_count||0)+' shares';
  var content=document.createElement('p');content.textContent=String(p.content||'').trim()||'(Media post)';
  main.append(title,meta,content);
  var action=document.createElement('div');action.className='reb-community-admin-post-action';
  var removed=String(p.status||'active')==='community_removed';
  action.appendChild(memberActionButton(removed?'Restore':'Remove',removed?'is-success':'is-danger',async function(){
    var verb=removed?'restore':'remove';
    if(!window.confirm((removed?'Restore':'Remove')+' this Community post?'))return;
    try{
      var d=await request('/api/social/community/admin/posts/'+encodeURIComponent(p.post_id)+'/status',{method:'POST',json:{action:verb}});
      toast(d.message||'Post updated.');await loadAdminPosts();await loadOverview();loadAdminHistory();
      if(window.REBSocialReloadFeed)window.REBSocialReloadFeed();
    }catch(e){toast(e.message||'Unable to update post.');}
  }));
  row.append(main,action);return row;
}
async function loadAdminPosts(){
  var state=q('rebCommunityAdminPostsState'),list=q('rebCommunityAdminPostsList');
  if(state){state.hidden=false;state.textContent='Loading posts…';}if(list)list.textContent='';
  try{
    var d=await request('/api/social/community/admin/posts?status='+encodeURIComponent(adminPostStatus)+'&page='+adminPostPage+'&limit=10',{method:'GET'});
    var posts=Array.isArray(d.posts)?d.posts:[];adminPostPage=Number(d.page||1);
    if(list)posts.forEach(function(p){list.appendChild(adminPostItem(p));});
    if(state){state.hidden=posts.length>0;state.textContent=posts.length?'':'No posts in this section.';}
    renderPagination(q('rebCommunityAdminPostsPagination'),Number(d.page||1),Number(d.total_pages||1),function(page){adminPostPage=page;loadAdminPosts();});
  }catch(e){if(state){state.hidden=false;state.textContent=e.message||'Unable to load posts.';}}
}
function historyText(item){
  var actor=item.actor&&(item.actor.display_name||item.actor.username)||'Admin';
  var target=item.target&&(item.target.display_name||item.target.username)||'';
  var action=String(item.action_type||'action');
  var map={member_removed:'removed member',member_restored:'restored member',member_role_updated:'changed member role',member_banned:'banned member',member_unbanned:'unbanned member',post_removed:'removed a post',post_restored:'restored a post',community_settings_updated:'updated Community settings',community_avatar_updated:'updated Community profile photo',community_cover_updated:'updated Community cover photo'};
  return actor+' '+(map[action]||action.replace(/_/g,' '))+(target?' · '+target:'');
}
async function loadAdminHistory(){
  var state=q('rebCommunityAdminHistoryState'),box=q('rebCommunityAdminHistory');if(!box)return;
  box.textContent='';
  try{
    var d=await request('/api/social/community/admin/history?limit=20',{method:'GET'}),items=Array.isArray(d.actions)?d.actions:[];
    if(state){state.hidden=items.length>0;state.textContent=items.length?'':'No admin activity yet.';}
    items.forEach(function(item){
      var row=document.createElement('div');row.className='reb-community-admin-history-row';
      var copy=document.createElement('div');var strong=document.createElement('strong');strong.textContent=historyText(item);
      var small=document.createElement('span');small.textContent=fmtDate(item.created_at)+(item.details?' · '+item.details:'');
      copy.append(strong,small);row.appendChild(copy);box.appendChild(row);
    });
  }catch(e){if(state){state.hidden=false;state.textContent=e.message||'Unable to load admin history.';}}
}
async function loadAdmin(){
  if(adminLoading)return;adminLoading=true;
  try{await loadOverview();if(!currentCommunity.viewer_can_manage)return;await Promise.all([loadAdminPosts(),loadAdminHistory()]);}
  finally{adminLoading=false;}
}

function wire(){
  document.addEventListener('click',closeMemberMenus);
  document.querySelectorAll('button[data-community-tab]').forEach(function(b){b.addEventListener('click',function(){showTab(b.dataset.communityTab);});});
  var search=q('rebCommunityMemberSearch'),timer=null;
  if(search)search.addEventListener('input',function(){clearTimeout(timer);timer=setTimeout(function(){memberQuery=search.value.trim();memberPage=1;loadMembers();},250);});
  var size=q('rebCommunityMemberPageSize');if(size)size.addEventListener('change',function(){memberPageSize=Number(size.value||10);memberPage=1;loadMembers();});
  var status=q('rebCommunityMemberStatus');if(status)status.addEventListener('change',function(){memberStatus=status.value||'active';memberPage=1;loadMembers();});
  var manage=q('rebCommunityManageMembers');if(manage)manage.addEventListener('click',function(){showTab('members');});
  var save=q('rebCommunityAdminSaveSettings');if(save)save.addEventListener('click',saveAdminSettings);
  var postStatus=q('rebCommunityAdminPostStatus');if(postStatus)postStatus.addEventListener('change',function(){adminPostStatus=postStatus.value||'active';adminPostPage=1;loadAdminPosts();});
  var refreshHistory=q('rebCommunityAdminRefreshHistory');if(refreshHistory)refreshHistory.addEventListener('click',loadAdminHistory);
  var changeAvatarHero=q('rebCommunityChangeAvatarHero');if(changeAvatarHero)changeAvatarHero.addEventListener('click',function(){chooseCommunityPhoto('avatar');});
  var changeCoverHero=q('rebCommunityChangeCoverHero');if(changeCoverHero)changeCoverHero.addEventListener('click',function(){chooseCommunityPhoto('cover');});
  var changeAvatarAdmin=q('rebCommunityChangeAvatarAdmin');if(changeAvatarAdmin)changeAvatarAdmin.addEventListener('click',function(){chooseCommunityPhoto('avatar');});
  var changeCoverAdmin=q('rebCommunityChangeCoverAdmin');if(changeCoverAdmin)changeCoverAdmin.addEventListener('click',function(){chooseCommunityPhoto('cover');});
  var avatarInput=q('rebCommunityAvatarInput');if(avatarInput)avatarInput.addEventListener('change',async function(){var f=avatarInput.files&&avatarInput.files[0];avatarInput.value='';if(!f)return;try{await uploadCommunityImage(f,'avatar');}catch(e){toast(e.message||'Unable to update Community profile photo.');}});
  var coverInput=q('rebCommunityCoverInput');if(coverInput)coverInput.addEventListener('change',async function(){var f=coverInput.files&&coverInput.files[0];coverInput.value='';if(!f)return;try{await uploadCommunityImage(f,'cover');}catch(e){toast(e.message||'Unable to update Community cover photo.');}});
  loadOverview();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
