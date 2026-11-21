@echo off
setlocal
cd /d "%~dp0"
echo Deploying Pantheon Tools v1.6.9-r52 to the existing dntrckr Pages project...
npx wrangler pages deploy . --project-name=dntrckr
if errorlevel 1 (
  echo Deployment failed. Review the Wrangler output above.
  pause
  exit /b 1
)
echo Deployment command completed. Verify https://dntrckr.pages.dev/version.json reports 1.6.9-r52.
pause
