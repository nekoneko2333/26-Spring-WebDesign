param(
    [Parameter(Mandatory = $true)]
    [string]$Text
)

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class ChineseTextConverterSingle
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
        if (length <= 0) return value;
        return output.ToString(0, length);
    }
}
"@

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::Write([ChineseTextConverterSingle]::ToSimplified($Text))
