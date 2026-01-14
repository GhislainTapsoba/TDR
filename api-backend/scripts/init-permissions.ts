import { initializePermissions } from '../lib/permissions';

async function main() {
  try {
    console.log('Initializing permissions...');
    await initializePermissions();
    console.log('Permissions initialized successfully!');
  } catch (error) {
    console.error('Error initializing permissions:', error);
    process.exit(1);
  }
}

main();
