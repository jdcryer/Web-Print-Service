import React from "react";
const electron = window.require("electron");
const remote = electron.remote;
const { dialog } = remote;
const { service } = require("../serviceHandler");

function MainPage() {
  return (
    <div>
      <button
        onClick={() => {
          dialog.showErrorBox("Error Box", "Fatal Error");
        }}
      >
        Show Error Box
      </button>

      <button
        onClick={() => {
          service("install");
        }}
      >
        Install Service
      </button>
    </div>
  );
}

export default MainPage;
