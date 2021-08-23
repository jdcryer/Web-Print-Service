import * as React from "react";
import * as ReactDOM from "react-dom";

import ReactRoot from "./ReactRoot";

// function render() {
//   ReactDOM.render(<h2>Hello from React!</h2>, document.body);
// }

// render();

ReactDOM.render(
  <React.StrictMode>
    <ReactRoot />
  </React.StrictMode>,
  document.getElementById("root")
);
