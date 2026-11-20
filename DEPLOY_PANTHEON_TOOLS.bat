@echo off
setlocal
cd /d "%~dp0"
echo Deploying Pantheon Tools v1.6.9-r24 to existing Pages project dntrckr...
call npx wrangler pages deploy . --project-name=dntrckr
if errorlevel 1 (
  echo Deployment failed. Review the Wrangler error above.
  pause
  exit /b 1
)
echo Deployment command completed. Verify https://dntrckr.pages.dev/version.json reports 1.6.9-r24.
pause
