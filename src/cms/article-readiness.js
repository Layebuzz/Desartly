const filled=value=>typeof value==='string'&&Boolean(value.trim());
export function articleReadiness(doc={}){
 const blocks=doc.blocks||[],texts=blocks.filter(b=>filled(b.text)||filled(b.markdown)),images=blocks.filter(b=>b.type==='image'&&filled(b.image));
 const definitions=[
 ['Foundation','Title',filled(doc.title),'Give the article a clear, specific title.'],
 ['Foundation','Excerpt',filled(doc.excerpt),'Introduce the question and the reader’s takeaway.'],
 ['Foundation','Cover',filled(doc.coverImage),'Choose a cover connected to the article’s subject.'],
 ['Foundation','Author',filled(doc.author),'Name the author.'],
 ['Foundation','Date',filled(doc.date),'Set the article date.'],
 ['Foundation','Category',filled(doc.category),'Choose an editorial category.'],
 ['Story','Opening',filled(texts[0]?.text)||filled(texts[0]?.markdown),'Open with a question, observation or experience.'],
 ['Story','Chapters',texts.length>=3,'Develop the story in at least three text sections.'],
 ['Story','Headings',texts.length>0&&texts.every(b=>filled(b.title)||filled(b.markdown)),'Make the structure easy to scan.'],
 ['Story','Closing',texts.length>=2&&(filled(texts.at(-1)?.text)||filled(texts.at(-1)?.markdown)),'End with a takeaway and a useful next step.'],
 ['Visuals & context','Supporting images',images.length>0,'Connect the observations to project visuals.'],
 ['Visuals & context','Image descriptions',images.length>0&&images.every(b=>filled(b.alt)),'Describe each supporting image.'],
 ['Visuals & context','Image captions',images.length>0&&images.every(b=>filled(b.caption)),'Explain what each image contributes.'],
 ['Visuals & context','Sources',doc.references?.some(r=>filled(r.url)&&filled(r.takeaway)),'Record sources and what they support.'],
 ['Visuals & context','Related project',filled(doc.relatedProject),'Connect the article to its project.'],
 ['Distribution','Language',filled(doc.language),'Set the language for typography and reading direction.'],
 ['Distribution','Tags',doc.tags?.some(filled),'Add useful topic tags.'],
 ['Distribution','Persian caption',filled(doc.announcement?.fa),'Write a private Persian social caption.'],
 ['Distribution','English caption',filled(doc.announcement?.en),'Write a private English social caption.'],
 ['Distribution','Hashtags',filled(doc.announcement?.hashtags),'Add relevant social hashtags.']
 ];const items=definitions.map(([group,title,checked,guidance],i)=>({id:'article-'+i,group,title,checked:Boolean(checked),guidance})),checked=items.filter(i=>i.checked).length;
 return {items,checked,total:items.length,score:checked*5};
}
