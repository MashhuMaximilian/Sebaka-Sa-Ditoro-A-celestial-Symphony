import { config } from 'dotenv';
config();

import {genkit} from 'genkit';

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down Genkit servers...');
  genkit.shutdown().then(() => {
    console.log('Genkit servers shut down successfully.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
    console.log('Shutting down all Genkit servers...');
    genkit.shutdown().then(() => {
        console.log('All Genkit servers shut down successfully.');
        process.exit(0);
    });
});
