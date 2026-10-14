Option Explicit
Dim shell, files, folder, shortcut, command, arg
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
folder = files.GetParentFolderName(WScript.ScriptFullName)
Set shortcut = shell.CreateShortcut(files.BuildPath(folder, "TORNO CNC.lnk"))
shortcut.TargetPath = files.BuildPath(shell.ExpandEnvironmentStrings("%SystemRoot%"), "System32\wscript.exe")
shortcut.Arguments = """" & WScript.ScriptFullName & """"
shortcut.WorkingDirectory = folder
shortcut.IconLocation = files.BuildPath(folder, "torno-cnc.ico") & ",0"
shortcut.Description = "TORNO CNC - Gerador e simulador local"
shortcut.Save
If WScript.Arguments.Named.Exists("atalho") Then WScript.Quit
command = """" & files.BuildPath(shell.ExpandEnvironmentStrings("%SystemRoot%"), "System32\WindowsPowerShell\v1.0\powershell.exe") & """ -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & files.BuildPath(folder, "Servidor-CNC.ps1") & """"
If WScript.Arguments.Named.Exists("teste") Then
  command = command & " -UiTest -NoBrowser -TestProfile """ & WScript.Arguments.Named.Item("teste") & """"
End If
If WScript.Arguments.Named.Exists("reiniciar") Then command = command & " -RestartExisting"
shell.Run command, 0, False
