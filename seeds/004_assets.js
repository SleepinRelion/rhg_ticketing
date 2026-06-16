export async function seed(knex) {
  // Clear existing
  await knex('assets').del();

  await knex('assets').insert([
    { id: 1, name: 'Lobby Printer', asset_tag: 'AST-PRT-001', category_id: 8, room_id: 1, location: 'Main Lobby Business Center', manufacturer: 'HP', model: 'LaserJet Pro M404dn', serial_number: 'VNB3K12345', status: 'operational' },
    { id: 2, name: 'Conference A Projector', asset_tag: 'AST-PRJ-001', category_id: 7, room_id: 2, location: 'Conference Room A Ceiling', manufacturer: 'Epson', model: 'EB-2265U', serial_number: 'X3KL98765', status: 'operational' },
    { id: 3, name: 'Main Wi-Fi Controller', asset_tag: 'AST-NET-001', category_id: 3, room_id: null, location: 'Server Room - Rack 1', manufacturer: 'Cisco', model: 'Catalyst 9800-L', serial_number: 'FJC2345H0LJ', status: 'operational' },
    { id: 4, name: 'Core Switch 1', asset_tag: 'AST-NET-002', category_id: 3, room_id: null, location: 'Server Room - Rack 1', manufacturer: 'Cisco', model: 'Catalyst 9300', serial_number: 'FJC2345H0LK', status: 'operational' },
    { id: 5, name: 'Access Point - Floor 2', asset_tag: 'AST-AP-001', category_id: 11, room_id: null, location: 'Floor 2 Hallway', manufacturer: 'Cisco', model: 'Catalyst 9120AX', serial_number: 'FJC2345H0LL', status: 'operational' },
    { id: 6, name: 'Restaurant POS Terminal 1', asset_tag: 'AST-POS-001', category_id: 5, room_id: 4, location: 'Restaurant Main Bar', manufacturer: 'Oracle', model: 'Micros Workstation 6', serial_number: 'ORC12345', status: 'needs_repair' },
    { id: 7, name: 'Restaurant POS Terminal 2', asset_tag: 'AST-POS-002', category_id: 5, room_id: 4, location: 'Restaurant Server Station', manufacturer: 'Oracle', model: 'Micros Workstation 6', serial_number: 'ORC12346', status: 'operational' },
    { id: 8, name: 'Front Desk Workstation 1', asset_tag: 'AST-PC-001', category_id: 9, room_id: 1, location: 'Front Desk Left', manufacturer: 'Dell', model: 'OptiPlex 7090', serial_number: 'DLL98765', status: 'operational' },
    { id: 9, name: 'Front Desk Workstation 2', asset_tag: 'AST-PC-002', category_id: 9, room_id: 1, location: 'Front Desk Right', manufacturer: 'Dell', model: 'OptiPlex 7090', serial_number: 'DLL98766', status: 'operational' },
    { id: 10, name: 'PMS Database Server', asset_tag: 'AST-SRV-001', category_id: 6, room_id: null, location: 'Server Room - Rack 2', manufacturer: 'Dell', model: 'PowerEdge R740', serial_number: 'DLLSRV01', status: 'operational' },
  ]);

  try { await knex.raw("SELECT setval('assets_id_seq', (SELECT MAX(id) FROM assets))"); } catch {}
}
