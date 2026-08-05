export async function up(knex) {
  // 1. System Parent
  let system = await knex('categories').where({ name: 'System', ticket_type: 'issue' }).first();
  if (!system) {
    const [inserted] = await knex('categories').insert({
      name: 'System',
      description: 'Core software, PMS, POS, servers, and network systems',
      ticket_type: 'issue',
      parent_id: null,
      is_active: true
    }).returning('*');
    system = inserted || await knex('categories').where({ name: 'System', ticket_type: 'issue' }).first();
  }

  const systemSubs = [
    { name: 'POS (Point of Sale)', description: 'Restaurant/bar POS terminal and software issues' },
    { name: 'PMS / Opera System', description: 'Property Management System and reservation software' },
    { name: 'Paymaster System', description: 'Payroll and paymaster system issues' },
    { name: 'SunSystems / Financials', description: 'Accounting and financial software issues' },
    { name: 'Network & Wi-Fi System', description: 'Hotel network, Wi-Fi controllers, and connectivity' },
    { name: 'IPTV System', description: 'IPTV headend, channel streaming, and server issues' },
    { name: 'PBX / Telephony System', description: 'PABX server, trunk lines, and phone system' },
    { name: 'Keycard / Door Lock System', description: 'Vingcard/Onity keycard encoder and server issues' },
    { name: 'Email & Software System', description: 'Outlook, email routing, and general office software' },
    { name: 'Printer & Scanner Server', description: 'Network print server and shared scanners' },
    { name: 'Server & Storage System', description: 'Physical/Virtual servers, NAS, and backup storage' }
  ];

  if (system && system.id) {
    for (const sub of systemSubs) {
      const exists = await knex('categories').where({ name: sub.name, parent_id: system.id }).first();
      if (!exists) {
        await knex('categories').insert({
          name: sub.name,
          description: sub.description,
          ticket_type: 'issue',
          parent_id: system.id,
          is_active: true
        });
      }
    }
  }

  // 2. Outlets Parent
  let outlets = await knex('categories').where({ name: 'Outlets', ticket_type: 'issue' }).first();
  if (!outlets) {
    const [inserted] = await knex('categories').insert({
      name: 'Outlets',
      description: 'Restaurant, bar, and resort dining outlet issues',
      ticket_type: 'issue',
      parent_id: null,
      is_active: true
    }).returning('*');
    outlets = inserted || await knex('categories').where({ name: 'Outlets', ticket_type: 'issue' }).first();
  }

  const outletSubs = [
    { name: 'Ferney', description: 'Ferney restaurant outlet' },
    { name: 'Tavola', description: 'Tavola restaurant outlet' },
    { name: 'Quatre Cocos', description: 'Quatre Cocos outlet' },
    { name: 'Belle Vue', description: 'Belle Vue restaurant outlet' },
    { name: 'Ocean Grill', description: 'Ocean Grill beach restaurant' },
    { name: 'Aqualand', description: 'Aqualand waterpark/outlet' },
    { name: 'Icery Bar', description: 'Icery Bar outlet' }
  ];

  if (outlets && outlets.id) {
    for (const sub of outletSubs) {
      const exists = await knex('categories').where({ name: sub.name, parent_id: outlets.id }).first();
      if (!exists) {
        await knex('categories').insert({
          name: sub.name,
          description: sub.description,
          ticket_type: 'issue',
          parent_id: outlets.id,
          is_active: true
        });
      }
    }
  }
}

export async function down(knex) {
  const parents = await knex('categories').whereIn('name', ['System', 'Outlets']).where({ ticket_type: 'issue' });
  for (const p of parents) {
    await knex('categories').where({ parent_id: p.id }).del();
    await knex('categories').where({ id: p.id }).del();
  }
}
