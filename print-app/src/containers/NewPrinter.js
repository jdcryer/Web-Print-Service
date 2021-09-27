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
import { makeStyles } from "@material-ui/core/styles";
import {
  useQueryGetPrinters,
  useQueryPostPrinter,
  useQueryCheckLogin,
} from "../endpoints";
import { useMutation, useQueryClient } from "react-query";

function NewPrinter({ open, setOpen }) {
  const queryClient = useQueryClient();

  const addPrinterMutation = useMutation(
    async (details) =>
      useQueryPostPrinter(
        details.userId,
        details.printerName,
        details.displayName,
        details.type
      ),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("getPrinters");
      },
    }
  );
  const { data: loginData } = useQueryCheckLogin();

  const [isError, setIsError] = useState([]);
  const [printer, setPrinter] = useState("");
  const [printerName, setPrinterName] = useState("");

  const { data: printerData } = useQueryGetPrinters();
  const printers = printerData?.filter((p) => !p.enabled);

  const printerTypes = [
    { type: "label", name: "Label" },
    { type: "printer", name: "Printer" },
  ];
  const [printerType, setPrinterType] = useState(printerTypes[0]);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleSubmit = () => {
    setIsError((t) => {
      if (printer === "") {
        t = t.includes("printer-select") ? t : [...t, "printer-select"];
      } else {
        t = t.includes("printer-select")
          ? t.filter((x) => x !== "printer-select")
          : t;
      }

      if (printerName === "") {
        t = t.includes("printer-name") ? t : [...t, "printer-name"];
      } else {
        t = t.includes("printer-name")
          ? t.filter((x) => x !== "printer-name")
          : t;
      }

      if (t.length > 0) {
        return t;
      }
      addPrinterMutation.mutate({
        userId: loginData?.data,
        printerName: printer,
        displayName: printerName,
        type: printerType.type,
      });
      handleClose();
      return t;
    });
  };

  const handleClose = () => {
    setPrinter("");
    setPrinterName("");
    setOpen(false);
  };

  return (
    <>
      <Button variant="outlined" onClick={handleClickOpen}>
        Add new printer
      </Button>
      <Dialog open={open} onClose={handleClose} fullWidth>
        <DialogTitle>Add a new printer</DialogTitle>
        <DialogContent>
          <FormControl fullWidth>
            <InputLabel htmlFor="printer-select">Select a printer</InputLabel>
            <Select
              error={isError?.includes("printer-select")}
              id="printer-select"
              value={printer}
              onChange={(n) => setPrinter(n.target.value)}
            >
              {printers?.map((p, i) => (
                <MenuItem value={p.name} key={i}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <TextField
              error={isError?.includes("printer-name")}
              label="Printer name"
              value={printerName}
              onChange={(n) => setPrinterName(n.target.value)}
              margin="dense"
              helperText="This will be what is displayed on i.LEVEL"
            />
          </FormControl>
          <FormControl fullWidth>
            <InputLabel htmlFor="printer-type">Printer type</InputLabel>
            <Select
              error={isError?.includes("printer-type")}
              id="printer-type"
              value={printerType.type}
              onChange={(n) =>
                setPrinterType(() =>
                  printerTypes.find((x) => x.type === n.target.value)
                )
              }
            >
              {printerTypes?.map((p, i) => (
                <MenuItem value={p.type} key={i}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Add</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default NewPrinter;
