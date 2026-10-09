import {metadata} from '../src/cms/metadata.js';
import {publicOrigin} from './site-domains.js';
const origin=publicOrigin;
const pathId=value=>{try{return decodeURIComponent(value)}catch{return value}};
const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function articleStructuredData(site,path){
 const id=path.startsWith('/journal/')?path.slice('/journal/'.length):null;
 const doc=(site.blogPosts||[]).find(p=>p.id===id&&!p.archived&&!p.hidden);if(!doc)return '';
 const data={'@context':'https://schema.org','@type':'Article',headline:doc.title,description:doc.excerpt||'',url:origin+path,...(doc.author?{author:{'@type':'Person',name:doc.author}}:{}),...(typeof doc.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(doc.date)?{datePublished:doc.date}:{}),...(doc.coverImage?{image:new URL(doc.coverImage,origin).href}:{})};
 return '<script type="application/ld+json">'+JSON.stringify(data).replaceAll('<','\\u003c')+'</script>';
}
export function pageStructuredData(site,path){
 const url=origin+path,m=metadata(site,path),name='Ali Komeili';let data;
 if(path==='/')data={'@context':'https://schema.org','@type':'WebSite',name:'Desartly',url:origin+'/'};
 else if(path==='/about')data={'@context':'https://schema.org','@type':'ProfilePage',url,name:m.title,mainEntity:{'@type':'Person',name,url:origin+'/about',jobTitle:'Independent designer'}};
 else if(['/work','/journal','/certificates'].includes(path)){
  const list=path==='/work'?(site.projects||[]).filter(d=>!d.archived&&!d.hidden).map(d=>({name:d.title,url:origin+'/work/'+encodeURIComponent(d.id)})):path==='/journal'?(site.blogPosts||[]).filter(d=>!d.archived&&!d.hidden).map(d=>({name:d.title,url:origin+'/journal/'+encodeURIComponent(d.id)})):(site.certificates||[]).map(d=>({name:d.title||d.name}));
  data={'@context':'https://schema.org','@type':'CollectionPage',url,name:m.title,mainEntity:{'@type':'ItemList',itemListElement:list.map((d,i)=>({'@type':'ListItem',position:i+1,...d}))}};
 }else if(path.startsWith('/work/')){const doc=(site.projects||[]).find(d=>d.id===pathId(path.slice(6))&&!d.hidden&&!d.archived);if(doc)data={'@context':'https://schema.org','@type':'CreativeWork',name:doc.title,description:doc.summary||'',url};}
 return data?'<script type="application/ld+json">'+JSON.stringify(data).replaceAll('<','\\u003c')+'</script>':'';
}
export function pageHead(html,site,path){const m=metadata(site,path),url=origin+path;return html.replace(/<title>[^<]*<\/title>/,'').replace(/<meta name="description"[^>]*>/,'').replace('</head>',`${path==='/'?'<meta name="google-site-verification" content="H9jf9PEkXksHvhPZ1WTyNojGRZusSp1HOMSO_6htWdw"/>':''}<title>${escape(m.title)}</title><meta name="description" content="${escape(m.description)}"/><link rel="canonical" href="${escape(url)}"/><meta property="og:type" content="website"/><meta property="og:title" content="${escape(m.title)}"/><meta property="og:description" content="${escape(m.description)}"/><meta property="og:url" content="${escape(url)}"/>${m.image?`<meta property="og:image" content="${escape(new URL(m.image,origin).href)}"/>`:''}<meta name="twitter:card" content="summary_large_image"/>${articleStructuredData(site,path)}${pageStructuredData(site,path)}</head>`);}
export function sitemap(site){const paths=['/','/work','/journal','/about','/services','/certificates','/contact','/privacy',...(site.projects||[]).filter(d=>!d.archived&&!d.hidden).map(d=>'/work/'+encodeURIComponent(d.id)),...(site.blogPosts||[]).filter(d=>!d.archived&&!d.hidden).map(d=>'/journal/'+encodeURIComponent(d.id))];return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(p=>'<url><loc>'+escape(origin+p)+'</loc></url>').join('')+'</urlset>';}
