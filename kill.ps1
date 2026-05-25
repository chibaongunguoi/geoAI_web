$ports = @(4000)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "Killing process $($process.Id) ($($process.ProcessName)) on port $port"
            Stop-Process -Id $process.Id -Force
        }
    }
}
