import React from "react";
import { IconButton } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { Loop, CheckCircle } from "@material-ui/icons";
import { Text } from ".";


const useStyles = makeStyles({
  root: {
    backgroundColor: "white",
    border: "1px solid black",
    padding: 10,
    margin: 10,
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
  },
  icon: {
    paddingRight: 12,
    paddingLeft: 12,
  },
  spacer: {
    flexGrow: 1,
  },
});

function ServiceStatusDisplay({status}) {
  return (
    <div>
      <div>{status}</div>
    </div>
  );
}


export default ServiceStatusDisplay;