import { runMigrationsIfNeeded } from './migrateRunner.js';
import { startBot } from './main_impl.js';

(async () => {
    try {
        await runMigrationsIfNeeded();
    } catch (e) {
        console.error('Migration runner error (continuing):', e && e.message ? e.message : e);
    }

    try {
        await startBot();
    } catch (e) {
        console.error('Error starting bot:', e && e.message ? e.message : e);
        process.exit(1);
    }
})();
