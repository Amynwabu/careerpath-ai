param(
  [int]$ApiPort = 3000,
  [int]$FrontendPort = 5173,
  [int]$TunnelAttempts = 5,
  [switch]$SkipApi,
  [switch]$KeepExistingTunnel
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$ApiDir = Join-Path $Root "artifacts\api-server"
$FrontendDir = Join-Path $Root "artifacts\careerpath-ai"
$ToolsDir = Join-Path $Root ".tools"
$LogDir = Join-Path $ToolsDir "logs"
$Cloudflared = Join-Path $ToolsDir "cloudflared.exe"
$TunnelPidFile = Join-Path $ToolsDir "careerpath-cloudflared.pid"
$Node = "C:\Program Files\nodejs\node.exe"

function Write-Step($Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Import-DotEnv($Path) {
  if (!(Test-Path -LiteralPath $Path)) {
    return
  }

  foreach ($line in Get-Content -LiteralPath $Path) {
    $trimmed = $line.Trim()
    if ($trimmed.Length -eq 0 -or $trimmed.StartsWith("#")) {
      continue
    }

    $match = [regex]::Match($trimmed, "^\s*([^=]+?)\s*=\s*(.*)\s*$")
    if (!$match.Success) {
      continue
    }

    $name = $match.Groups[1].Value.Trim()
    $value = $match.Groups[2].Value.Trim()

    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    [Environment]::SetEnvironmentVariable($name, $value, "Process")
  }
}

function Test-Port($Port) {
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $task = $client.ConnectAsync("127.0.0.1", $Port)
    if (!$task.Wait(500)) {
      return $false
    }
    return $client.Connected
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Wait-Port($Port, $Name, $TimeoutSeconds = 30) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-Port $Port) {
      Write-Host "$Name is listening on port $Port." -ForegroundColor Green
      return
    }
    Start-Sleep -Milliseconds 500
  }

  throw "$Name did not start on port $Port within $TimeoutSeconds seconds."
}

function Start-Detached($FileName, $Arguments, $WorkingDirectory, $Environment = @{}) {
  $psi = [System.Diagnostics.ProcessStartInfo]::new()
  $psi.FileName = $FileName
  $psi.Arguments = $Arguments
  $psi.WorkingDirectory = $WorkingDirectory
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  foreach ($entry in $Environment.GetEnumerator()) {
    $psi.EnvironmentVariables[$entry.Key] = [string]$entry.Value
  }
  return [System.Diagnostics.Process]::Start($psi)
}

function Get-LanIp {
  $ips = ipconfig | Select-String -Pattern "IPv4" | ForEach-Object {
    ($_.ToString().Split(":")[-1]).Trim()
  }

  return $ips | Where-Object {
    $_ -and $_ -notlike "127.*" -and $_ -notlike "169.254.*"
  } | Select-Object -First 1
}

function Test-UrlWithNode($Url) {
  $script = "fetch(process.argv[1]).then(r=>process.exit(r.ok ? 0 : 1)).catch(()=>process.exit(1))"
  & $Node -e $script $Url
  return $LASTEXITCODE -eq 0
}

function Wait-TunnelUrl($LogPath, $TimeoutSeconds = 45) {
  $pattern = "https://[a-z0-9-]+\.trycloudflare\.com"
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    if (Test-Path -LiteralPath $LogPath) {
      $match = Get-Content -LiteralPath $LogPath -ErrorAction SilentlyContinue |
        Select-String -Pattern $pattern |
        Select-Object -Last 1

      if ($match) {
        return $match.Matches.Value
      }
    }

    Start-Sleep -Seconds 1
  }

  throw "Cloudflare did not publish a tunnel URL within $TimeoutSeconds seconds. See log: $LogPath"
}

function Stop-PreviousTunnel {
  if (!(Test-Path -LiteralPath $TunnelPidFile)) {
    return
  }

  $rawPid = (Get-Content -LiteralPath $TunnelPidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  if (!$rawPid) {
    return
  }

  $pidValue = 0
  if (![int]::TryParse($rawPid, [ref]$pidValue)) {
    return
  }

  $process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
  if ($process -and $process.ProcessName -eq "cloudflared") {
    Write-Host "Stopping previous script-managed Cloudflare tunnel (PID $pidValue)."
    Stop-Process -Id $pidValue -Force
  }
}

if (!(Test-Path -LiteralPath $Node)) {
  throw "Node was not found at $Node. Install Node.js or update `$Node in this script."
}

if (!(Test-Path -LiteralPath $Cloudflared)) {
  throw "cloudflared.exe was not found at $Cloudflared."
}

New-Item -ItemType Directory -Force -Path $ToolsDir, $LogDir | Out-Null
Import-DotEnv (Join-Path $Root ".env")

if (!$SkipApi) {
  if (Test-Port $ApiPort) {
    Write-Host "API already appears to be running on port $ApiPort." -ForegroundColor Green
  } else {
    Write-Step "Building API server"
    Push-Location $ApiDir
    try {
      & $Node ".\build.mjs"
      if ($LASTEXITCODE -ne 0) {
        throw "API build failed with exit code $LASTEXITCODE."
      }
    } finally {
      Pop-Location
    }

    Write-Step "Starting API server on port $ApiPort"
    $apiProcess = Start-Detached $Node "--enable-source-maps ./dist/index.mjs" $ApiDir @{ PORT = $ApiPort; NODE_ENV = "development" }
    Write-Host "API PID: $($apiProcess.Id)"
    Wait-Port $ApiPort "API server"
  }
}

if (Test-Port $FrontendPort) {
  Write-Host "Frontend already appears to be running on port $FrontendPort." -ForegroundColor Green
} else {
  Write-Step "Starting frontend on 0.0.0.0:$FrontendPort"
  $frontendArgs = "`"node_modules\vite\bin\vite.js`" --config vite.config.ts --host 0.0.0.0 --port $FrontendPort"
  $frontendProcess = Start-Detached $Node $frontendArgs $FrontendDir
  Write-Host "Frontend PID: $($frontendProcess.Id)"
  Wait-Port $FrontendPort "Frontend"
}

if (!$KeepExistingTunnel) {
  Stop-PreviousTunnel
}

$lanIp = Get-LanIp
$localUrl = "http://127.0.0.1:$FrontendPort"
$lanUrl = if ($lanIp) { "http://$lanIp`:$FrontendPort" } else { $null }

Write-Step "Checking URLs"
if (!(Test-UrlWithNode $localUrl)) {
  throw "Local URL did not return OK: $localUrl"
}

if ($lanUrl) {
  if (!(Test-UrlWithNode $lanUrl)) {
    Write-Warning "LAN URL did not return OK from this machine: $lanUrl"
  }
}

$tunnelReady = $false
$tunnelUrl = $null
$tunnelLog = $null
$tunnelProcess = $null

Write-Step "Starting Cloudflare tunnel"
for ($attempt = 1; $attempt -le $TunnelAttempts; $attempt += 1) {
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $tunnelLog = Join-Path $LogDir "cloudflared-$timestamp-attempt$attempt.log"
  $tunnelArgs = "--logfile `"$tunnelLog`" tunnel --protocol http2 --url http://localhost:$FrontendPort"
  $tunnelProcess = Start-Detached $Cloudflared $tunnelArgs $Root
  $tunnelProcess.Id | Set-Content -LiteralPath $TunnelPidFile
  Write-Host "Cloudflare attempt $attempt PID: $($tunnelProcess.Id)"
  Write-Host "Cloudflare log: $tunnelLog"

  $tunnelUrl = Wait-TunnelUrl $tunnelLog
  Write-Host "Cloudflare URL: $tunnelUrl"

  for ($i = 0; $i -lt 12; $i += 1) {
    if (Test-UrlWithNode $tunnelUrl) {
      $tunnelReady = $true
      break
    }
    Start-Sleep -Seconds 2
  }

  if ($tunnelReady) {
    break
  }

  Write-Warning "Cloudflare URL did not respond yet. Retrying with a fresh tunnel..."
  $staleTunnel = Get-Process -Id $tunnelProcess.Id -ErrorAction SilentlyContinue
  if ($staleTunnel -and $staleTunnel.ProcessName -eq "cloudflared") {
    Stop-Process -Id $tunnelProcess.Id -Force
  }
}

if (!$tunnelReady) {
  throw "Cloudflare did not return a reachable URL after $TunnelAttempts attempt(s). Last URL: $tunnelUrl"
}

Write-Host ""
Write-Host "CareerPath AI is ready." -ForegroundColor Green
Write-Host "Local:      $localUrl"
if ($lanUrl) {
  Write-Host "LAN:        $lanUrl"
}
Write-Host "Cloudflare: $tunnelUrl"
Write-Host ""
Write-Host "If other devices on your Wi-Fi cannot open the LAN link, run PowerShell as Administrator and allow TCP ${FrontendPort}:"
Write-Host "netsh advfirewall firewall add rule name=`"CareerPath AI Vite $FrontendPort`" dir=in action=allow protocol=TCP localport=$FrontendPort"
