import React from 'react';

// Text-only leaves keep their React-owned structure; copy overrides are plain text.
export function VisualCopy({children, copy = {}, onChange, editable = false, scope = 'page'}) {
  const root = React.useRef(null);
  React.useLayoutEffect(() => {
    const counts = new Map();
    root.current?.querySelectorAll('h1,h2,h3,h4,p,span,small,label,a,button,li,dt,dd,strong,blockquote,figcaption').forEach(el => {
      if ((!editable && el.closest(".editor")) || el.closest('[data-editor-ui],.art,[contenteditable=true]:not([data-copy-key]),iframe,select') || el.children.length || !el.textContent.trim()) return;
      const original = el.dataset.copyOriginal || el.textContent;
      el.dataset.copyOriginal = original;
      const occurrence = counts.get(original) || 0;
      counts.set(original, occurrence + 1);
      const key = el.dataset.copyKey || `${scope}:${original.trim()}:${occurrence}`;
      el.dataset.copyKey = key;
      if (document.activeElement !== el && Object.hasOwn(copy, key)) el.textContent = copy[key];
      if (editable) {
        el.contentEditable = 'true';
        el.setAttribute('aria-label', `Edit: ${original.trim()}`);
      }
    });
  });
  return <div ref={root} className={editable ? 'visual-copy is-editing-copy' : 'visual-copy'} onClickCapture={e => {
    if (editable && e.target.closest('a') && !e.target.closest('[data-editor-ui]')) e.preventDefault();
    if (editable && e.target.closest('[data-copy-key]')) { e.preventDefault(); e.stopPropagation(); }
  }} onBlurCapture={e => {
    const key = e.target.dataset.copyKey;
    if (editable && key) onChange?.(key, e.target.innerText);
  }}>{children}</div>;
}
