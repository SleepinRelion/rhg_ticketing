import { useState, useEffect } from 'react';
import api from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import SearchableSelect from '../components/ui/SearchableSelect.jsx';
import FormatCategory from '../components/ui/FormatCategory.jsx';
import useSortableTable from '../hooks/useSortableTable.js';

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { sortedItems: sortedCategories, requestSort: requestCatSort, sortConfig: catSortConfig } = useSortableTable(categories);
  const { sortedItems: sortedTags, requestSort: requestTagSort, sortConfig: tagSortConfig } = useSortableTable(tags);
  
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', description: '', parent_id: '', ticket_type: 'issue', is_active: true });

  const [showTagModal, setShowTagModal] = useState(false);
  const [tagForm, setTagForm] = useState({ name: '', color: '#6B7280' });

  const [saving, setSaving] = useState(false);
  const { error, success } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [catRes, tagRes] = await Promise.all([
        api('/categories'),
        api('/categories/tags')
      ]);
      setCategories(catRes.categories || []);
      setTags(tagRes.tags || []);
    } catch (err) {
      error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  // --- Category Actions ---
  function openCatModal(cat = null) {
    if (cat) {
      setEditingCat(cat);
      setCatForm({ name: cat.name, description: cat.description || '', parent_id: cat.parent_id || '', ticket_type: cat.ticket_type || 'issue', is_active: cat.is_active });
    } else {
      setEditingCat(null);
      setCatForm({ name: '', description: '', parent_id: '', ticket_type: 'issue', is_active: true });
    }
    setShowCatModal(true);
  }

  async function handleCatSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCat) {
        await api(`/categories/${editingCat.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...catForm, parent_id: catForm.parent_id || null })
        });
        success('Category updated');
      } else {
        await api('/categories', {
          method: 'POST',
          body: JSON.stringify({ ...catForm, parent_id: catForm.parent_id || null })
        });
        success('Category created');
      }
      setShowCatModal(false);
      fetchData();
    } catch (err) {
      error(err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  }

  async function handleCatDelete(id) {
    if (!confirm('Are you sure you want to deactivate this category? It will no longer appear in new tickets.')) return;
    try {
      await api(`/categories/${id}`, { method: 'DELETE' });
      success('Category deactivated');
      fetchData();
    } catch (err) {
      error(err.message || 'Failed to delete category');
    }
  }

  // --- Tag Actions ---
  function openTagModal() {
    setTagForm({ name: '', color: '#3B82F6' });
    setShowTagModal(true);
  }

  async function handleTagSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/categories/tags', {
        method: 'POST',
        body: JSON.stringify(tagForm)
      });
      success('Tag created');
      setShowTagModal(false);
      fetchData();
    } catch (err) {
      error(err.message || 'Failed to save tag');
    } finally {
      setSaving(false);
    }
  }

  async function handleTagDelete(id) {
    if (!confirm('Are you sure you want to delete this tag?')) return;
    try {
      await api(`/categories/tags/${id}`, { method: 'DELETE' });
      success('Tag deleted');
      fetchData();
    } catch (err) {
      error(err.message || 'Failed to delete tag');
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Categories & Tags</h1>
          <p className="page-subtitle">Manage ticket classifications and metadata</p>
        </div>
        <button className="btn btn-primary" onClick={() => activeTab === 'categories' ? openCatModal() : openTagModal()}>
          <Plus size={16} /> {activeTab === 'categories' ? 'Add Category' : 'Add Tag'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button 
          className={`btn ${activeTab === 'categories' ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={() => setActiveTab('categories')}
        >
          Categories
        </button>
        <button 
          className={`btn ${activeTab === 'tags' ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={() => setActiveTab('tags')}
        >
          Tags
        </button>
      </div>

      <div className="data-table-container">
        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : activeTab === 'categories' ? (
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => requestCatSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Category Name {catSortConfig?.key === 'name' && (catSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => requestCatSort('ticket_type')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Ticket Type {catSortConfig?.key === 'ticket_type' && (catSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th>Description</th>
                <th>Parent Category</th>
                <th onClick={() => requestCatSort('is_active')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Status {catSortConfig?.key === 'is_active' && (catSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedCategories.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}><FormatCategory name={c.name} /></td>
                  <td>
                    {c.ticket_type && (
                      <span className="badge" style={{
                        background: c.ticket_type === 'task' ? 'rgba(6, 182, 212, 0.15)' : c.ticket_type === 'request' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: c.ticket_type === 'task' ? '#22d3ee' : c.ticket_type === 'request' ? '#a78bfa' : '#f87171',
                        textTransform: 'capitalize', fontSize: 11
                      }}>{c.ticket_type}</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.description || '-'}</td>
                  <td>{categories.find(parent => parent.id === c.parent_id)?.name || '-'}</td>
                  <td>
                    <span className="badge" style={{ background: c.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: c.is_active ? '#34d399' : '#f87171' }}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-icon" onClick={() => openCatModal(c)}><Edit2 size={16} /></button>
                      <button className="btn-icon" onClick={() => handleCatDelete(c.id)} style={{ color: 'var(--error)' }}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '16px' }}>
            {tags.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--bg-secondary)', borderRadius: '24px', border: `1px solid ${t.color}` }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: t.color }}></div>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</span>
                <button className="btn-icon" onClick={() => handleTagDelete(t.id)} style={{ padding: 2, marginLeft: 8 }}><X size={14} /></button>
              </div>
            ))}
            {tags.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No tags found.</div>}
          </div>
        )}
      </div>

      {/* Category Modal */}
      {showCatModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>{editingCat ? 'Edit Category' : 'Create Category'}</h2>
              <button className="btn-icon" onClick={() => setShowCatModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCatSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input type="text" className="form-input" required value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={catForm.description} onChange={e => setCatForm({...catForm, description: e.target.value})} rows={3} />
              </div>
              <div className="form-group">
                <label className="form-label">Ticket Type *</label>
                <SearchableSelect className="form-select" value={catForm.ticket_type} onChange={e => setCatForm({...catForm, ticket_type: e.target.value})}>
                  <option value="task">Task</option>
                  <option value="request">Request</option>
                  <option value="issue">Issue</option>
                </SearchableSelect>
              </div>
              <div className="form-group">
                <label className="form-label">Parent Category</label>
                <SearchableSelect className="form-select" value={catForm.parent_id} onChange={e => setCatForm({...catForm, parent_id: e.target.value})}>
                  <option value="">None (Top Level)</option>
                  {categories.filter(c => c.id !== editingCat?.id && !c.parent_id && c.ticket_type === catForm.ticket_type).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </SearchableSelect>
              </div>
              {editingCat && (
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <SearchableSelect className="form-select" value={catForm.is_active ? 'active' : 'inactive'} onChange={e => setCatForm({...catForm, is_active: e.target.value === 'active'})}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </SearchableSelect>
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCatModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={16} /> {saving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tag Modal */}
      {showTagModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Create Tag</h2>
              <button className="btn-icon" onClick={() => setShowTagModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleTagSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Tag Name *</label>
                <input type="text" className="form-input" required value={tagForm.name} onChange={e => setTagForm({...tagForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Color Hex</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" value={tagForm.color} onChange={e => setTagForm({...tagForm, color: e.target.value})} style={{ width: 40, height: 40, padding: 0, border: 'none', borderRadius: 4 }} />
                  <input type="text" className="form-input" required value={tagForm.color} onChange={e => setTagForm({...tagForm, color: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTagModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={16} /> {saving ? 'Saving...' : 'Save Tag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
