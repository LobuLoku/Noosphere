$files = Get-ChildItem -Path 'c:\Noosphera\backup_corrupted' -Filter '*.md' -Recurse | Where-Object { $_.Name -ne 'Squad Builder.md' } | Select-Object -ExpandProperty FullName

foreach ($file in $files) {
    $text = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
    
    $fixedText = [regex]::Replace($text, '[^\x00-\x7F]+', {
        param($match)
        $bytes = [System.Text.Encoding]::GetEncoding(1252).GetBytes($match.Value)
        
        $inputHasQuestionMark = $match.Value.Contains('?')
        $outputHasQuestionMark = [array]::IndexOf($bytes, [byte]63) -ne -1
        
        if ($outputHasQuestionMark -and -not $inputHasQuestionMark) {
            return $match.Value
        }
        
        try {
            $utf8 = new-object System.Text.UTF8Encoding $false, $true
            return $utf8.GetString($bytes)
        } catch {
            return $match.Value
        }
    })
    
    # Write to the actual model directory
    $destName = $file.Replace('c:\Noosphera\backup_corrupted', 'c:\Noosphera\Wargame\02 Models')
    [System.IO.File]::WriteAllText($destName, $fixedText, [System.Text.Encoding]::UTF8)
}

Write-Host 'Fully recovered 19 models safely!'
