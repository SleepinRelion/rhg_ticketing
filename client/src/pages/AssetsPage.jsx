import { useState, useEffect } from 'react';
import api from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { HardDrive, Plus, Edit2, Trash2, X, Save, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import BulkScanModal from '../components/assets/BulkScanModal.jsx';
import SearchableSelect from '../components/ui/SearchableSelect.jsx';
import useSortableTable from '../hooks/useSortableTable.js';

export default function AssetsPage() {
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [showBulkScanModal, setShowBulkScanModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [formData, setFormData] = useState({ name: '', asset_tag: '', category_id: '', room_id: '', location: '', manufacturer: '', model: '', serial_number: '', status: 'operational' });
  const [saving, setSaving] = useState(false);

  const { error, success } = useToast();
  const { user } = useAuth();
  const isManager = ['admin', 'manager'].includes(user?.role);
  
  const { sortedItems, requestSort, sortConfig } = useSortableTable(assets);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [assRes, catRes, roomRes] = await Promise.all([
        api('/assets'),
        api('/categories'),
        api('/rooms')
      ]);
      setAssets(assRes.assets || []);
      setCategories(catRes.categories || []);
      setRooms(roomRes.rooms || []);
    } catch (err) {
      error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  }

  function openModal(asset = null) {
    if (asset) {
      setEditingAsset(asset);
      setFormData({ 
        name: asset.name, 
        asset_tag: asset.asset_tag || '', 
        category_id: asset.category_id || '', 
        room_id: asset.room_id || '', 
        location: asset.location || '', 
        manufacturer: asset.manufacturer || '', 
        model: asset.model || '', 
        serial_number: asset.serial_number || '', 
        status: asset.status || 'operational' 
      });
    } else {
      setEditingAsset(null);
      setFormData({ name: '', asset_tag: '', category_id: '', room_id: '', location: '', manufacturer: '', model: '', serial_number: '', status: 'operational' });
    }
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData };
      if (!payload.category_id) delete payload.category_id;
      if (!payload.room_id) delete payload.room_id;

      if (editingAsset) {
        await api(`/assets/${editingAsset.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        success('Asset updated');
      } else {
        await api('/assets', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        success('Asset created');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      error(err.message || 'Failed to save asset');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this asset? This action cannot be undone if it has no dependencies.')) return;
    try {
      await api(`/assets/${id}`, { method: 'DELETE' });
      success('Asset deleted');
      fetchData();
    } catch (err) {
      error(err.message || 'Failed to delete asset');
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Assets & Equipment</h1>
          <p className="page-subtitle">Track hotel assets, appliances, and infrastructure</p>
        </div>
        {isManager && (
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={() => setShowBulkScanModal(true)}>
              <Camera size={16} /> Bulk Scan
            </button>
            <button className="btn btn-primary" onClick={() => openModal()}>
              <Plus size={16} /> Add Asset
            </button>
          </div>
        )}
      </div>

      <div className="data-table-container">
        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('name')} style={{ cursor: 'pointer' }}>
                  Name / Tag {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th onClick={() => requestSort('category_name')} style={{ cursor: 'pointer' }}>
                  Category {sortConfig?.key === 'category_name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th onClick={() => requestSort('room_number')} style={{ cursor: 'pointer' }}>
                  Location {sortConfig?.key === 'room_number' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th onClick={() => requestSort('status')} style={{ cursor: 'pointer' }}>
                  Status {sortConfig?.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th onClick={() => requestSort('next_maintenance_date')} style={{ cursor: 'pointer' }}>
                  Next Maintenance {sortConfig?.key === 'next_maintenance_date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                {isManager && <th style={{ width: 100 }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {sortedItems.map(asset => (
                <tr key={asset.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{asset.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{asset.asset_tag}</div>
                  </td>
                  <td>{asset.category_name || '-'}</td>
                  <td>{asset.room_number ? `Room ${asset.room_number}` : (asset.location || '-')}</td>
                  <td><span className="badge" style={{ background: asset.status === 'operational' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: asset.status === 'operational' ? '#34d399' : '#fbbf24' }}>{asset.status}</span></td>
                  <td>{asset.next_maintenance_date ? new Date(asset.next_maintenance_date).toLocaleDateString() : '-'}</td>
                  {isManager && (
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-icon" onClick={() => openModal(asset)}><Edit2 size={16} /></button>
                        <button className="btn-icon" onClick={() => handleDelete(asset.id)} style={{ color: 'var(--error)' }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>{editingAsset ? 'Edit Asset' : 'Add Asset'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">Name *</label>
                  <input type="text" className="form-input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Core Switch 1" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Asset Tag</label>
                  <input type="text" className="form-input" value={formData.asset_tag} onChange={e => setFormData({...formData, asset_tag: e.target.value})} placeholder="e.g. AST-001" />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Category</label>
                  <SearchableSelect className="form-select" value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})}>
                    <option value="">Select Category...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </SearchableSelect>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Status</label>
                  <SearchableSelect className="form-select" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="operational">Operational</option>
                    <option value="needs_repair">Needs Repair</option>
                    <option value="in_repair">In Repair</option>
                    <option value="retired">Retired</option>
                  </SearchableSelect>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Room</label>
                  <SearchableSelect className="form-select" value={formData.room_id} onChange={e => setFormData({...formData, room_id: e.target.value})}>
                    <option value="">No specific room</option>
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>Room {r.room_number}</option>
                    ))}
                  </SearchableSelect>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Location Details</label>
                  <input type="text" className="form-input" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="e.g. Rack 2, U14" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Manufacturer</label>
                  <input type="text" className="form-input" value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Model</label>
                  <input type="text" className="form-input" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Serial Number</label>
                  <input type="text" className="form-input" value={formData.serial_number} onChange={e => setFormData({...formData, serial_number: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={16} /> {saving ? 'Saving...' : 'Save Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkScanModal && (
        <BulkScanModal
          onClose={() => setShowBulkScanModal(false)}
          onComplete={() => {
            setShowBulkScanModal(false);
            fetchData();
          }}
          categories={categories}
          rooms={rooms}
        />
      )}
    </div>
  );
}
