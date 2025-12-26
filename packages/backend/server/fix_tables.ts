import './src/prelude';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './src/app.module';
import { IndexerService } from './src/plugins/indexer';

async function bootstrap() {
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const indexerService = app.get(IndexerService);
    await indexerService.createTables();
    console.log('Tables created successfully via fix_tables.ts');
    await app.close();
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
}
bootstrap();
