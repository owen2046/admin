import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const DEFAULT_ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || ''

class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function apiFetch(path, adminKey, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': adminKey,
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(body.error || `HTTP ${res.status}`, res.status)
  }
  return res.json()
}

// ─── TOAST ───────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        background: type === 'error' ? '#ef4444' : '#22c55e',
        color: '#fff', padding: '12px 20px', borderRadius: 8,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontWeight: 600,
        maxWidth: 360, fontSize: 14,
      }}
    >
      {message}
      <button onClick={onClose} style={{ marginLeft: 12, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 }}>×</button>
    </div>
  )
}

// ─── MODAL ───────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#1e293b', borderRadius: 12, width: '100%', maxWidth: 680,
        maxHeight: '90vh', overflowY: 'auto', padding: 28,
        border: '1px solid #334155',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: '#f1f5f9', fontSize: 20, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── FIELD COMPONENT ─────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', marginBottom: 5, color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '8px 12px', background: '#0f172a',
  border: '1px solid #334155', borderRadius: 6, color: '#f1f5f9',
  fontSize: 14, boxSizing: 'border-box',
}

const textareaStyle = { ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }

// ─── ADD / EDIT PROPERTY MODAL ────────────────────────────
function PropertyModal({ property, adminKey, onSave, onClose }) {
  const isEdit = !!property
  const [form, setForm] = useState({
    id: property?.id || '',
    builder_id: property?.builder_id || '',
    builder_name: property?.builder_name || '',
    name: property?.name || '',
    location: property?.location || '',
    type: property?.type || '',
    status: property?.status || 'Available',
    bhk: property?.bhk || '',
    price: property?.price || '',
    area: property?.area || '',
    img: property?.img || '',
    images: (property?.images || []).join('\n'),
    description: property?.description || '',
    amenities: (property?.amenities || []).join('\n'),
    nearby: (property?.nearby || []).join('\n'),
    total_units: property?.total_units ?? '',
    sold_units: property?.sold_units ?? '',
    possession: property?.possession || '',
    rera: property?.rera || '',
    tag: property?.tag || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    setError('')
    setSaving(true)
    try {
      const payload = {
        ...form,
        images: form.images.split('\n').map(s => s.trim()).filter(Boolean),
        amenities: form.amenities.split('\n').map(s => s.trim()).filter(Boolean),
        nearby: form.nearby.split('\n').map(s => s.trim()).filter(Boolean),
        total_units: form.total_units !== '' ? Number(form.total_units) : undefined,
        sold_units: form.sold_units !== '' ? Number(form.sold_units) : undefined,
      }
      if (isEdit) {
        await apiFetch(`/api/admin/properties/${property.id}`, adminKey, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      } else {
        await apiFetch('/api/admin/properties', adminKey, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }
      onSave()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? `Edit Property — ${property.name}` : 'Add New Property'} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        {!isEdit && (
          <Field label="Property ID" required>
            <input style={inputStyle} value={form.id} onChange={e => set('id', e.target.value)} placeholder="e.g. prestige-sunrise" />
          </Field>
        )}
        <Field label="Property Name" required>
          <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Prestige Sunrise" />
        </Field>
        <Field label="Location" required>
          <input style={inputStyle} value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. OMR, Chennai" />
        </Field>
        <Field label="Builder ID">
          <input style={inputStyle} value={form.builder_id} onChange={e => set('builder_id', e.target.value)} placeholder="e.g. prestige" />
        </Field>
        <Field label="Builder Name">
          <input style={inputStyle} value={form.builder_name} onChange={e => set('builder_name', e.target.value)} placeholder="e.g. Prestige Group" />
        </Field>
        <Field label="Type" required>
          <input style={inputStyle} value={form.type} onChange={e => set('type', e.target.value)} placeholder="e.g. Apartment" />
        </Field>
        <Field label="Status">
          <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
            <option>Available</option>
            <option>Sold Out</option>
            <option>Under Construction</option>
            <option>Ready to Move</option>
            <option>Upcoming</option>
          </select>
        </Field>
        <Field label="BHK">
          <input style={inputStyle} value={form.bhk} onChange={e => set('bhk', e.target.value)} placeholder="e.g. 2, 3 BHK" />
        </Field>
        <Field label="Price">
          <input style={inputStyle} value={form.price} onChange={e => set('price', e.target.value)} placeholder="e.g. ₹85L – 1.2Cr" />
        </Field>
        <Field label="Area">
          <input style={inputStyle} value={form.area} onChange={e => set('area', e.target.value)} placeholder="e.g. 1200–1800 sqft" />
        </Field>
        <Field label="Total Units">
          <input style={inputStyle} type="number" value={form.total_units} onChange={e => set('total_units', e.target.value)} placeholder="e.g. 240" />
        </Field>
        <Field label="Sold Units">
          <input style={inputStyle} type="number" value={form.sold_units} onChange={e => set('sold_units', e.target.value)} placeholder="e.g. 180" />
        </Field>
        <Field label="Possession">
          <input style={inputStyle} value={form.possession} onChange={e => set('possession', e.target.value)} placeholder="e.g. Dec 2026" />
        </Field>
        <Field label="RERA">
          <input style={inputStyle} value={form.rera} onChange={e => set('rera', e.target.value)} placeholder="e.g. TN/01/0123" />
        </Field>
        <Field label="Tag">
          <input style={inputStyle} value={form.tag} onChange={e => set('tag', e.target.value)} placeholder="e.g. Hot Deal" />
        </Field>
        <Field label="Main Image URL">
          <input style={inputStyle} value={form.img} onChange={e => set('img', e.target.value)} placeholder="https://..." />
        </Field>
      </div>
      <Field label="Gallery Image URLs (one per line)">
        <textarea style={textareaStyle} value={form.images} onChange={e => set('images', e.target.value)} placeholder={"https://img1.jpg\nhttps://img2.jpg"} />
      </Field>
      <Field label="Description">
        <textarea style={{ ...textareaStyle, minHeight: 100 }} value={form.description} onChange={e => set('description', e.target.value)} />
      </Field>
      <Field label="Amenities (one per line)">
        <textarea style={textareaStyle} value={form.amenities} onChange={e => set('amenities', e.target.value)} placeholder={"Swimming Pool\nGym\nPark"} />
      </Field>
      <Field label="Nearby Places (one per line)">
        <textarea style={textareaStyle} value={form.nearby} onChange={e => set('nearby', e.target.value)} placeholder={"Apollo Hospital 2km\nAirport 15km"} />
      </Field>

      {error && <p style={{ color: '#ef4444', marginBottom: 12, fontSize: 13 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: '8px 20px', background: '#334155', border: 'none', borderRadius: 6, color: '#cbd5e1', cursor: 'pointer' }}>Cancel</button>
        <button onClick={handleSubmit} disabled={saving}
          style={{ padding: '8px 24px', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Add Property')}
        </button>
      </div>
    </Modal>
  )
}

// ─── ADD / EDIT BUILDER MODAL ─────────────────────────────
function BuilderModal({ builder, adminKey, onSave, onClose }) {
  const isEdit = !!builder
  const [form, setForm] = useState({
    id: builder?.id || '',
    name: builder?.name || '',
    badge: builder?.badge || '',
    since: builder?.since || '',
    logo_url: builder?.logo_url || '',
    description: builder?.description || '',
    website: builder?.website || '',
    projects_count: builder?.projects_count ?? '',
    city: builder?.city || '',
    contact_email: builder?.contact_email || '',
    contact_phone: builder?.contact_phone || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    setError('')
    setSaving(true)
    try {
      const payload = {
        ...form,
        projects_count: form.projects_count !== '' ? Number(form.projects_count) : undefined,
      }
      if (isEdit) {
        await apiFetch(`/api/admin/builders/${builder.id}`, adminKey, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      } else {
        await apiFetch('/api/admin/builders', adminKey, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }
      onSave()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? `Edit Builder — ${builder.name}` : 'Add New Builder / Partner'} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        {!isEdit && (
          <Field label="Builder ID" required>
            <input style={inputStyle} value={form.id} onChange={e => set('id', e.target.value)} placeholder="e.g. prestige-group" />
          </Field>
        )}
        <Field label="Builder Name" required>
          <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Prestige Group" />
        </Field>
        <Field label="Badge">
          <input style={inputStyle} value={form.badge} onChange={e => set('badge', e.target.value)} placeholder="e.g. Premium Partner" />
        </Field>
        <Field label="Founded Year (since)">
          <input style={inputStyle} value={form.since} onChange={e => set('since', e.target.value)} placeholder="e.g. 1986" />
        </Field>
        <Field label="City">
          <input style={inputStyle} value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Chennai" />
        </Field>
        <Field label="Total Projects">
          <input style={inputStyle} type="number" value={form.projects_count} onChange={e => set('projects_count', e.target.value)} placeholder="e.g. 42" />
        </Field>
        <Field label="Contact Email">
          <input style={inputStyle} value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="contact@builder.com" />
        </Field>
        <Field label="Contact Phone">
          <input style={inputStyle} value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="+91 98765 43210" />
        </Field>
        <Field label="Website URL">
          <input style={inputStyle} value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://builder.com" />
        </Field>
        <Field label="Logo URL">
          <input style={inputStyle} value={form.logo_url} onChange={e => set('logo_url', e.target.value)} placeholder="https://cdn.../logo.png" />
        </Field>
      </div>
      <Field label="Description">
        <textarea style={{ ...textareaStyle, minHeight: 100 }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Short description about the builder…" />
      </Field>
      {form.logo_url && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>LOGO PREVIEW</p>
          <img src={form.logo_url} alt="logo" style={{ height: 60, objectFit: 'contain', background: '#0f172a', padding: 8, borderRadius: 6, border: '1px solid #334155' }} onError={e => e.target.style.display = 'none'} />
        </div>
      )}
      {error && <p style={{ color: '#ef4444', marginBottom: 12, fontSize: 13 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: '8px 20px', background: '#334155', border: 'none', borderRadius: 6, color: '#cbd5e1', cursor: 'pointer' }}>Cancel</button>
        <button onClick={handleSubmit} disabled={saving}
          style={{ padding: '8px 24px', background: '#8b5cf6', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Add Builder')}
        </button>
      </div>
    </Modal>
  )
}

// ─── ADD / EDIT ARTICLE MODAL ─────────────────────────────
function ArticleModal({ article, adminKey, onSave, onClose }) {
  const isEdit = !!article
  const [form, setForm] = useState({
    id: article?.id || '',
    title: article?.title || '',
    category: article?.category || '',
    excerpt: article?.excerpt || '',
    img: article?.img || '',
    read_time: article?.read_time || '',
    content: article?.content || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    setError('')
    setSaving(true)
    try {
      if (isEdit) {
        await apiFetch(`/api/admin/articles/${article.id}`, adminKey, {
          method: 'PATCH',
          body: JSON.stringify(form),
        })
      } else {
        await apiFetch('/api/admin/articles', adminKey, {
          method: 'POST',
          body: JSON.stringify(form),
        })
      }
      onSave()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? `Edit Article` : 'Add New Article'} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        {!isEdit && (
          <Field label="Article ID (slug)" required>
            <input style={inputStyle} value={form.id} onChange={e => set('id', e.target.value)} placeholder="e.g. tips-for-first-home-buyer" />
          </Field>
        )}
        <Field label="Title" required>
          <input style={inputStyle} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Article title…" />
        </Field>
        <Field label="Category">
          <input style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)} placeholder="e.g. Tips, Market, Legal" />
        </Field>
        <Field label="Read Time">
          <input style={inputStyle} value={form.read_time} onChange={e => set('read_time', e.target.value)} placeholder="e.g. 5 min read" />
        </Field>
        <Field label="Cover Image URL">
          <input style={inputStyle} value={form.img} onChange={e => set('img', e.target.value)} placeholder="https://…" />
        </Field>
      </div>
      <Field label="Excerpt">
        <textarea style={textareaStyle} value={form.excerpt} onChange={e => set('excerpt', e.target.value)} placeholder="Short preview of the article…" />
      </Field>
      <Field label="Full Content (HTML or Markdown)">
        <textarea style={{ ...textareaStyle, minHeight: 200 }} value={form.content} onChange={e => set('content', e.target.value)} placeholder="<p>Full article content here…</p>" />
      </Field>
      {error && <p style={{ color: '#ef4444', marginBottom: 12, fontSize: 13 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: '8px 20px', background: '#334155', border: 'none', borderRadius: 6, color: '#cbd5e1', cursor: 'pointer' }}>Cancel</button>
        <button onClick={handleSubmit} disabled={saving}
          style={{ padding: '8px 24px', background: '#10b981', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Add Article')}
        </button>
      </div>
    </Modal>
  )
}

// ─── CONFIRM DELETE MODAL ─────────────────────────────────
function ConfirmDelete({ label, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false)
  return (
    <Modal title="Confirm Delete" onClose={onClose}>
      <p style={{ color: '#cbd5e1', marginBottom: 20 }}>
        Delete <strong style={{ color: '#f87171' }}>{label}</strong>? This cannot be undone.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '8px 20px', background: '#334155', border: 'none', borderRadius: 6, color: '#cbd5e1', cursor: 'pointer' }}>Cancel</button>
        <button onClick={async () => { setDeleting(true); await onConfirm(); setDeleting(false) }} disabled={deleting}
          style={{ padding: '8px 20px', background: '#ef4444', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </Modal>
  )
}

// ─── STATS CARD ───────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: '#1e293b', border: `1px solid ${color}33`, borderRadius: 10,
      padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>{label}</span>
      <span style={{ color, fontSize: 28, fontWeight: 800 }}>{value ?? '—'}</span>
    </div>
  )
}

// ─── PROPERTIES TAB ───────────────────────────────────────
function PropertiesTab({ adminKey, toast }) {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | { type: 'add' | 'edit' | 'delete', item? }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/api/properties?limit=200', adminKey)
      setProperties(data.items || data.properties || [])
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [adminKey, toast])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() =>
    properties.filter(p =>
      !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.location?.toLowerCase().includes(search.toLowerCase()) ||
      p.builder_name?.toLowerCase().includes(search.toLowerCase())
    ), [properties, search])

  const handleDelete = async (id) => {
    try {
      await apiFetch(`/api/admin/properties/${id}`, adminKey, { method: 'DELETE' })
      toast('Property deleted!', 'success')
      setModal(null)
      load()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          style={{ ...inputStyle, maxWidth: 280, flex: 1 }}
          placeholder="Search properties…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button
          onClick={() => setModal({ type: 'add' })}
          style={{ padding: '8px 18px', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
        >
          + Add Property
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#64748b' }}>Loading…</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                {['Name', 'Location', 'Type', 'Status', 'Price', 'Units', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #1e293b', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '10px 12px', color: '#f1f5f9', fontWeight: 600 }}>
                    <div>{p.name}</div>
                    <div style={{ color: '#475569', fontSize: 11 }}>{p.id}</div>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{p.location}</td>
                  <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{p.type}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                      background: p.status === 'Available' ? '#14532d' : p.status === 'Sold Out' ? '#450a0a' : '#1c1917',
                      color: p.status === 'Available' ? '#4ade80' : p.status === 'Sold Out' ? '#f87171' : '#a8a29e',
                    }}>{p.status}</span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{p.price}</td>
                  <td style={{ padding: '10px 12px', color: '#94a3b8' }}>
                    {p.total_units != null ? `${p.sold_units ?? 0}/${p.total_units}` : '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setModal({ type: 'edit', item: p })}
                        style={{ padding: '4px 10px', background: '#334155', border: 'none', borderRadius: 4, color: '#93c5fd', cursor: 'pointer', fontSize: 12 }}>Edit</button>
                      <button onClick={() => setModal({ type: 'delete', item: p })}
                        style={{ padding: '4px 10px', background: '#450a0a', border: 'none', borderRadius: 4, color: '#f87171', cursor: 'pointer', fontSize: 12 }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 24, color: '#475569', textAlign: 'center' }}>No properties found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal?.type === 'add' && (
        <PropertyModal adminKey={adminKey} onSave={() => { setModal(null); toast('Property added!', 'success'); load() }} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'edit' && (
        <PropertyModal property={modal.item} adminKey={adminKey} onSave={() => { setModal(null); toast('Property saved!', 'success'); load() }} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'delete' && (
        <ConfirmDelete label={modal.item.name} onConfirm={() => handleDelete(modal.item.id)} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

// ─── BUILDERS / PARTNERS TAB ──────────────────────────────
function BuildersTab({ adminKey, toast }) {
  const [builders, setBuilders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/api/builders', adminKey)
      setBuilders(data.items || data.builders || [])
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [adminKey, toast])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() =>
    builders.filter(b =>
      !search || b.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.city?.toLowerCase().includes(search.toLowerCase())
    ), [builders, search])

  const handleDelete = async (id) => {
    try {
      await apiFetch(`/api/admin/builders/${id}`, adminKey, { method: 'DELETE' })
      toast('Builder deleted!', 'success')
      setModal(null)
      load()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          style={{ ...inputStyle, maxWidth: 280, flex: 1 }}
          placeholder="Search builders…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button
          onClick={() => setModal({ type: 'add' })}
          style={{ padding: '8px 18px', background: '#8b5cf6', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
        >
          + Add Builder
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#64748b' }}>Loading…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {filtered.map(b => (
            <div key={b.id} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                {b.logo_url ? (
                  <img src={b.logo_url} alt={b.name} style={{ width: 48, height: 48, objectFit: 'contain', background: '#1e293b', borderRadius: 6, padding: 4 }} />
                ) : (
                  <div style={{ width: 48, height: 48, background: '#1e293b', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 20 }}>🏗</div>
                )}
                <div>
                  <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>{b.name}</div>
                  <div style={{ color: '#475569', fontSize: 11 }}>{b.id}</div>
                </div>
              </div>
              {b.badge && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: '#1e1b4b', color: '#a5b4fc', marginBottom: 8, display: 'inline-block' }}>{b.badge}</span>}
              <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>
                {b.city && <span>📍 {b.city}</span>}
                {b.since && <span style={{ marginLeft: 10 }}>📅 Since {b.since}</span>}
                {b.projects_count != null && <span style={{ marginLeft: 10 }}>🏢 {b.projects_count} projects</span>}
              </div>
              {b.description && <p style={{ color: '#64748b', fontSize: 12, marginBottom: 10, lineHeight: 1.5 }}>{b.description.slice(0, 100)}{b.description.length > 100 ? '…' : ''}</p>}
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setModal({ type: 'edit', item: b })}
                  style={{ flex: 1, padding: '6px', background: '#334155', border: 'none', borderRadius: 4, color: '#a5b4fc', cursor: 'pointer', fontSize: 12 }}>Edit</button>
                <button onClick={() => setModal({ type: 'delete', item: b })}
                  style={{ flex: 1, padding: '6px', background: '#450a0a', border: 'none', borderRadius: 4, color: '#f87171', cursor: 'pointer', fontSize: 12 }}>Delete</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p style={{ color: '#475569', gridColumn: '1/-1', textAlign: 'center', padding: 24 }}>No builders found</p>
          )}
        </div>
      )}

      {modal?.type === 'add' && (
        <BuilderModal adminKey={adminKey} onSave={() => { setModal(null); toast('Builder added!', 'success'); load() }} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'edit' && (
        <BuilderModal builder={modal.item} adminKey={adminKey} onSave={() => { setModal(null); toast('Builder saved!', 'success'); load() }} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'delete' && (
        <ConfirmDelete label={modal.item.name} onConfirm={() => handleDelete(modal.item.id)} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

// ─── ARTICLES TAB ─────────────────────────────────────────
function ArticlesTab({ adminKey, toast }) {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/api/articles', adminKey)
      setArticles(data.items || data.articles || [])
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [adminKey, toast])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    try {
      await apiFetch(`/api/admin/articles/${id}`, adminKey, { method: 'DELETE' })
      toast('Article deleted!', 'success')
      setModal(null)
      load()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          onClick={() => setModal({ type: 'add' })}
          style={{ padding: '8px 18px', background: '#10b981', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontWeight: 600 }}
        >
          + Add Article
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#64748b' }}>Loading…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {articles.map(a => (
            <div key={a.id} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              {a.img && <img src={a.img} alt={a.title} style={{ width: 72, height: 52, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: 2 }}>{a.title}</div>
                <div style={{ color: '#475569', fontSize: 12 }}>
                  {a.category && <span style={{ color: '#a5b4fc', marginRight: 8 }}>#{a.category}</span>}
                  {a.read_time && <span>{a.read_time}</span>}
                  {a.published_at && <span style={{ marginLeft: 8 }}>{new Date(a.published_at).toLocaleDateString()}</span>}
                </div>
                {a.excerpt && <p style={{ color: '#64748b', fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>{a.excerpt.slice(0, 120)}{a.excerpt.length > 120 ? '…' : ''}</p>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => setModal({ type: 'edit', item: a })}
                  style={{ padding: '5px 12px', background: '#334155', border: 'none', borderRadius: 4, color: '#93c5fd', cursor: 'pointer', fontSize: 12 }}>Edit</button>
                <button onClick={() => setModal({ type: 'delete', item: a })}
                  style={{ padding: '5px 12px', background: '#450a0a', border: 'none', borderRadius: 4, color: '#f87171', cursor: 'pointer', fontSize: 12 }}>Delete</button>
              </div>
            </div>
          ))}
          {articles.length === 0 && <p style={{ color: '#475569', textAlign: 'center', padding: 24 }}>No articles found</p>}
        </div>
      )}

      {modal?.type === 'add' && (
        <ArticleModal adminKey={adminKey} onSave={() => { setModal(null); toast('Article added!', 'success'); load() }} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'edit' && (
        <ArticleModal article={modal.item} adminKey={adminKey} onSave={() => { setModal(null); toast('Article saved!', 'success'); load() }} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'delete' && (
        <ConfirmDelete label={modal.item.title} onConfirm={() => handleDelete(modal.item.id)} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

// ─── INQUIRIES TAB ────────────────────────────────────────
function InquiriesTab({ adminKey, toast }) {
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await apiFetch('/api/admin/inquiries', adminKey)
        setInquiries(data.items || data.inquiries || [])
      } catch (e) {
        toast(e.message, 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [adminKey, toast])

  const filtered = filter === 'all' ? inquiries : inquiries.filter(i => i.status === filter)

  const statusColor = (s) => ({
    new: '#3b82f6', contacted: '#f59e0b', closed: '#22c55e',
  }[s] || '#64748b')

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['all', 'new', 'contacted', 'closed'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{
              padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
              background: filter === s ? '#334155' : '#1e293b', color: filter === s ? '#f1f5f9' : '#475569',
            }}>{s}</button>
        ))}
      </div>
      {loading ? (
        <p style={{ color: '#64748b' }}>Loading…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((inq, i) => (
            <div key={i} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{inq.name}</span>
                  <span style={{ color: '#475569', fontSize: 12, marginLeft: 10 }}>{inq.email}</span>
                  {inq.phone && <span style={{ color: '#475569', fontSize: 12, marginLeft: 10 }}>📞 {inq.phone}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {inq.status && (
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: statusColor(inq.status) + '22', color: statusColor(inq.status) }}>
                      {inq.status}
                    </span>
                  )}
                  <span style={{ color: '#334155', fontSize: 11 }}>{inq.created_at ? new Date(inq.created_at).toLocaleDateString() : ''}</span>
                </div>
              </div>
              {inq.property_name && <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>🏠 {inq.property_name}</div>}
              {inq.message && <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{inq.message}</p>}
            </div>
          ))}
          {filtered.length === 0 && <p style={{ color: '#475569', textAlign: 'center', padding: 24 }}>No inquiries</p>}
        </div>
      )}
    </div>
  )
}

// ─── SETTINGS TAB ─────────────────────────────────────────
function SettingsTab({ adminKey, setAdminKey }) {
  const [key, setKey] = useState(adminKey)
  const [saved, setSaved] = useState(false)
  return (
    <div style={{ maxWidth: 400 }}>
      <Field label="Admin API Key">
        <input style={inputStyle} type="password" value={key} onChange={e => setKey(e.target.value)} />
      </Field>
      <button
        onClick={() => { setAdminKey(key); localStorage.setItem('adminKey', key); setSaved(true); setTimeout(() => setSaved(false), 2000) }}
        style={{ padding: '8px 20px', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontWeight: 600 }}
      >
        {saved ? '✓ Saved' : 'Save Key'}
      </button>
      <p style={{ color: '#475569', fontSize: 12, marginTop: 16 }}>
        The admin key is stored in localStorage and sent as <code style={{ color: '#94a3b8' }}>x-admin-key</code> header with every request.
      </p>
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────
const TABS = [
  { id: 'properties', label: '🏠 Properties' },
  { id: 'builders', label: '🏗 Builders' },
  { id: 'articles', label: '📰 Articles' },
  { id: 'inquiries', label: '📩 Inquiries' },
  { id: 'settings', label: '⚙️ Settings' },
]

function App() {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem('adminKey') || DEFAULT_ADMIN_KEY)
  const [tab, setTab] = useState('properties')
  const [toast, setToast] = useState(null)
  const [stats, setStats] = useState({})

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), [])

  useEffect(() => {
    if (!adminKey) return
    Promise.all([
      apiFetch('/api/properties?limit=1', adminKey).catch(() => null),
      apiFetch('/api/builders', adminKey).catch(() => null),
      apiFetch('/api/articles', adminKey).catch(() => null),
      apiFetch('/api/admin/inquiries', adminKey).catch(() => null),
    ]).then(([props, builders, articles, inquiries]) => {
      setStats({
        properties: props?.total || (props?.items || props?.properties || []).length,
        builders: (builders?.items || builders?.builders || []).length,
        articles: (articles?.items || articles?.articles || []).length,
        inquiries: (inquiries?.items || inquiries?.inquiries || []).length,
      })
    })
  }, [adminKey])

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#f1f5f9', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🏢</span>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#f1f5f9' }}>Estates61</span>
          <span style={{ color: '#334155', fontSize: 14 }}>Admin Panel</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, background: adminKey ? '#22c55e' : '#ef4444', borderRadius: '50%' }} />
          <span style={{ color: '#475569', fontSize: 12 }}>{adminKey ? 'Connected' : 'No Key'}</span>
        </div>
      </header>

      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          <StatCard label="Properties" value={stats.properties} color="#3b82f6" />
          <StatCard label="Builders" value={stats.builders} color="#8b5cf6" />
          <StatCard label="Articles" value={stats.articles} color="#10b981" />
          <StatCard label="Inquiries" value={stats.inquiries} color="#f59e0b" />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #1e293b', paddingBottom: 0 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
                color: tab === t.id ? '#3b82f6' : '#475569', fontWeight: tab === t.id ? 700 : 400,
                borderBottom: tab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
                fontSize: 13, transition: 'color 0.15s',
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'properties' && <PropertiesTab adminKey={adminKey} toast={showToast} />}
        {tab === 'builders' && <BuildersTab adminKey={adminKey} toast={showToast} />}
        {tab === 'articles' && <ArticlesTab adminKey={adminKey} toast={showToast} />}
        {tab === 'inquiries' && <InquiriesTab adminKey={adminKey} toast={showToast} />}
        {tab === 'settings' && <SettingsTab adminKey={adminKey} setAdminKey={setAdminKey} />}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
