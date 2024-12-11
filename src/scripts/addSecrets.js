import { GitHubManager } from '../utils/githubManager.js';
import { getCommonSecrets, getCommonVariables } from '../config/secrets.js';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_ORG = process.env.DEFAULT_ORG;

async function addSecretsAndVariables(repoName, orgName = DEFAULT_ORG) {
    const manager = new GitHubManager(process.env.GITHUB_TOKEN || '');
    
    try {
        console.log('\n🔐 Managing secrets and variables');
        console.log('Repository:', `${orgName}/${repoName}`);
        console.log('─'.repeat(50));

        // Add secrets
        const commonSecrets = getCommonSecrets();
        console.log('\n📝 Processing secrets...');
        for (const secret of commonSecrets) {
            try {
                const result = await manager.createOrUpdateSecret(
                    orgName,
                    repoName,
                    secret.name,
                    secret.value
                );
                console.log(`  ✅ ${secret.name.padEnd(20)} [${result.action}] (${secret.value ? 'has value' : 'empty'})`);
            } catch (error) {
                console.error(`  ❌ ${secret.name.padEnd(20)} [failed: ${error.message}]`);
            }
        }

        // Add variables
        const commonVariables = getCommonVariables();
        console.log('\n📝 Processing variables...');
        for (const variable of commonVariables) {
            try {
                const result = await manager.createOrUpdateVariable(
                    orgName,
                    repoName,
                    variable.name,
                    variable.value
                );
                console.log(`  ✅ ${variable.name.padEnd(20)} [${result.action}] (${variable.value || 'empty'})`);
            } catch (error) {
                console.error(`  ❌ ${variable.name.padEnd(20)} [failed: ${error.message}]`);
            }
        }

        // Summary
        console.log('\n📋 Current Configuration');
        console.log('─'.repeat(50));
        
        try {
            const allSecrets = await manager.getSecrets(orgName, repoName);
            console.log('Secrets:  ', allSecrets.map(s => s.name).join(', ') || 'none');
        } catch (error) {
            console.error('❌ Failed to fetch secrets:', error.message);
        }

        try {
            const allVariables = await manager.getVariables(orgName, repoName);
            console.log('Variables:', allVariables.map(v => v.name).join(', ') || 'none');
        } catch (error) {
            console.error('❌ Failed to fetch variables:', error.message);
        }

        console.log('─'.repeat(50));

    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// CLI support
if (process.argv[1] === import.meta.url.substring(7)) {
    const [,, repoName, orgName] = process.argv;
    
    if (!repoName) {
        console.error('\n❌ Please provide a repository name');
        console.error('\nUsage:');
        console.error('  yarn add-secrets <repo-name> [org-name]');
        console.error('\nExample:');
        console.error('  yarn add-secrets my-repo');
        console.error('  yarn add-secrets my-repo other-org\n');
        process.exit(1);
    }

    addSecretsAndVariables(repoName, orgName)
        .then(() => console.log('\n✅ Operation completed successfully\n'))
        .catch(error => {
            console.error('\n❌ Operation failed:', error.message);
            process.exit(1);
        });
}

export { addSecretsAndVariables }; 