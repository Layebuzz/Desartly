import React from 'react';
export function ArticleIntro({article}) {
 const fa=article.language==='fa',cover=article.heroImage||article.coverImage;
 const minutes=article.readingTime||Math.max(1,Math.ceil((article.blocks||[]).map(b=>b.text||b.markdown||'').join(' ').split(/\s+/).length/200));
 const parsedDate=new Date((article.date||'')+'T12:00:00');
 const date=article.date&&!Number.isNaN(parsedDate.getTime())?new Intl.DateTimeFormat(fa?'fa-IR':'en-GB',{year:'numeric',month:'long',day:'numeric'}).format(parsedDate):article.date||'';
 const rows=[[fa?'نویسنده':'Author',article.author||'Ali Komeili'],[fa?'تاریخ':'Date',date],[fa?'موضوع':'Subject',article.category],[fa?'زمان مطالعه':'Reading time',fa?minutes.toLocaleString('fa')+' دقیقه':minutes+' min']];
 return <section className="article-intro" aria-labelledby="article-title"><div className="article-intro-copy"><span className="eyebrow">{fa?'ژورنال / یادداشت طراحی':'JOURNAL / DESIGN NOTES'}</span><h1 id="article-title">{article.title}</h1><dl>{rows.filter(([,v])=>v).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><div className="article-intro-challenge"><h2>{fa?'چالش این یادداشت':'The question behind this story'}</h2><p>{article.challenge||article.excerpt}</p></div>{article.tags?.length>0&&<ul className="article-intro-tags" aria-label={fa?'موضوعات مقاله':'Article topics'}>{article.tags.map(t=><li key={t}>{t}</li>)}</ul>}</div>{cover&&<figure className="article-intro-cover"><img src={cover} alt={article.coverAlt||article.title} decoding="async" fetchPriority="high"/></figure>}</section>;
}
