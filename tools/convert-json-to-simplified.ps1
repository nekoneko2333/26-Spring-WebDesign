param(
    [string]$Path = "public/data/live-landmarks.json"
)

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class ChineseTextConverter
{
    private const uint LCMAP_SIMPLIFIED_CHINESE = 0x02000000;

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    private static extern int LCMapStringEx(
        string lpLocaleName,
        uint dwMapFlags,
        string lpSrcStr,
        int cchSrc,
        StringBuilder lpDestStr,
        int cchDest,
        IntPtr lpVersionInformation,
        IntPtr lpReserved,
        IntPtr sortHandle
    );

    public static string ToSimplified(string value)
    {
        if (String.IsNullOrEmpty(value)) return value;
        var output = new StringBuilder(value.Length * 2);
        var length = LCMapStringEx(
            "zh-CN",
            LCMAP_SIMPLIFIED_CHINESE,
            value,
            value.Length,
            output,
            output.Capacity,
            IntPtr.Zero,
            IntPtr.Zero,
            IntPtr.Zero
        );
        if (length <= 0) throw new InvalidOperationException("LCMapStringEx failed.");
        return output.ToString(0, length);
    }
}
"@

$resolved = (Resolve-Path -LiteralPath $Path).Path
$json = [System.IO.File]::ReadAllText($resolved, [System.Text.Encoding]::UTF8)
$converted = [ChineseTextConverter]::ToSimplified($json)
[System.IO.File]::WriteAllText($resolved, $converted, [System.Text.UTF8Encoding]::new($false))
Write-Output "Converted Chinese text to Simplified Chinese: $resolved"
