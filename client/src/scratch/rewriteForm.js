import fs from 'fs';

const filePath = 'c:/Users/Madhav/Documents/Projects/Hotel Ticketing System/client/src/components/tickets/create/TicketDetailsForm.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 2. Request Categories
content = content.replace(
  /\{parentCategories\.map\(cat => \{[\s\S]*?return \([\s\S]*?<button\s*key=\{cat\.id\}[\s\S]*?<\/button>\s*\);\s*\}\)\}/,
  `{parentCategories.map(cat => {
                    const CatIcon = REQUEST_CATEGORY_ICONS[cat.name] || FileQuestion;
                    const isSelected = formData.category_id === String(cat.id);
                    return (
                      <div key={cat.id} style={{ position: 'relative', display: 'flex' }}>
                      <button
                        type="button"
                        onClick={() => handleCategoryChange(String(cat.id))}
                        style={{
                          width: '100%',
                          padding: '20px',
                          borderRadius: 'var(--radius-xl)',
                          border: isSelected
                            ? \`2px solid \${typeConfig.color}\`
                            : '1px solid var(--border-color)',
                          background: isSelected ? typeConfig.bg : 'var(--bg-secondary)',
                          cursor: isEditingForm ? 'default' : 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s ease',
                          opacity: cat.is_active === false ? 0.5 : 1
                        }}
                      >
                        <CatIcon size={20} style={{ color: isSelected ? typeConfig.color : 'var(--text-secondary)', marginBottom: '8px' }} />
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{cat.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{cat.description}</div>
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
                    <button type="button" onClick={() => onEditCategory(null, '')} style={{ border: '1px dashed var(--primary-400)', background: 'transparent', color: 'var(--primary-600)', borderRadius: 'var(--radius-xl)', padding: '20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>+ Add Category</button>
                  )}`
);

// 3. Request Subcategories
content = content.replace(
  /\{subcategories\.map\(sub => \(\s*<button\s*key=\{sub\.id\}[\s\S]*?<\/button>\s*\)\)\}/,
  `{subcategories.map(sub => (
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
                      )}`
);

// 4. Issue Categories
content = content.replace(
  /\{parentCategories\.map\(cat => \{[\s\S]*?return \([\s\S]*?<button\s*key=\{cat\.id\}[\s\S]*?<\/button>\s*\);\s*\}\)\}/,
  `{parentCategories.map(cat => {
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
                  )}`
);

// 5. Issue Subcategories
content = content.replace(
  /\{subcategories\.map\(sub => \(\s*<button\s*key=\{sub\.id\}[\s\S]*?<\/button>\s*\)\)\}/,
  `{subcategories.map(sub => (
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
                      )}`
);

// If subcategories.length === 0, normally it hides the whole subcategories block. 
// But in edit mode, if they select a category, they should be able to add subcategories even if there are none.
content = content.replace(
  /\{subcategories\.length > 0 && \(/g,
  '{(subcategories.length > 0 || (isEditingForm && formData.category_id)) && ('
);


fs.writeFileSync(filePath, content);
console.log("Rewrote TicketDetailsForm.jsx");
