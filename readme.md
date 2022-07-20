# Web Print Service

This is the repository for the Telekinetix Web Print Service. It consists of two interlinked projects:

- `print-app`, an Electron frontend for configuration and control of the service
- `service`, a NodeJS backend that listens for jobs, builds them, and sends them to print

## Installers

For both Windows and macOS, Electron provides simple installers in the form of `electron-forge`. Windows uses `@electron-forge/maker-squirrel`, while macOS uses `@electron-forge/maker-dmg`. This is configured (within the various `webpack.js` files) to package a compiled version of the `service` project within itself, as well as various other essential configuration files and executable binaries within the `print-app/static` folder.

### Automatic Build Process

A Makefile has been written to handle automated setup, installation, and building of the project. On macOS, `wget` must first be installed (for example, using Homebrew). On Windows, [Cygwin](https://www.cygwin.com/install.html) is an easy way to be able to run Makefiles, though `wget` will also need to be installed afterwards.

Once installed, `make install-mac` or `make install-win` can be ran in the root directory of the project. This installs all required npm packages and downloads additional external dependencies for the Windows release.

Upon completion, `make build-mac` or `make build-win` can be ran in the root directory of the project, to build the project. This will build `service` using `npm run build`, copy the resulting compiled binaries into the `print-app/static/` folder, and then build `print-app` using `npm run build`. Installers will be created within the `print-app/out/` folder.

### Manual Build Process

_NOTE: An up-to-date build process can always be found within the `Makefile` file in the root directory, as the commands `make install-mac` or `make install-win` followed by `make build-mac` or `make build-win` will install all required packages and then build the project from a fresh version of the repository._

Firstly, run `npm run build` within the `service/` folder. This will create compiled binaries for both Windows and macOS within the `service/out/` folder. Then, the relevant binary must be moved into the `print-app/static/` folder.

Windows requires some additional files to be present within the `print-app/static/` folder:

- [WinSW](https://github.com/winsw/winsw/releases/download/v2.11.0/WinSW-x64.exe) must be located at `print-app/static/service-wrapper.exe`
- [PDFtoPrinter.exe](http://www.columbia.edu/~em36/PDFtoPrinter.exe) must be located at `print-app/static/static/PDFtoPrinter.exe`

Once these files are in place (along with `service-config-template.plist` for macOS or `service-wrapper-template.xml` for Windows), `print-app` can be built. This is done by running `npm run build` within the `print-app/` folder. This will create installers within the `print-app/out/` folder.
