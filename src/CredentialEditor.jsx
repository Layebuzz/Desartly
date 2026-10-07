import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, ImagePlus, Plus, Trash2 } from "lucide-react";

const blankCredential = (title = "Untitled certificate") => ({
  id: crypto.randomUUID(), title, issuer: "", date: "", url: "",
  description: "", image: "", topTenPercent: false,
});

function filenameTitle(filename) {
  return filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Untitled certificate";
}

export function CredentialEditor({ items, onChange, onUpload, onNotice }) {
  const [selectedId, setSelectedId] = useState(items[0]?.id || null);
  const [uploading, setUploading] = useState("");
  const selectedIndex = Math.max(0, items.findIndex(item => item.id === selectedId));
  const selected = items[selectedIndex];
  const completeCount = useMemo(() => items.filter(item => item.title && item.issuer && item.image).length, [items]);

  const patch = (id, values) => onChange(current => current.map(item => item.id === id ? { ...item, ...values } : item));

  function addCredential() {
    const credential = blankCredential();
    onChange(current => [...current, credential]);
    setSelectedId(credential.id);
    onNotice?.("Certificate added. Complete its details, then save the draft.");
  }

  function move(index, direction) {
    const destination = index + direction;
    if (destination < 0 || destination >= items.length) return;
    onChange(current => {
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  }

  async function uploadOne(item, file) {
    setUploading(item.id);
    try {
      patch(item.id, { image: await onUpload(file) });
      onNotice?.("Certificate image converted to WebP. Save the draft to retain it.");
    } catch (error) {
      onNotice?.(error.message || "The image could not be uploaded.");
    } finally {
      setUploading("");
    }
  }

  async function uploadMany(files) {
    if (!files.length) return;
    setUploading("bulk");
    let next = [...items];
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const emptyIndex = next.findIndex(item => !item.image);
        const image = await onUpload(file);
        if (emptyIndex >= 0) next[emptyIndex] = { ...next[emptyIndex], image };
        else next.push({ ...blankCredential(filenameTitle(file.name)), image });
        onNotice?.(`Uploading certificates ${index + 1} / ${files.length}…`);
      }
      onChange(next);
      onNotice?.(`${files.length} certificate images are ready. Save the draft, then publish when ready.`);
    } catch (error) {
      onChange(next);
      onNotice?.(error.message || "Upload stopped. Successfully uploaded images were kept.");
    } finally {
      setUploading("");
    }
  }

  function removeSelected() {
    if (!selected || !window.confirm(`Remove “${selected.title}” from the draft?`)) return;
    const nextId = items[selectedIndex + 1]?.id || items[selectedIndex - 1]?.id || null;
    onChange(current => current.filter(item => item.id !== selected.id));
    setSelectedId(nextId);
  }

  return <main className="credential-studio" data-editor-ui>
    <header className="credential-studio-heading">
      <div>
        <span className="eyebrow">COLLECTION / CERTIFICATES</span>
        <h1>Credentials</h1>
        <p>Choose a card to edit it. Images stay uncropped so the complete document remains visible.</p>
        <small>{completeCount} complete · {items.length - completeCount} need details</small>
      </div>
      <div className="credential-studio-actions">
        <label className="button secondary-upload"><ImagePlus size={15}/> {uploading === "bulk" ? "Uploading…" : "Import images"}<input type="file" accept="image/png,image/jpeg,image/webp,image/avif" multiple disabled={!!uploading} onChange={event => { uploadMany([...event.target.files]); event.target.value = ""; }}/></label>
        <button className="button" onClick={addCredential}><Plus size={15}/> New certificate</button>
      </div>
    </header>

    {items.length === 0 ? <button className="credential-empty-state" onClick={addCredential}><ImagePlus size={24}/><strong>Add your first certificate</strong><span>Upload the document and add its title, issuer and date.</span></button> : <div className="credential-studio-layout">
      <section className="credential-library" aria-label="Certificate library">
        {items.map((item, index) => <article key={item.id} className={`credential-library-card${item.id === selected?.id ? " active" : ""}`}>
          <button className="credential-library-select" onClick={() => setSelectedId(item.id)} aria-pressed={item.id === selected?.id}>
            <span className="credential-library-image">{item.image ? <img src={item.image} alt="" loading="lazy"/> : <ImagePlus size={22}/>} {item.topTenPercent && <i>TOP 10%</i>}</span>
            <span className="credential-library-copy"><strong>{item.title || "Untitled certificate"}</strong><small>{item.issuer || "Issuer needed"}</small></span>
            {item.title && item.issuer && item.image ? <Check className="credential-complete" size={15}/> : <span className="credential-incomplete">Needs details</span>}
          </button>
          <span className="credential-order"><button aria-label={`Move ${item.title} up`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={13}/></button><button aria-label={`Move ${item.title} down`} disabled={index === items.length - 1} onClick={() => move(index, 1)}><ArrowDown size={13}/></button></span>
        </article>)}
      </section>

      {selected && <section className="credential-fields" aria-label={`Edit ${selected.title}`}>
        <div className="credential-fields-heading"><div><span>{String(selectedIndex + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span><h2>{selected.title || "Untitled certificate"}</h2></div><button className="icon-danger" aria-label="Remove certificate" onClick={removeSelected}><Trash2 size={16}/></button></div>
        <label>Certificate title<input value={selected.title || ""} onChange={event => patch(selected.id, { title: event.target.value })}/></label>
        <label>Learning topic · used for creative progress<input value={selected.category||''} placeholder="Product & UX, Branding, 3D, AI…" onChange={event=>patch(selected.id,{category:event.target.value})}/></label><div className="credential-short-fields"><label>Issuer<input value={selected.issuer || ""} onChange={event => patch(selected.id, { issuer: event.target.value })}/></label><label>Completion date<input type="date" value={selected.date || ""} onChange={event => patch(selected.id, { date: event.target.value })}/></label></div>
        <label>Verification URL <span>Optional</span><input type="url" placeholder="https://…" value={selected.url || ""} onChange={event => patch(selected.id, { url: event.target.value })}/></label>
        <label>Description<textarea rows={5} value={selected.description || ""} onChange={event => patch(selected.id, { description: event.target.value })}/><small>One short paragraph explaining the skill or achievement.</small></label>
        <label className="certificate-honour"><input type="checkbox" checked={!!selected.topTenPercent} onChange={event => patch(selected.id, { topTenPercent: event.target.checked })}/> Show “Top 10% of class” badge</label>
        <div className="credential-image-field"><div className="credential-image-preview">{selected.image ? <img src={selected.image} alt={selected.title}/> : <span><ImagePlus size={22}/>No document uploaded</span>}</div><div><strong>Certificate image</strong><p>Recommended: 2000–2400 px wide, WebP or PNG. Keep the full document visible.</p><label className="button secondary-upload">{uploading === selected.id ? "Uploading…" : selected.image ? "Replace image" : "Upload image"}<input type="file" accept="image/png,image/jpeg,image/webp,image/avif" disabled={!!uploading} onChange={event => { const file = event.target.files?.[0]; if (file) uploadOne(selected, file); event.target.value = ""; }}/></label></div></div>
      </section>}
    </div>}
  </main>;
}
