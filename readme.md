# ILPS
This is the i Level Print Service

## Installation
### Windows
To install the service, run the Install.bat file. This will install the software as a service that starts on your machine startup.

## Running the application
The application should have be running as a service on your computer, to check that it is got to:
1. Task manager
2. click the service tab
3. sort by Name
4. find the i-level-print-service and check its status is running

To access the application on your machine, go to [localhost:3000](localhost:3000) in your browser. This will bring up the application itself.

# Authorisation
When the service starts it will look for a file called user-profile.json in the /i-level-print-service/ folder. If it cannot find it
it will create a new file that will have:
```json
{
  username: "",
  password: ""
}
```
The program will wait until these two objects have values to start. Once you save your credentials to that file the server will start its main processes.

Your login information is only loaded once, so if you need to change it restart the application

# Interface
As stated earlier go to [localhost:3000](localhost:3000) to see the current configuration of printers. There is yet to be an interactive UI.

# Configuration
To configure printers there is a file in /i-level-print-service/ folder called printer-configuration.json which is auto generated the first time. The current information stored about printers are:

```json
{
  id: "Generated by ilevel api", 
  name: "Name of printer on your network",
  enabled: "Whether this printer should be used or not",
  displayName: "An alias for the printer, only to be used in frontend",
  shareName: "Unsure of the use currently, seems to be important for sharing printers on a network",
  statusNumber: "Power of 2 from 0 - 6777216, represent the current state of the printer",
  online: "Whether the printer is online or not",
  acceptedTypes: "Array of types this printer accepts so zpl, pdf, etc."
}
```

