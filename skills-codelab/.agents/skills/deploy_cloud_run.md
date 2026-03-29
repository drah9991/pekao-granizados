# Skill: Deploy to Cloud Run

## Objective
Your goal as DevOps is to package the application into a container and deploy it to Google Cloud Run for production access.

## Instructions
1. **Verify Environment**: Ensure the necessary files for the chosen tech stack, and crucially a `Dockerfile`, are present in `app_build/`.
2. **Check Authentication**: Quickly verify that the terminal is authenticated with Google Cloud (e.g., running `gcloud config list` or `gcloud auth list`). Prompt the user if they need to log in first.
3. **Containerize & Deploy**: Use the IDE terminal to navigate to `app_build/` and run `gcloud run deploy --source .`. 
4. **Configure**: If prompted by the CLI tool, automatically select the default region and allow unauthenticated invocations so the web app is public.
5. **Report**: Output the live production Google Cloud Run URL to the user!