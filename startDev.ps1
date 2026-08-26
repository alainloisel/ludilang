<#
.SYNOPSIS
    Lance l'environnement de dev AloLangues : start.bat a gauche, Claude Code a droite.

.DESCRIPTION
    Ouvre deux fenetres console cote a cote sur l'ecran principal :
      - gauche  : start.bat (serveur local + navigateur)
      - droite  : claude (Claude Code, ouvert sur ce repertoire)

    Les deux fenetres sont lancees via conhost.exe pour garantir une fenetre
    console classique positionnable (Windows Terminal ne l'est pas de facon fiable).

.PARAMETER Ratio
    Largeur de la fenetre de gauche, en fraction de l'ecran (defaut 0.5 = 50%).

.PARAMETER Swap
    Inverse les deux fenetres : Claude Code a gauche, start.bat a droite.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\startDev.ps1
    powershell -ExecutionPolicy Bypass -File .\startDev.ps1 -Ratio 0.6 -Swap
#>

[CmdletBinding()]
param(
    [ValidateRange(0.2, 0.8)]
    [double] $Ratio = 0.5,

    [switch] $Swap
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# --- API Win32 : positionnement des fenetres + prise en compte du DPI ---------
Add-Type -Namespace Win -Name Api -MemberDefinition @'
    [DllImport("user32.dll")]
    public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool SetProcessDPIAware();
'@

Add-Type -AssemblyName System.Windows.Forms

# Sans cela, l'ecran est rapporte en pixels logiques alors que MoveWindow
# travaille en pixels physiques : les fenetres seraient mal dimensionnees.
[void][Win.Api]::SetProcessDPIAware()

$area = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea

$leftWidth  = [int]($area.Width * $Ratio)
$rightWidth = $area.Width - $leftWidth

$slotLeft = @{
    X = $area.X
    Y = $area.Y
    W = $leftWidth
    H = $area.Height
}
$slotRight = @{
    X = $area.X + $leftWidth
    Y = $area.Y
    W = $rightWidth
    H = $area.Height
}

# --- Helpers -----------------------------------------------------------------
function Start-ConsoleWindow {
    param(
        [Parameter(Mandatory)] [string] $Title,
        [Parameter(Mandatory)] [string] $Command,
        [Parameter(Mandatory)] [string] $WorkingDirectory
    )

    # conhost.exe force une fenetre console classique, positionnable via MoveWindow.
    # /k garde la fenetre ouverte si la commande se termine (message d'erreur lisible).
    Start-Process -FilePath 'conhost.exe' `
                  -ArgumentList @('cmd.exe', '/k', "title $Title & $Command") `
                  -WorkingDirectory $WorkingDirectory `
                  -PassThru
}

function Get-ProcessTreeId {
    # Retourne le pid donne et ceux de tous ses descendants.
    param([Parameter(Mandatory)] [int] $RootId)

    $ids  = @($RootId)
    $todo = @($RootId)

    while ($todo.Count -gt 0) {
        $current = $todo[0]
        $todo    = @($todo | Select-Object -Skip 1)

        $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$current" -ErrorAction SilentlyContinue
        foreach ($child in $children) {
            if ($ids -notcontains $child.ProcessId) {
                $ids  += $child.ProcessId
                $todo += $child.ProcessId
            }
        }
    }
    return $ids
}

function Wait-MainWindow {
    # La fenetre console appartient au cmd.exe lance par conhost.exe, pas a
    # conhost lui-meme : on cherche donc dans tout l'arbre de processus.
    param(
        [Parameter(Mandatory)] [System.Diagnostics.Process] $Process,
        [int] $TimeoutSeconds = 20
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        foreach ($id in Get-ProcessTreeId -RootId $Process.Id) {
            $proc = Get-Process -Id $id -ErrorAction SilentlyContinue
            if ($proc -and $proc.MainWindowHandle -ne [IntPtr]::Zero) {
                return $proc.MainWindowHandle
            }
        }
        Start-Sleep -Milliseconds 250
    }
    return [IntPtr]::Zero
}

function Set-WindowSlot {
    param(
        [Parameter(Mandatory)] [IntPtr]    $Handle,
        [Parameter(Mandatory)] [hashtable] $Slot,
        [Parameter(Mandatory)] [string]    $Label
    )

    if ($Handle -eq [IntPtr]::Zero) {
        Write-Warning "$Label : fenetre introuvable, positionnement ignore."
        return
    }

    [void][Win.Api]::ShowWindow($Handle, 9)   # SW_RESTORE (annule un eventuel maximise)
    [void][Win.Api]::MoveWindow($Handle, $Slot.X, $Slot.Y, $Slot.W, $Slot.H, $true)
}

# --- Verifications -----------------------------------------------------------
$batPath = Join-Path $root 'start.bat'
if (-not (Test-Path -LiteralPath $batPath)) {
    throw "start.bat est introuvable dans $root"
}

$claudeCmd = Get-Command claude -ErrorAction SilentlyContinue
if ($null -eq $claudeCmd) {
    Write-Warning "La commande 'claude' n'est pas dans le PATH : la fenetre de droite affichera une erreur."
}

# --- Lancement ---------------------------------------------------------------
Write-Host "Repertoire  : $root"
Write-Host ("Ecran       : {0}x{1} -> {2}px / {3}px" -f $area.Width, $area.Height, $leftWidth, $rightWidth)

$serverProc = Start-ConsoleWindow -Title 'AloLangues-Serveur' `
                                  -Command "`"$batPath`"" `
                                  -WorkingDirectory $root

# Le 'cd /d' est explicite : Claude Code doit demarrer sur le repertoire du projet.
$claudeProc = Start-ConsoleWindow -Title 'Claude-Code' `
                                  -Command "cd /d `"$root`" & claude" `
                                  -WorkingDirectory $root

$serverHandle = Wait-MainWindow -Process $serverProc
$claudeHandle = Wait-MainWindow -Process $claudeProc

if ($Swap) {
    Set-WindowSlot -Handle $claudeHandle -Slot $slotLeft  -Label 'Claude Code'
    Set-WindowSlot -Handle $serverHandle -Slot $slotRight -Label 'start.bat'
} else {
    Set-WindowSlot -Handle $serverHandle -Slot $slotLeft  -Label 'start.bat'
    Set-WindowSlot -Handle $claudeHandle -Slot $slotRight -Label 'Claude Code'
}

# Le focus va a Claude Code : c'est la qu'on tape.
if ($claudeHandle -ne [IntPtr]::Zero) {
    [void][Win.Api]::SetForegroundWindow($claudeHandle)
}

Write-Host 'Fenetres lancees. Fermer une fenetre arrete le processus correspondant.'
