#include <GUIConstantsEx.au3>
#include <StringConstants.au3>
#include <Array.au3>

Func ReadConfig()
   Local $clients[1][3] = [[0, 0, 0]]
   Local $row
   $lines = StringSplit(FileRead(@ScriptDir & "/teamviewer.tsv"), @CRLF, $STR_ENTIRESPLIT)
   For $i = 2 To $lines[0]
	  $parts = StringSplit($lines[$i], Chr(9))
	  $tv_name = $parts[1]
	  $tv_id = $parts[2]
	  $tv_pwd = $parts[3]
	  $row = $tv_name & "|" & $tv_id & "|" & $tv_pwd
	  $clients[0][0] = $clients[0][0] + 1
	  _ArrayAdd($clients, $row)
   Next
   Return $clients
EndFunc

Local $ButtonWidth = 90
Local $ButtonHeight = 45
Local $ButtonPadding = 8
Local $WindowPadding = 16
Local $Columns = 7

Local $clients = ReadConfig()

Local $Rows = Ceiling($clients[0][0] / $Columns)

GUICreate("Teamviewer Atelier", ($ButtonWidth + 2 * $ButtonPadding) * $Columns + 2 * $WindowPadding, ($ButtonHeight + 2 * $ButtonPadding) * $Rows + 2 * $WindowPadding)
Local $Buttons[1] = [0]
For $i = 1 To $clients[0][0]
   Local $col = Mod($i - 1, $Columns)
   Local $row = Int(($i - $col) / $Columns)
   $Btn = GUICtrlCreateButton($clients[$i][0], $WindowPadding + ($ButtonWidth + 2 * $ButtonPadding) * $col + $ButtonPadding, $WindowPadding + ($ButtonHeight + 2 * $ButtonPadding) * $row + $ButtonPadding, $ButtonWidth, $ButtonHeight)
   _ArrayAdd($Buttons, $Btn)
   $Buttons[0] = $Buttons[0] + 1
Next

GUISetState(@SW_SHOW)


Func StartSession($i)
   Local $tv_name = $clients[$i][0]
   Local $tv_id = $clients[$i][1]
   Local $tv_pwd = $clients[$i][2]
   ConsoleWrite("Starting session for " & $tv_name & @CRLF)
   ConsoleWrite("ID: " & $tv_id & "    PWD: " & $tv_pwd & @CRLF)
   Local $command = @ComSpec & " /k " & 'teamviewer.bat ' & $tv_id & ' ' & $tv_pwd
   ConsoleWrite($command & @CRLF)
   Run($command, "", @SW_ENABLE)
EndFunc


While 1
  $msg = GUIGetMsg()
  Select
   Case $msg = $GUI_EVENT_CLOSE
     ExitLoop
  EndSelect
  For $i = 1 To $Buttons[0]
   If $msg = $Buttons[$i] Then
	  StartSession($i)
	  EndIf
  Next
WEnd