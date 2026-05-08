$text = [System.IO.File]::ReadAllText('c:\Noosphera\backup_corrupted\Squad Builder.md', [System.Text.Encoding]::UTF8)

# Find all blocks of non-ASCII characters
$fixedText = [regex]::Replace($text, '[^\x00-\x7F]+', {
    param($match)
    # Convert string back to bytes using 1252
    $bytes = [System.Text.Encoding]::GetEncoding(1252).GetBytes($match.Value)
    
    # Check if we lost data (1252 GetBytes returns 3F '?' for characters not in 1252)
    # The original corrupted text was read by 1252, so it ONLY contains characters valid in 1252.
    # If the current match contains characters NOT in 1252 (like newly injected emojis ⚡),
    # GetBytes will turn them into 0x3F.
    # So if there are ANY 0x3F in the output bytes that weren't '?' in the input string, we skip!
    $inputHasQuestionMark = $match.Value.Contains('?')
    $outputHasQuestionMark = [array]::IndexOf($bytes, [byte]63) -ne -1
    
    if ($outputHasQuestionMark -and -not $inputHasQuestionMark) {
        return $match.Value # It's a newly injected string, keep it as is
    }
    
    # Try to decode the bytes as UTF-8
    try {
        # Create a strict UTF8 decoder
        $utf8 = new-object System.Text.UTF8Encoding $false, $true
        $decoded = $utf8.GetString($bytes)
        return $decoded
    } catch {
        return $match.Value # Not valid UTF-8, keep as is
    }
})

[System.IO.File]::WriteAllText('c:\Noosphera\Wargame\Squad Builder.md', $fixedText, [System.Text.Encoding]::UTF8)
Write-Host 'Fully recovered Squad Builder safely!'
