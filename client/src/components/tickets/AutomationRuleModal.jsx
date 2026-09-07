import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import SearchableSelect from '../ui/SearchableSelect.jsx';
import api from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';

const FIELD_OPTIONS = [
  { value: 'category_id', label: 'Category' },
  { value: 'department_id', label: 'Department' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' }
];

const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does not equal' },
  { value: 'contains', label: 'Contains' }
];

const ACTION_TYPES = [
  { value: 'assign_to', label: 'Assign To User' },
  { value: 'set_priority', label: 'Set Priority' }
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
];

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting', label: 'Waiting on Guest' },
  { value: 'resolved', label: 'Resolved' }
];

export default function AutomationRuleModal({ rule, onClose, onSave }) {
  const { error } = useToast();
  const [name, setName] = useState(rule?.name || '');
  const [isActive, setIsActive] = useState(rule ? rule.is_active : true);
  
  // Default to one empty condition and action
  const [conditions, setConditions] = useState(() => {
    if (rule?.conditions && rule.conditions.length > 0) return rule.conditions;
    return [{ field: 'category_id', operator: 'equals', value: '' }];
  });
  
  const [actions, setActions] = useState(() => {
    if (rule?.actions && rule.actions.length > 0) return rule.actions;
    return [{ type: 'assign_to', value: '' }];
  });

  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    Promise.all([
      api('/categories').catch(() => ({ categories: [] })),
      api('/departments').catch(() => ({ departments: [] })),
      api('/users').catch(() => ({ users: [] }))
    ]).then(([catRes, depRes, userRes]) => {
      setCategories(catRes.categories?.map(c => ({ value: String(c.id), label: c.name })) || []);
      setDepartments(depRes.departments?.map(d => ({ value: String(d.id), label: d.name })) || []);
      setUsers(userRes.users?.map(u => ({ value: String(u.id), label: u.name })) || []);
    });
  }, []);

  const handleAddCondition = () => {
    setConditions([...conditions, { field: 'category_id', operator: 'equals', value: '' }]);
  };

  const handleUpdateCondition = (index, key, val) => {
    const newConds = [...conditions];
    newConds[index][key] = val;
    if (key === 'field') newConds[index].value = ''; // Reset value when field changes
    setConditions(newConds);
  };

  const handleRemoveCondition = (index) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleAddAction = () => {
    setActions([...actions, { type: 'assign_to', value: '' }]);
  };

  const handleUpdateAction = (index, key, val) => {
    const newActs = [...actions];
    newActs[index][key] = val;
    if (key === 'type') newActs[index].value = ''; // Reset value when type changes
    setActions(newActs);
  };

  const handleRemoveAction = (index) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return error('Rule name is required.');
    
    // Filter out incomplete conditions/actions
    const validConditions = conditions.filter(c => c.field && c.operator && String(c.value).trim());
    const validActions = actions.filter(a => a.type && String(a.value).trim());

    if (validConditions.length === 0) return error('At least one valid condition is required.');
    if (validActions.length === 0) return error('At least one valid action is required.');

    onSave({
      id: rule?.id,
      name,
      is_active: isActive,
      conditions: validConditions,
      actions: validActions
    });
  };

  // Helper to render the right input for condition value
  const renderConditionValueInput = (cond, index) => {
    let options = [];
    if (cond.field === 'category_id') options = categories;
    else if (cond.field === 'department_id') options = departments;
    else if (cond.field === 'priority') options = PRIORITY_OPTIONS;
    else if (cond.field === 'status') options = STATUS_OPTIONS;

    if (options.length > 0 && cond.operator !== 'contains') {
      const selected = options.find(o => o.value === String(cond.value));
      return (
        <SearchableSelect
          options={options}
          value={selected}
          onChange={(opt) => handleUpdateCondition(index, 'value', opt.value)}
          placeholder="Select value..."
        />
      );
    }

    return (
      <input 
        type="text" 
        className="form-input" 
        placeholder="Enter value..."
        value={cond.value} 
        onChange={e => handleUpdateCondition(index, 'value', e.target.value)} 
      />
    );
  };

  // Helper to render the right input for action value
  const renderActionValueInput = (act, index) => {
    if (act.type === 'assign_to') {
      const selected = users.find(o => o.value === String(act.value));
      return (
        <SearchableSelect
          options={users}
          value={selected}
          onChange={(opt) => handleUpdateAction(index, 'value', opt.value)}
          placeholder="Select user..."
        />
      );
    } else if (act.type === 'set_priority') {
      const selected = PRIORITY_OPTIONS.find(o => o.value === String(act.value));
      return (
        <SearchableSelect
          options={PRIORITY_OPTIONS}
          value={selected}
          onChange={(opt) => handleUpdateAction(index, 'value', opt.value)}
          placeholder="Select priority..."
        />
      );
    }
    return (
      <input 
        type="text" 
        className="form-input" 
        value={act.value} 
        onChange={e => handleUpdateAction(index, 'value', e.target.value)} 
      />
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3>{rule ? 'Edit Automation Rule' : 'New Automation Rule'}</h3>
          <button type="button" className="btn btn-ghost" onClick={onClose}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Rule Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. Assign Hardware issues to IT"
              required 
            />
          </div>

          <div className="form-group" style={{ marginTop: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={isActive} 
                onChange={e => setIsActive(e.target.checked)} 
              />
              Rule is active
            </label>
          </div>

          <hr style={{ margin: '24px 0', borderColor: 'var(--border-color)' }} />

          {/* Conditions Section */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '16px' }}>When these conditions are met:</h4>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleAddCondition}>
                <Plus size={16} /> Add Condition
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {conditions.map((cond, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'var(--bg-hover)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <SearchableSelect
                      options={FIELD_OPTIONS}
                      value={FIELD_OPTIONS.find(o => o.value === cond.field)}
                      onChange={opt => handleUpdateCondition(i, 'field', opt.value)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <SearchableSelect
                      options={OPERATOR_OPTIONS}
                      value={OPERATOR_OPTIONS.find(o => o.value === cond.operator)}
                      onChange={opt => handleUpdateCondition(i, 'operator', opt.value)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    {renderConditionValueInput(cond, i)}
                  </div>
                  <button type="button" className="btn btn-ghost text-error" onClick={() => handleRemoveCondition(i)} style={{ padding: '8px', marginTop: '2px' }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {conditions.length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No conditions. This rule will run on every ticket.
                </div>
              )}
            </div>
          </div>

          <hr style={{ margin: '24px 0', borderColor: 'var(--border-color)' }} />

          {/* Actions Section */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '16px' }}>Perform these actions:</h4>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleAddAction}>
                <Plus size={16} /> Add Action
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {actions.map((act, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'var(--bg-hover)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <SearchableSelect
                      options={ACTION_TYPES}
                      value={ACTION_TYPES.find(o => o.value === act.type)}
                      onChange={opt => handleUpdateAction(i, 'type', opt.value)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    {renderActionValueInput(act, i)}
                  </div>
                  <button type="button" className="btn btn-ghost text-error" onClick={() => handleRemoveAction(i)} style={{ padding: '8px', marginTop: '2px' }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {actions.length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No actions defined.
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              <Save size={16} /> Save Rule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
