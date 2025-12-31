@echo off
setlocal enabledelayedexpansion
chcp 65001

:: --- CONFIGURATION ---
set "CLI_PATH=C:\Users\31126\Desktop\AssetStudio\AssetStudioCLI\bin\Release\net9.0\AssetStudioModCLI.exe"
set "SRC_DIR=D:\madodora\下载解密一条龙脚本\magia_exedra_decrypted\battle\character"
set "BASE_OUT_DIR=D:\madodora\character_models\latest_animate"

:: Loop through every folder in the source directory
for %%F in ("%SRC_DIR%\*.*") do (
    set "FILE_NAME=%%~nxF"
    set "CURRENT_OUT_DIR=%BASE_OUT_DIR%\!FILE_NAME!"

    echo --------------------------------------------------------
    echo Processing: !FILE_NAME!
    echo --------------------------------------------------------

    "%CLI_PATH%" "%%F" --unity-version 2022.3.21f1 --mode animator --fbx-animation all --fbx-uvs-as-diffuse -o "!CURRENT_OUT_DIR!"

    if exist "!CURRENT_OUT_DIR!\FBX_Animator\VisualRoot\" (
        echo Moving files and cleaning up...
        move "!CURRENT_OUT_DIR!\FBX_Animator\VisualRoot\*.*" "!CURRENT_OUT_DIR!\"
        rd /s /q "!CURRENT_OUT_DIR!\FBX_Animator"
    ) else (
        echo [WARNING] FBX_Animator\VisualRoot not found for !FILE_NAME!.
    )
)

echo --------------------------------------------------------
echo DONE: All characters processed.
pause
