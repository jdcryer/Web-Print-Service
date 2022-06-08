import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Text } from ".";

const useStyles = makeStyles({
  root: {
    display: "flex",
    justifyContent: "space-evenly",
  },
});

function ServiceStatusDisplay({ children }) {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <Text large bold>
        {children}
      </Text>
    </div>
  );
}

export default ServiceStatusDisplay;
