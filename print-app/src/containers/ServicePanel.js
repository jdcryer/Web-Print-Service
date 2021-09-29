import React, { useState, useEffect } from "react";
const { ipcRenderer, remote } = window.require("electron");
import { makeStyles } from "@material-ui/core/styles";
import { Print, Cancel, CheckCircle } from "@material-ui/icons";
import { ServiceStatusDisplay } from "../ui-library/";

const useStyles = makeStyles({
  root: {
    backgroundColor: "white",
    border: "1px solid black",
    padding: 3,
    margin: 3,
    width: 400,
    display: "flex",
    flexDirection: "column",
  },
  icon: {
    padding: 12,
  },
  spacer: {
    flexGrow: 1,
  },
});

function ServicePanel() {
  const [handlerState, setHandlerState] = useState("Unkown");

  useEffect(() => {
    let serviceListener = ipcRenderer.on("serviceHandlerState", (event, arg) =>
      setHandlerState(arg)
    );

    ipcRenderer.send("startServiceHandlerUpdate");

    return () => {
      ipcRenderer.removeListener("serviceHandlerState", serviceListener);
    };
  }, []);

  const classes = useStyles();
  return (
    <div className={classes.root}>
      <button
        onClick={() => {
          //Does nothing just here to relieve stress of frustrated user
        }}
      >
        Refresh
      </button>
      <ServiceStatusDisplay status={handlerState} />
    </div>
  );
}

export default ServicePanel;
