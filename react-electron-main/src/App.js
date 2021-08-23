import { Configuration } from "./pages";
import { QueryClient, QueryClientProvider } from "react-query";

const queryClient = new QueryClient();

const { app } = window.require("@electron/remote");

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      Hello
      <Configuration />
    </QueryClientProvider>
  );
}

export default App;
