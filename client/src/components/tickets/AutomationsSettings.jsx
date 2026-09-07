import { useState, useEffect } from 'react';
import api from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Plus, Trash2, Save, Play } from 'lucide-react';
import SearchableSelect from '../ui/SearchableSelect.jsx';

export default function AutomationsSettings() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();

  useEffect(() => {
    fetchRules();
  }, []);

  async function fetchRules() {
    try {
      const res = await api('/automations');
      setRules(res.rules || []);
    } catch (err) {
      error('Failed to load automations');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleRule(rule) {
    try {
      const updated = { ...rule, is_active: !rule.is_active };
      const res = await api(`/automations/${rule.id}`, {
        method: 'PUT',
        body: JSON.stringify(updated)
      });
      setRules(rules.map(r => r.id === rule.id ? res.rule : r));
      success(`Rule ${res.rule.is_active ? 'enabled' : 'disabled'}`);
    } catch (err) {
      error('Failed to update rule');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this rule?')) return;
    try {
      await api(`/automations/${id}`, { method: 'DELETE' });
      setRules(rules.filter(r => r.id !== id));
      success('Rule deleted');
    } catch (err) {
      error('Failed to delete rule');
    }
  }

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Automation Rules</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Rules run automatically when a new ticket is created.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => alert('Advanced rule builder coming soon.')}>
          <Plus size={16} /> New Rule
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center' }}><div className="spinner"></div></div>
      ) : rules.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-hover)', borderRadius: '8px' }}>
          No automation rules configured yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {rules.map(rule => (
            <div key={rule.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', background: rule.is_active ? 'transparent' : 'var(--bg-hover)' }}>
              <div>
                <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {rule.name}
                  {!rule.is_active && <span className="badge badge-warning">Disabled</span>}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {rule.conditions && rule.conditions.length > 0 ? (
                    `If ${rule.conditions.map(c => `${c.field} ${c.operator} ${c.value}`).join(' AND ')}`
                  ) : 'Always runs'}
                  {' ➔ '}
                  {rule.actions && rule.actions.length > 0 ? (
                    rule.actions.map(a => `${a.type.replace('_', ' ')} to ${a.value}`).join(', ')
                  ) : 'No actions'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost" onClick={() => handleToggleRule(rule)}>
                  {rule.is_active ? 'Disable' : 'Enable'}
                </button>
                <button className="btn btn-ghost text-error" onClick={() => handleDelete(rule.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
