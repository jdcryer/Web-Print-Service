import React, { useState } from "react";
import { IconButton } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { Print, Cancel, CheckCircle, MoreHoriz } from "@material-ui/icons";
import { Text, PrinterDisplay } from "../ui-library";
import { useQueryGetPrinters, useQueryDeletePrinter } from "../endpoints";
import { useQueryClient, useMutation } from "react-query";
import { EditPrinter } from ".";

const useStyles = makeStyles({
  root: {
    backgroundColor: "white",
    padding: 3,
    margin: 3,
    display: "flex",
    flexDirection: "column",
    maxHeight: 275,
    overflow: "scroll",
    overflowX: "hidden",
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

  const [selectedPrinter, setSelectedPrinter] = useState({});
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
      <EditPrinter
        open={selectedPrinter?.printerId !== undefined}
        setOpen={(b) => (!b ? setSelectedPrinter({}) : null)}
        printerId={selectedPrinter?.printerId}
        printerName={selectedPrinter?.printerName}
        oldDisplayName={selectedPrinter?.displayName}
        type={selectedPrinter?.type}
      />

      {printerData
        ?.filter((printer) => printer.enabled)
        .map((printer, i) => (
          <>
            <PrinterDisplay
              name={printer.name}
              displayName={printer.displayName}
              online={printer.online}
              key={`printerDisplay${i}`}
              onEdit={() =>
                setSelectedPrinter({
                  printerId: printer?.id,
                  printerName: printer?.name,
                  displayName: printer?.displayName,
                  type: printer?.acceptedTypes
                    ? printer.acceptedTypes[0]
                    : undefined,
                })
              }
              onDelete={() =>
                deletePrinterMutation.mutate({
                  id: printer.id,
                })
              }
            />
          </>
        ))}
    </div>
  );
}

export default PrinterPanel;
