import { useState, useEffect } from 'react';
import api from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { DoorOpen, Plus, Edit2, Trash2, X, Save, Search, Filter as FilterIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({ room_number: '', floor: '', room_type: 'guest' });
  const [saving, setSaving] = useState(false);

  // Filter & Sort States
  const [filterBlock, setFilterBlock] = useState('all');
  const [sortOption, setSortOption] = useState('block-asc');
  const [searchQuery, setSearchQuery] = useState('');

  const { error, success } = useToast();
  const { user } = useAuth();
  const isManager = ['admin', 'manager'].includes(user?.role);

  useEffect(() => {
    fetchRooms();
  }, []);

  async function fetchRooms() {
    setLoading(true);
    try {
      const data = await api('/rooms');
      setRooms(data.rooms);
    } catch (err) {
      error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }

  function parseRoom(roomNumber, hotelId) {
    const numStr = String(roomNumber || '').trim();
    let blockNum = 999999;
    let roomVal = 999999;
    let isNumeric = false;
    
    if (/^\d+$/.test(numStr)) {
      isNumeric = true;
      roomVal = parseInt(numStr, 10);
      
      // Azuri uses hotel_id === 3. We group by hundreds (1100, 1200...)
      if (hotelId === 3 && numStr.length === 4) {
        blockNum = parseInt(numStr.substring(0, 2), 10) * 100;
      } else {
        // Default / Crystal Beach logic
        if (numStr.length === 5) {
          if (numStr.startsWith('10')) blockNum = 10000;
          else if (numStr.startsWith('11')) blockNum = 11000;
        } else if (numStr.length === 4) {
          const firstDigit = numStr.charAt(0);
          blockNum = parseInt(firstDigit, 10) * 1000;
        } else if (numStr.length === 3) {
          blockNum = 0; // standard floor 1-3 blocks or lobby common areas
        }
      }
    }
    
    return { blockNum, roomVal, isNumeric, raw: numStr };
  }

  // Get unique blocks dynamically from loaded rooms
  const uniqueBlocks = Array.from(
    new Set(
      rooms
        .map(room => parseRoom(room.room_number, room.hotel_id).blockNum)
        .filter(blockNum => blockNum !== 999999 && blockNum !== 0)
    )
  ).sort((a, b) => a - b);

  // Filtered & Sorted Rooms list
  const processedRooms = rooms
    .filter(room => {
      // 1. Search Query Filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const numMatch = String(room.room_number || '').toLowerCase().includes(q);
        const floorMatch = String(room.floor || '').toLowerCase().includes(q);
        const typeMatch = String(room.room_type || '').toLowerCase().includes(q);
        if (!numMatch && !floorMatch && !typeMatch) return false;
      }
      
      // 2. Block Filter
      if (filterBlock !== 'all') {
        const parsed = parseRoom(room.room_number, room.hotel_id);
        if (filterBlock === 'other') {
          return !parsed.isNumeric || parsed.blockNum === 0 || parsed.blockNum === 999999;
        } else {
          return parsed.blockNum === parseInt(filterBlock, 10);
        }
      }
      return true;
    })
    .sort((a, b) => {
      const parsedA = parseRoom(a.room_number, a.hotel_id);
      const parsedB = parseRoom(b.room_number, b.hotel_id);

      if (sortOption === 'block-asc') {
        if (parsedA.blockNum !== parsedB.blockNum) {
          return parsedA.blockNum - parsedB.blockNum;
        }
        return parsedA.roomVal - parsedB.roomVal;
      }

      if (sortOption === 'block-desc') {
        if (parsedA.blockNum !== parsedB.blockNum) {
          return parsedB.blockNum - parsedA.blockNum;
        }
        return parsedB.roomVal - parsedA.roomVal;
      }

      if (sortOption === 'num-asc') {
        if (parsedA.isNumeric && parsedB.isNumeric) {
          return parsedA.roomVal - parsedB.roomVal;
        }
        return parsedA.raw.localeCompare(parsedB.raw);
      }

      if (sortOption === 'num-desc') {
        if (parsedA.isNumeric && parsedB.isNumeric) {
          return parsedB.roomVal - parsedA.roomVal;
        }
        return parsedB.raw.localeCompare(parsedA.raw);
      }

      return 0;
    });

  function openModal(room = null) {
    if (room) {
      setEditingRoom(room);
      setFormData({ room_number: room.room_number, floor: room.floor || '', room_type: room.room_type || 'guest' });
    } else {
      setEditingRoom(null);
      setFormData({ room_number: '', floor: '', room_type: 'guest' });
    }
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingRoom) {
        await api(`/rooms/${editingRoom.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        success('Room updated');
      } else {
        await api('/rooms', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        success('Room created');
      }
      setShowModal(false);
      fetchRooms();
    } catch (err) {
      error(err.message || 'Failed to save room');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this room? This action cannot be undone if it has no dependencies.')) return;
    try {
      await api(`/rooms/${id}`, { method: 'DELETE' });
      success('Room deleted');
      fetchRooms();
    } catch (err) {
      error(err.message || 'Failed to delete room');
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Rooms & Areas</h1>
          <p className="page-subtitle">Manage hotel rooms and physical spaces</p>
        </div>
        {isManager && (
          <button className="btn btn-primary" onClick={() => openModal()}>
            <Plus size={16} /> Add Room
          </button>
        )}
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="toolbar" style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: '1', minWidth: '200px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search room or type..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Filter:</span>
            <select
              className="form-select"
              value={filterBlock}
              onChange={e => setFilterBlock(e.target.value)}
              style={{ width: '150px' }}
            >
              <option value="all">All Blocks</option>
              {uniqueBlocks.map(block => (
                <option key={block} value={block}>Block {block}</option>
              ))}
              <option value="other">Other Areas</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Sort:</span>
            <select
              className="form-select"
              value={sortOption}
              onChange={e => setSortOption(e.target.value)}
              style={{ width: '220px' }}
            >
              <option value="block-asc">Block (Lowest First)</option>
              <option value="block-desc">Block (Highest First)</option>
              <option value="num-asc">Room Number (Lowest First)</option>
              <option value="num-desc">Room Number (Highest First)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="data-table-container">
        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Room Number</th>
                <th>Floor</th>
                <th>Type</th>
                <th>Open Tickets</th>
                {isManager && <th style={{ width: 100 }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {processedRooms.map(room => (
                <tr key={room.id}>
                  <td style={{ fontWeight: 600 }}>Room {room.room_number}</td>
                  <td>{room.floor || '-'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{room.room_type || '-'}</td>
                  <td>
                    {room.open_ticket_count > 0 
                      ? <span style={{ color: 'var(--error)', fontWeight: 600 }}>{room.open_ticket_count} Issues</span>
                      : <span style={{ color: 'var(--success)' }}>Clear</span>}
                  </td>
                  {isManager && (
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-icon" onClick={() => openModal(room)}><Edit2 size={16} /></button>
                        <button className="btn-icon" onClick={() => handleDelete(room.id)} style={{ color: 'var(--error)' }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && (
        <div style={{ marginTop: '16px', textAlign: 'right', fontSize: '13px', color: 'var(--text-muted)' }}>
          {filterBlock === 'all' 
            ? `Total records: ${processedRooms.length}`
            : `Total rooms in this block: ${processedRooms.length}`}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>{editingRoom ? 'Edit Room' : 'Add Room'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Room / Area Identifier *</label>
                <input type="text" className="form-input" required value={formData.room_number} onChange={e => setFormData({...formData, room_number: e.target.value})} placeholder="e.g. 101 or Lobby" />
              </div>
              <div className="form-group">
                <label className="form-label">Floor</label>
                <input type="text" className="form-input" value={formData.floor} onChange={e => setFormData({...formData, floor: e.target.value})} placeholder="e.g. 1" />
              </div>
              <div className="form-group">
                <label className="form-label">Room Type</label>
                <select className="form-select" value={formData.room_type} onChange={e => setFormData({...formData, room_type: e.target.value})}>
                  <option value="guest">Guest Room</option>
                  <option value="public">Public Area</option>
                  <option value="back_office">Back Office</option>
                  <option value="facility">Facility</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={16} /> {saving ? 'Saving...' : 'Save Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
