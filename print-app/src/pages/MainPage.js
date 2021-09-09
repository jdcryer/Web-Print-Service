import React, { useEffect } from "react";
const { ipcRenderer, remote } = window.require("electron");
import {
  useQueryGetPrinters,
  useQueryGetLogin,
  useQueryPostLogin,
} from "../endpoints";

function MainPage() {
  const { data: testData } = useQueryGetLogin();
  console.log(testData);
  useEffect(() => {
    ipcRenderer.on("install", (event, arg) => {
      console.log("Install:", arg);
    });

    ipcRenderer.on("uninstall", (event, arg) => {
      console.log("Uninstall:", arg);
    });

    ipcRenderer.on("start", (event, arg) => {
      console.log("Start:", arg);
    });

    ipcRenderer.on("stop", (event, arg) => {
      console.log("Stop:", arg);
    });

    ipcRenderer.on("status", (event, arg) => {
      console.log("Status:", arg);
    });

    ipcRenderer.on("getLogs", (event, arg) => {
      console.log("getLogs:", arg);
    });
  }, []);

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
          ipcRenderer.send("uninstall", "");
        }}
      >
        Uninstall Service
      </button>

      <button
        onClick={() => {
          ipcRenderer.send("start", "");
        }}
      >
        Start Service
      </button>

      <button
        onClick={() => {
          ipcRenderer.send("stop", "");
        }}
      >
        Stop Service
      </button>

      <button
        onClick={() => {
          ipcRenderer.send("status", "");
        }}
      >
        Status of Service
      </button>

      <button
        onClick={() => {
          ipcRenderer.send("getLogs", "wrapper");
        }}
      >
        Get wrapper logs
      </button>

      <button
        onClick={() => {
          ipcRenderer.send("getLogs", "application");
        }}
      >
        Get application logs
      </button>

      <button
        onClick={() => {
          ipcRenderer.send("getLogs", "error");
        }}
      >
        Get error logs
      </button>
    </div>
  );
}

export default MainPage;
