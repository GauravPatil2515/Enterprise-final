Write-Host "🚀 Starting DeliverIQ Enterprise..."
Write-Host "-----------------------------------"

# Start Backend in a new window
Write-Host "Starting Backend (Port 8001)..."
Start-Process -FilePath "cmd" -ArgumentList "/c start control_backend.bat" -WindowStyle Normal

# Start Frontend in a new window
Write-Host "Starting Frontend (Port 3000)..."
Start-Process -FilePath "cmd" -ArgumentList "/c start control_frontend.bat" -WindowStyle Normal

Write-Host "-----------------------------------"
Write-Host "Backend: http://localhost:8001"
Write-Host "Frontend: http://localhost:3000"
