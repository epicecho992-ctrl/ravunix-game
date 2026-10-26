$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add('http://localhost:8000/')
$l.Start()
Write-Host 'Ravunix server chal raha hai: http://localhost:8000  (is window ko band mat karo)'
$types = @{'.html'='text/html; charset=utf-8';'.js'='text/javascript; charset=utf-8';'.css'='text/css; charset=utf-8';'.md'='text/plain'}
while ($l.IsListening) {
  $c = $l.GetContext()
  $p = $c.Request.Url.LocalPath.TrimStart('/'); if ($p -eq '') { $p = 'index.html' }
  $f = Join-Path $root ($p -replace '/','\')
  if ((Test-Path $f -PathType Leaf) -and ($f.StartsWith($root))) {
    $ext = [IO.Path]::GetExtension($f).ToLower()
    $c.Response.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
    $b = [IO.File]::ReadAllBytes($f); $c.Response.ContentLength64 = $b.Length
    $c.Response.OutputStream.Write($b, 0, $b.Length)
  } else { $c.Response.StatusCode = 404 }
  $c.Response.Close()
}
