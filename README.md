# GitHub Manager

A command-line tool for managing GitHub repositories, secrets, and variables. Primarily focused on making GitHub Actions' secrets & variables easier to use.

## Motivation - Why do I need this? Why did I make this?
My team and I are working on so many projects(usually game projects) so we create repositories for each prototype, and it's quite often. 
We use GitHub Actions for automated server builds by doing build then upload, and then postback to a slack channel. Every repo has almost the same action's secrets. Defining them seperately one by one is not efficient. If you don't have organization planning on GitHub, you can't use organization-level secrets & variables instead of repository-level. So it's hard to manage secrets & variables for each repository's GitHub Actions. 

TL;DR: This tool makes your actions' secrets & variables easily to create.


## Features
- Validate GitHub tokens
- Create repositories from templates
- Manage GitHub Actions secrets and variables
- Delete repositories
- Add secrets & variables to repositories

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/alkanyunus/github-manager.git
cd github-manager

# yarn is recommended
yarn 

# or npm
npm install
```

### Setup Environment Variables

Create a `.env` file based on the provided template:

```bash
cp .env.template .env
```

Edit the `.env` file and add your specific values:
```plaintext
# GitHub Authentication
# must
GITHUB_TOKEN=your_github_token_here

# Organization and Template
DEFAULT_ORG=your_organization_name_here
DEFAULT_TEMPLATE=your_template_repo_name_here

# Your other common secrets for all repositories
SLACK_TOKEN=your_slack_token_here
SOME_SERVICE_TOKEN=your_some_service_token_here
```

## Usage

```bash
# Validate GitHub Auth Token
yarn validate-token

# List all repositories
yarn list-repos

# Create Repository
yarn create-repo my-repo

# Delete Repository
yarn delete-repo my-repo

# Add Secrets & variables to given repository
# it's an upsert operation(add or update)
yarn add-secrets my-repo
```

> Feel free to contribute to this project.