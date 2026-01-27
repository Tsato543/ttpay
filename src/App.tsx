import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import Up1 from "./pages/Up1";
import Up2 from "./pages/Up2";
import Up3 from "./pages/Up3";
import Up4 from "./pages/Up4";
import Up5 from "./pages/Up5";
import Up6 from "./pages/Up6";
import NotFound from "./pages/NotFound";

// PRESSELL (nomes reais do seu projeto)
import Presell from "./pages/Presell";
import Loading from "./pages/Loading";
import StepAge from "./pages/StepAge";
import StepName from "./pages/StepName";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>

          {/* 👉 PRESSELL AGORA É A HOME */}
          <Route path="/" element={<Presell />} />
          <Route path="/loading" element={<Loading />} />
          <Route path="/idade" element={<StepAge />} />
          <Route path="/nome" element={<StepName />} />

          {/* 👉 SITE PRINCIPAL */}
          <Route path="/home" element={<Index />} />

          {/* Ups */}
          <Route path="/up1" element={<Up1 />} />
          <Route path="/up2" element={<Up2 />} />
          <Route path="/up3" element={<Up3 />} />
          <Route path="/up4" element={<Up4 />} />
          <Route path="/up5" element={<Up5 />} />
          <Route path="/up6" element={<Up6 />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
