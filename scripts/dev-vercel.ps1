param(
  [ValidateRange(1, 65535)]
  [int]$Port = 3000
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$environmentFile = Join-Path $projectRoot '.env.local'

if (-not (Test-Path -LiteralPath $environmentFile)) {
  throw "Missing $environmentFile. Copy .env.example to .env.local and add the server-only Supabase values."
}

foreach ($line in Get-Content -LiteralPath $environmentFile) {
  $trimmedLine = $line.Trim()
  if (-not $trimmedLine -or $trimmedLine.StartsWith('#')) {
    continue
  }

  $separatorIndex = $trimmedLine.IndexOf('=')
  if ($separatorIndex -le 0) {
    continue
  }

  $name = $trimmedLine.Substring(0, $separatorIndex).Trim()
  $value = $trimmedLine.Substring($separatorIndex + 1).Trim()

  if ($name -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
    throw "Invalid environment variable name in $environmentFile."
  }

  if ($value.Length -ge 2) {
    $firstCharacter = $value[0]
    $lastCharacter = $value[$value.Length - 1]
    if (($firstCharacter -eq '"' -and $lastCharacter -eq '"') -or
        ($firstCharacter -eq "'" -and $lastCharacter -eq "'")) {
      $value = $value.Substring(1, $value.Length - 2)
    }
  }

  [Environment]::SetEnvironmentVariable($name, $value, 'Process')
}

if (-not $env:SUPABASE_URL -or -not $env:SUPABASE_SECRET_KEY) {
  throw 'SUPABASE_URL and SUPABASE_SECRET_KEY must both be set in .env.local.'
}

Push-Location $projectRoot
try {
  & vercel dev --listen $Port
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
