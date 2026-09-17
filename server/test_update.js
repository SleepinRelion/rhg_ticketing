import db from './config/database.js';

async function testUpdate() {
  try {
    const trx = await db.transaction();
    try {
      const req = { params: { id: '1' }, body: { hotel_ids: [1, 2], force_password_change: true } };
      const updates = { updated_at: new Date() };
      
      const hotel_ids = req.body.hotel_ids;
      
      if (hotel_ids !== undefined) {
        updates.primary_hotel_id = hotel_ids && hotel_ids.length > 0 ? hotel_ids[0] : null;
        await trx('user_hotels').where('user_id', req.params.id).del();
        if (hotel_ids && hotel_ids.length > 0) {
          const hotelInserts = hotel_ids.map(hotelId => ({
            user_id: req.params.id,
            hotel_id: hotelId
          }));
          await trx('user_hotels').insert(hotelInserts);
        }
      }
      await trx('users').where({
        id: req.params.id
      }).update(updates);
      
      await trx.commit();
      console.log('Transaction Success');
    } catch (e) {
      await trx.rollback();
      console.error('Transaction Error:', e);
    }
  } catch (err) {
    console.error('DB Error:', err);
  } finally {
    db.destroy();
  }
}

testUpdate();
