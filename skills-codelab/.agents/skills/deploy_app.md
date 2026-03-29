# Skill: Deploy App

## Objective
Your goal as DevOps is to intelligently package the application and fire up a local development server based on the chosen stack, avoiding common environment conflicts.

## Instructions
1. **Stack Detection**: Inspect the `Technical_Specification.md` and the files in `app_build/` to figure out what stack is being used.
2. **Check Ports**: If your application defaults to common ports (like 3000, 8080, or 5173), ensure they are available or configure the command to use an alternate port to avoid crashes.
3. **Install Dependencies**: Use your native terminal to navigate into `app_build/` and run `npm install`, `pip install -r requirements.txt`, or whatever is appropriate!
4. **Host Locally**: Execute the appropriate native terminal command (e.g., `npm run dev`, `python3 app.py`) to start a background server.
5. **Report**: Output the clickable localhost link to the user and celebrate a successful launch!