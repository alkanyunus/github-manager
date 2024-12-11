import { Octokit } from '@octokit/rest';

export class EnvManager {
    constructor(authToken) {
        if (!authToken) {
            throw new Error('GitHub token is required');
        }
        this.octokit = new Octokit({ auth: authToken });
    }

    async createEnvironment(owner, repo, envName) {
        try {
            await this.octokit.repos.createOrUpdateEnvironment({
                owner,
                repo,
                environment_name: envName,
                wait_timer: 0,
                reviewers: [],
                deployment_branch_policy: null
            });
            return true;
        } catch (error) {
            console.error('Error creating environment:', error);
            throw error;
        }
    }

    async getEnvironments(owner, repo) {
        try {
            const response = await this.octokit.repos.getAllEnvironments({
                owner,
                repo
            });
            return response.data.environments;
        } catch (error) {
            console.error('Error fetching environments:', error);
            throw error;
        }
    }
} 