import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { ErrorPage, Join, Home, Cut } from "./pages";
import Layout from "./layout/Layout";

function App() {
  
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Layout />,
      errorElement: <ErrorPage />,
      children: [
        {
          index: true,
          element: <Home />,
        },
        {
          path: "cut-audio",
          element: <Cut />,
        },
        {
          path: "join-audio",
          element: <Join />,
        },
      ],
    },
  ]);

  return <RouterProvider router={router} />;
}

export default App;
