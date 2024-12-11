import { GitHubManager } from '../utils/githubManager.js';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_ORG = process.env.DEFAULT_ORG;

async function validateGitHubToken() {
    const manager = new GitHubManager(process.env.GITHUB_TOKEN || '');
    
    try {
        const validation = await manager.validateToken(DEFAULT_ORG);
        
        if (validation.isValid && !validation.errors?.length) {
            console.log('✅ Token is fully valid and has all required permissions');
            return true;
        } else {
            console.log('❌ Token validation failed:');
            validation.errors?.forEach(error => console.log(`  • ${error}`));
            return false;
        }
    } catch (error) {
        console.error('Error validating token:', error);
        return false;
    }
}

// CLI support
if (process.argv[1] === import.meta.url.substring(7)) {
    validateGitHubToken()
        .then(isValid => process.exit(isValid ? 0 : 1))
        .catch(() => process.exit(1));
}

export { validateGitHubToken }; 