@REM ----------------------------------------------------------------------------
@REM Maven Start Up Batch script
@REM ----------------------------------------------------------------------------

@if "%DEBUG%" == "" @echo off
@classpstr "%~dp0"

@setlocal

set ERROR_CODE=0

@REM To isolate internal variables from possible post scripts, we use another setlocal
@setlocal

set MAVEN_PROJECTBASEDIR=%~dp0
if "%MAVEN_PROJECTBASEDIR%" == "" set MAVEN_PROJECTBASEDIR=%CD%

@REM Find maven.config file
set MAVEN_CONFIG_FILE=%MAVEN_PROJECTBASEDIR%\.mvn\maven.config
if exist "%MAVEN_CONFIG_FILE%" (
  set /p MAVEN_CONFIG= < "%MAVEN_CONFIG_FILE%"
)

@REM Find maven-wrapper.jar
set MAVEN_WRAPPER_JAR=%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar

if not exist "%MAVEN_WRAPPER_JAR%" (
  echo Downloading Maven Wrapper...
  powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar', '%MAVEN_WRAPPER_JAR%')"
)

@REM Execute Maven
"%JAVA_HOME%\bin\java.exe" -jar "%MAVEN_WRAPPER_JAR%" %*
if ERRORLEVEL 1 set ERROR_CODE=%ERROR_LEVEL%

@endlocal & set ERROR_CODE=%ERROR_CODE%

cmd /C exit /B %ERROR_CODE%
