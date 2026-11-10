import "./app/globals.css"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { ServiceWorkerCleanup } from "@/components/service-worker-cleanup"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { routes } from "@/router"

const router = createBrowserRouter(routes)

function App() {
  return (
    <StrictMode>
      <TooltipProvider>
        <ThemeProvider>
          <ServiceWorkerCleanup />
            <Toaster richColors position="top-center" />
          <RouterProvider router={router} />
        </ThemeProvider>
      </TooltipProvider>
    </StrictMode>
  )
}

export default App

createRoot(document.getElementById("root")!).render(<App />)
