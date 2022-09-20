

serviceName=$(sed -n 1p file-paths.txt)
uninstallServiceName=$(sed -n 2p file-paths.txt)
servicePath=$(sed -n 3p file-paths.txt)
uninstallServicePath=$(sed -n 4p file-paths.txt)


ids=$(sed -n 1p printer-config.txt)
launchctl stop $serviceName
launchctl remove $serviceName

rm "$servicePath"

username=$(sed -n 1p user-profile.txt)
password=$(sed -n 2p user-profile.txt)
baseUrl=$(sed -n 3p user-profile.txt)
ids=$(sed -n 1p printer-config.txt)

echo "https://$username:$password@$baseUrl/print/printer/$ids"
curl -H "Cookie: test" -X DELETE "https://$username:$password@$baseUrl/print/printer/$ids"


rm user-profile.txt
rm printer-config.txt
rm file-paths.txt
rm user-profile.json
rm printer-config.json
rm "$uninstallServicePath"
launchctl remove $uninstallServiceName
launchctl stop $uninstallServiceName
