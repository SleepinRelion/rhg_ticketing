/**
 * Add a `code` column to the hotels table.
 * This is the short identifier (e.g. MRUIA, MRUZL, MRUZG) used in legacy Excel imports.
 * Storing it in the DB eliminates the need to hardcode hotel IDs in the import service.
 */
export async function up(knex) {
  await knex.schema.alterTable('hotels', (table) => {
    table.string('code', 20).nullable().unique();
  });

  // Pre-populate known hotel codes for existing hotels by matching on name
  const hotels = await knex('hotels').select('id', 'name');
  for (const hotel of hotels) {
    let code = null;
    if (hotel.name.toLowerCase().includes('crystal') || hotel.name.toLowerCase().includes('mruia')) {
      code = 'MRUIA';
    } else if (hotel.name.toLowerCase().includes('poste lafayette') || hotel.name.toLowerCase().includes('mruzl')) {
      code = 'MRUZL';
    } else if (hotel.name.toLowerCase().includes('azuri') || hotel.name.toLowerCase().includes('mruzg')) {
      code = 'MRUZG';
    }
    if (code) {
      await knex('hotels').where('id', hotel.id).update({ code });
    }
  }
}

export async function down(knex) {
  await knex.schema.alterTable('hotels', (table) => {
    table.dropColumn('code');
  });
}
