import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, AlertTriangle, Edit3, X, Save } from 'lucide-react';
import api from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

import TicketTypeSelector, { TYPE_CONFIG } from '../components/tickets/create/TicketTypeSelector.jsx';
import TicketDetailsForm from '../components/tickets/create/TicketDetailsForm.jsx';

const REQUEST_CATEGORY_ICONS = {
  'Account': FileQuestion,
  'Asset': FileQuestion,
};

const ISSUE_CATEGORY_ICONS = {
  'Room': AlertTriangle,
  'Office/Dept': AlertTriangle,
  'Infrastructure': AlertTriangle,
};

export default function CreateTicketPage() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ticket_type: '',
    category_id: '',
    subcategory_id: '',
    priority: 'low',
    room_id: '',
    asset_id: '',
    guest_impact: 'none',
    guest_name: '',
    guest_room_occupied: 'unknown',
    department: '',
    requested_for: '',
    justification: '',
    assigned_to: '',
  });

  const [allCategories, setAllCategories] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [assets, setAssets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [saving, setSaving] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  
  // Edit Mode state
  const [isEditingForm, setIsEditingForm] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', description: '', parent_id: '', ticket_type: 'issue', is_active: true });
  const [catSaving, setCatSaving] = useState(false);

  const navigate = useNavigate();
  const { error, success } = useToast();
  const { user } = useAuth();

  const isIT = ['admin', 'manager', 'technician'].includes(user?.role);
  const isAdminOrManager = ['admin', 'manager'].includes(user?.role);

  useEffect(() => {
    fetchData();
  }, [isIT]);

  function fetchData() {
    Promise.all([
      api('/categories'),
      api('/rooms'),
      api('/assets'),
      api('/departments').catch(() => ({ departments: [] })),
      isIT ? api('/users/technicians').catch(() => ({ technicians: [] })) : Promise.resolve({ technicians: [] })
    ]).then(([catRes, roomRes, assetRes, deptRes, techRes]) => {
      setAllCategories(catRes.categories || []);
      setRooms(roomRes.rooms || []);
      setAssets(assetRes.assets || []);
      setDepartments(deptRes.departments || []);
      setTechnicians(techRes.technicians || []);
    }).catch(() => error('Failed to load form data'));
  }

  useEffect(() => {
    if (!formData.title || formData.title.length < 5) {
      setDuplicates([]);
      return;
    }
    const timer = setTimeout(() => {
      api(`/tickets?search=${encodeURIComponent(formData.title)}&status=open,in_progress`)
        .then(res => setDuplicates(res.tickets?.slice(0, 3) || []))
        .catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.title]);

  const parentCategories = useMemo(() => {
    return allCategories.filter(c => !c.parent_id && c.ticket_type === formData.ticket_type);
  }, [allCategories, formData.ticket_type]);

  const subcategories = useMemo(() => {
    if (!formData.category_id) return [];
    return allCategories.filter(c => c.parent_id === Number(formData.category_id));
  }, [allCategories, formData.category_id]);

  function handleCategoryChange(catId) {
    if (isEditingForm) return; // Prevent selection while editing
    setFormData(prev => ({ ...prev, category_id: catId, subcategory_id: '' }));
  }

  function handleTypeSelect(type) {
    setFormData(prev => ({
      ...prev,
      ticket_type: type,
      category_id: '',
      subcategory_id: '',
      title: '',
      description: '',
      priority: 'low',
    }));
  }

  function handleBackToTypeSelect() {
    setFormData(prev => ({ ...prev, ticket_type: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isEditingForm) return; // Prevent submit while editing

    if (!formData.ticket_type) return error('Please select a ticket type');
    if (!formData.category_id) return error('Please select a category');

    const isRequest = formData.ticket_type === 'request';
    const isIssue = formData.ticket_type === 'issue';
    
    if (isRequest || isIssue) {
      if (subcategories.length > 0 && !formData.subcategory_id) {
        return error('Please select a specific subcategory or action');
      }
    }

    if (isIssue) {
      const cat = parentCategories.find(c => c.id === Number(formData.category_id));
      if (/room|guest|suite/i.test(cat?.name) && !formData.room_id) {
        return error('Please select a room for this issue');
      }
    }

    setSaving(true);
    try {
      const ticket = await api('/tickets', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      success(`Ticket #${ticket.ticket_number} created!`);
      navigate(`/tickets/${ticket.id}`);
    } catch (err) {
      error(err.message || 'Failed to create ticket');
      setSaving(false);
    }
  }

  // Edit Mode Actions
  function openEditModal(cat = null, parentId = '') {
    if (cat) {
      setEditingCat(cat);
      setCatForm({ 
        name: cat.name, 
        description: cat.description || '', 
        parent_id: cat.parent_id || '', 
        ticket_type: cat.ticket_type || formData.ticket_type, 
        is_active: cat.is_active 
      });
    } else {
      setEditingCat(null);
      setCatForm({ 
        name: '', 
        description: '', 
        parent_id: parentId, 
        ticket_type: formData.ticket_type, 
        is_active: true 
      });
    }
    setShowCatModal(true);
  }

  async function handleCatSubmit(e) {
    e.preventDefault();
    setCatSaving(true);
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
        success('Category added');
      }
      setShowCatModal(false);
      fetchData();
    } catch (err) {
      error(err.message || 'Failed to save category');
    } finally {
      setCatSaving(false);
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

  if (!formData.ticket_type) {
    return <TicketTypeSelector onSelect={handleTypeSelect} />;
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Edit Mode Toggle for Admins/Managers */}
      {isAdminOrManager && (
        <div style={{ 
          position: 'absolute', top: '-16px', right: '0', zIndex: 10,
          display: 'flex', alignItems: 'center', gap: '8px',
          background: isEditingForm ? 'var(--primary-50)' : 'transparent',
          padding: '6px 12px', borderRadius: '24px', border: isEditingForm ? '1px solid var(--primary-200)' : 'none'
        }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: isEditingForm ? 'var(--primary-700)' : 'var(--text-secondary)' }}>
            {isEditingForm ? 'Edit Mode Active' : 'Edit Page Options'}
          </span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={isEditingForm} 
              onChange={(e) => setIsEditingForm(e.target.checked)}
            />
            <span className="slider round"></span>
          </label>
        </div>
      )}

      {isEditingForm && (
        <div style={{
          padding: '12px', marginBottom: '24px', borderRadius: '8px',
          background: 'var(--primary-50)', border: '1px dashed var(--primary-300)',
          color: 'var(--primary-700)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <Edit3 size={16} />
          <strong>Edit Mode:</strong> Click the pencil icons to edit options, or use the Add buttons to create new ones. Form submission is disabled.
        </div>
      )}

      <TicketDetailsForm
        formData={formData}
        setFormData={setFormData}
        typeConfig={TYPE_CONFIG[formData.ticket_type]}
        parentCategories={parentCategories}
        subcategories={subcategories}
        rooms={rooms}
        assets={assets}
        departments={departments}
        technicians={technicians}
        duplicates={duplicates}
        saving={saving}
        onSubmit={handleSubmit}
        onBack={handleBackToTypeSelect}
        onCancel={() => navigate('/tickets')}
        isIT={isIT}
        handleCategoryChange={handleCategoryChange}
        REQUEST_CATEGORY_ICONS={REQUEST_CATEGORY_ICONS}
        ISSUE_CATEGORY_ICONS={ISSUE_CATEGORY_ICONS}
        
        // Edit Mode Props
        isEditingForm={isEditingForm}
        onEditCategory={openEditModal}
        onDeleteCategory={handleCatDelete}
      />

      {/* Inline Category Modal */}
      {showCatModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>{editingCat ? 'Edit Option' : 'Add New Option'}</h2>
              <button className="btn-icon" onClick={() => setShowCatModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCatSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  value={catForm.name} 
                  onChange={e => setCatForm({...catForm, name: e.target.value})} 
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea 
                  className="form-textarea" 
                  value={catForm.description} 
                  onChange={e => setCatForm({...catForm, description: e.target.value})} 
                  rows={2} 
                />
              </div>
              {editingCat && (
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select 
                    className="form-select" 
                    value={catForm.is_active ? 'active' : 'inactive'} 
                    onChange={e => setCatForm({...catForm, is_active: e.target.value === 'active'})}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCatModal(false)} disabled={catSaving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={catSaving}>
                  <Save size={16} /> {catSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
