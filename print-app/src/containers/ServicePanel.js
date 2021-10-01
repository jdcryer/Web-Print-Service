import React, { useState, useEffect } from "react";
const { ipcRenderer } = window.require("electron");
import { ServiceStatusDisplay, FullscreenModal } from "../ui-library/";
import { Button } from "@material-ui/core";
import { useQueryClient } from "react-query";

function ServicePanel({ open, setOpen }) {
  const [handlerState, setHandlerState] = useState("Unknown");
  const queryClient = useQueryClient();

  useEffect(() => {
    let serviceListener = ipcRenderer.on(
      "serviceHandlerState",
      (event, arg) => {
        setHandlerState(arg);
      }
    );

    ipcRenderer.send("startServiceHandlerUpdate");
    return () => {
      ipcRenderer.removeListener("serviceHandlerState", serviceListener);
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
  return (
    <FullscreenModal open={open}>
      <ServiceStatusDisplay>{handlerState}</ServiceStatusDisplay>
    </FullscreenModal>
  );
}

export default ServicePanel;
