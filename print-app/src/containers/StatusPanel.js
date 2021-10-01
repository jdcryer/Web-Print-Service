import React, { useState, useEffect } from "react";
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@material-ui/core";
import { useMutation, useQueryClient } from "react-query";
import { Text } from "../ui-library";

const formatStatus = (s) =>
  ({
    not_installed: "Not Installed - ERROR",
    running: "Running",
  }[s]);

function StatusPanel({ open, setOpen, serviceStatus, loginStatus }) {
  return (
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
      <DialogTitle>Status</DialogTitle>
      <DialogContent>
        <Text large bold>
          Service status:
        </Text>
        <Text>{formatStatus(serviceStatus)}</Text>
        <Text large bold>
          Login status:
        </Text>
        <Text>{loginStatus ? "Logged in!" : "Error"}</Text>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>Back</Button>
      </DialogActions>
    </Dialog>
  );
}

export default StatusPanel;
