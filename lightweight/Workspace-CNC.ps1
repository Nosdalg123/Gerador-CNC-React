# A sessao de usuario e a revisao do cliente sao independentes do token da aplicacao.
function Deny-Workspace([int]$status,[string]$message){$script:requestStatus=$status;throw $message}
function Get-WorkspaceUser($request){
  $session=[string]$request.Headers['X-CNC-Session'];$active=$script:userSessions[$session]
  if(!$active){Deny-Workspace 401 'Entre no aplicativo para acessar os dados.'}
  $account=$script:registry.users|Where-Object username -eq $active.username
  if(!$account){Deny-Workspace 401 'Sessao encerrada. Entre novamente.'}
  $now=[DateTime]::UtcNow;Tick-User $active.username $now;$active.lastSeen=$now
  if(User-Expired $account){$script:userSessions.Remove($session);Write-Users;Deny-Workspace 403 'Tempo de uso esgotado. Solicite um ajuste ao administrador.'}
  return $account
}
function Get-WorkspaceTag($text){
  if($null -eq $text){return '"empty"'}
  $hash=[Security.Cryptography.SHA256]::Create()
  try{return '"'+([BitConverter]::ToString($hash.ComputeHash($utf8.GetBytes($text)))).Replace('-','').ToLowerInvariant()+'"'}finally{$hash.Dispose()}
}
function Test-WorkspaceEqual($left,$right){
  if($null -eq $left -or $null -eq $right){return ($null -eq $left -and $null -eq $right)}
  if($left -is [Array] -or $right -is [Array]){
    if($left -isnot [Array] -or $right -isnot [Array] -or $left.Count -ne $right.Count){return $false}
    for($i=0;$i -lt $left.Count;$i++){if(!(Test-WorkspaceEqual $left[$i] $right[$i])){return $false}};return $true
  }
  if($left -is [pscustomobject] -or $right -is [pscustomobject]){
    if($left -isnot [pscustomobject] -or $right -isnot [pscustomobject]){return $false}
    $keys=@($left.PSObject.Properties.Name);$other=@($right.PSObject.Properties.Name)
    if($keys.Count -ne $other.Count){return $false}
    foreach($key in $keys){if($other -cnotcontains $key -or !(Test-WorkspaceEqual $left.$key $right.$key)){return $false}};return $true
  }
  if($left -is [string] -or $right -is [string]){return ($left -is [string] -and $right -is [string] -and $left -ceq $right)}
  if($left -is [bool] -or $right -is [bool]){return ($left -is [bool] -and $right -is [bool] -and $left -eq $right)}
  return ([double]$left -eq [double]$right)
}
function Assert-WorkspaceFields($account,$previous,$next){
  # Dados e backup permite a importacao integral. Credenciais ficam em outro arquivo.
  if($account.username -eq 'admin' -or $account.views -contains 'dados'){return}
  if($null -eq $previous){Deny-Workspace 403 'O administrador precisa inicializar os dados desta distribuicao.'}
  $rules=@{tools=@('ferr');drawings=@('desenho','pdf','cad');work=@('desenho','pdf','cad');cadDrafts=@('cad');program=@('sim')}
  $keys=@(@($previous.PSObject.Properties.Name)+@($next.PSObject.Properties.Name)|Select-Object -Unique)
  foreach($key in $keys){
    if(Test-WorkspaceEqual $previous.$key $next.$key){continue}
    if($key -eq 'theme'){continue}
    if($key -eq 'form'){
      $fields=@(@($previous.form.PSObject.Properties.Name)+@($next.form.PSObject.Properties.Name)|Select-Object -Unique)
      foreach($field in $fields){
        if(Test-WorkspaceEqual $previous.form.$field $next.form.$field){continue}
        if($field -eq 'maq' -and $account.views -notcontains 'cfg'){
          # A identificacao Fanuc/Siemens e acessivel no seletor global; cursos nao sao.
          $machineKeys=@(@($previous.form.maq.PSObject.Properties.Name)+@($next.form.maq.PSObject.Properties.Name)|Select-Object -Unique)
          foreach($machineKey in $machineKeys){if($machineKey -ne 'comando' -and !(Test-WorkspaceEqual $previous.form.maq.$machineKey $next.form.maq.$machineKey)){Deny-Workspace 403 'Seu usuario nao pode alterar a configuracao da maquina.'}}
          if($next.form.maq.comando -notin @('fanuc','siemens')){Deny-Workspace 403 'Comando da maquina invalido.'};continue
        }
        $allowed=if($field -in @('maq','pressao','autor','dataManual','nome','nomeManual')){@('cfg')}elseif($field -in @('tipo','desenhoSel','lado','cadPrimeiro','cadUsinagem')){@('gerador','desenho','pdf','cad')}else{@('gerador')}
        if(!@($allowed|Where-Object {$account.views -contains $_}).Count){Deny-Workspace 403 ('Seu usuario nao pode alterar o campo '+$field+'.')}
      };continue
    }
    if(!$rules.ContainsKey($key) -or !@($rules[$key]|Where-Object {$account.views -contains $_}).Count){Deny-Workspace 403 ('Seu usuario nao pode alterar '+$key+'.')}
  }
}
