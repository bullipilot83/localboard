'use strict';
// Pure appearance and scheduling logic. No network requests or external dependencies.
const LocalboardAppearance = (() => {
 const modes=['dark','light','system','schedule','solar'];
 const palettes={
  dark:{bg:'#101416',panel:'#181e21',sidebar:'#151a1d',text:'#ecf1f4',muted:'#91a0a8',accent:'#b9f279',line:'#2b3338'},
  light:{bg:'#f3f5f7',panel:'#ffffff',sidebar:'#e9eef3',text:'#18232d',muted:'#53616d',accent:'#2563eb',line:'#c4ced7'}
 };
 const colorKeys=Object.keys(palettes.dark);
 const colorOK=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
 const timeOK=v=>typeof v==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v);
 const coordinatesOK=v=>v&&typeof v==='object'&&Number.isFinite(v.latitude)&&Math.abs(v.latitude)<=90&&Number.isFinite(v.longitude)&&Math.abs(v.longitude)<=180;
 const copy=v=>JSON.parse(JSON.stringify(v));
 function defaults(){return {mode:'dark',lightAt:'07:00',darkAt:'19:00',location:null,palettes:copy(palettes)};}
 function normalize(value){
  const a=defaults();if(!value||typeof value!=='object')return a;
  if(modes.includes(value.mode))a.mode=value.mode;
  if(timeOK(value.lightAt))a.lightAt=value.lightAt;
  if(timeOK(value.darkAt))a.darkAt=value.darkAt;
  if(a.lightAt===a.darkAt){a.lightAt='07:00';a.darkAt='19:00';}
  if(coordinatesOK(value.location))a.location={latitude:value.location.latitude,longitude:value.location.longitude};
  for(const scheme of ['dark','light'])for(const key of colorKeys){const v=value.palettes?.[scheme]?.[key];if(colorOK(v))a.palettes[scheme][key]=v.toLowerCase();}
  return a;
 }
 const minutes=s=>Number(s.slice(0,2))*60+Number(s.slice(3));
 function scheduled(a,date){
  const start=minutes(a.lightAt),end=minutes(a.darkAt),now=date.getHours()*60+date.getMinutes();
  return (start<end?now>=start&&now<end:now>=start||now<end)?'light':'dark';
 }
 // NOAA approximate solar position equations, evaluated using UTC throughout.
 // https://gml.noaa.gov/grad/solcalc/solareqns.PDF
 // The -0.833° horizon accounts approximately for refraction and the solar disk.
 // Direct elevation handles polar day/night and UTC date boundaries without a remote API.
 function solarElevation(date,latitude,longitude){
  const year=date.getUTCFullYear(),start=Date.UTC(year,0,1),days=(Date.UTC(year+1,0,1)-start)/86400000;
  const day=Math.floor((Date.UTC(year,date.getUTCMonth(),date.getUTCDate())-start)/86400000)+1;
  const hour=date.getUTCHours()+date.getUTCMinutes()/60+date.getUTCSeconds()/3600;
  const gamma=2*Math.PI/days*(day-1+(hour-12)/24),cos=Math.cos,sin=Math.sin;
  const eq=229.18*(.000075+.001868*cos(gamma)-.032077*sin(gamma)-.014615*cos(2*gamma)-.040849*sin(2*gamma));
  const decl=.006918-.399912*cos(gamma)+.070257*sin(gamma)-.006758*cos(2*gamma)+.000907*sin(2*gamma)-.002697*cos(3*gamma)+.00148*sin(3*gamma);
  const trueMinutes=((hour*60+eq+4*longitude)%1440+1440)%1440;
  const angle=(trueMinutes/4-180)*Math.PI/180,lat=latitude*Math.PI/180;
  const zenith=sin(lat)*sin(decl)+cos(lat)*cos(decl)*cos(angle);
  return Math.asin(Math.max(-1,Math.min(1,zenith)))*180/Math.PI;
 }
 function resolve(a,date=new Date(),systemDark=true){
  if(a.mode==='system')return systemDark?'dark':'light';
  if(a.mode==='schedule')return scheduled(a,date);
  if(a.mode==='solar')return coordinatesOK(a.location)?(solarElevation(date,a.location.latitude,a.location.longitude)>=-.833?'light':'dark'):scheduled(a,date);
  return a.mode==='light'?'light':'dark';
 }
 const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
 function mix(a,b,weight){const x=rgb(a),y=rgb(b);return '#'+x.map((v,i)=>Math.round(v*(1-weight)+y[i]*weight).toString(16).padStart(2,'0')).join('');}
 function luminance(hex){const c=rgb(hex).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*c[0]+.7152*c[1]+.0722*c[2];}
 function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
 function tokens(p,scheme){
  const out={...p};out['on-accent']=contrast(p.accent,'#000000')>contrast(p.accent,'#ffffff')?'#000000':'#ffffff';
  out.button=mix(p.panel,p.text,.04);out.hover=mix(p.panel,p.text,.1);out.input=mix(p.bg,p.panel,.35);
  out.selected=mix(p.panel,p.accent,.13);out['icon-bg']=mix(p.panel,p.accent,.1);
  out['notice-bg']=mix(p.panel,p.accent,.12);out['notice-text']=p.text;
  out.danger=scheme==='light'?'#b42318':'#ff9c9c';out.map=p.panel;out['map-dot']=p.line;
  return out;
 }
 function lowContrast(p){return contrast(p.text,p.bg)<4.5||contrast(p.text,p.panel)<4.5||contrast(p.muted,p.bg)<4.5;}
 return {modes,palettes,colorKeys,colorOK,timeOK,coordinatesOK,defaults,normalize,scheduled,solarElevation,resolve,tokens,contrast,lowContrast};
})();
