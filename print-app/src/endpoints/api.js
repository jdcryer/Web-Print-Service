import React from "react";
import { useQuery } from "react-query";
const axios = require("axios");

export function useQueryGetPrinters() {
  return useQuery("getPrinters", () =>
    fetch("http://localhost:3001/printers").then((res) => res.json())
  );
}

export function useQueryPutLogin(username, password) {
  return useQuery("putLogin", () =>
    axios.put("http://localhost:3001/putLogin", { username: username, password: password}).then((res) => res.json)
  );
}

export default useQueryGetPrinters;
