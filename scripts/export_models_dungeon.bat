@echo off
setlocal enabledelayedexpansion
chcp 65001

:: --- CONFIGURATION ---
set "CLI_PATH=C:\Users\31126\Desktop\AssetStudio\AssetStudioCLI\bin\Release\net9.0\AssetStudioModCLI.exe"
set "SRC_DIR=D:\madodora\GameResDownloader2\GameResDownloader2\Madoka Magica Magia Exedra_GL\AssetBundles\dungeon\character"
set "BASE_OUT_DIR=D:\madodora\character_models\dungeon"

:: Loop through every folder in the source directory
for %%F in ("%SRC_DIR%\*.*") do (
    set "FILE_NAME=%%~nxF"
    set "CURRENT_OUT_DIR=%BASE_OUT_DIR%"

    echo --------------------------------------------------------
    echo Processing: !FILE_NAME!
    echo --------------------------------------------------------

    "%CLI_PATH%" "%%F" --unity-version 2022.3.21f1 --mode animator --fbx-animation all --fbx-uvs-as-diffuse -o "!CURRENT_OUT_DIR!"
)

echo --------------------------------------------------------
echo DONE: All characters processed.
pause
