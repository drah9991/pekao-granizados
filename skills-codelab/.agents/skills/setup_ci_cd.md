# Skill: Setup CI/CD

## Objective
Your goal as DevOps is to automate the deployment process by configuring a CI/CD pipeline, avoiding the need for manual local terminal deployments in the future.

## Instructions
1. **Determine CI Platform**: Default to GitHub Actions unless specified otherwise in the `Technical_Specification.md`.
2. **Create Workflows**: Navigate to `app_build/` and create the directory structure `.github/workflows/`.
3. **Write Pipeline**: Create a `deploy.yml` file that triggers on pushes to the `main` branch. 
   - Ensure the pipeline includes steps to: checkout the code, setup the environment (Node/Python), install dependencies, run tests (if any), and finally deploy the code to the chosen provider (e.g., Google Cloud Run, Vercel).
4. **Document Secrets**: Explicitly list out any Repository Secrets (e.g., `GCP_CREDENTIALS`, API keys) that the user will need to configure in their GitHub settings for the action to succeed.
5. **Report**: Notify the user that the CI/CD pipeline is ready and list the required secrets they need to inject.
