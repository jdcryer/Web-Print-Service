import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import clsx from "clsx";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  bold: {
    fontWeight: "bold",
  },
  large: {
    fontSize: 20,
  },
});

function Text({ children, bold, large, ...rest }) {
  const classes = useStyles();
  return (
    <div
      className={clsx(classes.root, {
        [classes.bold]: bold,
        [classes.large]: large,
      })}
      {...rest}
    >
      {children}
    </div>
  );
}

export default Text;
