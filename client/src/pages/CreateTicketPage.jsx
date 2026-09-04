import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, AlertTriangle } from 'lucide-react';
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
  });

  const [allCategories, setAllCategories] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [assets, setAssets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [saving, setSaving] = useState(false);
  const [duplicates, setDuplicates] = useState([]);

  const navigate = useNavigate();
  const { error, success } = useToast();
  const { user } = useAuth();

  const isIT = ['admin', 'manager', 'technician'].includes(user?.role);

  useEffect(() => {
    Promise.all([
      api('/categories'),
      api('/rooms'),
      api('/assets'),
      api('/departments').catch(() => ({ departments: [] })),
      api('/tickets/templates').catch(() => ({ templates: [] }))
    ]).then(([catRes, roomRes, assetRes, deptRes, tmplRes]) => {
      setAllCategories(catRes.categories || []);
      setRooms(roomRes.rooms || []);
      setAssets(assetRes.assets || []);
      setDepartments(deptRes.departments || []);
      setTemplates(tmplRes.templates || []);
    }).catch(() => error('Failed to load form data'));
  }, []);

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
    setFormData(prev => ({ ...prev, category_id: catId, subcategory_id: '' }));
  }

  function handleTemplateSelect(e) {
    const templateId = e.target.value;
    if (!templateId) return;
    
    const template = templates.find(t => t.id === Number(templateId));
    if (!template) return;

    // We assume templates are for "Issue" type for now, but could be either.
    setFormData(prev => ({
      ...prev,
      ticket_type: 'issue', 
      title: template.title || '',
      description: template.description_template || '',
      category_id: template.category_id || '',
      priority: template.priority || 'medium',
      // If template has default assignee, the backend will handle it based on category/template ID,
      // but we populate the text fields for the user.
    }));
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

  if (!formData.ticket_type) {
    return <TicketTypeSelector onSelect={handleTypeSelect} />;
  }

  return (
    <TicketDetailsForm
      formData={formData}
      setFormData={setFormData}
      typeConfig={TYPE_CONFIG[formData.ticket_type]}
      parentCategories={parentCategories}
      subcategories={subcategories}
      rooms={rooms}
      assets={assets}
      departments={departments}
      templates={templates}
      handleTemplateSelect={handleTemplateSelect}
      duplicates={duplicates}
      saving={saving}
      onSubmit={handleSubmit}
      onBack={handleBackToTypeSelect}
      onCancel={() => navigate('/tickets')}
      isIT={isIT}
      handleCategoryChange={handleCategoryChange}
      REQUEST_CATEGORY_ICONS={REQUEST_CATEGORY_ICONS}
      ISSUE_CATEGORY_ICONS={ISSUE_CATEGORY_ICONS}
    />
  );
}
