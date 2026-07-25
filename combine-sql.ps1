# PowerShell script to combine all migration SQL files
$basePath = "C:\Users\Emran Hossan\Downloads\website-launch-guardian-1f54103d-main\website-launch-guardian-1f54103d-main"
$migrationDir = Join-Path $basePath "supabase\migrations"
$outputFile = Join-Path $basePath "supabase\combined_setup.sql"

# Get all SQL files sorted by name
$sqlFiles = Get-ChildItem -Path $migrationDir -Filter "*.sql" | Sort-Object Name

# Create header
$header = @"
-- ============================================================
-- BAZAR BD - Complete Database Setup Script (Combined)
-- Generated from all migration files
-- Total files: $($sqlFiles.Count)
-- ============================================================

"@

# Process each file
$allContent = @($header)
foreach ($file in $sqlFiles) {
    $content = Get-Content $file.FullName -Raw
    $allContent += "-- File: $($file.Name)"
    $allContent += $content
    $allContent += ""
}

# Write to output file
$allContent -join "`r`n" | Out-File $outputFile -Encoding UTF8

Write-Host "Combined $($sqlFiles.Count) SQL files into: $outputFile"
