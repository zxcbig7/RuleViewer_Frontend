import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./layout/HomePage";
import { RuleViewer } from "./components/RTDRuleViewer";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";

import CanvasComponent from "./components/CanvasTest/BasicCanvas";
import RuleViewerNew from "./components/CanvasTest/RuleViewerNew";

import TestBlockInspector from "./pages/TestBlockInspector";
import TestRuleView from "./pages/TestRuleView";
import TestControls from "./pages/TestControls";
import AuthPage from "./pages/AuthPage";

import SudokuSolver from "./components/Sudoku/SudokuSolver";
import ErrorPage from "./pages/defaultErrorPage";


function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* 獨立頁面：不含 sidebar 佈局 */}
        <Route path="/login" element={<AuthPage />} />

        {/* 受保護的主佈局 */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        >
          {/* 預設進來導到 dashboard */}
          <Route index element={<Navigate to="dashboard" replace />} />

          <Route path="dashboard" element={<div>Dashboard</div>} />

          {/* Rule Viewer Pages */}
          <Route path="ruleviewer" element={<RuleViewer />} />

          {/* Rule Viewer New Pages */}
          <Route path="ruleviewer/main" element={<RuleViewerNew />} />
          <Route path="ruleviewer/test1" element={<TestBlockInspector />} />
          <Route path="ruleviewer/test2" element={<TestRuleView />} />
          <Route path="ruleviewer/test3" element={<TestControls />} />
          <Route path="ruleviewer/legacy2" element={<CanvasComponent />} />

          {/* Sudoku Pages */}
          <Route path="sudoku" element={<SudokuSolver />} />

          {/* Error Pages */}
          <Route path="*" element={<ErrorPage statusCode={404} />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
