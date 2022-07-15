build: rm-build-files
	- mkdir out
	- cd service && pkg .
	cp service/out/web-print-service-win-x64.exe print-app/static
	cp service/out/web-print-service-macos-arm64 print-app/static
	- cd print-app && npm run make
	- powershell -command "cd print-app; npm run make"

get-files:
	cd print-app/static && wget https://github.com/winsw/winsw/releases/download/v2.11.0/WinSW-x64.exe && mv ./WinSW-x64.exe ./service-wrapper.exe
	- mkdir print-app/static/static
	cd print-app/static/static && wget http://www.columbia.edu/~em36/PDFtoPrinter.exe

install: clean-node-modules get-files
	- cd service && npm i
	- powershell -command "cd service; npm i"
	- cd print-app && npm i
	- powershell -command "cd print-app; npm i"

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
