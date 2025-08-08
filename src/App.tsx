import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ChoosePlan from "./pages/ChoosePlan";
import CreateAccount from "./pages/CreateAccount";
import Login from "./pages/Login";
import Admin from "./pages/Admin";

import AdminQuestionarios from "./pages/AdminQuestionarios";
import AdminVortex from "./pages/AdminVortex";
import AdminNexus from "./pages/AdminNexus";
import AdminRespondents from "./pages/AdminRespondents";
import Dashboard from "./pages/Dashboard";
import CreateSurvey from "./pages/CreateSurvey";
import CreateSurveyForm from "./pages/CreateSurveyForm";
import CreateSurveyRedirect from "./pages/CreateSurveyRedirect";
import CreateSurveyStart from "./pages/CreateSurveyStart";
import CreateSurveyVortex from "./pages/CreateSurveyVortex";
import CreateSurveyNexus from "./pages/CreateSurveyNexus";
import SurveyResponse from "./pages/SurveyResponse";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/choose-plan" element={<ChoosePlan />} />
          <Route path="/create-account" element={<CreateAccount />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />

          <Route path="/admin/questionarios" element={<AdminQuestionarios />} />
          <Route path="/admin/vortex" element={<AdminVortex />} />
          <Route path="/admin/nexus" element={<AdminNexus />} />
          <Route path="/admin/questionarios/nexus" element={<AdminNexus />} />

          <Route path="/admin/vortex/respondentes" element={<AdminRespondents />} />
          <Route path="/admin/nexus/respondentes" element={<AdminRespondents />} />
          <Route path="/create-survey" element={<CreateSurveyRedirect />} />
          <Route path="/create-survey-start" element={<CreateSurveyStart />} />
          <Route path="/create-survey-vortex" element={<CreateSurveyVortex />} />
          <Route path="/create-survey-nexus" element={<CreateSurveyNexus />} />
          <Route path="/manage-surveys" element={<CreateSurvey />} />
          <Route path="/survey/:surveyId" element={<SurveyResponse />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
