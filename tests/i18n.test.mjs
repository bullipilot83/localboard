import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const catalogCode=read('source/i18n.js'), appCode=read('source/app.js'), html=read('source/startpage.html');
const catalogContext=vm.createContext({});
vm.runInContext(catalogCode,catalogContext);
const i18n=vm.runInContext('LocalboardI18n',catalogContext);
const languages=['de','en','fr','es','it','nl'];

// Minimal DOM adapter for application state and text tests; not a layout/browser test.
class Element {
 constructor(){this.dataset={};this.style={};this.children=[];this.value='';this.textContent='';this.innerHTML='';this.nodes=new Map();this.classList={toggle(){},add(){},remove(){}};}
 querySelector(s){if(!this.nodes.has(s))this.nodes.set(s,new Element());return this.nodes.get(s);}
 querySelectorAll(){return [];}
 setAttribute(k,v){this[k]=v;}
 removeAttribute(k){delete this[k];}
 append(...els){this.children.push(...els);}
 replaceChildren(...els){this.children=els;}
 showModal(){this.open=true;}
 close(){this.open=false;}
 focus(){}
}
function boot({browser=['en-US'],saved=null,seed=null,blocked=false}={}){
 const nodes=new Map(),get=s=>{if(!nodes.has(s))nodes.set(s,new Element());return nodes.get(s);};
 const markers=[];
 for(const match of html.matchAll(/<[^>]+data-i18n(?:-[a-z]+)?="[^"]+"[^>]*>/g)){
  const tag=match[0],id=tag.match(/\bid="([^"]+)"/),el=id?get('#'+id[1]):new Element();
  for(const attr of tag.matchAll(/data-(i18n(?:-[a-z]+)?)="([^"]+)"/g))el.dataset[attr[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=attr[2];
  markers.push(el);
 }
 get('#seed').textContent=JSON.stringify(seed);
 const values=new Map(saved?[['localboard.v1.default',saved]]:[]),alerts=[],confirms=[];
 const context=vm.createContext({navigator:{languages:browser},URL,Blob,Date,console,setTimeout,
  document:{querySelector:get,querySelectorAll:s=>markers.filter(el=>Object.hasOwn(el.dataset,s.slice(6,-1).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()))),documentElement:{lang:''},body:new Element(),createElement:()=>new Element()},
  window:{addEventListener(){}},localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(blocked)throw Error('blocked');values.set(k,v);}},
  confirm:s=>{confirms.push(s);return true;},alert:s=>alerts.push(s),Image:class extends Element{}
 });
 // Handle the data-view selection separately from translated DOM markers.
 const original=context.document.querySelectorAll;
 context.document.querySelectorAll=s=>s==='[data-view]'?[]:original(s);
 vm.runInContext(catalogCode,context);vm.runInContext(appCode,context);
 return {context,get,values,alerts,confirms,run:code=>vm.runInContext(code,context)};
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
 for(const key of keys)assert.ok(Object.hasOwn(i18n.catalogs.en,key),key);
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
