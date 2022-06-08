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
import { useQueryEditPrinter } from "../endpoints";
import { useMutation, useQueryClient } from "react-query";

function EditPrinter({
  open,
  setOpen,
  printerId,
  printerName,
  oldDisplayName,
  type,
}) {
  const queryClient = useQueryClient();

  const editPrinterMutation = useMutation(
    async (details) =>
      useQueryEditPrinter(
        details.printerId,
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

  const [isError, setIsError] = useState([]);
  const [displayName, setDisplayName] = useState("");

  const printerTypes = [
    { type: "label", name: "Label" },
    { type: "printer", name: "Printer" },
  ];

  const [printerType, setPrinterType] = useState(printerTypes[1]);

  useEffect(() => {
    setPrinterType(
      printerTypes.find((x) => x.type === type) ?? printerTypes[1]
    );
  }, [type]);

  useEffect(() => {
    setDisplayName(oldDisplayName ?? "");
  }, [oldDisplayName]);

  const handleSubmit = () => {
    setIsError((t) => {
      if (displayName === "") {
        t = t.includes("display-name") ? t : [...t, "display-name"];
      } else {
        t = t.includes("display-name")
          ? t.filter((x) => x !== "display-name")
          : t;
      }

      if (t.length > 0) {
        return t;
      }
      editPrinterMutation.mutate({
        printerId: printerId,
        printerName: printerName,
        displayName: displayName,
        type: printerType.type,
      });
      handleClose();
      return t;
    });
  };

  const handleClose = () => {
    setDisplayName("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth>
      <DialogTitle>Edit printer {printerName}</DialogTitle>
      <DialogContent>
        <FormControl fullWidth>
          <TextField
            error={isError?.includes("display-name")}
            label="Display name"
            value={displayName}
            onChange={(n) => setDisplayName(n.target.value)}
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
        <Button onClick={handleSubmit}>Edit</Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditPrinter;
