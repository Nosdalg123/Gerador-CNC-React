# Registry is separate from workspace backups. Only authenticated admin sessions can change it.
$script:allModules=@('gerador','desenho','pdf','cad','ferr','sim','cfg','dados')
function Initialize-Users([string]$directory) {
  $script:usersFile=Join-Path $directory 'users.json'
  $script:usersExpected=if([IO.File]::Exists($script:usersFile)){[IO.File]::ReadAllText($script:usersFile)}else{$null}
  if($null -ne $script:usersExpected){
    $script:registry=$script:usersExpected|ConvertFrom-Json
    if($script:registry.version -ne 1 -or $script:registry.users -isnot [Array] -or !($script:registry.users|Where-Object username -eq 'admin')){throw 'Cadastro de usuarios invalido; os dados existentes foram preservados.'}
  }else{
    $script:registry=[pscustomobject]@{version=1;users=@(
      [pscustomobject]@{username='admin';hash='cd277c6bbef2c4f0094273a47b6f5109a25786c48978050ec42399603a67ec93';scheme='legacy';salt='';views=$script:allModules;limitSeconds=$null;usedSeconds=0.0},
      [pscustomobject]@{username='simu';hash='b0666239cc2df84b48f66edb2c736a0b5ad9fcc10b6a7f465cd37f18147c6792';scheme='legacy';salt='';views=@('sim','ferr','dados');limitSeconds=$null;usedSeconds=0.0},
      [pscustomobject]@{username='desenho';hash='728ea43ffbe016e94cea7770d2f2067c1321f5ea9c9bf5cb2e240b08bebf6956';scheme='legacy';salt='';views=@('desenho','pdf','cad','dados');limitSeconds=$null;usedSeconds=0.0}
    )}
    Write-Users
  }
  $script:userSessions=@{};$script:userTicks=@{}
}
function Write-Users {
  $disk=if([IO.File]::Exists($script:usersFile)){[IO.File]::ReadAllText($script:usersFile)}else{$null}
  if($disk -cne $script:usersExpected){throw 'Outro aplicativo alterou os usuarios. Reabra para preservar o cadastro.'}
  $text=ConvertTo-Json -InputObject $script:registry -Depth 12 -Compress
  [IO.File]::WriteAllText($script:usersFile+'.tmp',$text,$utf8)
  if([IO.File]::Exists($script:usersFile)){[IO.File]::Replace($script:usersFile+'.tmp',$script:usersFile,$script:usersFile+'.previous')}else{[IO.File]::Move($script:usersFile+'.tmp',$script:usersFile)}
  $script:usersExpected=$text
}
function Public-User($account){return @{username=$account.username;views=@($account.views);limitSeconds=$account.limitSeconds;usedSeconds=[double]$account.usedSeconds}}
function User-List {return ConvertTo-Json -InputObject @($script:registry.users|ForEach-Object {Public-User $_}) -Depth 8 -Compress}
function User-Expired($account){return $null -ne $account.limitSeconds -and [double]$account.usedSeconds -ge [double]$account.limitSeconds}
function Tick-User([string]$username,[DateTime]$now){
  $live=@($script:userSessions.Values|Where-Object { $_.username -eq $username -and ($now-$_.lastSeen).TotalSeconds -le 90 }).Count -gt 0
  $account=$script:registry.users|Where-Object username -eq $username
  if($live -and $script:userTicks.ContainsKey($username)){
    $elapsed=[Math]::Max(0,[Math]::Min(90,($now-$script:userTicks[$username]).TotalSeconds))
    $account.usedSeconds=[double]$account.usedSeconds+$elapsed
    if($null -ne $account.limitSeconds){$account.usedSeconds=[Math]::Min([double]$account.usedSeconds,[double]$account.limitSeconds)}
  }
  $script:userTicks[$username]=$now
}
function Password-Hash([string]$password,$account){
  if($account.scheme -eq 'legacy'){
    $algorithm=[Security.Cryptography.SHA256]::Create()
    try{return ([BitConverter]::ToString($algorithm.ComputeHash($utf8.GetBytes('alumasa-cnc:'+$password)))).Replace('-','').ToLowerInvariant()}finally{$algorithm.Dispose()}
  }
  if($account.scheme -ne 'pbkdf2' -or $account.salt -notmatch '^[a-f0-9]{32}$'){throw 'Credencial invalida.'}
  [byte[]]$salt=for($i=0;$i -lt 32;$i+=2){[Convert]::ToByte($account.salt.Substring($i,2),16)}
  $algorithm=[Security.Cryptography.Rfc2898DeriveBytes]::new($password,$salt,210000,[Security.Cryptography.HashAlgorithmName]::SHA256)
  try{return ([BitConverter]::ToString($algorithm.GetBytes(32))).Replace('-','').ToLowerInvariant()}finally{$algorithm.Dispose()}
}
function Invoke-UserAccess([string]$action,$request){
  if($request.HttpMethod -ne 'POST' -or $request.ContentLength64 -gt 32768){throw 'Operacao de usuarios invalida.'}
  $reader=New-Object IO.StreamReader($request.InputStream,$utf8);$text=$reader.ReadToEnd();$reader.Dispose()
  if($utf8.GetByteCount($text) -gt 32768){throw 'Cadastro excede o limite de tamanho.'}
  $userInput=$text|ConvertFrom-Json;$now=[DateTime]::UtcNow
  if($action -eq 'login'){
    $username=([string]$userInput.username).Trim().ToLowerInvariant();$account=$script:registry.users|Where-Object username -eq $username
    if(!$account -or (Password-Hash ([string]$userInput.password) $account) -cne $account.hash){throw 'Usuario ou senha incorretos.'}
    Tick-User $username $now;Write-Users
    if(User-Expired $account){throw 'Tempo de uso esgotado. Solicite um ajuste ao administrador.'}
    $session=[Guid]::NewGuid().ToString('N')+[Guid]::NewGuid().ToString('N')
    $script:userSessions[$session]=@{username=$username;lastSeen=$now}
    return ConvertTo-Json -InputObject @{session=$session;user=(Public-User $account)} -Depth 8 -Compress
  }
  $session=[string]$request.Headers['X-CNC-Session'];$active=$script:userSessions[$session]
  if(!$active){throw 'Sessao encerrada. Entre novamente.'}
  $account=$script:registry.users|Where-Object username -eq $active.username
  if(!$account){throw 'Usuario nao encontrado.'}
  Tick-User $active.username $now;$active.lastSeen=$now
  if($action -eq 'logout' -or $action -eq 'pause'){
    if($action -eq 'logout'){$script:userSessions.Remove($session)}else{$active.lastSeen=[DateTime]::MinValue}
    Write-Users;return 'true'
  }
  if(User-Expired $account){$script:userSessions.Remove($session);Write-Users;throw 'Tempo de uso esgotado. Solicite um ajuste ao administrador.'}
  if($action -eq 'pulse'){Write-Users;return ConvertTo-Json -InputObject @{user=(Public-User $account)} -Depth 8 -Compress}
  if($account.username -ne 'admin'){throw 'Somente o administrador pode gerenciar usuarios.'}
  if($action -eq 'users'){Write-Users;return User-List}
  if($action -ne 'save'){throw 'Operacao de usuarios desconhecida.'}
  $username=([string]$userInput.username).Trim().ToLowerInvariant()
  if($username -notmatch '^[a-z0-9._-]{1,40}$'){throw 'Use ate 40 letras sem acento, numeros, ponto, hifen ou sublinhado no usuario.'}
  $existing=$script:registry.users|Where-Object username -eq $username
  if($userInput.create -and $existing){throw 'Este usuario ja esta cadastrado.'}
  if(!$userInput.create -and !$existing){throw 'Usuario nao encontrado.'}
  $password=[string]$userInput.password
  if((!$existing -or $password.Length -gt 0) -and ($password.Length -lt 4 -or $password.Length -gt 256)){throw 'A senha deve ter de 4 a 256 caracteres.'}
  $views=@($script:allModules|Where-Object { $userInput.views -contains $_ })
  if($username -ne 'admin' -and !$views.Count){throw 'Selecione pelo menos um modulo.'}
  $limit=$null
  if($null -ne $userInput.limitSeconds){$limit=[double]$userInput.limitSeconds;if([double]::IsNaN($limit) -or [double]::IsInfinity($limit) -or $limit -le 0 -or $limit -gt 315360000){throw 'Informe um limite maior que zero, de ate 5.256.000 minutos.'}}
  if($username -eq 'admin'){$views=$script:allModules;$limit=$null}
  $next=[pscustomobject]@{username=$username;views=$views;limitSeconds=$limit;usedSeconds=0.0;hash='';scheme='pbkdf2';salt=''}
  if($existing){$next.usedSeconds=$existing.usedSeconds;$next.hash=$existing.hash;$next.scheme=$existing.scheme;$next.salt=$existing.salt}
  if($password.Length -gt 0){$random=[Security.Cryptography.RandomNumberGenerator]::Create();[byte[]]$salt=New-Object byte[] 16;try{$random.GetBytes($salt)}finally{$random.Dispose()};$next.salt=([BitConverter]::ToString($salt)).Replace('-','').ToLowerInvariant();$next.scheme='pbkdf2';$next.hash=Password-Hash $password $next}
  if($userInput.resetUsage){$next.usedSeconds=0.0;$script:userTicks[$username]=$now}
  if($existing){$script:registry.users=@($script:registry.users|ForEach-Object {if($_.username -eq $username){$next}else{$_}})}else{$script:registry.users=@($script:registry.users)+@($next)}
  Write-Users;return User-List
}
