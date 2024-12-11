import { GitHubManager } from '../utils/githubManager.js';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_ORG = process.env.DEFAULT_ORG;

async function listRepositories(orgName = DEFAULT_ORG) {
    const githubManager = new GitHubManager(process.env.GITHUB_TOKEN || '');

    try {
        console.log(`\n📦 Listing repositories for organization: ${orgName}`);
        const repos = await githubManager.listRepositories(orgName);

        if (repos.length === 0) {
            console.log('⚠️  No repositories found.');
        } else {
            console.log('Repositories:');
            repos.forEach(repo => {
                console.log(`  - ${repo.name} (Private: ${repo.private})`);
            });
        }
    } catch (error) {
        console.error('❌ Failed to list repositories:', error.message);
    }
}

// CLI support
if (process.argv[1] === import.meta.url.substring(7)) {
    listRepositories()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('❌ Error:', error.message);
            process.exit(1);
        });
}

export { listRepositories }; 