param(
  [string]$PostgresBin = ""
)

$ErrorActionPreference = "Stop"

if (-not $PostgresBin) {
  $initdbCommand = Get-Command initdb.exe -ErrorAction SilentlyContinue
  if ($initdbCommand) {
    $PostgresBin = Split-Path $initdbCommand.Source -Parent
  } else {
    $defaultBin = Join-Path $env:ProgramFiles "PostgreSQL\18\bin"
    if (Test-Path (Join-Path $defaultBin "initdb.exe")) {
      $PostgresBin = $defaultBin
    } else {
      throw "PostgreSQL server tools not found. Install PostgreSQL 15+ binaries or pass -PostgresBin."
    }
  }
}

$initdb = Join-Path $PostgresBin "initdb.exe"
$pgCtl = Join-Path $PostgresBin "pg_ctl.exe"
$psql = Join-Path $PostgresBin "psql.exe"
foreach ($binary in @($initdb, $pgCtl, $psql)) {
  if (-not (Test-Path $binary)) {
    throw "Required PostgreSQL tool is missing: $binary"
  }
}

$tempRoot = [System.IO.Path]::GetFullPath($env:TEMP).TrimEnd('\')
$clusterDir = Join-Path $tempRoot ("fp-google-oauth-pg-" + [guid]::NewGuid().ToString("N"))
$logFile = Join-Path $clusterDir "postgres.log"
$winnerStdout = Join-Path $clusterDir "winner.stdout"
$winnerStderr = Join-Path $clusterDir "winner.stderr"
$contenderStdout = Join-Path $clusterDir "contender.stdout"
$contenderStderr = Join-Path $clusterDir "contender.stderr"
$clusterStarted = $false
$winnerProcess = $null
$contenderProcess = $null

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$listener.Start()
$port = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
$listener.Stop()

function Invoke-TestPsql([string]$SqlFile) {
  & $psql -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p $port -U postgres -d google_oauth_trigger_test -f $SqlFile
  if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL integration SQL failed: $(Split-Path $SqlFile -Leaf)"
  }
}

try {
  New-Item -ItemType Directory -Path $clusterDir | Out-Null
  $resolvedCluster = [System.IO.Path]::GetFullPath($clusterDir)
  if (-not $resolvedCluster.StartsWith($tempRoot + "\", [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to initialize a cluster outside the temporary directory."
  }

  & $initdb -D $clusterDir -U postgres -A trust --encoding=UTF8 --no-locale
  if ($LASTEXITCODE -ne 0) {
    throw "initdb failed to create the disposable PostgreSQL cluster."
  }

  & $pgCtl -D $clusterDir -l $logFile -o "-h 127.0.0.1 -p $port" -w start
  if ($LASTEXITCODE -ne 0) {
    throw "pg_ctl failed to start the disposable PostgreSQL cluster."
  }
  $clusterStarted = $true

  & $psql -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p $port -U postgres -d postgres -c "CREATE DATABASE google_oauth_trigger_test;"
  if ($LASTEXITCODE -ne 0) {
    throw "Could not create the integration-test database in the disposable cluster."
  }

  Invoke-TestPsql (Join-Path $PSScriptRoot "google-oauth-trigger.integration.sql")

  $winnerFile = Join-Path $PSScriptRoot "google-oauth-trigger-concurrent-winner.sql"
  $winnerArgs = @(
    "-X", "-q", "-v", "ON_ERROR_STOP=1",
    "-h", "127.0.0.1", "-p", "$port", "-U", "postgres",
    "-d", "google_oauth_trigger_test", "-f", "`"$winnerFile`""
  )
  $winnerProcess = Start-Process -FilePath $psql -ArgumentList $winnerArgs -PassThru -NoNewWindow `
    -RedirectStandardOutput $winnerStdout -RedirectStandardError $winnerStderr

  Start-Sleep -Milliseconds 500

  $contenderFile = Join-Path $PSScriptRoot "google-oauth-trigger-concurrent-contender.sql"
  $contenderArgs = @(
    "-X", "-q", "-v", "ON_ERROR_STOP=1",
    "-h", "127.0.0.1", "-p", "$port", "-U", "postgres",
    "-d", "google_oauth_trigger_test", "-f", "`"$contenderFile`""
  )
  $contenderProcess = Start-Process -FilePath $psql -ArgumentList $contenderArgs -PassThru -NoNewWindow `
    -RedirectStandardOutput $contenderStdout -RedirectStandardError $contenderStderr

  $waiterSql = "SELECT count(*) FROM pg_stat_activity WHERE datname = 'google_oauth_trigger_test' AND wait_event_type = 'Lock' AND wait_event = 'advisory' AND query LIKE '%60000000-0000-0000-0000-000000000006%';"
  $waiterObserved = $false
  for ($attempt = 0; $attempt -lt 25; $attempt++) {
    $waiterCount = & $psql -X -q -tA -v ON_ERROR_STOP=1 -h 127.0.0.1 -p $port -U postgres -d google_oauth_trigger_test -c $waiterSql
    if ($LASTEXITCODE -ne 0) {
      throw "Could not inspect the disposable database's concurrent lock waiter."
    }
    if ([int]$waiterCount.Trim() -gt 0) {
      $waiterObserved = $true
      break
    }
    Start-Sleep -Milliseconds 100
  }
  if (-not $waiterObserved) {
    throw "The competing signup did not wait on the advisory lock while the first transaction was open."
  }

  $winnerProcess.WaitForExit()
  $contenderProcess.WaitForExit()
  $winnerProcess.Refresh()
  $contenderProcess.Refresh()
  $winnerError = ""
  $contenderError = ""
  if (Test-Path $winnerStderr) {
    $winnerError = Get-Content $winnerStderr -Raw
  }
  if (Test-Path $contenderStderr) {
    $contenderError = Get-Content $contenderStderr -Raw
  }
  if ($winnerError -and $winnerError.Trim().Length -gt 0) {
    $winnerOutput = Get-Content $winnerStdout -Raw
    throw "The first concurrent synthetic signup failed: $winnerError $winnerOutput"
  }
  if ($contenderError -notmatch "P0001") {
    throw "The competing synthetic signup was not rejected by the duplicate-email guard: $contenderError"
  }

  Invoke-TestPsql (Join-Path $PSScriptRoot "google-oauth-trigger-concurrent-assert.sql")
  Write-Output "PASS: isolated PostgreSQL trigger integration tests completed on port $port."
} finally {
  foreach ($process in @($winnerProcess, $contenderProcess)) {
    if ($process -and -not $process.HasExited) {
      $process.Kill()
      $process.WaitForExit()
    }
  }

  if ($clusterStarted) {
    & $pgCtl -D $clusterDir -m immediate -w stop | Out-Null
  }

  if (Test-Path $clusterDir) {
    $resolvedCluster = [System.IO.Path]::GetFullPath($clusterDir)
    if ($resolvedCluster.StartsWith($tempRoot + "\", [System.StringComparison]::OrdinalIgnoreCase)) {
      Remove-Item -LiteralPath $resolvedCluster -Recurse -Force
    }
  }
}
