param([switch]$UiTest,[int]$Port=0,[switch]$NoBrowser,[string]$TestProfile='')
$ErrorActionPreference='Stop'
$utf8=New-Object System.Text.UTF8Encoding($false)
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'app'))
$profile=Join-Path $env:APPDATA 'CNC Torno React'
if($UiTest){$profile=Join-Path ([IO.Path]::GetTempPath()) ('cnc-react-light-test-'+$PID)}
if($UiTest -and $TestProfile){$testRoot=[IO.Path]::GetFullPath([IO.Path]::GetTempPath());$candidate=[IO.Path]::GetFullPath($TestProfile);if(!$candidate.StartsWith($testRoot,[StringComparison]::OrdinalIgnoreCase) -or !([IO.Path]::GetFileName($candidate)).StartsWith('cnc-react-light-test-')){throw 'Pasta de teste invalida.'};$profile=$candidate}
function Open-CNC([string]$url){
  if($UiTest){Write-Output $url}
  if(!$NoBrowser){
    $edge=Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'
    if(!(Test-Path -LiteralPath $edge)){$edge=Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'}
    if(Test-Path -LiteralPath $edge){Start-Process -FilePath $edge -ArgumentList ('--app="'+$url+'"') -WindowStyle Normal}else{Start-Process $url -WindowStyle Normal}
  }
}
$listener=$null;$lock=$null
try {
  if(!(Test-Path -LiteralPath (Join-Path $root 'index.html'))){throw 'Pasta app ausente. Extraia todo o pacote antes de iniciar.'}
  if(!$UiTest -and (Get-Process -Name 'CNC-Torno' -ErrorAction SilentlyContinue)){throw 'Feche a versao Electron antes de abrir a versao leve.'}
  [IO.Directory]::CreateDirectory($profile)|Out-Null
  $sessionFile=Join-Path $profile 'lightweight.session.json'
  try{$lock=New-Object IO.FileStream((Join-Path $profile 'lightweight.lock'),[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)}catch{
    if([IO.File]::Exists($sessionFile)){
      $session=[IO.File]::ReadAllText($sessionFile)|ConvertFrom-Json
      if($session.url -match '^http://127\.0\.0\.1:\d+/\?token=([a-f0-9]{64})$'){
        $existingToken=$Matches[1];$existingOrigin=([Uri]$session.url).GetLeftPart([UriPartial]::Authority)
        $alive=Invoke-WebRequest -UseBasicParsing -Uri ($existingOrigin+'/api/alive') -Headers @{'X-CNC-Token'=$existingToken} -TimeoutSec 3
        if($alive.StatusCode -eq 200){Open-CNC $session.url;return}
      }
    }
    throw 'Outra sessao esta abrindo a versao leve. Aguarde alguns segundos e tente novamente.'
  }
  $file=Join-Path $profile 'workspace.json'
  $script:expected=if([IO.File]::Exists($file)){[IO.File]::ReadAllText($file)}else{$null}
  . (Join-Path $PSScriptRoot 'Usuarios-CNC.ps1')
  Initialize-Users $profile
  if($Port -eq 0){$probe=New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback,0);$probe.Start();$Port=$probe.LocalEndpoint.Port;$probe.Stop()}
  $origin='http://127.0.0.1:'+ $Port
  $token=[Guid]::NewGuid().ToString('N')+[Guid]::NewGuid().ToString('N')
  $listener=New-Object Net.HttpListener;$listener.Prefixes.Add($origin+'/');$listener.Start()
  $bridge=@"
const token='$token';
async function request(path,data,session='',keepalive=false){const r=await fetch(path,{method:data===undefined?'GET':'POST',headers:{'X-CNC-Token':token,'X-CNC-Session':session,'Content-Type':'application/json'},keepalive,...(data===undefined?{}:{body:JSON.stringify(data)})});if(!r.ok)throw new Error(await r.text());return r.json()}
globalThis.desktop={loadWorkspace:()=>request('/api/load'),saveWorkspace:data=>request('/api/save',data),dataPath:()=>request('/api/path'),access:(action,data,session,keepalive)=>request('/api/access/'+action,data,session,keepalive)};
setInterval(()=>request('/api/alive').catch(()=>{}),15000);
"@
  $url=$origin+'/?token='+$token
  [IO.File]::WriteAllText($sessionFile,(ConvertTo-Json -InputObject @{url=$url;pid=$PID} -Compress),$utf8)
  Open-CNC $url
  $last=[DateTime]::UtcNow;$cache=@{};$pending=$listener.GetContextAsync()
  while($listener.IsListening){
    if(!$pending.Wait(1000)){if(([DateTime]::UtcNow-$last).TotalMinutes -gt 30){break};continue}
    $ctx=$pending.Result;$pending=$listener.GetContextAsync();$req=$ctx.Request;$res=$ctx.Response
    try{
      $route=$req.Url.AbsolutePath;$last=[DateTime]::UtcNow
      $res.Headers['Cache-Control']='no-store';$res.Headers['X-Content-Type-Options']='nosniff'
      if($req.Headers['Host'] -ne ('127.0.0.1:'+$Port)){throw 'Host invalido.'}
      if($route.StartsWith('/api/')){
        if($req.Headers['X-CNC-Token'] -ne $token -or ($req.Headers['Origin'] -and $req.Headers['Origin'] -ne $origin)){throw 'Origem nao autorizada.'}
        $res.ContentType='application/json; charset=utf-8'
        if($route.StartsWith('/api/access/')){$body=Invoke-UserAccess ($route.Substring(12)) $req}else{switch($route){
          '/api/load' {if($req.HttpMethod -ne 'GET'){throw 'Metodo invalido.'};$body=if($null -eq $script:expected){'null'}else{$parsed=$script:expected|ConvertFrom-Json;if($parsed.format -ne 'cnc-workspace' -or $null -eq $parsed.tools -or $null -eq $parsed.drawings){throw 'Dados existentes invalidos; nao foram substituidos.'};$script:expected}}
          '/api/path' {$body=ConvertTo-Json -InputObject $profile -Compress}
          '/api/alive' {$body='true'}
          '/api/save' {
            if($req.HttpMethod -ne 'POST' -or $req.ContentLength64 -gt 31457280){throw 'Gravacao invalida ou backup excede 30 MB.'}
            $reader=New-Object IO.StreamReader($req.InputStream,$utf8);$text=$reader.ReadToEnd();$reader.Dispose()
            if($utf8.GetByteCount($text) -gt 31457280){throw 'Backup excede 30 MB.'}
            $data=$text|ConvertFrom-Json;if($data.format -ne 'cnc-workspace' -or $data.tools -isnot [Array] -or $data.drawings -isnot [Array]){throw 'Dados invalidos.'}
            $disk=if([IO.File]::Exists($file)){[IO.File]::ReadAllText($file)}else{$null}
            if($disk -cne $script:expected){throw 'Outro aplicativo alterou os dados. Exporte esta sessao e reabra para evitar sobrescrever.'}
            [IO.File]::WriteAllText($file+'.tmp',$text,$utf8)
            if([IO.File]::Exists($file)){[IO.File]::Replace($file+'.tmp',$file,$file+'.previous')}else{[IO.File]::Move($file+'.tmp',$file)}
            $script:expected=$text;$body='true'
          }
          default {throw 'Rota desconhecida.'}
        }}
        $bytes=$utf8.GetBytes($body)
      }elseif($route -eq '/bridge.js'){
        if($req.QueryString['token'] -ne $token){throw 'Sessao invalida.'};$res.ContentType='text/javascript; charset=utf-8';$bytes=$utf8.GetBytes($bridge)
      }else{
        if($req.HttpMethod -ne 'GET'){throw 'Metodo invalido.'}
        if($route -eq '/'){$route='/index.html'}
        $target=[IO.Path]::GetFullPath((Join-Path $root ([Uri]::UnescapeDataString($route).TrimStart('/').Replace('/','\'))))
        if(!$target.StartsWith($root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or ![IO.File]::Exists($target)){$res.StatusCode=404;$bytes=$utf8.GetBytes('Arquivo nao encontrado.')}else{
          $ext=[IO.Path]::GetExtension($target).ToLower();$mimes=@{'.html'='text/html';'.js'='text/javascript';'.mjs'='text/javascript';'.css'='text/css';'.json'='application/json';'.svg'='image/svg+xml';'.png'='image/png';'.wasm'='application/wasm';'.bcmap'='application/octet-stream';'.ttf'='font/ttf';'.woff2'='font/woff2'}
          $res.ContentType=if($mimes[$ext]){$mimes[$ext]}else{'application/octet-stream'}
          if($ext -eq '.html' -and $target -eq (Join-Path $root 'index.html')){
            if($req.QueryString['token'] -ne $token){throw 'Abra pelo Iniciar-CNC-Leve.cmd.'}
            $html=[IO.File]::ReadAllText($target).Replace('<head>','<head><script src="/bridge.js?token='+$token+'"></script>');$bytes=$utf8.GetBytes($html)
          }else{if(!$cache.ContainsKey($target)){$cache[$target]=[IO.File]::ReadAllBytes($target)};$bytes=$cache[$target]}
        }
      }
      $res.ContentLength64=$bytes.Length;$res.OutputStream.Write($bytes,0,$bytes.Length)
    }catch{
      $requestError=$_.Exception.Message
      # A janela pode fechar durante uma resposta; essa desconexao nao encerra o servidor.
      try{$res.StatusCode=400;$bytes=$utf8.GetBytes($requestError);$res.ContentType='text/plain; charset=utf-8';$res.ContentLength64=$bytes.Length;$res.OutputStream.Write($bytes,0,$bytes.Length)}catch{}
    }finally{$res.Close()}
  }
}catch{
  if($UiTest){throw}
  Add-Type -AssemblyName System.Windows.Forms
  [Windows.Forms.MessageBox]::Show($_.Exception.Message,'CNC Torno')|Out-Null
}finally{if($listener){$listener.Close()};if($lock){if($sessionFile -and [IO.File]::Exists($sessionFile)){[IO.File]::Delete($sessionFile)};$lock.Dispose()}}
