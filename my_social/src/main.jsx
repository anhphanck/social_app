import React from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import App from "./App";
import "./index.css";
import { UserProvider } from "./context/UserContext";

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || "";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <UserProvider >
      <App />
    </UserProvider>
  </React.StrictMode>
);

