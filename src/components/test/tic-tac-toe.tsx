import style from "../css/tic-tac-toe.module.css"
import { useState } from "react";


type squareProp = {
  value: string;
  onSquareClick(): void;
}

// 把 handleClick 函式當作道具傳下來。你並沒有呼叫它！但現在你立刻呼叫了那個函式——注意 handleClick（0） 裡的括號——這就是為什麼它執行得太早。 你不想在使用者點擊之前呼叫 handleClick！

// 參數解構（Destructuring）語法: { value, onSquareClick }: squareProp
// function Square({ value, onSquareClick }: { value: string, onSquareClick(): void }) {
function Square({ value, onSquareClick }: squareProp) {
  //const {value, onSquareClick} = prop;
  return (<>
    <button
      className={style.square}
      onClick={onSquareClick} // onXX -> 觸發函式
    >{value}</button>
  </>);
}

type boardProp = {
  xIsNext: boolean;
  squares: string[];
  onPlay(nextSquares: (string | null)[]): void;
}

function Board({ xIsNext, squares, onPlay }: boardProp) {

  // 判斷贏家(動態更新但不刷新頁面)
  const winner = checkWinner(squares);
  const status = winner ? "Winner: " + winner : "Next player: " + (xIsNext ? "X" : "O");


  // 更新儲存棋盤狀態的squares陣列：
  function hadleClick(i: number) {
    // 如果有資料或者決定贏家時候就不可繼續遊戲
    if (squares[i] || checkWinner(squares)) {
      return;
    }

    const nextSquare = squares.slice(); // 複製陣列

    // 更新玩家
    if (xIsNext) {
      nextSquare[i] = "X";
    } else {
      nextSquare[i] = "O";
    }

    onPlay(nextSquare); // 更新畫面
  }

  // 把函式當作 Prop 傳給（而不是呼叫），像 onSquareClick={handleFirstSquareClick} 。
  // 這樣就能解決無限迴圈的問題。

  // 臨時無命名函式
  //（） => handleClick（0） 是一個箭頭函式， 是定義函數的簡短方式。
  // 當點擊方格時，=>「箭頭」後的程式碼會執行，呼叫 handleClick（0）。
  return (
    <>
      <div className={style.status}>{status}</div>

      <div className={style.board}>
        {squares.map((value, index) => (<Square key={index} value={value} onSquareClick={() => hadleClick(index)} />))}
      </div>

    </>
  );
}

export default function Game() {
  // 要渲染當前移動的格子，你需要讀取歷史中最後一個格子陣列
  // 不需要 useState 來做這件事——已經有足夠的資訊在渲染時計算出來：
  const [history, setHistory] = useState([Array(9).fill(null)]);
  const [currentMove, setCurrentMove] = useState(0);
  const xIsNext = currentMove % 2 === 0;
  const currentSquares = history[currentMove];

  function handlePlay(nextSquares: string[]) {
    /// ... 把陣列「拆成一個一個元素」
    const nextHistory = [...history.slice(0, currentMove + 1), nextSquares];
    setHistory(nextHistory); // 新增歷史資訊
    setCurrentMove(nextHistory.length - 1);
  }

  // 跳歷史
  function jumpTo(nextMove: number) {
    setCurrentMove(nextMove);
  }

  const moves = history.map((squares, move) => {
    let description;
    if (move > 0) {
      description = 'Go to move #' + move;
    } else {
      description = 'Go to game start';
    }

    return (
      <li key={move}>
        <button onClick={() => jumpTo(move)}>{description}</button>
      </li>
    );

  });

  return (
    <div className={style.game}>
      <div className="game-board">
        <Board xIsNext={xIsNext} squares={currentSquares} onPlay={handlePlay} />
      </div>
      <div className={style.gameInfo}>
        <ol>{moves}</ol>
      </div>
    </div>
  );
}


function checkWinner(squares: string[]) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] == squares[b] && squares[b] == squares[c] && squares[c] == squares[a]) {
      return squares[a];
    }
  }

  return null;
}


// TODO
// For the current move only, show “You are at move #…” instead of a button.
// 僅針對當前走法，請顯示「你正在移動 #...」而不是按鈕。
// Rewrite Board to use two loops to make the squares instead of hardcoding them.
// 重寫 Board 用兩個迴圈來做方格，而不是硬編碼。
// Add a toggle button that lets you sort the moves in eiher ascending or descending order.
// 新增一個切換按鈕，讓你可以依序或從序或從序排序。
// When someone wins, highlight the three squares that caused the win (and when no one wins, display a message about the result being a draw).
// 當有人中獎時，標示出導致該勝利的三個格子（若無人中獎，則顯示結果為平手的訊息）。
// Display the location for each move in the format (row, col) in the move history list.
// 在移動歷史清單中，將每次移動的位置顯示在格式（列、欄）中。