import { Octokit } from '@octokit/rest';
import sodium from 'libsodium-wrappers';

export class GitHubManager {
    constructor(authToken, commonSecrets = [], commonVariables = []) {
        if (!authToken) {
            throw new Error('GitHub token is required');
        }
        this.octokit = new Octokit({ auth: authToken });
        this.commonSecrets = commonSecrets;
        this.commonVariables = commonVariables;
    }

    async validateToken(orgName) {
        const validation = {
            isValid: false,
            hasOrgAccess: false,
            errors: []
        };

        try {
            // Test basic authentication
            const { data: user } = await this.octokit.users.getAuthenticated();
            validation.isValid = true;
            validation.username = user.login;

            // Get token metadata
            const { headers } = await this.octokit.request('GET /user');
            validation.scopes = headers['x-oauth-scopes']?.split(', ');

            // Verify required scopes
            const requiredScopes = ['repo', 'workflow', 'admin:org'];
            const missingScopes = requiredScopes.filter(
                scope => !validation.scopes?.includes(scope)
            );

            if (missingScopes.length > 0) {
                validation.errors.push(
                    `Missing required scopes: ${missingScopes.join(', ')}`
                );
            }

            // Test organization access
            if (orgName) {
                try {
                    await this.octokit.orgs.get({ org: orgName });
                    validation.hasOrgAccess = true;
                } catch (error) {
                    validation.errors.push(`No access to organization: ${orgName}`);
                }
            }

        } catch (error) {
            validation.errors.push(`Authentication failed: ${error.message}`);
        }

        return validation;
    }

    async createRepository(owner, name, isPrivate = true, template = null) {
        try {
            let response;
            
            if (template && template !== 'none') {
                // Create from template
                const templateOwner = typeof template === 'object' ? template.owner : owner;
                const templateRepo = typeof template === 'object' ? template.repo : template;
                
                console.log(`Using template: ${templateOwner}/${templateRepo}`);

                // First, verify template exists and is accessible
                try {
                    await this.octokit.repos.get({
                        owner: templateOwner,
                        repo: templateRepo
                    });
                } catch (error) {
                    if (error.status === 404) {
                        throw new Error(`Template repository ${templateOwner}/${templateRepo} not found`);
                    }
                    throw error;
                }

                // Create from template using POST request
                response = await this.octokit.request('POST /repos/{template_owner}/{template_repo}/generate', {
                    template_owner: templateOwner,
                    template_repo: templateRepo,
                    owner: owner,
                    name: name,
                    description: `Created from template: ${templateOwner}/${templateRepo}`,
                    private: isPrivate,
                    include_all_branches: true,
                    headers: {
                        accept: 'application/vnd.github.baptiste-preview+json'
                    }
                });
                console.log('✅ Repository created from template');
            } else {
                // Create empty repository
                console.log('📋 Creating empty repository');
                response = await this.octokit.repos.createInOrg({
                    org: owner,
                    name,
                    private: isPrivate,
                    auto_init: true,
                });
                console.log('✅ Repository created');
            }

            console.log('🔧 Setting up secrets and variables...');
            await this.setupCommonSecrets(owner, name);
            await this.setupCommonVariables(owner, name);

            return response.data;
        } catch (error) {
            if (error.status === 404) {
                console.error('❌ Repository creation failed');
                console.error('💡 Make sure:');
                console.error('   1. The organization exists:', owner);
                console.error('   2. The template repository exists:', template);
                console.error('   3. Your token has access to both organizations');
                console.error('   4. The repository is marked as a template');
            } else if (error.status === 422) {
                console.error('❌ Repository creation failed');
                console.error('💡 The repository might not be marked as a template');
                console.error('   Go to repository settings and enable "Template repository"');
            } else {
                console.error('❌ Error creating repository:', error.message);
                console.error('   Status:', error.status);
                console.error('   Response:', error.response?.data?.message || 'No additional details');
            }
            throw error;
        }
    }

    async setupCommonSecrets(owner, repo) {
        for (const secret of this.commonSecrets) {
            await this.createOrUpdateSecret(owner, repo, secret.name, secret.value);
            console.log(`Secret ${secret.name} created/updated for ${owner}/${repo}`);
        }
    }

    async setupCommonVariables(owner, repo) {
        for (const variable of this.commonVariables) {
            await this.createOrUpdateVariable(owner, repo, variable.name, variable.value);
            console.log(`Variable ${variable.name} created/updated for ${owner}/${repo}`);
        }
    }

    async createOrUpdateSecret(owner, repo, secretName, secretValue) {
        try {
            // Check if secret exists
            const secrets = await this.getSecrets(owner, repo);
            const exists = secrets.some(s => s.name === secretName);

            const { data: publicKey } = await this.octokit.actions.getRepoPublicKey({
                owner,
                repo,
            });

            const encryptedValue = await this.encryptSecret(
                secretValue,
                publicKey.key
            );

            await this.octokit.actions.createOrUpdateRepoSecret({
                owner,
                repo,
                secret_name: secretName,
                encrypted_value: encryptedValue,
                key_id: publicKey.key_id,
            });

            return { success: true, action: exists ? 'updated' : 'created' };
        } catch (error) {
            console.error('Error creating/updating secret:', error);
            throw error;
        }
    }

    async encryptSecret(secret, publicKey) {
        await sodium.ready;
        const binkey = sodium.from_base64(publicKey, sodium.base64_variants.ORIGINAL);
        const binsec = sodium.from_string(secret);
        const encBytes = sodium.crypto_box_seal(binsec, binkey);
        return sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);
    }

    async createOrUpdateVariable(owner, repo, variableName, variableValue) {
        try {
            // Check if variable exists
            const variables = await this.getVariables(owner, repo);
            const exists = variables.some(v => v.name === variableName);

            if (exists) {
                // Update existing variable
                await this.octokit.request('PATCH /repos/{owner}/{repo}/actions/variables/{name}', {
                    owner,
                    repo,
                    name: variableName,
                    value: variableValue
                });
            } else {
                // Create new variable
                await this.octokit.request('POST /repos/{owner}/{repo}/actions/variables', {
                    owner,
                    repo,
                    name: variableName,
                    value: variableValue
                });
            }

            return { success: true, action: exists ? 'updated' : 'created' };
        } catch (error) {
            console.error('Error creating/updating variable:', error);
            throw error;
        }
    }

    async getSecrets(owner, repo) {
        try {
            const response = await this.octokit.actions.listRepoSecrets({
                owner,
                repo,
            });
            return response.data.secrets;
        } catch (error) {
            console.error('Error fetching secrets:', error);
            throw error;
        }
    }

    async getVariables(owner, repo) {
        try {
            const response = await this.octokit.request('GET /repos/{owner}/{repo}/actions/variables', {
                owner,
                repo
            });
            return response.data.variables;
        } catch (error) {
            console.error('Error fetching variables:', error);
            throw error;
        }
    }

    async deleteRepository(owner, name) {
        try {
            console.log(`🗑️  Deleting repository: ${owner}/${name}`);
            
            // Verify repository exists
            try {
                await this.octokit.repos.get({
                    owner,
                    repo: name
                });
            } catch (error) {
                if (error.status === 404) {
                    throw new Error(`Repository ${owner}/${name} not found`);
                }
                throw error;
            }

            // Delete repository
            await this.octokit.repos.delete({
                owner,
                repo: name
            });
            
            console.log('✅ Repository deleted successfully');
            return true;
        } catch (error) {
            if (error.status === 404) {
                console.error('❌ Repository not found');
            } else if (error.status === 403) {
                console.error('❌ Permission denied');
                console.error('💡 Make sure your token has delete_repo scope');
            } else {
                console.error('❌ Failed to delete repository:', error.message);
            }
            throw error;
        }
    }

    async listRepositories(orgName) {
        try {
            const response = await this.octokit.repos.listForOrg({
                org: orgName,
                type: 'all', // Can be 'all', 'public', 'private', 'forks', 'sources', 'member'
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching repositories:', error);
            throw error;
        }
    }
} 