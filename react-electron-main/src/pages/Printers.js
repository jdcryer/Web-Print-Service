import { useQueryGetPrinters } from "../services";

function Printers() {
  const {
    isLoading: isLoadingPrinters,
    error: errorPrinters,
    data: dataPrinters,
  } = useQueryGetPrinters();

  if (isLoadingPrinters) {
    return <div>Loading</div>;
  }
  if (errorPrinters || dataPrinters === null) {
    return <div>Error</div>;
  }

  return (
    <div className="container mt-2">
      Hey there
      {JSON.stringify(dataPrinters)}
      {/* <FilesViewer files={filteredFiles} onBack={onBack} onOpen={onOpen} /> */}
    </div>
  );
}

export default Printers;
