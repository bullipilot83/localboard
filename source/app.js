 'use strict';
let language = LocalboardI18n.detect(navigator.languages || [navigator.language]);
const t = (key, params) => LocalboardI18n.translate(language, key, params);
const uiError = key => Object.assign(new Error(t(key)), {translationKey:key});
const errorText = error => error?.translationKey ? t(error.translationKey) : t('operationFailed');
function parseDashboard(text) {
 let value;try { value=JSON.parse(text); } catch { throw uiError('invalidJson'); }
 return validate(value);
}
let noticeState=null, lastSaved=null;
let themeDraft=null,themePalette='dark';
const themeMedia=window.matchMedia?.('(prefers-color-scheme: dark)');
function renderStatus(){
 $('#storage').textContent=dirty?t('memoryOnly'):lastSaved?t('saved',{time:lastSaved.toLocaleTimeString(language,{hour:'2-digit',minute:'2-digit'})}):t('localStorage');
 if(noticeState){$('#notice').hidden=false;$('#notice').textContent=t(noticeState.key,noticeState.params);}
}
function applyLanguage(){
 document.documentElement.lang=language;document.title=t('pageTitle');
 document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
 document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>el.setAttribute('placeholder',t(el.dataset.i18nPlaceholder)));
 document.querySelectorAll('[data-i18n-label]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.i18nLabel)));
 $('#language').value=language;
 $('#themeMode').innerHTML=themeOptions(data.appearance.mode);$('#themeMode').value=data.appearance.mode;
 renderStatus();
}

const $=s=>document.querySelector(s), uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,9);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const blank=()=>({version:1,language,appearance:LocalboardAppearance.defaults(),logo:'',showEmptyGroups:true,id:uid(),revision:uid(),title:'',titleMode:'auto',active:'all',views:{},collapsedGroups:[],groups:[{id:'site-a',name:t('siteA'),parent:null,background:'',ratio:16/9},{id:'zone-b',name:t('zoneB'),parent:'site-a',background:'',ratio:16/9},{id:'zone-c',name:t('zoneC'),parent:'site-a',background:'',ratio:16/9},{id:'systems',name:t('systems'),parent:null,background:'',ratio:16/9}],links:[]});
function url(s){
 try {if(typeof s!=='string')throw Error();s=s.trim();if(!/^[a-z][a-z0-9+.-]*:\/\//i.test(s))s='http://'+s;
 const u=new URL(s);if(!['http:','https:'].includes(u.protocol)||!u.hostname||u.username||u.password)throw Error();return u.href;
 }catch{throw uiError('urlError');}
}
function validate(d){if(!d||d.version!==1||typeof d.id!=='string'||typeof d.revision!=='string'||!Array.isArray(d.groups)||!Array.isArray(d.links)||d.groups.length>1000||d.links.length>10000)throw uiError('invalidFile');
 if(d.logo!=null&&d.logo!==''&&(typeof d.logo!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(d.logo)))throw uiError('invalidIcon');
 d.logo=d.logo||'';d.showEmptyGroups=d.showEmptyGroups!==false;
 const ids=new Set();for(const g of d.groups){if(!g||typeof g.id!=='string'||ids.has(g.id)||g.id==='all'||typeof g.name!=='string'||g.name.length>160)throw uiError('invalidGroup');ids.add(g.id);if(g.background&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(g.background))throw uiError('invalidMap');if(!Number.isFinite(g.ratio)||g.ratio<.1||g.ratio>10)g.ratio=16/9;}
 for(const g of d.groups){let p=g;const seen=new Set([g.id]);while(p.parent){if(!ids.has(p.parent)||seen.has(p.parent))throw uiError('invalidHierarchy');seen.add(p.parent);p=d.groups.find(x=>x.id===p.parent);}}
 const lids=new Set();for(const l of d.links){if(!l||typeof l.id!=='string'||lids.has(l.id)||typeof l.name!=='string'||!l.name.trim()||l.name.length>160||!ids.has(l.group))throw uiError('invalidLink');lids.add(l.id);l.url=url(l.url);if(l.icon&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(l.icon))throw uiError('invalidIcon');l.x=Number.isFinite(l.x)?Math.max(0,Math.min(100,l.x)):50;l.y=Number.isFinite(l.y)?Math.max(0,Math.min(100,l.y)):50;l.favicon=l.favicon===true;}
 d.title=typeof d.title==='string'?d.title.slice(0,160):'';
 // Legacy versions stored the translated default as plain text. Migrate only
 // known defaults when no explicit title mode exists; preserve custom titles.
 if(!['auto','custom'].includes(d.titleMode)){
  const wasDefault=!d.title.trim()||Object.values(LocalboardI18n.catalogs).some(c=>c.defaultTitle===d.title);
  d.titleMode=wasDefault?'auto':'custom';
 }
 if(d.titleMode==='auto'||!d.title.trim()){d.titleMode='auto';d.title='';}
 d.active=ids.has(d.active)?d.active:'all';const views={};if(d.views&&typeof d.views==='object')for(const k of ['all',...ids])if(['grid','list','map'].includes(d.views[k]))Object.defineProperty(views,k,{value:d.views[k],enumerable:true,writable:true,configurable:true});d.views=views;d.appearance=LocalboardAppearance.normalize(d.appearance);d.collapsedGroups=Array.isArray(d.collapsedGroups)?[...new Set(d.collapsedGroups.filter(id=>typeof id==='string'&&ids.has(id)&&d.groups.some(g=>g.parent===id)))]:[];d.language=LocalboardI18n.supported(d.language)?d.language:language;return d;}
let seed=JSON.parse($('#seed').textContent);
if(LocalboardI18n.supported(seed?.language))language=seed.language;
let data=seed?validate(seed):blank(), editing=false, baseRevision=data.revision, dirty=false, startupWarning='';
const KEY=seed?'localboard.v1.'+seed.id:'localboard.v1.default';
try{const cached=localStorage.getItem(KEY);if(cached){const c=parseDashboard(cached);language=c.language;if(seed&&c.baseRevision!==seed.revision){if(confirm(t('seedConflict'))){data=c;baseRevision=c.baseRevision||seed.revision;}}else{data=c;baseRevision=c.baseRevision||data.revision;}}}catch(e){startupWarning='storageReadError';}
language=data.language;
const path=id=>{const a=[];let g=data.groups.find(x=>x.id===id);while(g){a.unshift(g.name);g=data.groups.find(x=>x.id===g.parent);}return a.join(' / ');};
function descendants(id){const out=[id];for(let i=0;i<out.length;i++)for(const g of data.groups)if(g.parent===out[i])out.push(g.id);return out;}
function message(key,params={}){noticeState={key,params};renderStatus();}
function persist(){data.revision=uid();data.baseRevision=baseRevision;try{const current=localStorage.getItem(KEY);if(current&&lastStored&&current!==lastStored){dirty=true;message('writeConflict');return false;}const serialized=JSON.stringify(data);localStorage.setItem(KEY,serialized);lastStored=serialized;dirty=false;lastSaved=new Date();renderStatus();return true;}catch(e){dirty=true;message('storageWriteError');return false;}}
let lastStored;try{lastStored=localStorage.getItem(KEY);}catch{};
function groupOptions(selected,exclude=[]){return data.groups.filter(g=>!exclude.includes(g.id)).map(g=>`<option value="${esc(g.id)}" ${g.id===selected?'selected':''}>${esc(path(g.id))}</option>`).join('');}
function navigate(id){data.active=id;revealAncestors(id);$('#search').value='';persist();render();}
// Folding is a view preference, available without enabling edit mode.
function revealAncestors(id){
 const ancestors=new Set();let group=data.groups.find(g=>g.id===id);
 while(group?.parent){ancestors.add(group.parent);group=data.groups.find(g=>g.id===group.parent);}
 data.collapsedGroups=data.collapsedGroups.filter(id=>!ancestors.has(id));
}
function toggleGroup(id){
 if(!data.groups.some(g=>g.id===id)||!data.groups.some(g=>g.parent===id))return;
 data.collapsedGroups=data.collapsedGroups.includes(id)?data.collapsedGroups.filter(x=>x!==id):[...data.collapsedGroups,id];
 persist();render();
 [...$('#tree').querySelectorAll('[data-fold]')].find(b=>b.dataset.fold===id)?.focus();
}
function foldAll(collapse){
 data.collapsedGroups=collapse?data.groups.filter(g=>data.groups.some(child=>child.parent===g.id)).map(g=>g.id):[];
 persist();render();
}
$('#collapseAll').onclick=()=>foldAll(true);
$('#expandAll').onclick=()=>foldAll(false);
function orderedGroups(parent=null){return data.groups.filter(g=>g.parent===parent).flatMap(g=>[g,...orderedGroups(g.id)]);}
function moveGroup(id,direction){
 if(!editing||![1,-1].includes(direction))return;
 const g=data.groups.find(x=>x.id===id);if(!g)return;
 const siblings=data.groups.filter(x=>x.parent===g.parent),index=siblings.indexOf(g),other=siblings[index+direction];if(!other)return;
 const a=data.groups.indexOf(g),b=data.groups.indexOf(other);
 [data.groups[a],data.groups[b]]=[data.groups[b],data.groups[a]];
 persist();render();
 const button=[...$('#tree').querySelectorAll('[data-move]')].find(b=>b.dataset.id===id&&Number(b.dataset.move)===direction);
 if(button&&!button.disabled)button.focus();
 else [...$('#tree').querySelectorAll('[data-group]')].find(b=>b.dataset.group===id)?.focus();
}
function render(){applyLanguage();applyAppearance();renderBrand();document.body.classList.toggle('editing',editing);$('#lock').textContent=editing?t('finishEditing'):t('editButton');const active=data.groups.find(g=>g.id===data.active);$('#title').textContent=active?active.name:dashboardTitle();$('#editTitle').hidden=Boolean(active);$('#crumb').textContent=active?path(active.id):t('overview');$('#groupEdit').disabled=!active;$('#background').disabled=!active;
 let tree='<button data-group="all" class="'+(!active?'active':'')+'">▦ '+esc(t('overview'))+' <small>'+data.links.length+'</small></button>';
 function branch(parent,depth){
  const siblings=data.groups.filter(g=>g.parent===parent);
  for(const [index,g] of siblings.entries()){
   const children=data.groups.some(child=>child.parent===g.id),folded=data.collapsedGroups.includes(g.id);
   const foldLabel=t(folded?'expandGroup':'collapseGroup',{name:g.name});
   const activeInside=folded&&data.active!==g.id&&descendants(g.id).includes(data.active);
   tree+=`<div class="group-row" style="--depth:${depth}">
    ${children?`<button class="group-fold" type="button" data-fold="${esc(g.id)}" aria-expanded="${!folded}" aria-label="${esc(foldLabel)}" title="${esc(foldLabel)}">${folded?'▸':'▾'}</button>`:'<span class="group-fold-spacer" aria-hidden="true"></span>'}
    <button data-group="${esc(g.id)}" class="group-select ${data.active===g.id?'active':''} ${activeInside?'contains-active':''}" ${data.active===g.id?'aria-current="page"':''}><span>${esc(g.name)}</span><small>${data.links.filter(l=>descendants(g.id).includes(l.group)).length}</small></button>
    <div class="group-order edit-only"><button data-id="${esc(g.id)}" data-move="-1" title="${esc(t('moveUp',{name:g.name}))}" aria-label="${esc(t('moveUp',{name:g.name}))}" ${index===0?'disabled':''}>↑</button><button data-id="${esc(g.id)}" data-move="1" title="${esc(t('moveDown',{name:g.name}))}" aria-label="${esc(t('moveDown',{name:g.name}))}" ${index===siblings.length-1?'disabled':''}>↓</button></div>
   </div>`;
   if(!folded)branch(g.id,depth+1);
  }
 }
 branch(null,0);$('#tree').innerHTML=tree;
 $('#tree').querySelectorAll('[data-group]').forEach(b=>b.onclick=()=>navigate(b.dataset.group));
 $('#tree').querySelectorAll('[data-fold]').forEach(b=>b.onclick=()=>toggleGroup(b.dataset.fold));
 $('#tree').querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>moveGroup(b.dataset.id,Number(b.dataset.move)));
 const hasBranches=data.groups.some(g=>g.parent!==null);
 $('#collapseAll').disabled=!hasBranches;$('#expandAll').disabled=!data.collapsedGroups.length;
 const tabs=active?data.groups.filter(g=>g.parent===active.id):data.groups.filter(g=>!g.parent);$('#tabs').innerHTML=tabs.map(g=>`<button data-group="${esc(g.id)}">${esc(g.name)} ↗</button>`).join('');$('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>navigate(b.dataset.group));renderContent();}
function renderContent(){const view=data.views[data.active]||'grid', allowed=data.active==='all'?data.groups.map(g=>g.id):descendants(data.active),q=$('#search').value.toLocaleLowerCase(language);const links=data.links.filter(l=>allowed.includes(l.group)&&[l.name,l.url,path(l.group)].join(' ').toLocaleLowerCase(language).includes(q));$('#subtitle').textContent=t('summary',{links:links.length,groups:allowed.length});document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('#hint').textContent=view==='map'?(editing?t('mapEditHint'):t('mapHint')):t('dropHint')+' '+(editing?t('sortHint'):t('lockedHint'));const content=$('#content');content.className=view;content.replaceChildren();
 if(view==='map'){const map=document.createElement('div');map.className='map';const g=data.groups.find(x=>x.id===data.active);if(g?.background){map.style.aspectRatio=String(g.ratio);const img=new Image();img.src=g.background;img.alt=t('siteMap');map.append(img);}links.forEach(l=>map.append(card(l,true)));content.append(map);if(!links.length)$('#hint').textContent+=' '+t('noSelectionLinks');}
 else for(const g of orderedGroups().filter(g=>allowed.includes(g.id))){const ls=links.filter(l=>l.group===g.id);if(q&&!ls.length)continue;const section=document.createElement('section');section.dataset.group=g.id;section.innerHTML=`<div class="group-head"><h2>${esc(path(g.id))}</h2><span>${esc(t('linkCount',{count:ls.length}))}</span><button aria-label="${esc(t('addToGroup',{name:g.name}))}">＋</button></div><div class="cards"></div>`;section.querySelector('button').onclick=()=>editLink(null,'',g.id);for(const l of ls)section.querySelector('.cards').append(card(l,false));if(!ls.length&&data.showEmptyGroups)section.querySelector('.cards').innerHTML=`<div class="empty">${esc(t('emptyGroup'))}</div>`;content.append(section);}
 if(!content.children.length&&(q||data.showEmptyGroups))content.innerHTML=`<div class="empty"><strong>${esc(t('emptyTitle'))}</strong>${esc(t('emptyHint'))}</div>`;}
function card(l,map){const el=document.createElement('article');el.className='card';el.dataset.id=l.id;const host=new URL(l.url).host;el.innerHTML=`<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"><span class="icon">${esc(l.name.slice(0,1).toUpperCase())}</span><span class="card-text"><strong>${esc(l.name)}</strong><small>${esc(host)}</small></span></a>`;el.title=l.name+'\n'+l.url;const src=l.icon||(l.favicon?new URL('/favicon.ico',l.url).href:'');if(src){const icon=el.querySelector('.icon'),img=new Image();img.alt='';img.referrerPolicy='no-referrer';img.onload=()=>icon.replaceChildren(img);img.src=src;}
 if(editing){const b=document.createElement('button');b.className='edit-link';b.textContent='✎';b.title=t('editLink');b.setAttribute('aria-label',t('editNamed',{name:l.name}));b.onclick=()=>editLink(l);el.append(b);el.querySelector('a').onclick=e=>{e.preventDefault();if(!map)editLink(l);};if(map){el.tabIndex=0;el.setAttribute('aria-label',t('moveWithKeys',{name:l.name}));el.onkeydown=e=>{const v={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(v&&e.target===el){e.preventDefault();l.x=Math.max(0,Math.min(100,l.x+v[0]));l.y=Math.max(0,Math.min(100,l.y+v[1]));position(el,l);persist();}};el.onpointerdown=e=>{if(e.target.closest('button')||e.button!==0)return;e.preventDefault();const mapRect=el.parentElement.getBoundingClientRect(),startX=e.clientX,startY=e.clientY,x=l.x,y=l.y;el.setPointerCapture(e.pointerId);el.onpointermove=ev=>{l.x=Math.max(0,Math.min(100,x+(ev.clientX-startX)/mapRect.width*100));l.y=Math.max(0,Math.min(100,y+(ev.clientY-startY)/mapRect.height*100));position(el,l);};el.onpointerup=()=>{el.onpointermove=null;persist();};el.onpointercancel=()=>{el.onpointermove=null;persist();};};}else{el.draggable=true;el.ondragstart=e=>{e.dataTransfer.setData('application/x-localboard',l.id);e.dataTransfer.effectAllowed='move';};el.ondragover=e=>e.preventDefault();el.ondrop=e=>{const id=e.dataTransfer.getData('application/x-localboard');if(!id)return;e.preventDefault();e.stopPropagation();const from=data.links.findIndex(x=>x.id===id);if(from<0||data.links[from].group!==l.group)return;const item=data.links.splice(from,1)[0];data.links.splice(data.links.indexOf(l),0,item);persist();renderContent();};}}
 if(map)position(el,l);return el;}
function position(el,l){el.style.left=`clamp(86px, ${l.x}%, calc(100% - 86px))`;el.style.top=`clamp(32px, ${l.y}%, calc(100% - 32px))`;}
let submitAction=null;function dialog(title,html,submit,remove){$('#dialogTitle').textContent=title;$('#fields').innerHTML=html;$('#save').hidden=!submit;$('#remove').hidden=!remove;$('#remove').onclick=remove||null;submitAction=submit;$('#modal').showModal();}
$('#form').onsubmit=async e=>{e.preventDefault();if(!submitAction)return;$('#save').disabled=true;try{await submitAction();$('#modal').close();persist();render();}catch(err){alert(errorText(err));}finally{$('#save').disabled=false;}};$('#close').onclick=$('#cancel').onclick=()=>$('#modal').close();
function renderBrand(){
 const brand=$('#brand');
 brand.innerHTML=data.logo?`<img class="custom-logo" src="${esc(data.logo)}" alt="${esc(dashboardTitle())}">`:`▦ <span>localboard<small>${esc(t('brandTag'))}</small></span>`;
}
function editBranding(){
 if(!editing)return;
 dialog(t('branding'),`${data.logo?`<img class="logo-preview" src="${esc(data.logo)}" alt="${esc(t('customLogo'))}">`:''}<label>${esc(t('customLogo'))}<input id="logoFile" type="file" accept="image/png,image/jpeg,image/webp"></label><p class="note">${esc(t('logoNote'))}</p>${data.logo?`<label class="check"><input type="checkbox" id="clearLogo">${esc(t('removeLogo'))}</label>`:''}<label class="check"><input type="checkbox" id="showEmptyGroups" ${data.showEmptyGroups?'checked':''}>${esc(t('showEmptyGroups'))}</label><p class="note">${esc(t('emptyGroupsNote'))}</p>`,async()=>{
  const showEmptyGroups=$('#showEmptyGroups').checked,clear=$('#clearLogo')?.checked;
  const uploaded=await imageData($('#logoFile').files[0],640);
  data.logo=uploaded?.src||(clear?'':data.logo);
  data.showEmptyGroups=showEmptyGroups;
 });
}
$('#branding').onclick=editBranding;
async function imageData(file,maxWidth){if(!file)return null;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>20*1024*1024)throw uiError('imageTypeError');const raw=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(uiError('imageReadError'));r.readAsDataURL(file);});const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(uiError('imageReadError'));i.src=raw;});const ratio=img.width/img.height;if(ratio<.1||ratio>10)throw uiError('imageRatioError');const factor=Math.min(1,maxWidth/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*factor);c.height=Math.round(img.height*factor);c.getContext('2d').drawImage(img,0,0,c.width,c.height);return {src:c.toDataURL('image/webp',.85),ratio};}
function editLink(link,initial='',group){if(link&&!editing)return;if(!data.groups.length){message('createGroupFirst');return;}dialog(link?t('editLink'):t('newLink'),`<label>${esc(t('name'))}<input id="lname" maxlength="160" required value="${esc(link?.name||'')}"></label><label>${esc(t('address'))}<input id="lurl" required placeholder="http://192.168.1.10" value="${esc(link?.url||initial)}"></label><label>${esc(t('group'))}<select id="lgroup">${groupOptions(link?.group||group||(data.active!=='all'?data.active:data.groups[0].id))}</select></label><label class="check"><input type="checkbox" id="lfav" ${link?.favicon?'checked':''}>${esc(t('loadFavicon'))}</label><p class="note">${esc(t('faviconNote'))}</p><label>${esc(t('customIcon'))}<input type="file" id="licon" accept="image/png,image/jpeg,image/webp"></label>${link?.icon?`<label class="check"><input type="checkbox" id="clearIcon">${esc(t('removeIcon'))}</label>`:''}<label>${esc(t('mapPosition'))}<div style="display:flex;gap:8px"><input aria-label="${esc(t('xPosition'))}" id="lx" type="number" min="0" max="100" step="any" value="${link?.x??50}"><input aria-label="${esc(t('yPosition'))}" id="ly" type="number" min="0" max="100" step="any" value="${link?.y??50}"></div></label>`,async()=>{const name=$('#lname').value.trim();if(!name)throw uiError('nameRequired');const u=url($('#lurl').value),uploaded=await imageData($('#licon').files[0],96);const obj={id:link?.id||uid(),name,url:u,group:$('#lgroup').value,favicon:$('#lfav').checked,icon:uploaded?.src||($('#clearIcon')?.checked?'':link?.icon||''),x:Number($('#lx').value),y:Number($('#ly').value)};if(link)Object.assign(link,obj);else data.links.push(obj);},link?()=>{if(editing&&confirm(t('deleteLinkConfirm',{name:link.name}))){data.links=data.links.filter(l=>l!==link);$('#modal').close();persist();render();}}:null);}
function dashboardTitle(){return data.titleMode==='custom'?data.title:t('defaultTitle');}
function editDashboardTitle(){
 if(!editing)return;
 dialog(t('editDashboardTitle'),`<label>${esc(t('dashboardTitle'))}<input id="dashboardTitleInput" maxlength="160" value="${esc(data.titleMode==='custom'?data.title:'')}" placeholder="${esc(t('defaultTitle'))}"></label><p class="note">${esc(t('titleNote'))}</p>`,()=>{
  const title=$('#dashboardTitleInput').value.trim();
  data.title=title;data.titleMode=title?'custom':'auto';
 });
}
$('#editTitle').onclick=editDashboardTitle;
function editGroup(g){if(!editing)return;const blocked=g?descendants(g.id):[];dialog(g?t('editGroup'):t('newGroup'),`<label>${esc(t('name'))}<input id="gname" maxlength="160" required value="${esc(g?.name||'')}"></label><label>${esc(t('parentGroup'))}<select id="gparent"><option value="">${esc(t('noParent'))}</option>${groupOptions(g?.parent|| (data.active==='all'?null:data.active),blocked)}</select></label><p class="note">${esc(t('groupNote'))}</p>`,()=>{const name=$('#gname').value.trim();if(!name)throw uiError('nameRequired');const p=$('#gparent').value||null;if(g)Object.assign(g,{name,parent:p});else{const id=uid();data.groups.push({id,name,parent:p,background:'',ratio:16/9});data.active=id;}revealAncestors(data.active);},g?()=>{const ids=descendants(g.id),count=data.links.filter(l=>ids.includes(l.group)).length;if(confirm(t('deleteGroupConfirm',{name:g.name,groups:ids.length-1,links:count}))){data.groups=data.groups.filter(x=>!ids.includes(x.id));data.collapsedGroups=data.collapsedGroups.filter(id=>!ids.includes(id)&&data.groups.some(x=>x.parent===id));data.links=data.links.filter(x=>!ids.includes(x.group));data.active='all';$('#modal').close();persist();render();}}:null);}
$('#lock').onclick=()=>{if(!editing&&!confirm(t('editConfirm')))return;editing=!editing;render();};$('#add').onclick=()=>editLink();$('#newGroup').onclick=()=>editGroup();$('#groupEdit').onclick=()=>editGroup(data.groups.find(g=>g.id===data.active));$('#search').oninput=renderContent;document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{data.views[data.active]=b.dataset.view;persist();renderContent();});
$('#background').onclick=()=>{if(!editing)return;const g=data.groups.find(g=>g.id===data.active);dialog(t('mapImage'),`<p class="note">${esc(t('mapNote'))}</p><label>${esc(t('floorPlan'))}<input id="bgfile" type="file" accept="image/png,image/jpeg,image/webp"></label>${g.background?`<label class="check"><input id="bgclear" type="checkbox">${esc(t('removeBackground'))}</label>`:''}`,async()=>{const img=await imageData($('#bgfile').files[0],2000);if(img){g.background=img.src;g.ratio=img.ratio;}else if($('#bgclear')?.checked)g.background='';data.views[g.id]='map';});};
function download(name,content,type){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([content],{type}));a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);}
async function portable(){
 let styleText,jsText,i18nText,appearanceText;
 const css=document.querySelector('link[rel=stylesheet]');
 if(css){try{
  styleText=[...css.sheet.cssRules].map(r=>r.cssText).join('\n');
  [jsText,i18nText,appearanceText]=await Promise.all(['app.js','i18n.js','appearance.js'].map(async path=>{const r=await fetch(path);if(!r.ok)throw Error();return r.text();}));
 }catch{throw uiError('portableError');}}
 else{styleText=$('#appStyle').textContent;jsText=$('#appCode').textContent;i18nText=$('#i18nCode').textContent;appearanceText=$('#appearanceCode').textContent;}
 const doc=document.documentElement.cloneNode(true);
 doc.querySelector('link[rel=stylesheet]')?.remove();doc.querySelector('#appStyle')?.remove();
 const st=document.createElement('style');st.id='appStyle';st.textContent=styleText;doc.querySelector('head').append(st);
 doc.querySelectorAll('script[src], #appCode, #i18nCode, #appearanceCode').forEach(el=>el.remove());
 for(const [id,code] of [['i18nCode',i18nText],['appearanceCode',appearanceText],['appCode',jsText]]){const script=document.createElement('script');script.id=id;script.textContent=code;doc.querySelector('body').append(script);}
 for(const [key,value] of Object.entries(LocalboardAppearance.tokens(data.appearance.palettes[LocalboardAppearance.resolve(data.appearance,new Date(),themeMedia?.matches??true)],LocalboardAppearance.resolve(data.appearance,new Date(),themeMedia?.matches??true))))doc.style.setProperty('--'+key,value);
 const snapshot=JSON.parse(JSON.stringify(data));snapshot.baseRevision=snapshot.revision;
 doc.querySelector('#seed').textContent=JSON.stringify(snapshot).replace(/</g,'\\u003c');
 doc.querySelector('#modal').removeAttribute('open');
 for(const id of ['fields','tree','content','tabs'])doc.querySelector('#'+id).replaceChildren();
 doc.querySelector('#notice').hidden=true;doc.querySelector('body').classList.remove('editing');
 download('Localboard-Standalone.html','<!doctype html>\n'+doc.outerHTML,'text/html');message('htmlExported');
}
$('#export').onclick=()=>{
 dialog(t('exportDashboard'),`<div class="help"><p>${esc(t('jsonNote'))}</p><button type="button" id="jsonExport" class="wide">${esc(t('jsonExport'))}</button><p>${esc(t('htmlNote'))}</p><button type="button" id="htmlExport" class="wide">${esc(t('htmlExport'))}</button></div>`,null);
 $('#jsonExport').onclick=()=>download('Localboard-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(data,null,2),'application/json');
 $('#htmlExport').onclick=async()=>{try{await portable();$('#modal').close();}catch(e){alert(errorText(e));}};
};
$('#import').onclick=()=>{if(editing)$('#importFile').click();};$('#importFile').onchange=async e=>{try{if(!editing||!e.target.files[0])return;const f=e.target.files[0];if(f.size>30*1024*1024)throw uiError('fileTooLarge');const incoming=parseDashboard(await f.text());if(!confirm(t('importConfirm',{links:incoming.links.length,groups:incoming.groups.length})))return;data=incoming;language=data.language;const saved=persist();render();if(saved)message('imported');}catch(err){alert(t('importFailed',{error:errorText(err)}));}finally{e.target.value='';}};
const main=$('main');main.ondragover=e=>{if(e.dataTransfer.types.includes('application/x-localboard'))return;e.preventDefault();main.classList.add('drop-target');};main.ondragleave=e=>{if(!main.contains(e.relatedTarget))main.classList.remove('drop-target');};main.ondrop=e=>{e.preventDefault();main.classList.remove('drop-target');if(e.dataTransfer.types.includes('application/x-localboard'))return;const raw=(e.dataTransfer.getData('text/uri-list')||e.dataTransfer.getData('text/plain')).split(/\r?\n/).find(x=>x&&!x.startsWith('#'));if(!raw){message('noDropUrl');return;}try{editLink(null,url(raw),e.target.closest('[data-group]')?.dataset.group);}catch(err){message(err.translationKey||'operationFailed');}};
$('#help').onclick=()=>dialog(t('helpTitle'),'<div class="help">'+['Storage','Safety','Network','Icons','Usage'].map(part=>`<h3>${esc(t('help'+part+'Title'))}</h3><p>${esc(t('help'+part))}</p>`).join('')+'</div>',null);
$('#language').innerHTML=Object.entries(LocalboardI18n.names).map(([code,name])=>`<option value="${code}" lang="${code}">${name}</option>`).join('');
$('#language').onchange=e=>{const next=e.target.value;if(!LocalboardI18n.supported(next))return;language=next;data.language=next;persist();render();};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue!==lastStored){message('otherTabChanged');}});
function themeOptions(selected){return LocalboardAppearance.modes.map(mode=>`<option value="${mode}" ${mode===selected?'selected':''}>${esc(t('theme'+mode[0].toUpperCase()+mode.slice(1)))}</option>`).join('');}
function applyAppearance(appearance=data.appearance,preview=null){
 const scheme=preview||LocalboardAppearance.resolve(appearance,new Date(),themeMedia?.matches??true);
 const root=document.documentElement;
 for(const [key,value] of Object.entries(LocalboardAppearance.tokens(appearance.palettes[scheme],scheme)))root.style.setProperty('--'+key,value);
 root.style.colorScheme=scheme;root.dataset.theme=scheme;
 $('#themeStatus').textContent=appearance.mode==='solar'&&!appearance.location?t('solarFallback'):t('themeCurrent',{theme:t(scheme==='dark'?'themeDark':'themeLight')});
}
function refreshAppearance(){applyAppearance(themeDraft||data.appearance,themeDraft?themePalette:null);}
function readThemeColors(strict=false){
 let valid=true;
 for(const key of LocalboardAppearance.colorKeys){const value=$('#themeHex_'+key).value;
  if(LocalboardAppearance.colorOK(value)){themeDraft.palettes[themePalette][key]=value.toLowerCase();$('#themeColor_'+key).value=value;}
  else valid=false;
 }
 if(!valid&&strict)throw uiError('invalidColors');
 return valid;
}
function previewAppearance(){
 refreshAppearance();
 $('#contrastWarning').hidden=!LocalboardAppearance.lowContrast(themeDraft.palettes[themePalette]);
}
function renderPaletteFields(){
 $('#paletteFields').innerHTML=LocalboardAppearance.colorKeys.map(key=>{
  const label=t('color'+key[0].toUpperCase()+key.slice(1)),value=themeDraft.palettes[themePalette][key];
  return `<div class="color-row"><label for="themeHex_${key}">${esc(label)}</label><input id="themeColor_${key}" type="color" value="${value}" aria-label="${esc(label)}"><input id="themeHex_${key}" type="text" value="${value}" pattern="#[0-9a-fA-F]{6}" maxlength="7" spellcheck="false" aria-label="${esc(label)}"></div>`;
 }).join('');
 for(const key of LocalboardAppearance.colorKeys){
  $('#themeColor_'+key).oninput=e=>{$('#themeHex_'+key).value=e.target.value;readThemeColors();previewAppearance();};
  $('#themeHex_'+key).oninput=()=>{readThemeColors();previewAppearance();};
 }
 previewAppearance();
}
function updateAppearanceFields(){
 $('#scheduleFields').hidden=$('#appearanceMode').value!=='schedule';
 $('#solarFields').hidden=$('#appearanceMode').value!=='solar';
}
function editAppearance(){
 if(!editing)return;
 themeDraft=LocalboardAppearance.normalize(data.appearance);
 themePalette=LocalboardAppearance.resolve(themeDraft,new Date(),themeMedia?.matches??true);
 dialog(t('appearance'),`<p class="note">${esc(t('previewNote'))}</p>
  <label>${esc(t('themeMode'))}<select id="appearanceMode">${themeOptions(themeDraft.mode)}</select></label>
  <div id="scheduleFields"><div class="settings-columns"><label>${esc(t('lightAt'))}<input id="lightAt" type="time" value="${themeDraft.lightAt}"></label><label>${esc(t('darkAt'))}<input id="darkAt" type="time" value="${themeDraft.darkAt}"></label></div><p class="note">${esc(t('scheduleNote'))}</p></div>
  <div id="solarFields"><div class="settings-columns"><label>${esc(t('latitude'))}<input id="latitude" type="number" step="any" min="-90" max="90" value="${themeDraft.location?.latitude??''}"></label><label>${esc(t('longitude'))}<input id="longitude" type="number" step="any" min="-180" max="180" value="${themeDraft.location?.longitude??''}"></label></div><div class="settings-buttons"><button type="button" id="useLocation">${esc(t('useLocation'))}</button><button type="button" id="clearLocation">${esc(t('clearLocation'))}</button></div><p class="note">${esc(t('solarNote'))}</p><p id="locationStatus" class="note" role="status"></p></div>
  <label>${esc(t('editPalette'))}<select id="appearancePalette"><option value="dark" ${themePalette==='dark'?'selected':''}>${esc(t('themeDark'))}</option><option value="light" ${themePalette==='light'?'selected':''}>${esc(t('themeLight'))}</option></select></label>
  <div id="paletteFields"></div><p id="contrastWarning" class="note" role="status" hidden>${esc(t('contrastWarning'))}</p><button type="button" id="resetPalette">${esc(t('resetPalette'))}</button>`,()=>{
   readThemeColors(true);
   const mode=$('#appearanceMode').value,lightAt=$('#lightAt').value,darkAt=$('#darkAt').value;
   if(!LocalboardAppearance.timeOK(lightAt)||!LocalboardAppearance.timeOK(darkAt)||lightAt===darkAt)throw uiError('invalidSchedule');
   const lat=$('#latitude').value.trim(),lon=$('#longitude').value.trim();
   const location=lat!==''&&lon!==''?{latitude:Number(lat),longitude:Number(lon)}:null;
   if((lat!==''||lon!=='')&&!LocalboardAppearance.coordinatesOK(location)||mode==='solar'&&!location)throw uiError('invalidLocation');
   data.appearance=LocalboardAppearance.normalize({...themeDraft,mode,lightAt,darkAt,location});themeDraft=null;
  });
 $('#appearanceMode').onchange=updateAppearanceFields;
 $('#appearancePalette').onchange=e=>{
  try{readThemeColors(true);}catch(err){e.target.value=themePalette;alert(errorText(err));return;}
  themePalette=e.target.value;renderPaletteFields();
 };
 $('#resetPalette').onclick=()=>{themeDraft.palettes[themePalette]={...LocalboardAppearance.palettes[themePalette]};renderPaletteFields();};
 $('#clearLocation').onclick=()=>{$('#latitude').value='';$('#longitude').value='';$('#locationStatus').textContent='';};
 $('#useLocation').onclick=()=>{
  const draft=themeDraft;
  if(!navigator.geolocation){$('#locationStatus').textContent=t('locationFailed');return;}
  $('#useLocation').disabled=true;$('#locationStatus').textContent=t('locationLoading');
  navigator.geolocation.getCurrentPosition(position=>{
   if(themeDraft!==draft||!$('#modal').open)return;
   $('#latitude').value=String(Math.round(position.coords.latitude*1000)/1000);$('#longitude').value=String(Math.round(position.coords.longitude*1000)/1000);
   $('#useLocation').disabled=false;$('#locationStatus').textContent='';
  },()=>{if(themeDraft!==draft||!$('#modal').open)return;$('#useLocation').disabled=false;$('#locationStatus').textContent=t('locationFailed');}, {enableHighAccuracy:false,timeout:10000,maximumAge:3600000});
 };
 updateAppearanceFields();renderPaletteFields();
}
$('#appearance').onclick=editAppearance;
$('#themeMode').onchange=e=>{
 const mode=e.target.value;if(!LocalboardAppearance.modes.includes(mode))return;
 if(mode==='solar'&&!data.appearance.location){e.target.value=data.appearance.mode;message('solarNeedsLocation');return;}
 data.appearance.mode=mode;persist();render();
};
$('#modal').addEventListener('close',()=>{if(themeDraft){themeDraft=null;applyAppearance();}});
themeMedia?.addEventListener('change',refreshAppearance);
window.addEventListener('focus',refreshAppearance);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshAppearance();});
setInterval(refreshAppearance,60000);

render();if(startupWarning)message(startupWarning);else if(!seed&&!data.links.length)message('welcome');
