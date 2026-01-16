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

main()
  .then(() => {
    console.log("Permissions initialized successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error initializing permissions:", err);
    process.exit(1);
  });

