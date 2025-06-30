import React, { useEffect, useRef, useState, useCallback } from "react";
import "./App.css";

// Color theme from requirements
const PRIMARY = "#27ae60";
const SECONDARY = "#2d3436";
const ACCENT = "#f1c40f";
const BOARD_SIZE = 20; // 20x20 grid
const INITIAL_SPEED = 180; // ms per move (lower is faster)
const FOOD_ANIMATION_RATE = 400; // ms for food pulse

const DIRS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

const OPPOSITE = {
  ArrowUp: "ArrowDown",
  ArrowDown: "ArrowUp",
  ArrowLeft: "ArrowRight",
  ArrowRight: "ArrowLeft",
};

// PUBLIC_INTERFACE
function App() {
  // Game state
  const [snake, setSnake] = useState([
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
  ]);
  const [dir, setDir] = useState("ArrowRight");
  const [pendingDir, setPendingDir] = useState(null);
  const [food, setFood] = useState({ x: 13, y: 6 });
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [gameOver, setGameOver] = useState(false);
  const [foodPulse, setFoodPulse] = useState(1);
  const [lastMove, setLastMove] = useState(Date.now());

  // For keyboard handling
  const gameRef = useRef(null);

  // For keeping interval reference
  const moveInterval = useRef(null);

  // For controlling focus for keyboard on mobile
  useEffect(() => {
    if (gameRef.current) gameRef.current.focus();
  }, []);

  // PUBLIC_INTERFACE
  // Main game movement loop
  useEffect(() => {
    if (gameOver) {
      if (moveInterval.current) clearInterval(moveInterval.current);
      return;
    }
    moveInterval.current = setInterval(() => {
      step();
    }, speed);

    return () => {
      clearInterval(moveInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snake, dir, speed, gameOver]);

  // Animate food pulse for visual feedback
  useEffect(() => {
    if (!gameOver) {
      const t = setInterval(() => {
        setFoodPulse((old) => (old >= 1 ? 0.8 : 1));
      }, FOOD_ANIMATION_RATE);
      return () => clearInterval(t);
    }
  }, [gameOver]);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e) => {
      if (!Object.keys(DIRS).includes(e.key)) return;
      if (gameOver) return;
      if (OPPOSITE[e.key] === dir) return; // Prevent 180 reverse
      setPendingDir((old) => (old === e.key ? old : e.key));
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dir, gameOver]);

  // Auto-focus container for keyboard on mount (less intrusive on desktop)
  useEffect(() => {
    if (gameRef.current && typeof gameRef.current.focus === "function")
      gameRef.current.focus();
  }, []);

  // PUBLIC_INTERFACE
  // Move the snake forward by one tile
  const step = useCallback(() => {
    if (gameOver) return;

    let nextDir = pendingDir && OPPOSITE[pendingDir] !== dir ? pendingDir : dir;
    setDir(nextDir);
    setPendingDir(null);

    // Calculate next head position
    const head = { ...snake[0] };
    const delta = DIRS[nextDir];
    head.x += delta.x;
    head.y += delta.y;

    // Check wall collision
    if (
      head.x < 0 ||
      head.y < 0 ||
      head.x >= BOARD_SIZE ||
      head.y >= BOARD_SIZE
    ) {
      setGameOver(true);
      return;
    }

    // Check self collision
    for (let s of snake) {
      if (head.x === s.x && head.y === s.y) {
        setGameOver(true);
        return;
      }
    }

    // Food eaten
    const ate = head.x === food.x && head.y === food.y;
    let newSnake = [head, ...snake];
    if (ate) {
      setScore((s) => s + 10);
      let placed;
      let tries = 0;
      do {
        placed = {
          x: Math.floor(Math.random() * BOARD_SIZE),
          y: Math.floor(Math.random() * BOARD_SIZE),
        };
        tries++;
      } while (
        newSnake.some((s) => s.x === placed.x && s.y === placed.y) &&
        tries < 100
      );
      setFood(placed);
      // Speed up as score increases
      setSpeed((prev) => (prev > 70 ? Math.max(70, prev - 7) : prev));
    } else {
      newSnake.pop();
    }

    setSnake(newSnake);
    setLastMove(Date.now());
  }, [snake, dir, pendingDir, food, gameOver]);

  // PUBLIC_INTERFACE
  // Start/restart game
  const startGame = useCallback(() => {
    setSnake([
      { x: 8, y: 10 },
      { x: 7, y: 10 },
      { x: 6, y: 10 },
    ]);
    setDir("ArrowRight");
    setPendingDir(null);
    setFood({
      x: Math.floor(Math.random() * BOARD_SIZE),
      y: Math.floor(Math.random() * BOARD_SIZE),
    });
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setGameOver(false);
    setLastMove(Date.now());
    if (gameRef.current) gameRef.current.focus();
  }, []);

  // PUBLIC_INTERFACE
  // On-screen control panel for keyboard and touch
  const handleDirectionButton = (d) => {
    if (OPPOSITE[d] === dir || gameOver) return;
    setPendingDir(d);
  };

  // Renderers
  const renderBoard = () => {
    const board = [];
    // Create a BOARD_SIZE x BOARD_SIZE array
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const isHead = x === snake[0].x && y === snake[0].y;
        const isBody =
          !isHead && snake.some((s, idx) => idx !== 0 && s.x === x && s.y === y);
        const isFood = x === food.x && y === food.y;

        let cellClass = "cell";
        let cellStyle = {};
        if (isHead) {
          cellClass += " snake-head";
          cellStyle = {
            background: `linear-gradient(135deg, ${ACCENT}, ${PRIMARY})`,
            boxShadow: `0 0 10px 2px ${ACCENT}99`,
            zIndex: 2,
          };
        } else if (isBody) {
          cellClass += " snake-body";
          // Slightly lighter green as snake gets longer
          const opacity =
            0.7 +
            0.2 *
              (1 -
                snake.findIndex((s) => s.x === x && s.y === y) /
                  snake.length);
          cellStyle = {
            background: `linear-gradient(135deg, ${PRIMARY}, ${SECONDARY})`,
            opacity,
          };
        } else if (isFood) {
          cellClass += " food";
          cellStyle = {
            background: ACCENT,
            animation: `pulse-food ${FOOD_ANIMATION_RATE /
              1000}s infinite alternate`,
            opacity: foodPulse,
            boxShadow: `0 0 14px 2px ${ACCENT}88`,
            zIndex: 2,
          };
        }

        // Minimal border and hover effect for modern look
        board.push(
          <div
            key={`${x},${y}`}
            className={cellClass}
            style={{
              ...cellStyle,
              border:
                isHead || isBody || isFood ? "none" : "1px solid var(--snake-board-border)",
            }}
          />
        );
      }
    }
    return board;
  };

  return (
    <div className="snake-app-bg" tabIndex={-1} ref={gameRef}>
      <main className="snake-main">
        <h1 className="snake-title">🐍 Snake</h1>
        <div className="score-panel">
          <div className="score-label">Score</div>
          <div className="score-value" data-test="score">
            {score}
          </div>
          <div className="speed-label">Speed</div>
          <div className="speed-value" data-test="speed" role="status">
            {Math.round(1000 / speed)} cell/s
          </div>
        </div>
        <div
          className={`snake-board${gameOver ? " blurred" : ""}`}
          style={{
            "--board-dim": BOARD_SIZE,
          }}
        >
          {renderBoard()}
          {gameOver && (
            <div className="game-over">
              <div className="game-over-text">Game Over</div>
              <div
                className="restart-btn"
                onClick={startGame}
                tabIndex={0}
                role="button"
                aria-label="Restart game"
              >
                Restart
              </div>
            </div>
          )}
        </div>

        {/* On-screen controls */}
        <div className="control-panel">
          <div className="instructions">
            <span>
              Use <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> (arrows) to control.
              Tap the buttons on mobile.
            </span>
          </div>
          <div className="arrow-buttons">
            <button
              className="control-btn"
              onClick={() => handleDirectionButton("ArrowUp")}
              aria-label="Up"
              tabIndex={0}
            >
              ↑
            </button>
            <div>
              <button
                className="control-btn"
                onClick={() => handleDirectionButton("ArrowLeft")}
                aria-label="Left"
                tabIndex={0}
              >
                ←
              </button>
              <button
                className="control-btn"
                onClick={() => handleDirectionButton("ArrowDown")}
                aria-label="Down"
                tabIndex={0}
              >
                ↓
              </button>
              <button
                className="control-btn"
                onClick={() => handleDirectionButton("ArrowRight")}
                aria-label="Right"
                tabIndex={0}
              >
                →
              </button>
            </div>
          </div>
          {gameOver && (
            <div className="mobile-restart-btn">
              <button className="restart-btn" onClick={startGame}>
                Restart
              </button>
            </div>
          )}
        </div>
        <footer className="snake-footer">
          <span>Modern Snake Game &copy; 2024</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
