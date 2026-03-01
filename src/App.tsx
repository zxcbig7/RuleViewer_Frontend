import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./layout/HomePage";
import RuleViewer from "./pages/RuleViewer";
import BasicCanvas from "./components/CanvasTest/BasicCanvas";
import RuleViewerNew from "./components/CanvasTest/RuleViewerNew";
import SudokuSolver from "./components/Sudoku/SudokuSolver";
import ErrorPage from "./pages/defaultErrorPage";


function App() {
  return (
    <Routes>
      {/* HomePage 永遠存在 */}
      <Route path="/" element={<HomePage />}>
        {/* 預設進來導到 dashboard（可選） */}
        <Route index element={<Navigate to="dashboard" replace />} />

        {/* 這些才是右邊內容 */}
        <Route path="dashboard" element={<div>Dashboard</div>} />

        {/* Rule Viewer Pages */}
        <Route path="ruleviewer" element={<RuleViewer />} />
        <Route path="ruleviewer/main" element={<RuleViewerNew />} />
        <Route path="ruleviewer/test1" element={<BasicCanvas />} />
        <Route path="ruleviewer/test2" element={<BasicCanvas />} />
        <Route path="ruleviewer/test3" element={<BasicCanvas />} />

        {/* Sudoku Pages */}
        <Route path="sudoku" element={<SudokuSolver />} />

        {/* Error Pages */}
        <Route path="*" element={<ErrorPage statusCode={404} />} />
      </Route>
    </Routes>
  );
}

export default App;
