import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const code=readFileSync(new URL('../source/appearance.js',import.meta.url),'utf8');
const ctx=vm.createContext({});vm.runInContext(code,ctx);const A=vm.runInContext('LocalboardAppearance',ctx);
const plain=x=>JSON.parse(JSON.stringify(x));
const at=(hours,minutes=0)=>new Date(2026,9,15,hours,minutes);

test('legacy settings keep dark theme; defaults and palettes are independent copies',()=>{
 const a=A.normalize(undefined),b=A.defaults();assert.equal(a.mode,'dark');
 a.palettes.dark.accent='#000000';assert.notEqual(b.palettes.dark.accent,a.palettes.dark.accent);
 assert.equal(a.palettes.light.bg,'#f3f5f7');
});
test('import validation strips unsafe CSS, unknown fields and invalid schedules/locations',()=>{
 const a=A.normalize({mode:'anything',lightAt:'99:00',darkAt:'07:00',location:{latitude:Infinity,longitude:0},palettes:{dark:{bg:'url(https://example.com)',text:'#ABCDEF',accent:'red;display:none',unknown:'#ffffff'}},evil:'x'});
 assert.equal(a.mode,'dark');assert.equal(a.location,null);assert.equal(a.lightAt,'07:00');assert.equal(a.darkAt,'19:00');
 assert.equal(a.palettes.dark.text,'#abcdef');assert.equal(a.palettes.dark.bg,A.palettes.dark.bg);assert.equal(a.evil,undefined);assert.equal(a.palettes.dark.unknown,undefined);
 for(const location of [{latitude:91,longitude:0},{latitude:0,longitude:181},{latitude:'53',longitude:8}])assert.equal(A.normalize({location}).location,null);
 assert.deepEqual(plain(A.normalize({location:{latitude:0,longitude:0}}).location),{latitude:0,longitude:0});
});
test('manual and system themes resolve predictably',()=>{
 const a=A.defaults();assert.equal(A.resolve(a,at(12),false),'dark');
 a.mode='light';assert.equal(A.resolve(a,at(0),true),'light');a.mode='system';
 assert.equal(A.resolve(a,at(0),false),'light');assert.equal(A.resolve(a,at(12),true),'dark');
});
test('clock schedule handles both boundaries and intervals crossing midnight',()=>{
 const a=A.defaults();a.mode='schedule';
 for(const [h,m,expected] of [[6,59,'dark'],[7,0,'light'],[18,59,'light'],[19,0,'dark']])assert.equal(A.resolve(a,at(h,m)),expected);
 a.lightAt='20:00';a.darkAt='06:00';
 for(const [h,m,expected] of [[19,59,'dark'],[20,0,'light'],[0,0,'light'],[5,59,'light'],[6,0,'dark']])assert.equal(A.resolve(a,at(h,m)),expected);
});
test('solar position gives opposite day/night hemispheres and correct seasonal polar states',()=>{
 const a=A.defaults();a.mode='solar';a.location={latitude:0,longitude:0};
 assert.equal(A.resolve(a,new Date('2026-03-20T12:00:00Z')),'light');assert.equal(A.resolve(a,new Date('2026-03-20T00:00:00Z')),'dark');
 a.location.longitude=180;assert.equal(A.resolve(a,new Date('2026-03-20T00:00:00Z')),'light');assert.equal(A.resolve(a,new Date('2026-03-20T12:00:00Z')),'dark');
 for(const lon of [-180,180])assert.ok(Number.isFinite(A.solarElevation(new Date('2028-02-29T23:59:00Z'),90,lon)));
 a.location={latitude:89,longitude:0};assert.equal(A.resolve(a,new Date('2026-06-21T00:00:00Z')),'light');assert.equal(A.resolve(a,new Date('2026-12-21T12:00:00Z')),'dark');
 a.location.latitude=-89;assert.equal(A.resolve(a,new Date('2026-06-21T12:00:00Z')),'dark');assert.equal(A.resolve(a,new Date('2026-12-21T00:00:00Z')),'light');
});
test('solar mode without coordinates falls back to schedule, not an invented location',()=>{
 const a=A.defaults();a.mode='solar';assert.equal(A.resolve(a,at(12)),'light');assert.equal(A.resolve(a,at(23)),'dark');
});
test('theme tokens contain safe colors and choose legible accent-button text',()=>{
 for(const scheme of ['dark','light']){
  const p=A.palettes[scheme],tokens=A.tokens(p,scheme);
  for(const value of Object.values(tokens))assert.ok(A.colorOK(value));
  assert.ok(A.contrast(p.accent,tokens['on-accent'])>=4.5);assert.equal(A.lowContrast(p),false);
 }
 assert.equal(A.lowContrast({...A.palettes.light,text:'#f3f5f7'}),true);
});
