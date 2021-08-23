import React from "react";
const electron = window.require("electron");
const remote = electron.remote;
const { dialog } = remote;

function MainPage() {
  return (
    <button
      onClick={() => {
        dialog.showErrorBox("Error Box", "Fatal Error");
      }}
    >
      Show Error Box
    </button>
  );
}

export default MainPage;
