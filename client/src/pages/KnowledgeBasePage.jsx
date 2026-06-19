import { useState, useEffect } from 'react';
import api from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { BookOpen, Plus, Edit, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    symptoms: '',
    resolution_steps: ''
  });

  const { addToast } = useToast();
  const { user } = useAuth();

  const fetchData = async () => {
    try {
      const [resKb, resCat] = await Promise.all([
        api('/knowledge-base'),
        api('/categories')
      ]);
      setArticles(resKb.articles);
      setCategories(resCat.categories);
    } catch (err) {
      addToast('Failed to fetch data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (article = null) => {
    if (article) {
      setEditingArticle(article);
      setFormData({
        title: article.title,
        category_id: article.category_id || '',
        symptoms: article.symptoms,
        resolution_steps: article.resolution_steps
      });
    } else {
      setEditingArticle(null);
      setFormData({ title: '', category_id: '', symptoms: '', resolution_steps: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingArticle(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingArticle) {
        await api(`/knowledge-base/${editingArticle.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        addToast('Article updated successfully.', 'success');
      } else {
        await api('/knowledge-base', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        addToast('Article created successfully.', 'success');
      }
      handleCloseModal();
      fetchData();
    } catch (err) {
      addToast(err.message || 'Failed to save article.', 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Knowledge Base</h1>
          <p className="page-subtitle">Standard operating procedures and troubleshooting guides</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'technician') && (
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={16} style={{ marginRight: '8px' }} />
            New Article
          </button>
        )}
      </div>
      
      {loading ? <div className="loading-spinner"><div className="spinner"></div></div> : (
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))' }}>
          {articles.map(article => (
            <div key={article.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ marginBottom: '8px' }}>{article.title}</h3>
                <div style={{ fontSize: '12px', color: 'var(--primary-400)', marginBottom: '16px' }}>{article.category_name || 'General'}</div>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}><strong>Symptoms:</strong> {article.symptoms.substring(0, 100)}{article.symptoms.length > 100 ? '...' : ''}</p>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}><strong>Resolution:</strong> {article.resolution_steps.substring(0, 100)}{article.resolution_steps.length > 100 ? '...' : ''}</p>
              </div>
              {(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'technician') && (
                <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost" onClick={() => handleOpenModal(article)}>
                    <Edit size={16} style={{ marginRight: '8px' }} />
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, 
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{editingArticle ? 'Edit Article' : 'New Article'}</h2>
              <button className="btn btn-ghost" onClick={handleCloseModal} style={{ padding: '4px' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <SearchableSelect 
                  className="form-input" 
                  value={formData.category_id} 
                  onChange={e => setFormData({...formData, category_id: e.target.value})}
                >
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SearchableSelect>
              </div>
              <div className="form-group">
                <label className="form-label">Symptoms (Markdown)</label>
                <textarea 
                  className="form-input" 
                  required 
                  rows={4}
                  value={formData.symptoms} 
                  onChange={e => setFormData({...formData, symptoms: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Resolution Steps (Markdown)</label>
                <textarea 
                  className="form-input" 
                  required 
                  rows={6}
                  value={formData.resolution_steps} 
                  onChange={e => setFormData({...formData, resolution_steps: e.target.value})} 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-ghost" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Article</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
