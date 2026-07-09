import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import api from '../api/client.js';
import { Ticket, AlertCircle, Clock, CheckCircle2, TrendingUp, AlertTriangle, Maximize2, X } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import SearchableSelect from '../components/ui/SearchableSelect.jsx';
import { useNavigate } from 'react-router-dom';

function DashboardSkeleton() {
  return (
    <div style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
      <div className="page-header">
        <div>
          <div style={{ height: '32px', width: '250px', backgroundColor: 'var(--bg-elevated)', borderRadius: '4px', marginBottom: '8px' }}></div>
          <div style={{ height: '20px', width: '350px', backgroundColor: 'var(--bg-elevated)', borderRadius: '4px' }}></div>
        </div>
      </div>
      <div className="stat-cards">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="stat-card" style={{ height: '90px', backgroundColor: 'var(--bg-elevated)' }}></div>
        ))}
      </div>
      <div className="charts-grid">
        <div className="chart-card" style={{ height: '400px', backgroundColor: 'var(--bg-elevated)' }}></div>
        <div className="chart-card" style={{ height: '400px', backgroundColor: 'var(--bg-elevated)' }}></div>
        <div className="chart-card" style={{ height: '400px', backgroundColor: 'var(--bg-elevated)' }}></div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [topProblemFilter, setTopProblemFilter] = useState('rooms');
  const [expandedChart, setExpandedChart] = useState(false);
  const { error } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData(true); // silent refresh
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchDashboardData(silent = false) {
    try {
      if (!silent) setLoading(true);
      setFetchError(null);

      const [statsRes, chartsRes] = await Promise.all([
        api(`/dashboard/stats`),
        api(`/dashboard/charts`)
      ]);
      setStats(statsRes.stats);
      setCharts(chartsRes.charts);
    } catch (err) {
      if (!silent) {
        error('Failed to load dashboard data: ' + err.message);
        setFetchError(err.message);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  if (fetchError) {
    return (
      <div style={{ padding: '2rem', color: 'red' }}>
        <h2>Error Loading Dashboard</h2>
        <p>{fetchError}</p>
      </div>
    );
  }

  if (loading || !stats || !charts) {
    return <DashboardSkeleton />;
  }

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#0ea5e9'];

  const fullProblemData = topProblemFilter === 'rooms' ? charts.topRooms :
                          topProblemFilter === 'room_types' ? charts.topRoomTypes :
                          topProblemFilter === 'assets' ? charts.topAssets :
                          topProblemFilter === 'categories' ? charts.byCategory :
                          [...charts.byDepartment].sort((a, b) => b.count - a.count);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p className="page-subtitle">
            Real-time metrics and operational status
          </p>
        </div>
      </div>

      <div className="stat-cards">
        <div className="stat-card" style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }} onClick={() => navigate('/tickets?status=open,in_progress,assigned')} onMouseEnter={e => e.currentTarget.style.transform='scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
          <div className="stat-card-icon blue"><Ticket size={24} /></div>
          <div className="stat-card-info">
            <div className="stat-card-label">Open Tickets</div>
            <div className="stat-card-value">{stats.open + stats.assigned + stats.in_progress}</div>
          </div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }} onClick={() => navigate('/tickets?priority=critical')} onMouseEnter={e => e.currentTarget.style.transform='scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
          <div className="stat-card-icon red"><AlertCircle size={24} /></div>
          <div className="stat-card-info">
            <div className="stat-card-label">Critical Priority</div>
            <div className="stat-card-value">{stats.critical}</div>
          </div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }} onClick={() => navigate('/tickets?sla_status=breached')} onMouseEnter={e => e.currentTarget.style.transform='scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
          <div className="stat-card-icon red" style={{ animation: stats.sla_breached > 0 ? 'pulse-glow 2s infinite' : 'none' }}>
            <AlertTriangle size={24} />
          </div>
          <div className="stat-card-info">
            <div className="stat-card-label">SLA Breached</div>
            <div className="stat-card-value">{stats.sla_breached}</div>
          </div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }} onClick={() => navigate('/tickets?status=resolved,closed')} onMouseEnter={e => e.currentTarget.style.transform='scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
          <div className="stat-card-icon green"><CheckCircle2 size={24} /></div>
          <div className="stat-card-info">
            <div className="stat-card-label">Resolved (7d)</div>
            <div className="stat-card-value">{stats.resolved_this_week}</div>
          </div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }} onClick={() => navigate('/tickets?status=resolved,closed')} onMouseEnter={e => e.currentTarget.style.transform='scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
          <div className="stat-card-icon indigo"><Clock size={24} /></div>
          <div className="stat-card-info">
            <div className="stat-card-label">Avg Resolution</div>
            <div className="stat-card-value">{stats.avg_resolution_hours}h</div>
          </div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }} onClick={() => navigate('/tickets?escalated=true&status=open,in_progress,assigned')} onMouseEnter={e => e.currentTarget.style.transform='scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
          <div className="stat-card-icon orange"><TrendingUp size={24} /></div>
          <div className="stat-card-info">
            <div className="stat-card-label">Escalated</div>
            <div className="stat-card-value">{stats.escalated}</div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-card-title">Tickets by Category</h3>
          <div style={{ height: 300 }}>
            {charts.byCategory && charts.byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.byCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="category" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'var(--bg-hover)' }} contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} />
                  <Bar 
                    dataKey="count" 
                    fill="var(--primary-500)" 
                    radius={[4, 4, 0, 0]} 
                    onClick={(data) => {
                      if (data && data.category_id) {
                        navigate(`/tickets?category_id=${data.category_id}`);
                      } else if (data && data.category) {
                        navigate(`/tickets?search=${encodeURIComponent(data.category)}`);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No data available</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-card-title">Ticket Volume Trend (6 Months)</h3>
          <div style={{ height: 300 }}>
            {charts.monthlyTrend && charts.monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.monthlyTrend} onClick={(data) => {
                  if (data && data.activeLabel) {
                    const [year, month] = data.activeLabel.split('-');
                    navigate(`/tickets?year=${year}&month=${month}`);
                  }
                }} style={{ cursor: 'pointer' }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} />
                  <Line type="monotone" dataKey="count" stroke="var(--accent-500)" strokeWidth={3} dot={{ r: 4, fill: 'var(--bg-surface)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No data available</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="chart-card-title" style={{ margin: 0 }}>Top Problem Areas</h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <SearchableSelect 
                className="form-input" 
                style={{ width: 'auto', padding: '0.25rem 2rem 0.25rem 0.5rem', height: 'auto' }}
                value={topProblemFilter}
                onChange={(e) => setTopProblemFilter(e.target.value)}
              >
                <option value="rooms">By Room</option>
                <option value="room_types">By Room Category</option>
                <option value="assets">By Device/Asset</option>
                <option value="categories">By Category</option>
                <option value="departments">By Department</option>
              </SearchableSelect>
              <button className="btn-icon" onClick={() => setExpandedChart(true)} title="Expand"><Maximize2 size={16} /></button>
            </div>
          </div>
          <div style={{ height: 300 }}>
            {fullProblemData && fullProblemData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={fullProblemData.slice(0, 10)} 
                  layout="vertical" 
                  margin={{ left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    dataKey={
                      topProblemFilter === 'rooms' ? 'room_number' :
                      topProblemFilter === 'room_types' ? 'room_type' :
                      topProblemFilter === 'assets' ? 'asset_name' :
                      topProblemFilter === 'categories' ? 'category' :
                      'department'
                    } 
                    type="category" 
                    stroke="var(--text-secondary)" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip cursor={{ fill: 'var(--bg-hover)' }} contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} />
                  <Bar 
                    dataKey="count" 
                    fill="var(--error)" 
                    radius={[0, 4, 4, 0]} 
                    onClick={(data) => {
                       if(data) {
                          let q = '';
                          if(data.room_number) q = '?search=' + encodeURIComponent(data.room_number);
                          else if(data.room_type) q = '?search=' + encodeURIComponent(data.room_type);
                          else if(data.asset_name) q = '?search=' + encodeURIComponent(data.asset_name);
                          else if(data.category_id) q = '?category_id=' + encodeURIComponent(data.category_id);
                          else if(data.department) q = '?department=' + encodeURIComponent(data.department);
                          navigate(`/tickets${q}`);
                       }
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No data available</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-card-title">Technician Workload (Active Tickets)</h3>
          <div style={{ height: 300 }}>
            {charts.techWorkload && charts.techWorkload.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.techWorkload}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="full_name"
                    onClick={(data) => {
                       if (data && data.user_id) {
                          navigate(`/tickets?status=open,in_progress,assigned&assignee_id=${data.user_id}`);
                       }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {charts.techWorkload.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No data available</div>
            )}
          </div>
        </div>
      </div>

      {expandedChart && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '2rem', borderRadius: '8px', width: '90%', height: '90%', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>All Problem Areas</h2>
              <button className="btn-icon" onClick={() => setExpandedChart(false)}><X size={24} /></button>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <ResponsiveContainer width="100%" height={Math.max(600, fullProblemData.length * 40)}>
                <BarChart data={fullProblemData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    dataKey={
                      topProblemFilter === 'rooms' ? 'room_number' :
                      topProblemFilter === 'room_types' ? 'room_type' :
                      topProblemFilter === 'assets' ? 'asset_name' :
                      topProblemFilter === 'categories' ? 'category' :
                      'department'
                    } 
                    type="category" 
                    stroke="var(--text-secondary)" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    width={150}
                  />
                  <Tooltip cursor={{ fill: 'var(--bg-hover)' }} contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} />
                  <Bar 
                    dataKey="count" 
                    fill="var(--error)" 
                    radius={[0, 4, 4, 0]} 
                    onClick={(data) => {
                       if(data) {
                          let q = '';
                          if(data.room_number) q = '?search=' + encodeURIComponent(data.room_number);
                          else if(data.room_type) q = '?search=' + encodeURIComponent(data.room_type);
                          else if(data.asset_name) q = '?search=' + encodeURIComponent(data.asset_name);
                          else if(data.category) q = '?search=' + encodeURIComponent(data.category);
                          else if(data.department) q = '?department=' + encodeURIComponent(data.department);
                          navigate(`/tickets${q}`);
                       }
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
