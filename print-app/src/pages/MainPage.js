import React, { useEffect, useState } from "react";
const { ipcRenderer, remote } = window.require("electron");
import { useQueryPostLogin, useQueryCheckLogin } from "../endpoints";
import { useMutation, useQueryClient } from "react-query";
import {
  PrinterPanel,
  NewPrinter,
  Login,
  ServicePanel,
  StatusPanel,
} from "../containers";
import { Button } from "@material-ui/core";

function MainPage() {
  const [log, setLog] = useState({});
  const [status, setStatus] = useState({});

  const [newPrinterOpen, setNewPrinterOpen] = useState(false);

  const [loginOpen, setLoginOpen] = useState(false);
  const [loginForced, setLoginForced] = useState(false);

  const [serviceOpen, setServiceOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const { data: loginData } = useQueryCheckLogin();

  useEffect(() => {
    if (!loginData?.success) {
      if (status?.data !== "running") {
        setServiceOpen(true);
      } else {
        setServiceOpen(false);
        setLoginForced(true);
        setLoginOpen(true);
      }
    } else {
      setLoginForced(false);
      setServiceOpen(false);
    }
  }, [loginData, status, setServiceOpen, setLoginForced, setLoginOpen]);

  useEffect(() => {
    if (loginForced === false) setLoginOpen(false);
  }, [loginForced, setLoginOpen]);

  useEffect(() => {
    ipcRenderer.on("getLogs", (event, arg) => {
      setLog(arg);
    });

    let statusListener = ipcRenderer.on("status", (event, arg) => {
      setStatus(arg);
    });

    //let intId = setInterval(() => ipcRenderer.send("status", ""), 3000);

    return () => {
      ipcRenderer.removeListener("status", statusListener);
      //clearInterval(intId);
    };
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
    <div style={{ display: "flex", flexDirection: "column" }}>
      <PrinterPanel />
      <Button variant="outlined" onClick={() => setLoginOpen(true)}>
        Edit login details
      </Button>
      <br />
      <Button variant="outlined" onClick={() => setStatusOpen(true)}>
        Check Service Status
      </Button>
      <br />

      <Button variant="outlined" onClick={() => setNewPrinterOpen(true)}>
        Add New Printer
      </Button>

      <Login open={loginOpen} setOpen={setLoginOpen} forced={loginForced} />
      <ServicePanel open={serviceOpen} setOpen={setServiceOpen} />
      <StatusPanel
        open={statusOpen}
        setOpen={setStatusOpen}
        serviceStatus={status?.data}
        loginStatus={loginData?.success}
      />
      <NewPrinter open={newPrinterOpen} setOpen={setNewPrinterOpen} />
      {/*
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
      </button>*/}
    </div>
  );
}

export default MainPage;
