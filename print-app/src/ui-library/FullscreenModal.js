import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import clsx from "clsx";
import { Dialog, DialogContent } from "@material-ui/core";
const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  child: {
    width: "40%",
  },
});

function FullscreenModal({ children, open, slow, ...rest }) {
  const classes = useStyles();
  return (
    <Dialog
      open={open}
      fullScreen={true}
      transitionDuration={{ enter: 300, exit: slow ? 2000 : 300 }}
    >
      <DialogContent className={classes.root}>
        <div className={classes.child}>{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export default FullscreenModal;
