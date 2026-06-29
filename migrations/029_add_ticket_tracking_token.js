import { randomUUID } from 'crypto';

export async function up(knex) {
  await knex.schema.alterTable('tickets', (table) => {
    table.uuid('guest_tracking_token').nullable();
  });

  // Populate existing tickets with random UUIDs using Node's crypto
  const tickets = await knex('tickets').select('id');
  
  // Update in chunks to avoid blocking too long
  for (let i = 0; i < tickets.length; i += 500) {
    const chunk = tickets.slice(i, i + 500);
    await Promise.all(
      chunk.map((ticket) => 
        knex('tickets')
          .where('id', ticket.id)
          .update({ guest_tracking_token: randomUUID() })
      )
    );
  }
}

export async function down(knex) {
  await knex.schema.alterTable('tickets', (table) => {
    table.dropColumn('guest_tracking_token');
  });
}
