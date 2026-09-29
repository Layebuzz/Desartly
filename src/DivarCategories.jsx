import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import './DivarCategories.css';

const categories = [
  ['property', 'Real Estate'], ['vehicles', 'Vehicles'],
  ['electronics', 'Electronics'], ['living', 'Home & Living'],
  ['fashion', 'Fashion'], ['beauty', 'Beauty & Care'],
  ['sports', 'Sports & Leisure'], ['community', 'Community'],
];

export function DivarCategories() {
  const [selected, setSelected] = useState('electronics');
  const reducedMotion = useReducedMotion();
  const selectedLabel = categories.find(([id]) => id === selected)[1];
  return <section className="divar-categories" aria-labelledby="divar-categories-title" lang="en" dir="ltr">
    <div className="divar-categories-panel">
      <header className="divar-categories-header">
        <div><span className="divar-categories-eyebrow">DISCOVER YOUR NEXT</span><h2 id="divar-categories-title">A world of possibilities.</h2></div>
        <span className="divar-categories-count">08 categories</span>
      </header>
      <div className="divar-categories-grid" role="group" aria-label="Choose a category">
        {categories.map(([id, label]) => <motion.button key={id} type="button"
          className="divar-category-tile" aria-pressed={selected === id}
          onClick={() => setSelected(id)}
          whileHover={reducedMotion ? undefined : { y: -2 }}
          whileTap={reducedMotion ? undefined : { scale: 0.99 }}
          transition={{ duration: 0.16, ease: [0.2, 0.65, 0.3, 1] }}>
          <span className="divar-category-check" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="m4 8 2.5 2.5L12 5" /></svg></span>
          <img src={`/projects/divar/icons/${id}.webp`} alt="" width="320" height="320" decoding="async" />
          <span className="divar-category-label">{label}</span>
        </motion.button>)}
      </div>
      <footer className="divar-categories-status"><span>Find what moves you.</span><span aria-live="polite" aria-atomic="true"><i aria-hidden="true" />{selectedLabel} selected</span></footer>
    </div>
  </section>;
}
