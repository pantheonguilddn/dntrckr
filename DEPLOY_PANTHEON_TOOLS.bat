@echo off
setlocal
cd /d "%~dp0"
echo Deploying Pantheon Tools v1.6.9-r16 to the existing dntrckr Cloudflare Pages project.
echo Make sure you have run "npx wrangler login" at least once.
echo.
npx wrangler pages deploy . --project-name=dntrckr
if errorlevel 1 (
  echo.
  echo Deployment did not complete. Review the Wrangler error above.
) else (
  echo.
  echo Wrangler reported a successful deployment. Verify /version.json and the Admin recovery action.
)
echo.
pause
endlocal
