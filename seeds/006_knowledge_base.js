export async function seed(knex) {
  await knex('knowledge_base_articles').insert([
    {
      id: 1,
      title: 'Fix TV No Signal in Guest Room',
      category_id: 14,
      asset_type: 'TV',
      symptoms: 'TV shows "No Signal" on all inputs. Black screen or blue screen with no signal message. Guest cannot watch any channels.',
      resolution_steps: '1. Check if the TV is powered on and not in standby mode.\n2. Check the HDMI cable connection at the back of the TV.\n3. Check the HDMI cable connection at the set-top box.\n4. Try a different HDMI input on the TV.\n5. Restart the set-top box by unplugging for 30 seconds.\n6. Restart the TV by unplugging for 30 seconds.\n7. Try a different HDMI cable.\n8. If none of the above work, reset the TV to factory settings.\n9. If issue persists, the set-top box may need replacement.\n10. Confirm with guest that channels are working.',
      created_by: 1,
      is_published: true,
    },
    {
      id: 2,
      title: 'Clear Printer Error E04',
      category_id: 8,
      asset_type: 'Printer',
      symptoms: 'Printer displays Error E04. Printer is jammed or not feeding paper. Print jobs are stuck in queue.',
      resolution_steps: '1. Turn off the printer.\n2. Open the front panel and remove the toner cartridge.\n3. Gently pull out any jammed paper. Pull in the direction of paper path.\n4. Check the paper tray for misaligned or crumpled paper.\n5. Fan the paper stack before reloading.\n6. Reinsert the toner cartridge.\n7. Close the front panel.\n8. Turn on the printer.\n9. Clear the print queue on the connected computer.\n10. Send a test print to verify.\n11. If error persists, check the pickup roller for wear.',
      created_by: 1,
      is_published: true,
    },
    {
      id: 3,
      title: 'AC Not Cooling - Basic Troubleshooting',
      category_id: 1,
      asset_type: 'AC Unit',
      symptoms: 'AC is running but not cooling the room. Room temperature remains high. AC may be blowing warm air.',
      resolution_steps: '1. Check the thermostat setting - ensure it is set to COOL mode.\n2. Check the set temperature - should be lower than current room temp.\n3. Check if the air filter is dirty - clean or replace if necessary.\n4. Check if the AC vents are blocked by furniture or curtains.\n5. Check if the outdoor unit is running.\n6. Check if the AC has been recently serviced.\n7. Try resetting the AC by turning off at the breaker for 5 minutes.\n8. If the outdoor unit fan is not spinning, the capacitor may be faulty.\n9. If refrigerant is low, a certified HVAC technician is needed.\n10. Document findings and escalate if basic troubleshooting fails.',
      created_by: 1,
      is_published: true,
    },
    {
      id: 4,
      title: 'Guest Room Door Lock - Key Card Not Working',
      category_id: 1,
      asset_type: 'Door Lock',
      symptoms: 'Guest key card is not opening the room door. Red light on lock. Lock beeps but does not open.',
      resolution_steps: '1. Verify the key card is for the correct room.\n2. Check if the key card has expired (checkout date passed).\n3. Try re-encoding the key card at the front desk.\n4. Check if the lock battery is low (slow response or dim LED).\n5. Try the master key card.\n6. If master key works, the guest card encoding is the issue.\n7. If master key does not work, replace the lock batteries (4x AA).\n8. After battery replacement, test with master key first.\n9. If still not working, the lock mechanism may be jammed - apply lock lubricant.\n10. As last resort, use the manual key override.\n11. Schedule lock replacement if mechanical failure is confirmed.',
      created_by: 1,
      is_published: true,
    },
    {
      id: 5,
      title: 'Wi-Fi Connectivity Issues - Guest Room',
      category_id: 11,
      asset_type: 'Wi-Fi Router',
      symptoms: 'Guest cannot connect to Wi-Fi. Wi-Fi network not visible. Connected but no internet access. Slow Wi-Fi speed.',
      resolution_steps: '1. Ask guest to forget the network and reconnect.\n2. Verify the guest has accepted the captive portal terms.\n3. Check if other guests on the same floor have connectivity.\n4. If floor-wide outage, check the floor access point status.\n5. Try rebooting the nearest access point.\n6. Check the patch cable from AP to switch.\n7. Verify the switch port is active (LED indicator).\n8. If single room, check if the room is in a dead zone.\n9. Consider providing a Wi-Fi extender for the room.\n10. For slow speed, check if bandwidth limits are configured.\n11. Escalate to IT if access point hardware failure is suspected.',
      created_by: 1,
      is_published: true,
    },
  ]);

  try { await knex.raw("SELECT setval('knowledge_base_articles_id_seq', (SELECT MAX(id) FROM knowledge_base_articles))"); } catch {}
}
