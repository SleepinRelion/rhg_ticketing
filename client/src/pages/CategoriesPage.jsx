import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { Plus, Edit2, Trash2, X, Save, Layers, Tags, Building2, ChevronRight, ChevronDown, FileText, ToggleLeft, ToggleRight } from 'lucide-react';
import SearchableSelect from '../components/ui/SearchableSelect.jsx';

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTypes, setExpandedTypes] = useState({ task: true, request: true, issue: true });
  
  // Modals state
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', description: '', parent_id: '', ticket_type: 'issue', is_active: true });

  const [showTagModal, setShowTagModal] = useState(false);
  const [tagForm, setTagForm] = useState({ name: '', color: '#6B7280' });

  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: '', is_active: true });

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: '', title: '', description_template: '', category_id: '', priority: 'medium', default_assignee_id: '', is_active: true
  });

  const [saving, setSaving] = useState(false);
  const { error, success } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [catRes, tagRes, deptRes, tmplRes, techRes] = await Promise.all([
        api('/categories'),
        api('/categories/tags'),
        api('/departments/all').catch(() => ({ departments: [] })),
        api('/tickets/templates').catch(() => ({ templates: [] })),
        api('/users/technicians').catch(() => ({ technicians: [] }))
      ]);
      setCategories(catRes.categories || []);
      setTags(tagRes.tags || []);
      setDepartments(deptRes.departments || []);
      setTemplates(tmplRes.templates || []);
      setTechnicians(techRes.technicians || []);
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

  // --- Department Actions ---
  function openDeptModal(dept = null) {
    if (dept) {
      setEditingDept(dept);
      setDeptForm({ name: dept.name, is_active: dept.is_active });
    } else {
      setEditingDept(null);
      setDeptForm({ name: '', is_active: true });
    }
    setShowDeptModal(true);
  }

  async function handleDeptSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingDept) {
        await api(`/departments/${editingDept.id}`, {
          method: 'PUT',
          body: JSON.stringify(deptForm)
        });
        success('Department updated');
      } else {
        await api('/departments', {
          method: 'POST',
          body: JSON.stringify(deptForm)
        });
        success('Department created');
      }
      setShowDeptModal(false);
      fetchData();
    } catch (err) {
      error(err.message || 'Failed to save department');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeptDelete(id) {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await api(`/departments/${id}`, { method: 'DELETE' });
      success('Department deleted');
      fetchData();
    } catch (err) {
      error(err.message || 'Failed to delete department');
    }
  }

  // --- Template Actions ---
  function openTemplateModal(tmpl = null) {
    if (tmpl) {
      setEditingTemplate(tmpl);
      setTemplateForm({
        name: tmpl.name || '',
        title: tmpl.title || '',
        description_template: tmpl.description_template || '',
        category_id: tmpl.category_id ? String(tmpl.category_id) : '',
        priority: tmpl.priority || 'medium',
        default_assignee_id: tmpl.default_assignee_id ? String(tmpl.default_assignee_id) : '',
        is_active: tmpl.is_active !== false
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({
        name: '', title: '', description_template: '', category_id: '', priority: 'medium', default_assignee_id: '', is_active: true
      });
    }
    setShowTemplateModal(true);
  }

  async function handleTemplateSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...templateForm,
        category_id: templateForm.category_id || null,
        default_assignee_id: templateForm.default_assignee_id || null
      };
      if (editingTemplate) {
        await api(`/tickets/templates/${editingTemplate.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        success('Template updated');
      } else {
        await api('/tickets/templates', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        success('Template created');
      }
      setShowTemplateModal(false);
      fetchData();
    } catch (err) {
      error(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  async function handleTemplateDelete(id) {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await api(`/tickets/templates/${id}`, { method: 'DELETE' });
      success('Template deleted');
      fetchData();
    } catch (err) {
      error(err.message || 'Failed to delete template');
    }
  }

  async function handleTemplateToggle(tmpl) {
    try {
      await api(`/tickets/templates/${tmpl.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !tmpl.is_active })
      });
      success(`Template ${tmpl.is_active ? 'deactivated' : 'activated'}`);
      fetchData();
    } catch (err) {
      error(err.message || 'Failed to toggle template');
    }
  }

  // Group Categories hierarchically
  const groupedCategories = useMemo(() => {
    const types = { task: [], request: [], issue: [] };
    
    categories.forEach(cat => {
      if (cat.parent_id) return; // skip children for now
      const t = cat.ticket_type || 'issue';
      if (!types[t]) types[t] = [];
      
      const children = categories.filter(c => c.parent_id === cat.id);
      types[t].push({ ...cat, children });
    });
    
    return types;
  }, [categories]);

  const toggleType = (type) => {
    setExpandedTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const priorityColor = (p) => {
    const map = { low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444' };
    return map[p] || 'var(--text-muted)';
  };

  function getAddButtonLabel() {
    if (activeTab === 'categories') return 'Add Category';
    if (activeTab === 'tags') return 'Add Tag';
    if (activeTab === 'departments') return 'Add Department';
    if (activeTab === 'templates') return 'Add Template';
    return 'Add';
  }

  function handleAddClick() {
    if (activeTab === 'categories') openCatModal();
    else if (activeTab === 'tags') openTagModal();
    else if (activeTab === 'departments') openDeptModal();
    else if (activeTab === 'templates') openTemplateModal();
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Ticket Configuration</h1>
          <p className="page-subtitle">Manage categories, templates, departments, and tags</p>
        </div>
        <button className="btn btn-primary" onClick={handleAddClick}>
          <Plus size={16} /> 
          {getAddButtonLabel()}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button 
          className={`btn ${activeTab === 'categories' ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={() => setActiveTab('categories')}
          style={{ borderRadius: '24px', padding: '8px 20px' }}
        >
          <Layers size={16} /> Categories
        </button>
        <button 
          className={`btn ${activeTab === 'templates' ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={() => setActiveTab('templates')}
          style={{ borderRadius: '24px', padding: '8px 20px' }}
        >
          <FileText size={16} /> Templates
        </button>
        <button 
          className={`btn ${activeTab === 'departments' ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={() => setActiveTab('departments')}
          style={{ borderRadius: '24px', padding: '8px 20px' }}
        >
          <Building2 size={16} /> Departments
        </button>
        <button 
          className={`btn ${activeTab === 'tags' ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={() => setActiveTab('tags')}
          style={{ borderRadius: '24px', padding: '8px 20px' }}
        >
          <Tags size={16} /> Tags
        </button>
      </div>

      <div className="card" style={{ padding: '24px' }}>
        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : activeTab === 'categories' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {['issue', 'request', 'task'].map(type => (
              <div key={type} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                {/* Type Header */}
                <div 
                  onClick={() => toggleType(type)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', 
                    background: 'var(--bg-secondary)', cursor: 'pointer',
                    borderBottom: expandedTypes[type] ? '1px solid var(--border-color)' : 'none'
                  }}
                >
                  {expandedTypes[type] ? <ChevronDown size={20} color="var(--text-muted)" /> : <ChevronRight size={20} color="var(--text-muted)" />}
                  <h3 style={{ margin: 0, textTransform: 'capitalize', fontSize: '16px', color: 'var(--text-primary)' }}>
                    {type}s
                  </h3>
                  <span className="badge" style={{ marginLeft: 'auto', background: 'var(--bg-elevated)' }}>
                    {groupedCategories[type].length} Top-level
                  </span>
                </div>
                
                {/* Type Content */}
                {expandedTypes[type] && (
                  <div className="table-responsive" style={{ padding: '0' }}>
                    {groupedCategories[type].length === 0 ? (
                      <div style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center' }}>No categories found for this type.</div>
                    ) : (
                      <table className="data-table" style={{ margin: 0 }}>
                        <thead style={{ background: 'transparent' }}>
                          <tr>
                            <th style={{ paddingLeft: '32px' }}>Name</th>
                            <th>Description</th>
                            <th>Status</th>
                            <th style={{ width: 100 }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupedCategories[type].map(cat => (
                            <React.Fragment key={cat.id}>
                              {/* Parent Category Row */}
                              <tr style={{ background: 'rgba(255,255,255,0.01)' }}>
                                <td style={{ fontWeight: 600, paddingLeft: '32px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {cat.name}
                                  </div>
                                </td>
                                <td style={{ color: 'var(--text-muted)' }}>{cat.description || '-'}</td>
                                <td>
                                  <span className="badge" style={{ background: cat.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: cat.is_active ? '#34d399' : '#f87171' }}>
                                    {cat.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="btn-icon" onClick={() => openCatModal(cat)} title="Edit"><Edit2 size={16} /></button>
                                    <button className="btn-icon" onClick={() => handleCatDelete(cat.id)} style={{ color: 'var(--error)' }} title="Deactivate"><Trash2 size={16} /></button>
                                  </div>
                                </td>
                              </tr>
                              
                              {/* Children Rows */}
                              {cat.children.map(child => (
                                <tr key={child.id}>
                                  <td style={{ paddingLeft: '64px', position: 'relative' }}>
                                    <div style={{
                                      position: 'absolute', left: '44px', top: '0', bottom: '50%',
                                      width: '12px', borderLeft: '2px solid var(--border-color)', borderBottom: '2px solid var(--border-color)'
                                    }} />
                                    {child.name}
                                  </td>
                                  <td style={{ color: 'var(--text-muted)' }}>{child.description || '-'}</td>
                                  <td>
                                    <span className="badge" style={{ background: child.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: child.is_active ? '#34d399' : '#f87171' }}>
                                      {child.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <button className="btn-icon" onClick={() => openCatModal(child)} title="Edit"><Edit2 size={14} /></button>
                                      <button className="btn-icon" onClick={() => handleCatDelete(child.id)} style={{ color: 'var(--error)' }} title="Deactivate"><Trash2 size={14} /></button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

        ) : activeTab === 'templates' ? (
          /* ===== TEMPLATES TAB ===== */
          <div>
            {templates.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
                <FileText size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                <p>No templates configured yet.</p>
                <p style={{ fontSize: '13px' }}>Templates let staff create common tickets with one click — pre-filling the title, description, category, and priority.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Template Name</th>
                      <th>Auto-fill Title</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Default Assignee</th>
                      <th>Status</th>
                      <th style={{ width: 120 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map(tmpl => (
                      <tr key={tmpl.id}>
                        <td style={{ fontWeight: 600 }}>{tmpl.name}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{tmpl.title}</td>
                        <td>
                          {tmpl.category_name ? (
                            <span className="badge" style={{ background: 'var(--bg-elevated)' }}>{tmpl.category_name}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span className="badge" style={{ 
                            background: `${priorityColor(tmpl.priority)}20`, 
                            color: priorityColor(tmpl.priority),
                            textTransform: 'capitalize'
                          }}>
                            {tmpl.priority}
                          </span>
                        </td>
                        <td style={{ color: tmpl.default_assignee_name ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {tmpl.default_assignee_name || 'Unassigned'}
                        </td>
                        <td>
                          <span className="badge" style={{ 
                            background: tmpl.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                            color: tmpl.is_active ? '#34d399' : '#f87171' 
                          }}>
                            {tmpl.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn-icon" onClick={() => openTemplateModal(tmpl)} title="Edit">
                              <Edit2 size={16} />
                            </button>
                            <button className="btn-icon" onClick={() => handleTemplateToggle(tmpl)} title={tmpl.is_active ? 'Deactivate' : 'Activate'} style={{ color: tmpl.is_active ? 'var(--text-muted)' : 'var(--success)' }}>
                              {tmpl.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                            </button>
                            <button className="btn-icon" onClick={() => handleTemplateDelete(tmpl.id)} style={{ color: 'var(--error)' }} title="Delete">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        ) : activeTab === 'departments' ? (
          <div className="table-responsive">
            {departments.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
                <Building2 size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                <p>No departments configured yet.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Department Name</th>
                    <th>Status</th>
                    <th style={{ width: 100 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map(dept => (
                    <tr key={dept.id}>
                      <td style={{ fontWeight: 500 }}>{dept.name}</td>
                      <td>
                        <span className="badge" style={{ background: dept.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: dept.is_active ? '#34d399' : '#f87171' }}>
                          {dept.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-icon" onClick={() => openDeptModal(dept)}><Edit2 size={16} /></button>
                          <button className="btn-icon" onClick={() => handleDeptDelete(dept.id)} style={{ color: 'var(--error)' }}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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

      {/* Department Modal */}
      {showDeptModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>{editingDept ? 'Edit Department' : 'Create Department'}</h2>
              <button className="btn-icon" onClick={() => setShowDeptModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleDeptSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Department Name *</label>
                <input type="text" className="form-input" required value={deptForm.name} onChange={e => setDeptForm({...deptForm, name: e.target.value})} />
              </div>
              {editingDept && (
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <SearchableSelect className="form-select" value={deptForm.is_active ? 'active' : 'inactive'} onChange={e => setDeptForm({...deptForm, is_active: e.target.value === 'active'})}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </SearchableSelect>
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeptModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={16} /> {saving ? 'Saving...' : 'Save Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2>{editingTemplate ? 'Edit Template' : 'Create Template'}</h2>
              <button className="btn-icon" onClick={() => setShowTemplateModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleTemplateSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Template Name *</label>
                <input 
                  type="text" className="form-input" required 
                  value={templateForm.name} 
                  onChange={e => setTemplateForm({...templateForm, name: e.target.value})}
                  placeholder="e.g., TV Not Working"
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Displayed in the template dropdown on the Create Ticket page.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Auto-fill Title *</label>
                <input 
                  type="text" className="form-input" required 
                  value={templateForm.title} 
                  onChange={e => setTemplateForm({...templateForm, title: e.target.value})}
                  placeholder="e.g., TV not working in guest room"
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>This will be pre-filled as the ticket title when staff selects this template.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Description Template</label>
                <textarea 
                  className="form-textarea" 
                  value={templateForm.description_template} 
                  onChange={e => setTemplateForm({...templateForm, description_template: e.target.value})}
                  placeholder="Pre-filled description text..."
                  rows={3}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <SearchableSelect 
                    className="form-select" 
                    value={templateForm.category_id} 
                    onChange={e => setTemplateForm({...templateForm, category_id: e.target.value})}
                  >
                    <option value="">None</option>
                    {categories.filter(c => !c.parent_id).map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.ticket_type})</option>
                    ))}
                  </SearchableSelect>
                </div>

                <div className="form-group">
                  <label className="form-label">Default Priority</label>
                  <SearchableSelect 
                    className="form-select" 
                    value={templateForm.priority} 
                    onChange={e => setTemplateForm({...templateForm, priority: e.target.value})}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </SearchableSelect>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Default Assignee</label>
                <SearchableSelect 
                  className="form-select" 
                  value={templateForm.default_assignee_id} 
                  onChange={e => setTemplateForm({...templateForm, default_assignee_id: e.target.value})}
                >
                  <option value="">Unassigned</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </SearchableSelect>
              </div>

              {editingTemplate && (
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <SearchableSelect 
                    className="form-select" 
                    value={templateForm.is_active ? 'active' : 'inactive'} 
                    onChange={e => setTemplateForm({...templateForm, is_active: e.target.value === 'active'})}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </SearchableSelect>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTemplateModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={16} /> {saving ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
