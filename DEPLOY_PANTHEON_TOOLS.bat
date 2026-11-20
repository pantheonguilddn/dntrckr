@echo off
setlocal
echo Deploying Pantheon Tools v1.6.9-r23 to existing Pages project dntrckr...
npx wrangler pages deploy . --project-name=dntrckr
if errorlevel 1 (
  echo Deployment failed. Review the Wrangler message above.
  pause
  exit /b 1
)
echo Deployment command completed. Verify https://dntrckr.pages.dev/version.json reports 1.6.9-r23.
pause
