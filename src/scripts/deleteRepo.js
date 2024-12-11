import { GitHubManager } from '../utils/githubManager.js';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_ORG = process.env.DEFAULT_ORG;

async function deleteRepo(repoName, orgName = DEFAULT_ORG) {
    const githubManager = new GitHubManager(process.env.GITHUB_TOKEN || '');

    try {
        // First validate organization access
        const validation = await githubManager.validateToken(orgName);
        if (!validation.isValid) {
            throw new Error(`No access to organization or personal repositories.`);
        }

        console.log('\n🗑️  Deleting repository');
        console.log('Organization:', orgName);
        console.log('Repository:', repoName);
        console.log('─'.repeat(50));

        await githubManager.deleteRepository(orgName, repoName);

        console.log('─'.repeat(50));
        console.log('\n✨ Repository deleted successfully\n');

    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// CLI support
if (process.argv[1] === import.meta.url.substring(7)) {
    const args = process.argv.slice(2); // Remove node and script path
    const [repoName] = args;

    if (!repoName) {
        console.error('\n❌ Please provide a repository name');
        console.error('\nUsage:');
        console.error('  yarn delete-repo <repo-name>');
        console.error('\nExample:');
        console.error('  yarn delete-repo my-repo\n');
        process.exit(1);
    }

    // Ask for confirmation
    console.log(`\n⚠️  WARNING: You are about to delete ${DEFAULT_ORG}/${repoName}`);
    console.log('This action cannot be undone!');
    console.log('\nPress Ctrl+C to cancel, or Enter to continue...');
    
    process.stdin.once('data', () => {
        deleteRepo(repoName)
            .then(() => process.exit(0))
            .catch(error => {
                console.error('\n❌ Failed to delete repository:', error.message);
                process.exit(1);
            });
    });
}

export { deleteRepo }; 