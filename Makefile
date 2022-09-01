build: rm-build-files
	- powershell -command "cd service; npm run build"
	- cd service && npm run build
	cp service/out/web-print-service-win-x64.exe print-app/static
	cp service/out/web-print-service-macos-arm64 print-app/static
	- cd print-app && npm run build
	- powershell -command "cd print-app; npm run build"

build-mac: rm-build-files
	- cd service && npm run build
	cp service/out/web-print-service-macos-arm64 print-app/static
	- cd print-app && npm run build

build-win: rm-build-files
	- powershell -command "cd service; npm run build"
	cp service/out/web-print-service-win-x64.exe print-app/static
	- powershell -command "cd print-app; npm run build"

install: clean-node-modules get-files-win
	- cd service && npm i && npm i -g pkg
	- powershell -command "cd service; npm i; npm i -g pkg"
	- cd print-app && npm i
	- powershell -command "cd print-app; npm i"

install-mac: clean-node-modules
	- cd service && npm i && npm i -g pkg
	- cd print-app && npm i

install-win: clean-node-modules get-files-win
	- powershell -command "cd service; npm i; npm i -g pkg"
	- powershell -command "cd print-app; npm i"

get-files-win:
	cd print-app/static && wget https://github.com/winsw/winsw/releases/download/v2.11.0/WinSW-x64.exe && mv ./WinSW-x64.exe ./service-wrapper.exe
	- mkdir print-app/static/static
	cd print-app/static/static && wget http://www.columbia.edu/~em36/PDFtoPrinter.exe

clean-node-modules: clean-node-modules-service clean-node-modules-app

clean-node-modules-service:
	- yes | rm service/node_modules/* -r
	- yes | rm service/package-lock.json

clean-node-modules-app:
	- yes | rm print-app/node_modules/* -r
	- yes | rm print-app/package-lock.json
	

rm-build-files: rm-build-files-app rm-build-files-service

rm-build-files-app:
	- rm print-app/out -r
	- rm print-app/.webpack -r
	- rm print-app/static/web-print-service-win-x64.exe
	- rm print-app/static/web-print-service-macos-arm64

rm-build-files-service:
	- rm service/out/web-print-service-win-x64.exe
	- rm service/out/web-print-service-macos-arm64
