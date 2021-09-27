import React from "react";
import { IconButton } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { Print, Cancel, CheckCircle, MoreHoriz } from "@material-ui/icons";
import { Text, PrinterDisplay } from "../ui-library";
import { useQueryGetPrinters, useQueryDeletePrinter } from "../endpoints";
import { useQueryClient, useMutation } from "react-query";

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
  row: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  icon: {
    padding: 12,
  },
  spacer: {
    flexGrow: 1,
  },
});

function PrinterPanel() {
  const queryClient = useQueryClient();
  const { data: printerData } = useQueryGetPrinters();

  const deletePrinterMutation = useMutation(
    async (details) => useQueryDeletePrinter(details.id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("getPrinters");
      },
    }
  );
  const classes = useStyles();
  return (
    <div className={classes.root}>
      {printerData
        ?.filter((printer) => printer.enabled)
        .map((printer, i) => (
          <PrinterDisplay
            name={printer.name}
            online={printer.online}
            key={`printerDisplay${i}`}
            onDelete={() =>
              deletePrinterMutation.mutate({
                id: printer.id,
              })
            }
          />
        ))}
    </div>
  );
}

export default PrinterPanel;
