import React from "react";
import { useQuery } from "react-query";

export function useQueryGetPrinters() {
  return useQuery("getPrinters", () =>
    fetch("http://localhost:3001/printers").then((res) => res.json())
  );
}

export default useQueryGetPrinters;
