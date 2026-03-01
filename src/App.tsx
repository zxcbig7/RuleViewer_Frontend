import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./layout/HomePage";
import RuleViewer from "./pages/RuleViewer";
import BasicCanvas from "./components/CanvasTest/BasicCanvas";
import Test2 from "./components/CanvasTest/Test2";
import  SudokuSolver from "./components/SudokuSolver";


function App() {
  return (
    <Routes>
      {/* HomePage 永遠存在 */}
      <Route path="/" element={<HomePage />}>
        {/* 預設進來導到 dashboard（可選） */}
        <Route index element={<Navigate to="dashboard" replace />} />

        {/* 這些才是右邊內容 */}
        <Route path="dashboard" element={<div>Dashboard</div>} />

        <Route path="ruleviewer" element={<RuleViewer />} />

        <Route path="test" element={<BasicCanvas />} />
        <Route path="test2" element={<Test2 />} />
        <Route path="sudoku" element={<SudokuSolver />} />

        <Route path="user" element={<div>User</div>} />
        <Route path="user/tom" element={<div>Tom</div>} />
        <Route path="user/bill" element={<div>Bill</div>} />
        <Route path="user/alex" element={<div>Alex</div>} />

        <Route path="team" element={<div>Team</div>} />
        <Route path="team/1" element={<div>Team 1</div>} />
        <Route path="team/2" element={<div>Team 2</div>} />

        <Route path="files" element={<div>Files</div>} />

        <Route path="*" element={<div>404 Not Found</div>} />
      </Route>
    </Routes>
  );
}

export default App;
