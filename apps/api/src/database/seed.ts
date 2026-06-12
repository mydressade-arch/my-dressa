import { AppDataSource } from './data-source';
import * as bcrypt from 'bcrypt';

async function seed() {
  await AppDataSource.initialize();
  console.log('🌱 Seeding Datenbank...');

  const adminHash    = await bcrypt.hash('Admin123!', 12);
  const merchantHash = await bcrypt.hash('Merchant123!', 12);
  const customerHash = await bcrypt.hash('Customer123!', 12);

  const db = AppDataSource.manager;

  // Admin
  const adminResult = await db.query(`
    INSERT INTO users (email, password_hash, role, first_name, last_name, is_verified)
    VALUES ($1, $2, 'admin', 'Admin', 'Dressa', TRUE)
    ON CONFLICT (email) DO UPDATE SET password_hash = $2
    RETURNING id
  `, ['admin@mydressa.de', adminHash]);

  // Händler
  const merchantResult = await db.query(`
    INSERT INTO users (email, password_hash, role, first_name, last_name, is_verified)
    VALUES ($1, $2, 'merchant', 'Maria', 'Müller', TRUE)
    ON CONFLICT (email) DO UPDATE SET password_hash = $2
    RETURNING id
  `, ['haendler@mydressa.de', merchantHash]);

  if (merchantResult[0]?.id) {
    const userId = merchantResult[0].id;
    await db.query(`
      INSERT INTO merchant_profiles (user_id, shop_name, is_verified)
      VALUES ($1, 'Marias Vintage Mode', TRUE)
      ON CONFLICT (user_id) DO NOTHING
    `, [userId]);

    const mpResult = await db.query(
      `SELECT id FROM merchant_profiles WHERE user_id = $1`, [userId]
    );

    if (mpResult[0]?.id) {
      const merchantProfileId = mpResult[0].id;
      const productResult = await db.query(`
        INSERT INTO products (merchant_id, title, description, rental_price, sale_price,
          category, status, is_for_rent, is_for_sale)
        VALUES ($1, 'Elegantes Schwarzes Abendkleid',
          'Wunderschönes Kleid für besondere Anlässe. Neuwertig, kaum getragen.',
          29.99, 89.99, 'Abendmode', 'active', TRUE, TRUE)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [merchantProfileId]);

      if (productResult[0]?.id) {
        const productId = productResult[0].id;
        await db.query(`
          INSERT INTO product_variants (product_id, size, color, stock_quantity)
          VALUES ($1, 'S', 'Schwarz', 1),
                 ($1, 'M', 'Schwarz', 1),
                 ($1, 'L', 'Schwarz', 1)
          ON CONFLICT DO NOTHING
        `, [productId]);
        console.log(`  ✅ Demo-Produkt erstellt: ${productId}`);
      }
    }
  }

  // Kunde
  await db.query(`
    INSERT INTO users (email, password_hash, role, first_name, last_name, is_verified)
    VALUES ($1, $2, 'customer', 'Anna', 'Schmidt', TRUE)
    ON CONFLICT (email) DO UPDATE SET password_hash = $2
  `, ['kunde@mydressa.de', customerHash]);

  await AppDataSource.destroy();

  console.log('\n✅ Seed abgeschlossen!');
  console.log('');
  console.log('Test-Accounts:');
  console.log('  Admin:    admin@mydressa.de       / Admin123!');
  console.log('  Händler:  haendler@mydressa.de    / Merchant123!');
  console.log('  Kunde:    kunde@mydressa.de        / Customer123!');
}

seed().catch((err) => { console.error('Seed Fehler:', err); process.exit(1); });
