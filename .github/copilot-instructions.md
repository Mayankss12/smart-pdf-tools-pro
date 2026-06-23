# PDFMantra AI Working Rules

Project: PDFMantra / smart-pdf-tools-pro
Stack: Next.js + TypeScript + Tailwind CSS

## Core Rules

- Product name must remain PDFMantra.
- Work one safe step at a time.
- Read the existing file before changing it.
- Do not make broad multi-file refactors unless explicitly requested.
- Do not create fake working features.
- Do not add fake coming-soon modals or fake backend errors.
- Preserve existing PDF engine/export logic unless there is a real technical reason to change it.
- Use existing components, hooks, utilities, and styling patterns before creating new ones.
- Maintain TypeScript safety.
- Do not ignore build errors.
- Do not claim work is complete until build/type checks pass.

## Editor Rules

- Private-development toolbar can show all tools/options.
- Working tools should be clickable.
- Unbuilt tools must be clearly disabled, faded, or locked.
- Public production release should hide or complete unfinished tools.
- Do not set Text/Edit as the default active tool.
- User should manually select the active tool.
- Keep object state centralized in useEditor where appropriate.
- Keep export logic centralized and stable.
- Do not break existing tools while improving another tool.

## UI/UX Rules

- Build premium, clean, modern UI.
- Do not copy Sejda, Stirling PDF, PDF Gear, or competitor branding.
- Use original PDFMantra styling.
- Keep mobile/tablet layout responsive.
- Avoid bulky fonts and messy spacing.
- Prefer polished, production-grade UI.

## Workflow Rules

Before code changes:
1. Summarize current file/context.
2. Explain intended change.
3. Confirm exact file path.

After code changes:
1. Show changed files.
2. Run npm.cmd run build if app code changed.
3. Fix all build errors.
4. Provide a short test checklist.
5. Suggest a clear commit message.

## Safety Rules

- Do not delete files unless explicitly approved.
- Do not change package versions unless explicitly approved.
- Do not touch .env files or secrets.
- Use Windows PowerShell compatible commands.
- For small changes, prefer automatic commands.
- For large changes, provide full file replacement code.
