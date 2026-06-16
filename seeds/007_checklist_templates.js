export async function seed(knex) {
  await knex('checklist_templates').insert([
    {
      id: 1,
      category_id: 14, // TV
      name: 'TV Troubleshooting Checklist',
      items_json: JSON.stringify([
        'Check HDMI cable connection',
        'Restart TV (unplug for 30 seconds)',
        'Check set-top box power and connections',
        'Try different HDMI input',
        'Test all channels',
        'Confirm with guest or front desk',
      ]),
      created_by: 1,
    },
    {
      id: 2,
      category_id: 8, // Printer
      name: 'Printer Issue Checklist',
      items_json: JSON.stringify([
        'Check paper tray level and alignment',
        'Clear any paper jams',
        'Check toner/ink level',
        'Restart printer',
        'Clear print queue',
        'Send test print',
        'Confirm with user',
      ]),
      created_by: 1,
    },
    {
      id: 3,
      category_id: 1, // AC
      name: 'AC Troubleshooting Checklist',
      items_json: JSON.stringify([
        'Check thermostat settings',
        'Check and clean air filter',
        'Inspect vents for blockage',
        'Check outdoor unit operation',
        'Reset AC at breaker (5 min wait)',
        'Check refrigerant levels',
        'Record temperature readings before and after',
        'Confirm with guest',
      ]),
      created_by: 1,
    },
    {
      id: 4,
      category_id: 1, // Door Lock
      name: 'Door Lock Troubleshooting Checklist',
      items_json: JSON.stringify([
        'Verify key card room number and dates',
        'Re-encode key card at front desk',
        'Test with master key card',
        'Check lock battery level',
        'Replace batteries if needed',
        'Test lock mechanism',
        'Apply lubricant if stiff',
        'Confirm guest can enter room',
      ]),
      created_by: 1,
    },
    {
      id: 5,
      category_id: 11, // Wi-Fi
      name: 'Wi-Fi Issue Checklist',
      items_json: JSON.stringify([
        'Verify scope of issue (single room vs floor vs building)',
        'Check access point status lights',
        'Check patch cable connection',
        'Reboot access point if needed',
        'Verify switch port status',
        'Test connectivity from affected area',
        'Check captive portal',
        'Confirm with guest',
      ]),
      created_by: 1,
    },
    {
      id: 6,
      category_id: 1, // Plumbing
      name: 'Plumbing Issue Checklist',
      items_json: JSON.stringify([
        'Identify source of leak/blockage',
        'Turn off water supply if needed',
        'Assess damage to surrounding area',
        'Clear blockage or repair leak',
        'Test water flow and drainage',
        'Check for water damage to walls/floor',
        'Clean and dry affected area',
        'Confirm with guest or housekeeping',
      ]),
      created_by: 1,
    },
  ]);

  try { await knex.raw("SELECT setval('checklist_templates_id_seq', (SELECT MAX(id) FROM checklist_templates))"); } catch {}

  // Preventive maintenance schedules
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextMonthStr = nextMonth.toISOString().split('T')[0];

  const twoMonths = new Date();
  twoMonths.setMonth(twoMonths.getMonth() + 2);
  const twoMonthsStr = twoMonths.toISOString().split('T')[0];

  const threeMonths = new Date();
  threeMonths.setMonth(threeMonths.getMonth() + 3);
  const threeMonthsStr = threeMonths.toISOString().split('T')[0];

  await knex('preventive_maintenance').insert([
    { id: 1, asset_id: 1, title: 'Monthly Lobby Printer Maintenance', description: 'Clean rollers, check toner levels, run calibration page, clean scanner glass', frequency: 'monthly', next_due_date: nextMonthStr, assigned_to: 3, is_active: true },
    { id: 2, asset_id: 4, title: 'Quarterly Wi-Fi Router Inspection - Floor 1', description: 'Check firmware version, review logs, test throughput, clean vents, verify backup config', frequency: 'quarterly', next_due_date: threeMonthsStr, assigned_to: 3, is_active: true },
    { id: 3, asset_id: 5, title: 'Quarterly Wi-Fi Router Inspection - Floor 2', description: 'Check firmware version, review logs, test throughput, clean vents, verify backup config', frequency: 'quarterly', next_due_date: threeMonthsStr, assigned_to: 3, is_active: true },
    { id: 4, asset_id: 6, title: 'Quarterly Wi-Fi Router Inspection - Floor 3', description: 'Check firmware version, review logs, test throughput, clean vents, verify backup config', frequency: 'quarterly', next_due_date: threeMonthsStr, assigned_to: 3, is_active: true },
    { id: 5, asset_id: 9, title: 'Bimonthly AC Filter Check - Room 201', description: 'Clean or replace air filter, check refrigerant pressure, clean condenser coils', frequency: 'bimonthly', next_due_date: twoMonthsStr, assigned_to: 4, is_active: true },
    { id: 6, asset_id: 2, title: 'Monthly Elevator A Inspection', description: 'Check door alignment, test emergency phone, inspect cables, lubricate guides', frequency: 'monthly', next_due_date: nextMonthStr, assigned_to: null, is_active: true },
    { id: 7, asset_id: 3, title: 'Weekly Pool Pump Check', description: 'Check pump pressure, clean strainer basket, verify chemical levels, inspect seals', frequency: 'weekly', next_due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], assigned_to: 4, is_active: true },
  ]);

  try { await knex.raw("SELECT setval('preventive_maintenance_id_seq', (SELECT MAX(id) FROM preventive_maintenance))"); } catch {}
}
