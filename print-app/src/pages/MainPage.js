import React, { useEffect, useState } from "react";
const { ipcRenderer, remote } = window.require("electron");
import { useQueryPostLogin, useQueryCheckLogin } from "../endpoints";
import { useMutation, useQueryClient } from "react-query";
import { PrinterPanel, NewPrinter, Login, ServicePanel } from "../containers";

function MainPage() {
  const [log, setLog] = useState({});
  const [status, setStatus] = useState({});

  const [newPrinterOpen, setNewPrinterOpen] = useState(false);

  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    ipcRenderer.on("getLogs", (event, arg) => {
      setLog(arg);
      console.log("getLogs:", arg);
    });
    ipcRenderer.on("status", (event, arg) => {
      setStatus(arg);
      console.log("Status:", arg);
    });

    ipcRenderer.send("status", "");
  }, []);

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
  }, []);

  return (
    <div>
      {log?.success ? log?.data : log?.error?.message}
      <br />
      {status?.success ? status?.data : "Fail"}
      <br />

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

      <PrinterPanel />

      <ServicePanel />
      <NewPrinter open={newPrinterOpen} setOpen={setNewPrinterOpen} />
      <Login open={loginOpen} setOpen={setLoginOpen} forced={false} />
    </div>
  );
}

export default MainPage;
