$ports = @(3000,4000,5000,5055,9200)
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
