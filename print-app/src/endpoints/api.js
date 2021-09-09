import React from "react";
import { useQuery } from "react-query";

export function useQueryGetPrinters() {
  return useQuery("getPrinters", () =>
    fetch("http://localhost:3001/printers").then((res) => res.json())
  );
}

export function useQueryPostLogin(username, password) {
  return useQuery("setLogin", () =>
    fetch("http://localhost:3001/setLogin", {
      method: "POST",
      body: {
        username: username,
        password: password,
      },
      headers: {
        "Content-Security-Policy": "connect-src http://*:*",
      },
    }).then((res) => res.json())
  );
}

export function useQueryGetLogin() {
  return useQuery("getLogin", () =>
    fetch("http://localhost:3001/getLogin", {
      method: "GET",
      mode: "cors",
      headers: {
        "Content-Security-Policy": "connect-src 'self' localhost:*",
      },
    }).then((res) => res.json())
  );
}
