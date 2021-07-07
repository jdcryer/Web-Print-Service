# ILPS
This is the i Level Print Service

## Build
Make sure you have "pkg" installed with the arguement "-g"
To build: 
1. go to root/i-level-print-service/
2. run npm install
3. run pkg .

## Structure
The structure of the system is:

In the i-level-print-service folder contains all the code for the program itself.

Inside this folder there is:

    assets - contains all none node code as well as any data to go along with the program (excluding printer-config.json)

    build - contains all the scripts that will be compiled

In the Windows folder there are:

    .bat files for installing, running and uninstalling the service.

## Service
### Windows
The service is installed by the winsw [application wrapper](https://github.com/winsw/winsw) in the Windows folder which takes in the i-level-print-service-win.exe in the main folder and installs it as a service that starts when the computer is switched on. The wrapper is configured in the .xml files that MUST in the same directory as the wrapper. There is a seperate wrapper for x64 and x86 which can be downloaded from the link above. The wrappers are not included in the repository as they are large files.




## Installer Creation
Only certain files need to be included in the release of the software, these include:

In the i-level-print-service folder:

    assets
    i-level-print-service-win/linux/macos (depending on the OS you are building for)
    printer-config.json

The entire Windows/Mac/Linux folder


### Windows
Currently i am using a tool called [inno](https://jrsoftware.org/isinfo.php) which allows you to select all the files that i want to include in the release and compile them into a single installer file. There is a 
wizard that comes with the tool that can help you magically make a compile script which is then run by the tool to build the program. Or you can write the script yourself if you are cool.

To my knowledge at the current time, the software uses absolute file paths to find your source files so the script is not portable between computers. The alternative to this is to just have one person build the releases or just make your own script if need be.

