import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const appearanceCode=read('source/appearance.js');
const catalogCode=read('source/i18n.js'), appCode=read('source/app.js'), html=read('source/startpage.html');
const catalogContext=vm.createContext({});
vm.runInContext(catalogCode,catalogContext);
const i18n=vm.runInContext('LocalboardI18n',catalogContext);
const languages=['de','en','fr','es','it','nl'];

// Minimal DOM adapter for application state and text tests; not a layout/browser test.
class Element {
 constructor(){this.dataset={};this.style={setProperty(key,value){this[key]=value;}};this.events={};this.children=[];this.value='';this.textContent='';this.innerHTML='';this.nodes=new Map();this.classList={toggle(){},add(){},remove(){}};}
 querySelector(s){if(!this.nodes.has(s))this.nodes.set(s,new Element());return this.nodes.get(s);}
 querySelectorAll(){return [];}
 setAttribute(k,v){this[k]=v;}
 removeAttribute(k){delete this[k];}
 append(...els){this.children.push(...els);}
 replaceChildren(...els){this.children=els;}
 showModal(){this.open=true;}
 close(){this.open=false;this.events.close?.();}
 addEventListener(name,callback){this.events[name]=callback;}
 focus(){}
}
function boot({browser=['en-US'],saved=null,seed=null,blocked=false,systemDark=true}={}){
 const nodes=new Map(),get=s=>{if(!nodes.has(s))nodes.set(s,new Element());return nodes.get(s);};
 const markers=[];
 for(const match of html.matchAll(/<[^>]+data-i18n(?:-[a-z]+)?="[^"]+"[^>]*>/g)){
  const tag=match[0],id=tag.match(/\bid="([^"]+)"/),el=id?get('#'+id[1]):new Element();
  for(const attr of tag.matchAll(/data-(i18n(?:-[a-z]+)?)="([^"]+)"/g))el.dataset[attr[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=attr[2];
  markers.push(el);
 }
 get('#seed').textContent=JSON.stringify(seed);
 const values=new Map(saved?[['localboard.v1.default',saved]]:[]),alerts=[],confirms=[];
 const media={matches:systemDark,events:{},addEventListener(name,fn){this.events[name]=fn;}};
 const callbacks={};
 const context=vm.createContext({navigator:{languages:browser},URL,Blob,Date,console,setTimeout,setInterval:fn=>{callbacks.interval=fn;return 1;},
  document:{querySelector:get,querySelectorAll:s=>markers.filter(el=>Object.hasOwn(el.dataset,s.slice(6,-1).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()))),addEventListener:(name,fn)=>{callbacks[name]=fn;},documentElement:new Element(),body:new Element(),createElement:()=>new Element()},
  window:{matchMedia:()=>media,addEventListener:(name,fn)=>{callbacks[name]=fn;}},localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(blocked)throw Error('blocked');values.set(k,v);}},
  confirm:s=>{confirms.push(s);return true;},alert:s=>alerts.push(s),Image:class extends Element{}
 });
 // Handle the data-view selection separately from translated DOM markers.
 const original=context.document.querySelectorAll;
 context.document.querySelectorAll=s=>s==='[data-view]'?[]:original(s);
 vm.runInContext(catalogCode,context);vm.runInContext(appearanceCode,context);vm.runInContext(appCode,context);
 return {context,get,values,alerts,confirms,media,callbacks,run:code=>vm.runInContext(code,context)};
}
const clone=x=>JSON.parse(JSON.stringify(x));
const placeholders=text=>Array.from(text.matchAll(/\{(\w+)\}/g),m=>m[1]).sort();

test('six complete catalogs with matching placeholders and valid UI keys',()=>{
 const expected=Object.keys(i18n.catalogs.en).sort();
 for(const language of languages){
  assert.deepEqual(Object.keys(i18n.catalogs[language]).sort(),expected);
  for(const key of expected){assert.ok(i18n.catalogs[language][key].trim(),`${language}.${key}`);assert.deepEqual(placeholders(i18n.catalogs[language][key]),placeholders(i18n.catalogs.en[key]),`${language}.${key}`);}
 }
 const keys=[...appCode.matchAll(/(?:\bt|uiError|message)\('([^']+)'/g)].map(m=>m[1]).filter(k=>k!=='help');
 keys.push(...Array.from(html.matchAll(/data-i18n(?:-[a-z]+)?="([^"]+)"/g),m=>m[1]));
 for(const key of keys.filter(k=>!['theme','color'].includes(k)))assert.ok(Object.hasOwn(i18n.catalogs.en,key),key);
});

test('regional browser tags, preference order and unsupported-language fallback',()=>{
 assert.equal(i18n.detect(['fr-CA','de-DE']),'fr');
 assert.equal(i18n.detect(['pl-PL','nl-BE']),'nl');
 assert.equal(i18n.detect(['es_MX']),'es');
 assert.equal(i18n.detect(['ja-JP']),'en');
 assert.equal(i18n.detect([]),'en');
 assert.equal(i18n.supported('__proto__'),false);
});

for(const language of languages){
 test(`${language}: startup, UI, dialogs, persistence and user data preservation`,()=>{
  const app=boot({browser:[language+'-XX']});
  assert.equal(app.run('language'),language);
  assert.equal(app.context.document.documentElement.lang,language);
  assert.equal(app.get('#add').textContent,i18n.translate(language,'addLink'));
  assert.equal(app.get('#search').placeholder,i18n.translate(language,'searchPlaceholder'));
  assert.equal(app.get('#close')['aria-label'],i18n.translate(language,'close'));
  app.run(`data.groups[0].name='Haus 2 <Tor>';data.links.push({id:'cam',name:'Kamera & Tür',url:'http://192.168.1.2/',group:'site-a',x:12,y:34,icon:'',favicon:false});`);
  const original=app.run('JSON.stringify({groups:data.groups,links:data.links})');
  app.get('#language').onchange({target:{value:language}});
  assert.equal(app.run('JSON.stringify({groups:data.groups,links:data.links})'),original);
  assert.equal(JSON.parse(app.values.get('localboard.v1.default')).language,language);
  const reopened=boot({browser:['ja-JP'],saved:app.values.get('localboard.v1.default')});
  assert.equal(reopened.run('language'),language);
  app.get('#lock').onclick();
  assert.equal(app.confirms.at(-1),i18n.translate(language,'editConfirm'));
  app.run('editLink(data.links[0])');
  assert.equal(app.get('#dialogTitle').textContent,i18n.translate(language,'editLink'));
  assert.ok(app.get('#fields').innerHTML.includes('Kamera &amp; Tür'));
  assert.ok(app.get('#fields').innerHTML.includes('Haus 2 &lt;Tor&gt;'));
  app.run('editGroup(data.groups[0])');
  assert.equal(app.get('#dialogTitle').textContent,i18n.translate(language,'editGroup'));
  app.get('#help').onclick();
  assert.equal(app.get('#dialogTitle').textContent,i18n.translate(language,'helpTitle'));
  assert.ok(!app.get('#fields').innerHTML.includes('undefined'));
  app.get('#export').onclick();
  assert.equal(app.get('#dialogTitle').textContent,i18n.translate(language,'exportDashboard'));
  assert.throws(()=>app.run(`url('javascript:alert(1)')`),e=>e.message===i18n.translate(language,'urlError'));
 });
}

test('language switching retranslates notices without translating data or clearing search',()=>{
 const app=boot({browser:['de-DE']});
 app.get('#search').value='Haus';
 app.run(`message('otherTabChanged')`);
 const before=app.run('JSON.stringify(data.groups)');
 app.get('#language').onchange({target:{value:'it'}});
 assert.equal(app.get('#notice').textContent,i18n.translate('it','otherTabChanged'));
 assert.equal(app.get('#search').value,'Haus');
 assert.equal(app.run('JSON.stringify(data.groups)'),before);
 assert.equal(app.get('#lock').textContent,i18n.translate('it','editButton'));
});

test('legacy imports preserve names and inherit active language; supported saved languages win',()=>{
 const app=boot({browser:['nl-BE']});
 const old=clone(app.run('blank()'));delete old.language;old.groups[0].name='Haus 1';
 app.context.incoming=JSON.stringify(old);
 assert.equal(app.run('parseDashboard(incoming).language'),'nl');
 assert.equal(app.run('parseDashboard(incoming).groups[0].name'),'Haus 1');
 old.language='fr';app.context.incoming=JSON.stringify(old);
 assert.equal(app.run('parseDashboard(incoming).language'),'fr');
 old.language='__proto__';app.context.incoming=JSON.stringify(old);
 assert.equal(app.run('parseDashboard(incoming).language'),'nl');
 assert.throws(()=>app.run(`parseDashboard('{broken')`),e=>e.message===i18n.translate('nl','invalidJson'));
});

test('import handler applies exported language and localized success text',async()=>{
 const app=boot({browser:['de']});app.get('#lock').onclick();
 const data=clone(app.run('blank()'));data.language='es';data.groups[0].name='Haus 3';
 await app.get('#importFile').onchange({target:{files:[{size:200,text:async()=>JSON.stringify(data)}],value:'selected'}});
 assert.equal(app.run('language'),'es');
 assert.equal(app.get('#add').textContent,i18n.translate('es','addLink'));
 assert.equal(app.get('#notice').textContent,i18n.translate('es','imported'));
 assert.equal(app.run('data.groups[0].name'),'Haus 3');
});

test('HTML seed language overrides browser locale; JSON export preserves language',()=>{
 const original=boot({browser:['fr']});const seed=clone(original.run('data'));
 const restored=boot({browser:['de'],seed});assert.equal(restored.run('language'),'fr');
 original.run(`download=(name,content,type)=>{globalThis.exported={name,content,type};}`);
 original.get('#export').onclick();original.get('#jsonExport').onclick();
 const exported=JSON.parse(original.context.exported.content);
 assert.equal(exported.language,'fr');assert.deepEqual(exported.groups,seed.groups);
});

test('storage failure stays visible after language change and import',async()=>{
 const app=boot({browser:['de'],blocked:true});
 app.get('#language').onchange({target:{value:'en'}});
 assert.equal(app.get('#notice').textContent,i18n.translate('en','storageWriteError'));
 assert.equal(app.get('#storage').textContent,i18n.translate('en','memoryOnly'));
 app.get('#lock').onclick();const incoming=clone(app.run('data'));incoming.language='fr';
 await app.get('#importFile').onchange({target:{files:[{size:200,text:async()=>JSON.stringify(incoming)}],value:'file'}});
 assert.equal(app.get('#notice').textContent,i18n.translate('fr','storageWriteError'));
});

test('standalone build embeds all catalogs before application code without external scripts',()=>{
 const bundle=read('startpage.html');
 assert.ok(!/<script\s+src=/.test(bundle));
 assert.ok(bundle.indexOf('id="i18nCode"')<bundle.indexOf('id="appCode"'));
 assert.ok(bundle.includes(catalogCode));assert.ok(bundle.includes(appCode));
 for(const match of bundle.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
});

test('default dashboard title follows all six languages and old defaults migrate',()=>{
 const app=boot({browser:['de']});
 for(const language of languages){
  app.get('#language').onchange({target:{value:language}});
  assert.equal(app.get('#title').textContent,i18n.translate(language,'defaultTitle'));
  const legacy=clone(app.run('data'));delete legacy.titleMode;legacy.title=i18n.translate(language,'defaultTitle');
  const restored=boot({browser:['en'],saved:JSON.stringify(legacy)});
  assert.equal(restored.run('data.titleMode'),'auto');
  restored.get('#language').onchange({target:{value:'nl'}});
  assert.equal(restored.get('#title').textContent,i18n.translate('nl','defaultTitle'));
 }
});

test('custom title editing is gated, saved, preserved on language change and resettable',async()=>{
 const app=boot({browser:['de']});
 app.get('#editTitle').onclick();assert.notEqual(app.get('#modal').open,true);
 app.get('#lock').onclick();app.get('#editTitle').onclick();
 assert.equal(app.get('#dialogTitle').textContent,i18n.translate('de','editDashboardTitle'));
 app.get('#dashboardTitleInput').value='  Mein Haus & Garten  ';
 await app.get('#form').onsubmit({preventDefault(){}});
 assert.equal(app.get('#title').textContent,'Mein Haus & Garten');
 const saved=app.values.get('localboard.v1.default');
 assert.equal(JSON.parse(saved).titleMode,'custom');
 const reopened=boot({saved});assert.equal(reopened.get('#title').textContent,'Mein Haus & Garten');
 for(const language of languages){app.get('#language').onchange({target:{value:language}});assert.equal(app.get('#title').textContent,'Mein Haus & Garten');}
 app.get('#editTitle').onclick();app.get('#dashboardTitleInput').value='  ';
 await app.get('#form').onsubmit({preventDefault(){}});
 assert.equal(app.run('data.titleMode'),'auto');
 assert.equal(app.get('#title').textContent,i18n.translate('nl','defaultTitle'));
});

test('legacy custom title and explicitly custom default-looking title are preserved',()=>{
 const source=boot({browser:['de']});const custom=clone(source.run('data'));
 delete custom.titleMode;custom.title='Haus 1';
 const legacy=boot({saved:JSON.stringify(custom)});
 assert.equal(legacy.run('data.titleMode'),'custom');
 legacy.get('#language').onchange({target:{value:'es'}});
 assert.equal(legacy.get('#title').textContent,'Haus 1');
 custom.title='Meine Startseite';custom.titleMode='custom';
 const explicit=boot({saved:JSON.stringify(custom)});
 explicit.get('#language').onchange({target:{value:'en'}});
 assert.equal(explicit.get('#title').textContent,'Meine Startseite');
});

test('dashboard title controls are only shown on overview; group names stay unchanged',()=>{
 const app=boot();app.run(`data.groups[0].name='Haus 2';navigate('site-a')`);
 assert.equal(app.get('#editTitle').hidden,true);
 assert.equal(app.get('#title').textContent,'Haus 2');
 app.get('#language').onchange({target:{value:'fr'}});
 assert.equal(app.get('#title').textContent,'Haus 2');
 app.run(`navigate('all')`);assert.equal(app.get('#editTitle').hidden,false);
 assert.equal(app.get('#title').textContent,i18n.translate('fr','defaultTitle'));
});

test('JSON export/import and HTML seed keep explicit title mode and custom title',async()=>{
 const app=boot();app.run(`data.title='Meine Startseite';data.titleMode='custom';download=(name,content)=>{globalThis.exported=content;}`);
 app.get('#export').onclick();app.get('#jsonExport').onclick();
 const exported=JSON.parse(app.context.exported);
 assert.equal(exported.titleMode,'custom');
 const imported=boot({browser:['fr']});imported.get('#lock').onclick();
 await imported.get('#importFile').onchange({target:{files:[{size:500,text:async()=>JSON.stringify(exported)}],value:''}});
 imported.get('#language').onchange({target:{value:'it'}});
 assert.equal(imported.get('#title').textContent,'Meine Startseite');
 const portable=boot({browser:['nl'],seed:exported});
 portable.get('#language').onchange({target:{value:'nl'}});
 assert.equal(portable.get('#title').textContent,'Meine Startseite');
});

test('sidebar folding works while locked, hides descendants only and survives reload',()=>{
 const app=boot();const before=app.run('JSON.stringify({groups:data.groups,links:data.links,active:data.active})');
 assert.ok(app.get('#tree').innerHTML.includes('data-group="zone-b"'));
 app.run(`toggleGroup('site-a')`);
 assert.equal(app.run('editing'),false);
 assert.ok(!app.get('#tree').innerHTML.includes('data-group="zone-b"'));
 assert.ok(app.get('#tree').innerHTML.includes('aria-expanded="false"'));
 assert.equal(app.run('JSON.stringify({groups:data.groups,links:data.links,active:data.active})'),before);
 const restored=boot({saved:app.values.get('localboard.v1.default')});
 assert.ok(!restored.get('#tree').innerHTML.includes('data-group="zone-b"'));
 restored.run(`toggleGroup('site-a')`);
 assert.ok(restored.get('#tree').innerHTML.includes('data-group="zone-b"'));
});

test('nested folds are independent; navigating to a hidden descendant reveals its ancestors',()=>{
 const app=boot();app.run(`data.groups.push({id:'deep',name:'Deep',parent:'zone-b',background:'',ratio:1});render();toggleGroup('zone-b');toggleGroup('site-a');toggleGroup('site-a')`);
 assert.ok(app.get('#tree').innerHTML.includes('data-group="zone-b"'));
 assert.ok(!app.get('#tree').innerHTML.includes('data-group="deep"'));
 app.run(`toggleGroup('site-a');navigate('deep')`);
 assert.ok(app.get('#tree').innerHTML.includes('data-group="deep"'));
 assert.equal(app.run('data.collapsedGroups.length'),0);
 assert.equal(app.run('data.active'),'deep');
 app.run(`toggleGroup('site-a')`);
 assert.equal(app.run('data.active'),'deep');
 assert.ok(app.get('#tree').innerHTML.includes('contains-active'));
});

test('expand/collapse all and invalid or leaf toggles',()=>{
 const app=boot();app.run(`data.groups.push({id:'deep',name:'Deep',parent:'zone-b',background:'',ratio:1});render()`);
 app.get('#collapseAll').onclick();
 assert.deepEqual(clone(app.run('data.collapsedGroups')),['site-a','zone-b']);
 const before=app.run('JSON.stringify(data)');app.run(`toggleGroup('missing');toggleGroup('deep')`);
 assert.equal(app.run('JSON.stringify(data)'),before);
 app.get('#expandAll').onclick();assert.equal(app.run('data.collapsedGroups.length'),0);
 assert.ok(app.get('#tree').innerHTML.includes('data-group="deep"'));
});

test('legacy and malformed fold settings normalize safely and JSON/HTML seeds preserve valid folds',async()=>{
 const app=boot();const old=clone(app.run('data'));delete old.collapsedGroups;
 const legacy=boot({saved:JSON.stringify(old)});assert.equal(legacy.run('data.collapsedGroups.length'),0);
 old.collapsedGroups=['site-a','site-a','missing','zone-b',null,{}];
 const normalized=boot({saved:JSON.stringify(old)});assert.deepEqual(clone(normalized.run('data.collapsedGroups')),['site-a']);
 normalized.run(`download=(name,content)=>{globalThis.exported=content;}`);
 normalized.get('#export').onclick();normalized.get('#jsonExport').onclick();
 const exported=JSON.parse(normalized.context.exported);assert.deepEqual(exported.collapsedGroups,['site-a']);
 const snapshot=boot({seed:exported});assert.ok(!snapshot.get('#tree').innerHTML.includes('data-group="zone-b"'));
 const imported=boot();imported.get('#lock').onclick();
 await imported.get('#importFile').onchange({target:{files:[{size:500,text:async()=>JSON.stringify(exported)}],value:''}});
 assert.ok(!imported.get('#tree').innerHTML.includes('data-group="zone-b"'));
});

test('fold labels are localized and safely escape custom group names',()=>{
 const app=boot();app.run(`data.groups[0].name='House "A" <B>';render()`);
 for(const language of languages){
  app.get('#language').onchange({target:{value:language}});
  const label=i18n.translate(language,'collapseGroup',{name:'House "A" <B>'});
  app.context.expectedLabel=label;
  assert.ok(app.get('#tree').innerHTML.includes(app.run('esc(expectedLabel)')));
 }
 app.run(`editing=true;toggleGroup('site-a');moveGroup('site-a',1)`);
 assert.deepEqual(clone(app.run('data.collapsedGroups')),['site-a']);
});

function prepareAppearanceForm(app){
 const a=clone(app.run('themeDraft')),palette=app.run('themePalette');
 app.get('#appearanceMode').value=a.mode;app.get('#appearancePalette').value=palette;
 app.get('#lightAt').value=a.lightAt;app.get('#darkAt').value=a.darkAt;
 app.get('#latitude').value=a.location?String(a.location.latitude):'';app.get('#longitude').value=a.location?String(a.location.longitude):'';
 for(const [key,value] of Object.entries(a.palettes[palette]))app.get('#themeHex_'+key).value=value;
}

test('appearance preview is gated and cancel restores saved CSS without mutating data',()=>{
 const app=boot();const original=app.run('JSON.stringify(data.appearance)');
 app.get('#appearance').onclick();assert.equal(app.run('themeDraft'),null);
 app.get('#lock').onclick();app.get('#appearance').onclick();prepareAppearanceForm(app);
 app.get('#themeHex_bg').value='#112233';app.get('#themeHex_bg').oninput();
 assert.equal(app.context.document.documentElement.style['--bg'],'#112233');assert.equal(app.run('JSON.stringify(data.appearance)'),original);
 app.get('#cancel').onclick();assert.equal(app.run('themeDraft'),null);
 assert.equal(app.context.document.documentElement.style['--bg'],'#101416');
});

test('saved palettes, mode and schedule survive reload, JSON and HTML seed',async()=>{
 const app=boot();app.get('#lock').onclick();app.get('#appearance').onclick();prepareAppearanceForm(app);
 app.get('#themeHex_accent').value='#ff7700';app.get('#appearanceMode').value='light';app.get('#lightAt').value='08:00';
 await app.get('#form').onsubmit({preventDefault(){}});
 assert.equal(app.run('data.appearance.palettes.dark.accent'),'#ff7700');assert.equal(app.run('data.appearance.mode'),'light');
 assert.equal(app.context.document.documentElement.dataset.theme,'light');
 const restored=boot({saved:app.values.get('localboard.v1.default')});assert.equal(restored.run('data.appearance.lightAt'),'08:00');
 app.run(`download=(name,content)=>{globalThis.exported=content;}`);app.get('#export').onclick();app.get('#jsonExport').onclick();
 const seed=JSON.parse(app.context.exported),snapshot=boot({seed});assert.equal(snapshot.run('data.appearance.palettes.dark.accent'),'#ff7700');assert.equal(snapshot.context.document.documentElement.dataset.theme,'light');
});

test('manual and system quick switches respond to OS changes and timer/focus refresh',()=>{
 const app=boot({systemDark:false});app.get('#themeMode').onchange({target:{value:'system'}});
 assert.equal(app.context.document.documentElement.dataset.theme,'light');
 app.media.matches=true;app.media.events.change();assert.equal(app.context.document.documentElement.dataset.theme,'dark');
 app.get('#themeMode').onchange({target:{value:'light'}});app.callbacks.interval();app.callbacks.focus();app.callbacks.visibilitychange();
 assert.equal(app.context.document.documentElement.dataset.theme,'light');
});

test('solar selection requires explicit coordinates; geolocation is never requested automatically',async()=>{
 const app=boot();let calls=0,success;
 app.context.navigator.geolocation={getCurrentPosition:fn=>{calls++;success=fn;}};
 app.get('#themeMode').onchange({target:{value:'solar'}});assert.equal(app.run('data.appearance.mode'),'dark');assert.equal(calls,0);
 app.get('#lock').onclick();app.get('#appearance').onclick();prepareAppearanceForm(app);assert.equal(calls,0);
 app.get('#useLocation').onclick();assert.equal(calls,1);
 success({coords:{latitude:53.075,longitude:8.807}});
 assert.equal(app.run('data.appearance.location'),null);
 app.get('#appearanceMode').value='solar';await app.get('#form').onsubmit({preventDefault(){}});
 assert.deepEqual(clone(app.run('data.appearance.location')),{latitude:53.075,longitude:8.807});assert.equal(app.run('data.appearance.mode'),'solar');
});

test('late geolocation result after cancelling is ignored; failed save leaves data untouched',async()=>{
 const app=boot();let success;app.context.navigator.geolocation={getCurrentPosition:fn=>{success=fn;}};
 app.get('#lock').onclick();app.get('#appearance').onclick();prepareAppearanceForm(app);app.get('#useLocation').onclick();app.get('#cancel').onclick();
 success({coords:{latitude:53,longitude:8}});assert.equal(app.run('data.appearance.location'),null);
 app.get('#appearance').onclick();prepareAppearanceForm(app);const before=app.run('JSON.stringify(data.appearance)');
 app.get('#appearanceMode').value='solar';await app.get('#form').onsubmit({preventDefault(){}});
 assert.equal(app.run('JSON.stringify(data.appearance)'),before);assert.ok(app.alerts.length>0);
});

test('appearance labels translate in all six languages and engine is embedded in standalone build',()=>{
 const bundle=read('startpage.html');assert.ok(bundle.includes(appearanceCode));assert.ok(bundle.indexOf('id="appearanceCode"')<bundle.indexOf('id="appCode"'));
 for(const language of languages){
  const app=boot({browser:[language]});app.get('#lock').onclick();app.get('#appearance').onclick();
  assert.equal(app.get('#dialogTitle').textContent,i18n.translate(language,'appearance'));assert.ok(!app.get('#fields').innerHTML.includes('undefined'));
 }
});

test('branding edits are gated, atomic on upload failure, saved and resettable',async()=>{
 const app=boot();
 app.run('editBranding()');assert.notEqual(app.get('#modal').open,true);
 app.run('editing=true;editBranding()');
 app.get('#logoFile').files=[{}];app.get('#showEmptyGroups').checked=false;
 app.run("imageData=async()=>{throw uiError('imageReadError')}");
 await app.get('#form').onsubmit({preventDefault(){}});
 assert.equal(app.run('data.showEmptyGroups'),true);assert.equal(app.run('data.logo'),'');
 app.run("imageData=async()=>({src:'data:image/png;base64,YQ=='})");
 await app.get('#form').onsubmit({preventDefault(){}});
 assert.equal(app.run('data.showEmptyGroups'),false);
 assert.match(app.get('#brand').innerHTML,/custom-logo/);
 const saved=app.values.get('localboard.v1.default');
 const reopened=boot({saved});assert.equal(reopened.run('data.logo'),'data:image/png;base64,YQ==');assert.equal(reopened.run('data.showEmptyGroups'),false);
 const seeded=boot({seed:JSON.parse(saved)});assert.match(seeded.get('#brand').innerHTML,/custom-logo/);
 app.run('editBranding()');app.get('#cancel').onclick();assert.equal(app.run('data.logo'),'data:image/png;base64,YQ==');
 app.run('editBranding();imageData=async()=>null');app.get('#logoFile').files=[];app.get('#clearLogo').checked=true;app.get('#showEmptyGroups').checked=true;
 await app.get('#form').onsubmit({preventDefault(){}});
 assert.equal(app.run('data.logo'),'');assert.match(app.get('#brand').innerHTML,/localboard/);
});

test('legacy branding defaults, safe image validation and heading-only groups',()=>{
 const app=boot();
 assert.equal(app.run("(()=>{const d=blank();delete d.logo;delete d.showEmptyGroups;return validate(d).showEmptyGroups})()"),true);
 for(const logo of ['https://example.com/logo.png','data:image/svg+xml;base64,YQ==','\" onerror=alert(1)']){
  assert.throws(()=>app.run(`validate({...blank(),logo:${JSON.stringify(logo)}})`));
 }
 assert.ok(app.get('#content').children.every(s=>s.querySelector('.cards').innerHTML.includes('empty')));
 app.run('data.showEmptyGroups=false;renderContent()');
 assert.ok(app.get('#content').children.length>0);
 for(const section of app.get('#content').children){assert.match(section.innerHTML,/group-head/);assert.equal(section.querySelector('.cards').innerHTML,'');}
 app.run("data.views.all='list';renderContent()");
 assert.ok(app.get('#content').children.every(s=>s.querySelector('.cards').innerHTML===''));
 app.get('#search').value='no matching link';app.run('renderContent()');
 assert.match(app.get('#content').innerHTML,/empty/);
});

test('global links can be created without groups and survive reload, JSON and HTML seeds',async()=>{
 const app=boot();app.run('data.groups=[];render()');app.get('#add').onclick();
 assert.equal(app.get('#modal').open,true);assert.match(app.get('#fields').innerHTML,/<option value="all" selected>/);
 app.get('#lname').value='Global intranet';app.get('#lurl').value='https://example.org';app.get('#lgroup').value='all';app.get('#licon').files=[];
 await app.get('#form').onsubmit({preventDefault(){}});
 assert.equal(app.alerts.length,0);assert.equal(app.run('data.links[0].group'),'all');
 assert.equal(app.get('#content').children[0].dataset.group,'all');
 const saved=app.values.get('localboard.v1.default');assert.equal(boot({saved}).run('data.links[0].group'),'all');
 app.run("download=(name,content)=>{globalThis.exported=content}");app.get('#export').onclick();app.get('#jsonExport').onclick();
 const exported=JSON.parse(app.context.exported);assert.equal(exported.links[0].group,'all');assert.equal(boot({seed:exported}).run('data.links[0].group'),'all');
 assert.throws(()=>app.run("validate({...blank(),links:[{id:'bad',name:'Bad',url:'https://example.org',group:'missing'}]})"));
});

test('global links stay in the overview in grid/list/map and do not affect group counts',()=>{
 const app=boot();app.run("data.links=[{id:'global',name:'Global intranet',url:'https://example.org/',group:'all',x:50,y:50},{id:'local',name:'Camera',url:'https://camera.example/',group:'zone-b',x:50,y:50}];render()");
 assert.equal(app.get('#content').children[0].dataset.group,'all');
 assert.equal(app.get('#subtitle').textContent,i18n.translate('en','summary',{links:2,groups:4}));
 app.run("data.views.all='list';renderContent()");assert.equal(app.get('#content').children[0].dataset.group,'all');
 app.run("data.views.all='map';renderContent()");assert.equal(app.get('#content').children[0].children.length,2);
 app.run("navigate('site-a')");assert.ok(app.get('#content').children.every(s=>s.dataset.group!=='all'));
 assert.equal(app.get('#subtitle').textContent,i18n.translate('en','summary',{links:1,groups:3}));
 app.run("navigate('all');data.views.all='grid'");app.get('#search').value='Global intranet';app.run('renderContent()');
 assert.equal(app.get('#content').children.length,1);assert.equal(app.get('#content').children[0].dataset.group,'all');
 app.run("editing=true;editGroup(data.groups.find(g=>g.id==='site-a'))");app.get('#remove').onclick();
 assert.equal(app.run('data.links.length'),1);assert.equal(app.run('data.links[0].id'),'global');
});

test('link dialogs default to their context and existing links can move to global',async()=>{
 const app=boot();app.run("navigate('zone-b');editLink()");assert.match(app.get('#fields').innerHTML,/<option value="zone-b" selected>/);
 app.run("editing=true;data.links=[{id:'local',name:'Camera',url:'https://example.org/',group:'zone-b'}];editLink(data.links[0])");
 app.get('#lname').value='Camera';app.get('#lurl').value='https://example.org/';app.get('#lgroup').value='all';app.get('#licon').files=[];
 await app.get('#form').onsubmit({preventDefault(){}});assert.equal(app.run('data.links[0].group'),'all');
 app.run('editLink(data.links[0])');assert.match(app.get('#fields').innerHTML,/<option value="all" selected>/);
 assert.doesNotMatch(app.run("groupOptions(null)"),/value="all"/);
});
