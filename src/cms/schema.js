import {initialProjects,categories} from '../data.js';
export const uid=()=>crypto.randomUUID();
export const sectionTypes=['intro','projects','logos','text','image','gallery','quote','stats','practice','contact','video','embed','comparison','steps'];
export function newSection(type='text'){return {id:uid(),type,title:'',text:'',visible:true,items:[],width:'wide',background:'white',spacing:'normal'};}
export function defaults(){return {
 schema:1,projects:structuredClone(initialProjects),categories:[...categories],certificates:[],pages:{
 '/':{title:'Product thinking.',subtitle:'Visual character.',intro:"I'm Ali, an independent designer connecting digital experiences, visual identities and ideas that move people.",sections:['intro','logos','projects','practice','quote','contact'].map(type=>({...newSection(type),visible:!['logos','quote'].includes(type)}))},
 '/about':{sections:[]},'/resume':{sections:[]},'/services':{sections:[]},'/contact':{sections:[]},'/certificates':{sections:[]},'/work':{sections:[]}},
 nav:['Work','About','Resume','Certificates','Contact'].map(label=>({id:uid(),label,url:'/'+label.toLowerCase(),visible:true})),footer:[{id:uid(),label:'Services',url:'/services',visible:true},{id:uid(),label:'Privacy',url:'/privacy',visible:true}],
 slides:[],clients:[],testimonials:[],collections:[],media:[],trash:[],
 profile:{name:'Ali Komeili',logo:'pol',description:'DESIGN PORTFOLIO',bio:'',photo:'',resume:'',experience:[],skills:[]},
 theme:{ink:'#202632',muted:'#697080',blue:'#3475ef',violet:'#8255db',rose:'#ff678c',surface:'#f5f6fa',font:'Manrope',width:1440,space:1},
 settings:{autoplay:true,interval:5,analytics:false,siteTitle:'Pol — Ali Komeili',description:'Product & AI, branding and advertising.',shareImage:''}
};}
export function migrateLegacy(){const base=defaults();try{for(const [key,field]of [['pol-published','projects'],['pol-categories','categories'],['pol-certificates','certificates']]){const data=JSON.parse(localStorage.getItem(key));if(Array.isArray(data)&&data.length)base[field]=data;}const pages=JSON.parse(localStorage.getItem('pol-page-content'))||{};for(const [path,page]of Object.entries(pages))base.pages[path]={...base.pages[path],...page};}catch{}return base;}
export function normalize(site){const d=defaults();return {...d,...site,pages:{...d.pages,...site?.pages},profile:{...d.profile,...site?.profile},theme:{...d.theme,...site?.theme},settings:{...d.settings,...site?.settings}};}
export function publicSite(site){const copy=structuredClone(site);copy.projects=copy.projects.filter(p=>!p.hidden);copy.trash=[];copy.media=[];return copy;}
export function references(site,id){const needle='/api/media/'+id;const copy={...site,media:[],trash:[]};return JSON.stringify(copy).includes(needle);}
export function reorder(items,from,to){const out=[...items];if(from<0||to<0||from>=out.length||to>=out.length)return out;out.splice(to,0,out.splice(from,1)[0]);return out;}
export function validateSite(site){if(!site||site.schema!==1||!Array.isArray(site.projects)||!Array.isArray(site.categories)||!site.pages||!Array.isArray(site.nav))throw Error('Invalid portfolio file.');if(site.projects.length>500||Object.keys(site.pages).length>200)throw Error('Portfolio is too large.');const ids=new Set();for(const p of site.projects){if(!p.id||ids.has(p.id)||!Array.isArray(p.blocks))throw Error('Project IDs must be unique and blocks must be arrays.');ids.add(p.id);}for(const path of Object.keys(site.pages)){if(!/^\/(?![\/\\])/.test(path)||/[?#]/.test(path))throw Error('Invalid page path.');}return normalize(site);}
