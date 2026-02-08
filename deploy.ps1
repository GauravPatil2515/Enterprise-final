# ========================================
# DeliverIQ Enterprise - Quick Deploy to Vercel
# ========================================

Write-Host "🚀 DeliverIQ Enterprise Deployment Helper`n" -ForegroundColor Cyan

# Step 1: Check if code is committed
Write-Host "✓ Checking git status..." -ForegroundColor Yellow
$status = git status --porcelain
if ($status) {
    Write-Host "  ⚠️  You have uncommitted changes. Commit them first!" -ForegroundColor Red
    git status
    exit 1
}
Write-Host "  ✓ All changes committed`n" -ForegroundColor Green

# Step 2: Push to GitHub
Write-Host "✓ Pushing to GitHub..." -ForegroundColor Yellow
git push origin master 2>&1 | Out-Null
Write-Host "  ✓ Code pushed to GitHub`n" -ForegroundColor Green

# Step 3: Deployment instructions
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📦 DEPLOYMENT STEPS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "OPTION 1: Deploy Backend to Railway (Recommended)" -ForegroundColor Green
Write-Host "  1. Go to https://railway.app" -ForegroundColor White
Write-Host "  2. Click 'New Project' → 'Deploy from GitHub repo'" -ForegroundColor White
Write-Host "  3. Select: GauravPatil2515/Enterprise-final" -ForegroundColor White
Write-Host "  4. Set Root Directory: backend" -ForegroundColor White
Write-Host "  5. Add environment variables from backend\.env:" -ForegroundColor White
Write-Host "     FEATHERLESS_API_KEY, NEO4J_URI, NEO4J_PASSWORD, etc." -ForegroundColor Gray
Write-Host "  6. Deploy! Railway will give you a URL like:" -ForegroundColor White
Write-Host "     https://enterprise-final-production.up.railway.app`n" -ForegroundColor Cyan

Write-Host "OPTION 2: Deploy Frontend to Vercel" -ForegroundColor Green
Write-Host "  1. Go to https://vercel.com" -ForegroundColor White
Write-Host "  2. Click 'Add New Project'" -ForegroundColor White
Write-Host "  3. Import: GauravPatil2515/Enterprise-final" -ForegroundColor White
Write-Host "  4. Framework Preset: Vite" -ForegroundColor White
Write-Host "  5. Root Directory: frontend" -ForegroundColor White
Write-Host "  6. Build Command: npm run build" -ForegroundColor White
Write-Host "  7. Output Directory: dist" -ForegroundColor White
Write-Host "  8. Add environment variable:" -ForegroundColor White
Write-Host "     VITE_API_URL=<your-railway-backend-url>" -ForegroundColor Cyan
Write-Host "  9. Deploy!`n" -ForegroundColor White

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔑 Environment Variables (from .env)" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan
Get-Content backend\.env | ForEach-Object {
    if ($_ -and !$_.StartsWith("#")) {
        Write-Host "  $_" -ForegroundColor Gray
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📚 Full guide: DEPLOYMENT_GUIDE.md" -ForegroundColor White
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "✨ Your code is pushed and ready to deploy!" -ForegroundColor Green
Write-Host "   GitHub: https://github.com/GauravPatil2515/Enterprise-final" -ForegroundColor Cyan
