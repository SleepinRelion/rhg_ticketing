import { useState, useEffect } from 'react';
import api from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { Download, BarChart2, PieChart as PieChartIcon, Activity, Users, Settings, Building, CreditCard, Wrench } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const REPORT_TYPES = [
  { id: 'ticket-summary', label: 'Ticket Summary', icon: PieChartIcon },
  { id: 'sla', label: 'SLA Performance', icon: Activity },
  { id: 'technician-performance', label: 'Technician Performance', icon: Users },
  { id: 'asset-reliability', label: 'Asset Reliability', icon: Settings },
  { id: 'room-issue', label: 'Room Issues', icon: Building },
  { id: 'department', label: 'Department Analytics', icon: BarChart2 },
  { id: 'cost', label: 'Cost Analysis', icon: CreditCard },
  { id: 'vendor', label: 'Vendor Performance', icon: Wrench }
];

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('ticket-summary');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { error } = useToast();

  useEffect(() => {
    fetchReport(activeReport);
  }, [activeReport]);

  async function fetchReport(type) {
    setLoading(true);
    try {
      const res = await api(`/reports/${type}`);
      setData(res.report.data || []);
    } catch (err) {
      error(err.message || 'Failed to load report data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    const token = localStorage.getItem('accessToken');
    const hotelId = localStorage.getItem('activeHotelId');
    const url = `/api/reports/${activeReport}/export`;
    
    // Create a temporary link to download the file directly through the browser
    // passing the token in the URL is unsafe, so we use fetch to get the blob
    api(`/reports/${activeReport}/export`)
      .then(blob => {
        if (!(blob instanceof Blob)) {
          throw new Error('Failed to download report');
        }
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `report_${activeReport}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
      })
      .catch(err => error('Failed to export CSV.'));
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  function renderDashboard() {
    if (data.length === 0) return <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>No data available for this report.</div>;

    if (activeReport === 'ticket-summary') {
      // Group by status
      const statusData = data.reduce((acc, curr) => {
        const existing = acc.find(item => item.name === curr.status);
        if (existing) {
          existing.value += parseInt(curr.count, 10);
        } else {
          acc.push({ name: curr.status, value: parseInt(curr.count, 10) });
        }
        return acc;
      }, []);

      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Tickets by Status</h3>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Tickets']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Raw Data Summary</h3>
            {renderTable()}
          </div>
        </div>
      );
    }

    if (activeReport === 'sla') {
      const grouped = data.reduce((acc, curr) => {
        if (!acc[curr.priority]) {
          acc[curr.priority] = { priority: curr.priority, met: 0, breached: 0 };
        }
        if (curr.sla_status === 'breached') {
          acc[curr.priority].breached += parseInt(curr.count, 10);
        } else {
          acc[curr.priority].met += parseInt(curr.count, 10);
        }
        return acc;
      }, {});

      const formattedData = Object.values(grouped);

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ padding: '24px', height: 400 }}>
            <h3 style={{ marginBottom: '16px' }}>SLA Performance</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="priority" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="met" name="SLA Met" stackId="a" fill="#10b981" />
                <Bar dataKey="breached" name="SLA Breached" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">{renderTable()}</div>
        </div>
      );
    }

    // Default Fallback
    return (
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '16px', textTransform: 'capitalize' }}>{activeReport.replace(/-/g, ' ')} Data</h3>
        {renderTable()}
      </div>
    );
  }

  // Render dynamic table based on data shape
  function renderTable() {
    if (data.length === 0) return null;

    const columns = Object.keys(data[0]);

    return (
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col}>{col.replace(/_/g, ' ').toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col}>{row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 120px)' }}>
      {/* Sidebar Navigation */}
      <div className="card" style={{ width: '280px', flexShrink: 0, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
        <h3 style={{ padding: '0 12px 12px', margin: 0, borderBottom: '1px solid var(--border-color)', marginBottom: '8px' }}>Reports</h3>
        {REPORT_TYPES.map(report => {
          const Icon = report.icon;
          return (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                border: 'none',
                background: activeReport === report.id ? 'var(--primary-50)' : 'transparent',
                color: activeReport === report.id ? 'var(--primary-600)' : 'var(--text-primary)',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                fontWeight: activeReport === report.id ? 600 : 400,
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={18} />
              {report.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 className="page-title">{REPORT_TYPES.find(r => r.id === activeReport)?.label}</h1>
            <p className="page-subtitle">Real-time data and analytics</p>
          </div>
          <button onClick={handleExport} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} /> Export CSV
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
          {loading ? (
            <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="loading-spinner"><div className="spinner"></div></div>
            </div>
          ) : (
            renderDashboard()
          )}
        </div>
      </div>
    </div>
  );
}
