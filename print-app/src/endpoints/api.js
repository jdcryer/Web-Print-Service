import React from "react";
import { useQuery } from "react-query";

export function useQueryGetPrinters() {
  return useQuery("getPrinters", () =>
    fetch("http://localhost:3001/printers").then((res) => res.json())
  );
}

export function useQueryCheckLogin() {
  return useQuery("checkLogin", () =>
    fetch("http://localhost:3001/checkLogin", {
      method: "GET",
    }).then((res) => res.json())
  );
}

export async function useQueryPostLogin(username, password, baseUrl) {
  return fetch("http://localhost:3001/postLogin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: username,
      password: password,
      baseUrl: baseUrl,
    }),
  }).then((res) => res.json());
}

export async function useQueryPostPrinter(
  userId,
  printerName,
  displayName,
  type
) {
  return fetch("http://localhost:3001/newPrinter", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: userId,
      printerName: printerName,
      displayName: displayName,
      type: type,
    }),
  }).then((res) => res.json());
}

export async function useQueryEditPrinter(
  printerId,
  printerName,
  displayName,
  type
) {
  return fetch("http://localhost:3001/editPrinter", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      printerId: printerId,
      printerName: printerName,
      displayName: displayName,
      type: type,
    }),
  }).then((res) => res.json());
}

export async function useQueryDeletePrinter(printerId) {
  return fetch("http://localhost:3001/deletePrinter", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ printerId: printerId }),
  }).then((res) => res.json());
}
