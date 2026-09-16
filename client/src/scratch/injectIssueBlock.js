import fs from 'fs';

const path = 'c:/Users/Madhav/Documents/Projects/Hotel Ticketing System/client/src/components/tickets/create/TicketDetailsForm.jsx';
let code = fs.readFileSync(path, 'utf8');

// Normalize newlines for precise matching
code = code.replace(/\r\n/g, '\n');

const target = `              </>
            )}
            </div>

            {/* === STEP 2: DETAILS === */}`;

const replacement = `              </>
            )}

            {/* === ISSUE === */}
            {isIssueType && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  {parentCategories.map(cat => {
                    const CatIcon = getCategoryIcon(cat.name, AlertTriangle);
                    const isSelected = formData.category_id === String(cat.id);
                    return (
                      <div key={cat.id} style={{ position: 'relative', display: 'flex' }}>
                      <button
                        type="button"
                        onClick={() => handleCategoryChange(String(cat.id))}
                        style={{
                          width: '100%',
                          padding: '16px 12px',
                          borderRadius: 'var(--radius-xl)',
                          border: isSelected
                            ? \`2px solid \${typeConfig.color}\`
                            : '1px solid var(--border-color)',
                          background: isSelected ? typeConfig.bg : 'var(--bg-secondary)',
                          cursor: isEditingForm ? 'default' : 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.2s ease',
                          opacity: cat.is_active === false ? 0.5 : 1
                        }}
                      >
                        <CatIcon size={24} style={{ color: isSelected ? typeConfig.color : 'var(--text-secondary)', marginBottom: '8px' }} />
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{cat.name}</div>
                        {cat.description && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{cat.description}</div>}
                      </button>
                      {isEditingForm && (
                        <div style={{ position: 'absolute', top: '-8px', right: '-8px', display: 'flex', gap: '4px', background: 'var(--bg-primary)', padding: '2px', borderRadius: '6px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', border: '1px solid var(--border-color)' }}>
                          <button type="button" onClick={(e) => { e.stopPropagation(); onEditCategory(cat); }} style={{ cursor: 'pointer', padding: '4px', border: 'none', background: 'transparent', color: 'var(--text-secondary)' }}><Edit3 size={14} /></button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); onDeleteCategory(cat.id); }} style={{ cursor: 'pointer', padding: '4px', border: 'none', background: 'transparent', color: 'var(--error)' }}><Trash2 size={14} /></button>
                        </div>
                      )}
                      </div>
                    );
                  })}
                  {isEditingForm && (
                    <button type="button" onClick={() => onEditCategory(null, '')} style={{ border: '1px dashed var(--primary-400)', background: 'transparent', color: 'var(--primary-600)', borderRadius: 'var(--radius-xl)', padding: '16px 12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>+ Add Category</button>
                  )}
                </div>

                {(subcategories.length > 0 || (isEditingForm && formData.category_id)) && (
                  <div className="form-group">
                    <label className="form-label">
                      {isOutletIssue ? 'Select Outlet' : isSystemIssue ? 'System / Module' : 'Subcategory / Problem Type'} <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                      {subcategories.map(sub => (
                        <div key={sub.id} style={{ position: 'relative', display: 'flex' }}>
                        <button
                          type="button"
                          onClick={() => { if (!isEditingForm) setFormData({ ...formData, subcategory_id: String(sub.id) }) }}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-lg)',
                            border: formData.subcategory_id === String(sub.id)
                              ? \`2px solid \${typeConfig.color}\`
                              : '1px solid var(--border-color)',
                            background: formData.subcategory_id === String(sub.id)
                              ? typeConfig.bg
                              : 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            cursor: isEditingForm ? 'default' : 'pointer',
                            textAlign: 'left',
                            fontSize: '13px',
                            fontWeight: formData.subcategory_id === String(sub.id) ? 600 : 400,
                            transition: 'all 0.15s ease',
                            opacity: sub.is_active === false ? 0.5 : 1
                          }}
                        >
                          {sub.name}
                        </button>
                        {isEditingForm && (
                          <div style={{ position: 'absolute', top: '-8px', right: '-8px', display: 'flex', gap: '4px', background: 'var(--bg-primary)', padding: '2px', borderRadius: '6px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', border: '1px solid var(--border-color)' }}>
                            <button type="button" onClick={(e) => { e.stopPropagation(); onEditCategory(sub, formData.category_id); }} style={{ cursor: 'pointer', padding: '4px', border: 'none', background: 'transparent', color: 'var(--text-secondary)' }}><Edit3 size={14} /></button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); onDeleteCategory(sub.id); }} style={{ cursor: 'pointer', padding: '4px', border: 'none', background: 'transparent', color: 'var(--error)' }}><Trash2 size={14} /></button>
                          </div>
                        )}
                        </div>
                      ))}
                      {isEditingForm && (
                        <button type="button" onClick={() => onEditCategory(null, formData.category_id)} style={{ border: '1px dashed var(--primary-400)', background: 'transparent', color: 'var(--primary-600)', borderRadius: 'var(--radius-lg)', padding: '10px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>+ Add Option</button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            </div>

            {/* === STEP 2: DETAILS === */}`;

if (!code.includes(target)) {
  console.log("Error: Target not found!");
} else {
  code = code.replace(target, replacement);
  fs.writeFileSync(path, code);
  console.log("Successfully injected Issue block");
}
