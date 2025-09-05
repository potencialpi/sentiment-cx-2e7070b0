import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import CheckoutGuest from "./pages/CheckoutGuest";
import ChoosePlan from "./pages/ChoosePlan";
import CreateAccount from "./pages/CreateAccount";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";

import AdminQuestionarios from "./pages/AdminQuestionarios";
import AdminVortex from "./pages/AdminVortex";
import AdminNexus from "./pages/AdminNexus";
import AdminRespondents from "./pages/AdminRespondents";
import Dashboard from "./pages/Dashboard";
import CreateSurvey from "./pages/CreateSurvey";

import CreateSurveyRedirect from "./pages/CreateSurveyRedirect";
import CreateSurveyVortex from "./pages/CreateSurveyVortex";
import CreateSurveyNexus from "./pages/CreateSurveyNexus";
import SurveyResponse from "./pages/SurveyResponse";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import MagicLinkAuth from "./pages/MagicLinkAuth";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import TestSelect from './components/TestSelect';
import DebugSelect from './components/DebugSelect';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/checkout-guest" element={<CheckoutGuest />} />
          <Route path="/choose-plan" element={<ChoosePlan />} />
          <Route path="/create-account" element={<CreateAccount />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-cancel" element={<PaymentCancel />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />

          <Route path="/admin/questionarios" element={<ProtectedRoute><AdminQuestionarios /></ProtectedRoute>} />
          <Route path="/admin/start" element={<ProtectedRoute><AdminQuestionarios /></ProtectedRoute>} />
          <Route path="/admin/vortex" element={<ProtectedRoute><AdminVortex /></ProtectedRoute>} />
          <Route path="/admin/nexus" element={<ProtectedRoute><AdminNexus /></ProtectedRoute>} />
          <Route path="/admin/questionarios/nexus" element={<ProtectedRoute><AdminNexus /></ProtectedRoute>} />

          <Route path="/admin/start-quantico/respondents" element={<ProtectedRoute><AdminRespondents /></ProtectedRoute>} />
          <Route path="/admin/vortex-neural/respondents" element={<ProtectedRoute><AdminRespondents /></ProtectedRoute>} />
          <Route path="/admin/nexus-infinito/respondents" element={<ProtectedRoute><AdminRespondents /></ProtectedRoute>} />
          {/* Rotas alternativas para compatibilidade */}
          <Route path="/admin/vortex/respondentes" element={<ProtectedRoute><AdminRespondents /></ProtectedRoute>} />
          <Route path="/admin/nexus/respondentes" element={<ProtectedRoute><AdminRespondents /></ProtectedRoute>} />
          <Route path="/create-survey" element={<ProtectedRoute><CreateSurveyRedirect /></ProtectedRoute>} />

          <Route path="/create-survey-vortex" element={<ProtectedRoute><CreateSurveyVortex /></ProtectedRoute>} />
          <Route path="/create-survey-nexus" element={<ProtectedRoute><CreateSurveyNexus /></ProtectedRoute>} />
          <Route path="/manage-surveys" element={<ProtectedRoute><CreateSurvey /></ProtectedRoute>} />
          <Route path="/survey/:surveyId" element={<ProtectedRoute><SurveyResponse /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/auth/magic-link" element={<MagicLinkAuth />} />
          <Route path="/test-select" element={<TestSelect />} />
            <Route path="/debug-select" element={<DebugSelect />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
