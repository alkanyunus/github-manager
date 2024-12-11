import { GitHubManager } from '../utils/githubManager.js';
import { EnvManager } from '../utils/envManager.js';
import { getCommonSecrets, getCommonVariables } from '../config/secrets.js';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_ORG = process.env.DEFAULT_ORG;
const DEFAULT_TEMPLATE = process.env.DEFAULT_TEMPLATE;

async function createRepo(repoName, orgName = DEFAULT_ORG, template = DEFAULT_TEMPLATE) {
    const githubManager = new GitHubManager(
        process.env.GITHUB_TOKEN || '',
        getCommonSecrets(),
        getCommonVariables()
    );
    const envManager = new EnvManager(process.env.GITHUB_TOKEN || '');

    try {
        // First validate organization access
        const validation = await githubManager.validateToken(orgName);
        if (!validation.isValid) {
            throw new Error(`No access to organization or personal repositories.`);
        }

        console.log('\n Creating new repository');
        console.log('Organization:', orgName);
        console.log('Repository:', repoName);
        
        // Validate template
        if (template === 'none') {
            console.log('Template: none (creating empty repository)');
        } else {
            const templateOwner = typeof template === 'object' ? template.owner : orgName;
            const templateRepo = typeof template === 'object' ? template.repo : template;
            console.log('Template:', `${templateOwner}/${templateRepo}`);
            
            // Check if template exists
            try {
                await githubManager.octokit.repos.get({
                    owner: templateOwner,
                    repo: templateRepo
                });
            } catch (error) {
                if (error.status === 404) {
                    throw new Error(`Template repository ${templateOwner}/${templateRepo} not found`);
                }
                throw error;
            }
        }
        
        console.log('─'.repeat(50));

        // Create repository with template
        console.log('\n📦 Creating repository...');
        await githubManager.createRepository(orgName, repoName, true, template);
        
        // Get environments from template
        console.log('\n🌍 Verifying environments...');
        try {
            const environments = await envManager.getEnvironments(orgName, repoName);
            if (environments.length > 0) {
                environments.forEach(env => {
                    console.log(`  ✅ ${env.name.padEnd(20)} [configured]`);
                });
            } else {
                console.log('  ⚠️  No environments found');
            }
        } catch (error) {
            console.error('  ❌ Failed to fetch environments:', error.message);
        }

        // Summary
        console.log('\n📋 Configuration Summary');
        console.log('─'.repeat(50));
        
        // Verify the secrets
        try {
            const secrets = await githubManager.getSecrets(orgName, repoName);
            console.log('Secrets:  ', secrets.map(s => s.name).join(', ') || 'none');
        } catch (error) {
            console.error('❌ Failed to fetch secrets:', error.message);
        }
        
        // Verify the variables
        try {
            const variables = await githubManager.getVariables(orgName, repoName);
            console.log('Variables:', variables.map(v => v.name).join(', ') || 'none');
        } catch (error) {
            console.error('❌ Failed to fetch variables:', error.message);
        }

        console.log('─'.repeat(50));
        console.log(`\n✨ Repository created: https://github.com/${orgName}/${repoName}\n`);

    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// CLI support
if (process.argv[1] === import.meta.url.substring(7)) {
    const args = process.argv.slice(2);
    const [repoName] = args;

    if (!repoName) {
        console.error('\n❌ Please provide a repository name');
        console.error('\nUsage:');
        console.error('  yarn create-repo <repo-name>');
        console.error('\nExamples:');
        console.error('  yarn create-repo my-repo');
        process.exit(1);
    }

    // Create repository in the default organization
    createRepo(repoName, DEFAULT_ORG)
        .then(() => process.exit(0))
        .catch(error => {
            console.error('\n❌ Failed to create repository:', error.message);
            process.exit(1);
        });
}

export { createRepo }; 