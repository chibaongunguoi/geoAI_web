$body = '{"identifier":"admin123","password":"admin123"}'
try {
    $response = Invoke-WebRequest -UseBasicParsing `
        -Uri 'http://localhost:4000/auth/login' `
        -Method POST `
        -ContentType 'application/json' `
        -Body $body `
        -TimeoutSec 10
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Content: $($response.Content.Substring(0, [Math]::Min(500, $response.Content.Length)))"
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    $errBody = $_.Exception.Response | Select-Object -ExpandProperty Content -ErrorAction SilentlyContinue
    Write-Host "Error status: $code"
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = [System.IO.StreamReader]::new($stream)
        $text = $reader.ReadToEnd()
        Write-Host "Error body: $text"
    }
}
