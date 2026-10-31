# BILLORA backend verification runner
# Save as backend/verify-backend.ps1 and run from the backend directory.
# This script does not reset, migrate, seed, or delete database data.

$ErrorActionPreference = "Continue"
$results = @()

function Run-Check {
    param([string]$Name, [scriptblock]$Command)

    Write-Host "`n==================================================" -ForegroundColor DarkGray
    Write-Host "RUNNING: $Name" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor DarkGray

    try {
        & $Command
        $code = $LASTEXITCODE
        if ($null -eq $code) { $code = 0 }

        if ($code -eq 0) {
            Write-Host "PASS: $Name" -ForegroundColor Green
            $script:results += [pscustomobject]@{ Check = $Name; Result = "PASS" }
        } else {
            Write-Host "FAIL: $Name (exit code $code)" -ForegroundColor Red
            $script:results += [pscustomobject]@{ Check = $Name; Result = "FAIL ($code)" }
        }
    } catch {
        Write-Host "FAIL: $Name - $($_.Exception.Message)" -ForegroundColor Red
        $script:results += [pscustomobject]@{ Check = $Name; Result = "FAIL (exception)" }
    }
}

if (-not (Test-Path "package.json")) {
    Write-Host "Run this script from the BILLORA backend directory (the folder containing backend/package.json)." -ForegroundColor Red
    exit 1
}

Write-Host "BILLORA BACKEND VERIFICATION" -ForegroundColor Yellow
Write-Host "Working directory: $((Get-Location).Path)"
Write-Host "No database reset or destructive operation will be performed."

Run-Check "TypeScript build" { npm run build }
Run-Check "Prisma schema validation" { npx prisma validate }
Run-Check "Prisma migration status" { npx prisma migrate status }

$testFiles = @(
    "tests/phase2_test.ts",
    "tests/phase3_test.ts",
    "tests/products_test.ts",
    "tests/plans_test.ts",
    "tests/member3_billing_test.ts"
)

foreach ($testFile in $testFiles) {
    if (Test-Path $testFile) {
        Run-Check "API tests: $testFile" { npx tsx $testFile }
    } else {
        Write-Host "SKIP: $testFile not found" -ForegroundColor Yellow
        $results += [pscustomobject]@{ Check = "API tests: $testFile"; Result = "SKIPPED (file not found)" }
    }
}

Write-Host "`n================ VERIFICATION SUMMARY ================" -ForegroundColor Yellow
$results | Format-Table -AutoSize

$failed = @($results | Where-Object { $_.Result -like "FAIL*" })
$skipped = @($results | Where-Object { $_.Result -like "SKIPPED*" })

if ($failed.Count -gt 0) {
    Write-Host "Some checks failed. Share the full output; do not commit yet." -ForegroundColor Red
    exit 1
}
if ($skipped.Count -gt 0) {
    Write-Host "Available checks passed, but skipped tests still need separate verification." -ForegroundColor Yellow
    exit 0
}

Write-Host "All available checks passed." -ForegroundColor Green
exit 0
