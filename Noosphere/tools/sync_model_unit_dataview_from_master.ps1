<#
.SYNOPSIS
  Sincroniza os dois blocos DataviewJS contíguos (HUD V13 + carrossel «#### Mais») a partir de uma nota master para todas as fichas Model sob Wargame/02 Models.

.DESCRIPTION
  Edita apenas [Casacos/Casaca Escuro.md] (ou outra master que definires), corre este script, e todas as notas que contenham «V13.0 - RELATIONAL» recebem o mesmo par de blocos — mantém um único sítio para patches de export/HTML.

  Webpage HTML Export — ESCOPO (opcional, só configuração do plugin):
  Para builds mais rápidos podes excluir temporariamente pastas sob «Wargame/02 Models» no conjunto exportado e incluir só o Squad Builder / facções, desde que o site público não precise de todas as fichas individuais. As optimisations em código (classe body «html-export-running», paths em vez de Base64 durante o export) já reduzem custo quando incluídes models.

.PARAMETER Master
  Caminho absoluto ao .md master (por defeito: Casaca Escuro).

.PARAMETER ModelsRoot
  Pasta raiz «02 Models».

.EXAMPLE
  .\tools\sync_model_unit_dataview_from_master.ps1
#>
param(
    [string]$Master = "",
    [string]$ModelsRoot = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $Master) {
    $Master = Join-Path $repoRoot "Wargame\02 Models\Casacos\Casaca Escuro.md"
}
if (-not $ModelsRoot) {
    $ModelsRoot = Join-Path $repoRoot "Wargame\02 Models"
}

$enc = New-Object System.Text.UTF8Encoding($false)
if (-not (Test-Path -LiteralPath $Master)) {
    throw "Master não encontrada: $Master"
}

$masterRaw = [System.IO.File]::ReadAllText($Master, $enc)
$pattern = '(?s)```dataviewjs.*?```\r?\n\r?\n---\r?\n\r?\n#### Mais:\r?\n\r?\n```dataviewjs.*?```\r?\n'
$rx = New-Object System.Text.RegularExpressions.Regex($pattern, [System.Text.RegularExpressions.RegexOptions]::Compiled)
$mMaster = $rx.Match($masterRaw)
if (-not $mMaster.Success) {
    throw "Regex não encontrou o par de blocos dataviewjs no master (```dataviewjs ... ``` --- #### Mais: ```dataviewjs ... ```)."
}
$replacement = $mMaster.Value

$nOk = 0
$nSkip = 0
$nFail = 0

Get-ChildItem -LiteralPath $ModelsRoot -Recurse -Filter "*.md" | ForEach-Object {
    $fp = $_.FullName
    if ($fp -eq $Master) {
        $nSkip++
        return
    }
    $raw = [System.IO.File]::ReadAllText($fp, $enc)
    if ($raw -notmatch 'V13\.0 - RELATIONAL') {
        return
    }
    $m = $rx.Match($raw)
    if (-not $m.Success) {
        Write-Warning "Sem match do par de blocos: $fp"
        $nFail++
        return
    }
    $newRaw = $rx.Replace($raw, $replacement)
    [System.IO.File]::WriteAllText($fp, $newRaw, $enc)
    $nOk++
}

Write-Host "Atualizadas: $nOk | Ignoradas (master): $nSkip | Falhas: $nFail"
