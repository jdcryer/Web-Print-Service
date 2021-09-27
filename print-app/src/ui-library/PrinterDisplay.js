import React from "react";
import { IconButton } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { Print, Cancel, CheckCircle, MoreHoriz } from "@material-ui/icons";
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
  row: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  icon: {
    paddingRight: 12,
    paddingLeft: 12,
  },
  spacer: {
    flexGrow: 1,
  },
});

function PrinterDisplay({ online, name, onDelete }) {
  const classes = useStyles();
  return (
    <div className={classes.root}>
      <div className={classes.row}>
        <Print className={classes.icon} />
        <Text bold>{name}</Text>
        <IconButton color="primary" onClick={onDelete}>
          <MoreHoriz />
        </IconButton>
      </div>

      <div className={classes.row}>
        <Text bold>Printer status:</Text>
        <div className={classes.spacer} />
        {online ? (
          <>
            <Text>Online</Text>
            <CheckCircle className={classes.icon} style={{ fill: "green" }} />
          </>
        ) : (
          <>
            <Text>Offline</Text>
            <Cancel className={classes.icon} style={{ fill: "red" }} />
          </>
        )}
      </div>
    </div>
  );
}

export default PrinterDisplay;
