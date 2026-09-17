import fs from 'fs';

const path = 'c:/Users/Madhav/Documents/Projects/Hotel Ticketing System/client/src/pages/DashboardPage.jsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add useMemo
code = code.replace(
  "import { useState, useEffect } from 'react';",
  "import { useState, useEffect, useMemo } from 'react';"
);

// 2. Update defaultLayout
const defaultLayoutSearch = `  const defaultLayout = {
    category: true,
    trend: true,
    problem: true,
    workload: true,
    sla: true
  };`;
const defaultLayoutReplace = `  const defaultLayout = {
    status: true,
    priority: true,
    type: true,
    category: true,
    trend: true,
    interventions: true,
    problem: true,
    workload: true,
    sla: true
  };`;
code = code.replace(defaultLayoutSearch, defaultLayoutReplace);

// 3. Update fullProblemData to useMemo
const fullProblemDataSearch = `  const fullProblemData = topProblemFilter === 'rooms' ? charts.topRooms :
                          topProblemFilter === 'room_types' ? charts.topRoomTypes :
                          topProblemFilter === 'assets' ? charts.topAssets :
                          topProblemFilter === 'categories' ? charts.byCategory :
                          [...charts.byDepartment].sort((a, b) => b.count - a.count);`;
const fullProblemDataReplace = `  const fullProblemData = useMemo(() => {
    if (!charts) return [];
    if (topProblemFilter === 'rooms') return charts.topRooms || [];
    if (topProblemFilter === 'room_types') return charts.topRoomTypes || [];
    if (topProblemFilter === 'assets') return charts.topAssets || [];
    if (topProblemFilter === 'categories') return charts.byCategory || [];
    return [...(charts.byDepartment || [])].sort((a, b) => b.count - a.count);
  }, [charts, topProblemFilter]);`;
code = code.replace(fullProblemDataSearch, fullProblemDataReplace);

// 4. Add new charts just before the 'category' chart.
const categoryChartSearch = `        {layout.category && (
          <div className="chart-card">`;
const newCharts = `        {layout.status && (
          <div className="chart-card">
            <h3 className="chart-card-title">Tickets by Status</h3>
            <div style={{ height: 300 }}>
              {charts.byStatus && charts.byStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={charts.byStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="count" nameKey="status" onClick={(data) => { if (data && data.status) navigate(\`/tickets?status=\${data.status}\`); }} style={{ cursor: 'pointer' }}>
                      {charts.byStatus.map((entry, index) => <Cell key={\`cell-\${index}\`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (<div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No data available</div>)}
            </div>
          </div>
        )}

        {layout.priority && (
          <div className="chart-card">
            <h3 className="chart-card-title">Tickets by Priority</h3>
            <div style={{ height: 300 }}>
              {charts.byPriority && charts.byPriority.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={charts.byPriority} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="count" nameKey="priority" onClick={(data) => { if (data && data.priority) navigate(\`/tickets?priority=\${data.priority}\`); }} style={{ cursor: 'pointer' }}>
                      {charts.byPriority.map((entry, index) => {
                        let color = COLORS[index % COLORS.length];
                        if (entry.priority === 'critical') color = '#ef4444';
                        if (entry.priority === 'high') color = '#f97316';
                        if (entry.priority === 'medium') color = '#eab308';
                        if (entry.priority === 'low') color = '#22c55e';
                        return <Cell key={\`cell-\${index}\`} fill={color} />;
                      })}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (<div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No data available</div>)}
            </div>
          </div>
        )}

        {layout.type && (
          <div className="chart-card">
            <h3 className="chart-card-title">Tickets by Type</h3>
            <div style={{ height: 300 }}>
              {charts.byType && charts.byType.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={charts.byType} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="count" nameKey="ticket_type" onClick={(data) => { if (data && data.ticket_type) navigate(\`/tickets?ticket_type=\${data.ticket_type}\`); }} style={{ cursor: 'pointer' }}>
                      {charts.byType.map((entry, index) => <Cell key={\`cell-\${index}\`} fill={COLORS[(index + 3) % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (<div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No data available</div>)}
            </div>
          </div>
        )}

`;
code = code.replace(categoryChartSearch, newCharts + categoryChartSearch);

// 5. Add Weekly Interventions Chart just before 'Top Problem Areas'
const problemAreaSearch = `        {layout.problem && (
        <div className="chart-card">
          <div className="chart-card-header"`;
const interventionsChart = `        {layout.interventions && (
        <div className="chart-card">
          <h3 className="chart-card-title">Weekly Interventions (8 Weeks)</h3>
          <div style={{ height: 300 }}>
            {charts.weeklyInterventions && charts.weeklyInterventions.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.weeklyInterventions}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="week" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} />
                  <Line type="monotone" dataKey="count" stroke="#ec4899" strokeWidth={3} dot={{ r: 4, fill: 'var(--bg-surface)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (<div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No data available</div>)}
          </div>
        </div>
        )}

`;
code = code.replace(problemAreaSearch, interventionsChart + problemAreaSearch);

// 6. Update Customization form
const customFormSearch = `              <label className="form-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <input type="checkbox" checked={layout.category} onChange={e => setLayout(p => ({...p, category: e.target.checked}))} />
                Tickets by Category
              </label>`;
const newCheckboxes = `              <label className="form-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <input type="checkbox" checked={layout.status} onChange={e => setLayout(p => ({...p, status: e.target.checked}))} />
                Tickets by Status
              </label>
              <label className="form-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <input type="checkbox" checked={layout.priority} onChange={e => setLayout(p => ({...p, priority: e.target.checked}))} />
                Tickets by Priority
              </label>
              <label className="form-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <input type="checkbox" checked={layout.type} onChange={e => setLayout(p => ({...p, type: e.target.checked}))} />
                Tickets by Type
              </label>
              <label className="form-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <input type="checkbox" checked={layout.interventions} onChange={e => setLayout(p => ({...p, interventions: e.target.checked}))} />
                Weekly Interventions
              </label>
`;
code = code.replace(customFormSearch, newCheckboxes + customFormSearch);

// Standardizing React.memo
code = code.replace(
  "import { useState, useEffect, useMemo } from 'react';",
  "import React, { useState, useEffect, useMemo, memo } from 'react';"
);
code = code.replace('export default function DashboardPage() {', 'const DashboardPage = memo(function DashboardPage() {');
code = code.replace('export default function DashboardPage()', 'function DashboardPage()');
if (!code.includes('export default DashboardPage;')) {
  code += '\nexport default DashboardPage;\n';
}
// Fix closing brace for memo
code = code.replace('    </div>\n  );\n}\n\nexport default DashboardPage;', '    </div>\n  );\n});\n\nexport default DashboardPage;');

fs.writeFileSync(path, code);
console.log("Successfully updated DashboardPage.jsx");
