import { Printers } from "./pages";
import { QueryClient, QueryClientProvider } from "react-query";

const queryClient = new QueryClient();

const { app } = window.require("@electron/remote");

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      Hello
      <Printers />
    </QueryClientProvider>
  );
}

export default App;
