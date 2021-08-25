import React from "react";
const { ipcRenderer, remote } = window.require("electron");

function MainPage() {
  ipcRenderer.on("install", (event, arg) => {
    console.log("Installed I guess??", arg);
  });
  return (
    <div>
      <button
        onClick={() => {
          dialog.showErrorBox("Error Box", "Fatal Error");
        }}
      >
        Show Error Box
      </button>

      <button
        onClick={() => {
          ipcRenderer.send("install", "");
        }}
      >
        Install Service
      </button>

      <button
        onClick={() => {
          ipcRenderer.send("getLogs", "wrapper");
          ipcRenderer.on("getLogs", (event, arg) => {
            console.log(arg);
          })
        }}
      >
        getLogs
      </button>
    </div>
  );
}

export default MainPage;
