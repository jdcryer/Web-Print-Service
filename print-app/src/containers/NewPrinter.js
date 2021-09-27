import React, { useState, useEffect } from "react";
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Button,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import {
  useQueryGetPrinters,
  useQueryPostPrinter,
  useQueryCheckLogin,
} from "../endpoints";
import { useMutation, useQueryClient } from "react-query";

const useStyles = makeStyles({
  root: {
    backgroundColor: "white",
    border: "1px solid black",
    padding: 10,
    margin: 10,
    width: 300,
  },
  formControl: {
    width: "100%",
  },
  submit: {
    marginTop: 20,
    display: "flex",
    marginLeft: "auto",
  },
});

function NewPrinter() {
  const queryClient = useQueryClient();
  const { data: printerData } = useQueryGetPrinters();
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

  const [printer, setPrinter] = useState("");
  const [printerName, setPrinterName] = useState("");
  const printers = printerData?.filter((p) => !p.enabled);
  const printerTypes = [
    { type: "label", name: "Label" },
    { type: "printer", name: "Printer" },
  ];
  const [printerType, setPrinterType] = useState(printerTypes[0]);

  useEffect(() => {
    setPrinter((v) => {
      if (!printers) return v;

      if (v === "" || !printers.some((p) => p.name === v))
        return printers[0]?.name;
      return v;
    });
  }, [printers, setPrinter]);

  const classes = useStyles();
  return (
    <div className={classes.root}>
      Add a new printer.
      <br />
      <br />
      <FormControl className={classes.formControl}>
        <InputLabel htmlFor="printer-select">Select a printer</InputLabel>
        <Select
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
      <FormControl className={classes.formControl}>
        <TextField
          label="Printer name"
          value={printerName}
          onChange={(n) => setPrinterName(n.target.value)}
          margin="dense"
          helperText="This will be what is displayed on i.LEVEL"
        />
      </FormControl>
      <FormControl className={classes.formControl}>
        <InputLabel htmlFor="printer-type">Printer type</InputLabel>
        <Select
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
      <Button
        variant="contained"
        className={classes.submit}
        onClick={() => {
          if (printer === "" || printerName === "") {
            console.log("no");
            return;
          }
          addPrinterMutation.mutate({
            userId: loginData?.data,
            printerName: printer,
            displayName: printerName,
            type: printerType.type,
          });
        }}
      >
        Submit
      </Button>
    </div>
  );
}

export default NewPrinter;
