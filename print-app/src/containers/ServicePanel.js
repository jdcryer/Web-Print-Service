import React, { useState, useEffect } from "react";
const { ipcRenderer } = window.require("electron");
import { ServiceStatusDisplay, FullscreenModal } from "../ui-library/";
import { ComputerLogin } from ".";
import { Button } from "@material-ui/core";
import { useQueryClient } from "react-query";

function ServicePanel({ open, setOpen }) {
  const [handlerState, setHandlerState] = useState("Unknown");
  const [username, setUsername] = useState(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (success) {
      ipcRenderer.send("makeConfigFile", {
        username: username,
        password: password,
      });
    }
  }, [success, password, ipcRenderer]);

  useEffect(() => {
    let serviceListener = ipcRenderer.on(
      "serviceHandlerState",
      (event, arg) => {
        setHandlerState(arg);
      }
    );

    let usernameListener = ipcRenderer.on("username", (event, arg) => {
      setUsername(arg);
    });

    ipcRenderer.once("status", (event, arg) => {
      if (arg.isWin) {
        if (arg.data === "not_installed") {
          ipcRenderer.send("username");
        } else {
          ipcRenderer.send("startServiceHandlerUpdate");
        }
      } else {
        ipcRenderer.send("makeConfigFile");
      }
    });

    let makeListener = ipcRenderer.on("makeConfigFile", (event, arg) => {
      if (arg.success) {
        ipcRenderer.send("startServiceHandlerUpdate");
      } else {
        setSuccess(false);
        setError(arg.error);
      }
    });

    ipcRenderer.send("status");

    return () => {
      ipcRenderer.removeListener("serviceHandlerState", serviceListener);
      ipcRenderer.removeListener("makeConfigFile", makeListener);
      ipcRenderer.removeListener("username", usernameListener);
    };
  }, []);

  useEffect(() => {
    if (!setOpen || !handlerState) return;
    if (handlerState === "Running") {
      ipcRenderer.send("status", "");
      queryClient.invalidateQueries("checkLogin");

      setOpen(false);
    }
  }, [setOpen, handlerState]);
  return username !== null && !success ? (
    <ComputerLogin
      username={username}
      password={password}
      setPassword={setPassword}
      error={error}
      submit={setSuccess}
    ></ComputerLogin>
  ) : (
    <FullscreenModal open={open}>
      <ServiceStatusDisplay>{handlerState}</ServiceStatusDisplay>
    </FullscreenModal>
  );
}

export default ServicePanel;
