import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { safeLink } from "./data";

export function CredentialGallery({ certificates }) {
  const [selected, setSelected] = useState(null);
  const [formats, setFormats] = useState({});
  const dialog = useRef(null);
  const trigger = useRef(null);
  useEffect(() => {
    if (!selected) return;
    dialog.current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = old; };
  }, [selected]);
  const close = () => { dialog.current?.close(); setSelected(null); trigger.current?.focus(); };
  const rememberFormat = (id, image) => {
    const ratio = image.naturalWidth / image.naturalHeight;
    const format = ratio > 1.15 ? "landscape" : ratio < .88 ? "portrait" : "square";
    setFormats(current => current[id] === format ? current : { ...current, [id]: format });
  };
  return <>
    <div className="credential-cards">
      {certificates.map((credential, index) => <motion.button type="button" className={`credential-card is-${formats[credential.id] || "unknown"}`} key={credential.id} onClick={event => { trigger.current = event.currentTarget; setSelected(credential); }} aria-label={`View certificate: ${credential.title}`} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.18 }} transition={{ duration: 0.5, delay: (index % 4) * 0.055, ease: [0.22, 1, 0.36, 1] }} whileHover={{ y: -4 }}>
        <div className="credential-cover">{credential.image ? <img src={credential.image} alt={credential.title} loading="lazy" onLoad={event => rememberFormat(credential.id, event.currentTarget)} /> : <span>Certificate</span>}{credential.topTenPercent && <span className="credential-badge">Top 10% of class</span>}</div>
        <div className="credential-meta"><small>{credential.issuer}{credential.date ? ` · ${credential.date}` : ""}</small><h2>{credential.title}</h2><span>View details +</span></div>
      </motion.button>)}
    </div>
    <dialog ref={dialog} className="credential-dialog" aria-labelledby="credential-title" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      {selected && <div className={`credential-dialog-body is-${formats[selected.id] || "unknown"}`}><button type="button" className="credential-close" onClick={close} autoFocus aria-label="Close certificate">Close ×</button>{selected.image && <div className="credential-dialog-media"><img src={selected.image} alt={selected.title} onLoad={event => rememberFormat(selected.id, event.currentTarget)} /></div>}<div className="credential-dialog-copy"><small>{selected.issuer}{selected.date ? ` · ${selected.date}` : ""}</small><h2 id="credential-title">{selected.title}</h2>{selected.topTenPercent && <span className="credential-badge">Top 10% of class</span>}<p>{selected.description || "Further details about this credential will be added soon."}</p>{safeLink(selected.url) && <a className="portfolio-action" href={safeLink(selected.url)} target="_blank" rel="noopener noreferrer">Verify credential ↗</a>}</div></div>}
    </dialog>
  </>;
}
