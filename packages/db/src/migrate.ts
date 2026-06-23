import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './index';

migrate(db, { migrationsFolder: './migrations', migrationsSchema: 'glhonda' })
  .then(() => {
    console.log('migrations finished!');
    process.exit(0);
  })
  .catch(err => {
    console.log(err);
    process.exit(1);
  });
