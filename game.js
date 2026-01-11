/**
 * BUSCAMINAS -
 *
 * Este archivo contiene toda la estructura lógica del juego Buscaminas:
 * - Inicialización del juego
 * - Manejo de eventos del usuario
 * - Lógica del juego
 * - Control del temporizador
 * - Manejo del estado del juego
 */

document.addEventListener("DOMContentLoaded", () => {
  // Elementos del DOM
  const boardElement = document.getElementById("board");
  const minesCountElement = document.getElementById("mines-count");
  const timeElement = document.getElementById("time");
  const bestTimeElement = document.getElementById("best-time");
  const messageElement = document.getElementById("message");
  const newGameButton = document.getElementById("new-game");
  const difficultySelect = document.getElementById("difficulty");
  const customSettings = document.getElementById("custom-settings");
  const customRows = document.getElementById("custom-rows");
  const customCols = document.getElementById("custom-cols");
  const customMines = document.getElementById("custom-mines");

  // ============================================
  // CONFIGURACIÓN DEL JUEGO
  // Parámetros iniciales del juego que pueden cambiar según la dificultad
  // ============================================
  let config = {
    rows: 8,
    cols: 8,
    mines: 10,
    difficulty: "beginner",
  };

  // ============================================
  // ESTADO DEL JUEGO
  // Variables que guardan el estado actual del juego
  // ============================================
  let board = [];
  let revealedCount = 0;
  let gameOver = false;
  let gameStarted = false;
  let timer = null;
  let seconds = 0;
  let flagsPlaced = 0;

  // ============================================
  // INICIALIZACIÓN DEL JUEGO
  // Función que prepara el juego para comenzar
  // ============================================
  function initGame() {
    // Limpiar la clase win del body
    document.body.classList.remove("win");

    // Detener el temporizador anterior si existe
    if (timer) clearInterval(timer);

    // Reiniciar el estado del juego
    gameOver = false;
    gameStarted = false;
    seconds = 0;
    timeElement.textContent = "0";
    messageElement.textContent = "";
    messageElement.className = "message";

    // Configurar el tablero
    setupBoard();

    // Actualizar el contador de minas
    updateMinesCount();

    // Actualizar el mejor tiempo
    updateBestTime();
  }

  // ============================================
  // CONFIGURACIÓN DEL TABLERO
  // Crea la estructura del tablero según la dificultad seleccionada
  // ============================================
  function setupBoard() {
    // Limpiar el tablero
    board = [];
    boardElement.innerHTML = "";
    revealedCount = 0;
    flagsPlaced = 0;

    // Configurar tamaño según dificultad
    switch (config.difficulty) {
      case "beginner":
        config.rows = 8;
        config.cols = 8;
        config.mines = 10;
        break;
      case "intermediate":
        config.rows = 12;
        config.cols = 12;
        config.mines = 30;
        break;
      case "expert":
        config.rows = 16;
        config.cols = 16;
        config.mines = 60;
        break;
      case "custom":
        config.rows = parseInt(customRows.value) || 10;
        config.cols = parseInt(customCols.value) || 10;
        const maxMines = Math.floor(config.rows * config.cols * 0.35);
        config.mines = Math.min(parseInt(customMines.value) || 10, maxMines);
        break;
    }

    // Asegurar que no haya más minas que celdas
    config.mines = Math.min(config.mines, config.rows * config.cols - 1);

    // Ajustar el grid CSS
    boardElement.style.gridTemplateColumns = `repeat(${config.cols}, 1fr)`;

    // Crear celdas
    for (let i = 0; i < config.rows; i++) {
      const row = [];
      for (let j = 0; j < config.cols; j++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.row = i;
        cell.dataset.col = j;

        // Eventos del ratón
        cell.addEventListener("click", handleCellClick);
        cell.addEventListener("contextmenu", handleRightClick);
        cell.addEventListener("contextmenu", (e) => e.preventDefault());

        boardElement.appendChild(cell);

        row.push({
          element: cell,
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          adjacentMines: 0,
        });
      }
      board.push(row);
    }
  }

  // ============================================
  // COLOCACIÓN DE MINAS
  // Evita la primera celda y las adyacentes
  // ============================================
  function placeMines(firstClickRow, firstClickCol) {
    let minesPlaced = 0;

    while (minesPlaced < config.mines) {
      const row = Math.floor(Math.random() * config.rows);
      const col = Math.floor(Math.random() * config.cols);

      const isFirstClickAdjacent =
        Math.abs(row - firstClickRow) <= 1 &&
        Math.abs(col - firstClickCol) <= 1;

      if (!board[row][col].isMine && !isFirstClickAdjacent) {
        board[row][col].isMine = true;
        minesPlaced++;
      }
    }

    calculateAdjacentMines();
  }

  // ============================================
  // CÁLCULO DE MINAS ADYACENTES
  // ============================================
  function calculateAdjacentMines() {
    for (let i = 0; i < config.rows; i++) {
      for (let j = 0; j < config.cols; j++) {
        if (!board[i][j].isMine) {
          let count = 0;

          for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
              if (di === 0 && dj === 0) continue;

              const ni = i + di;
              const nj = j + dj;

              if (
                ni >= 0 &&
                ni < config.rows &&
                nj >= 0 &&
                nj < config.cols &&
                board[ni][nj].isMine
              ) {
                count++;
              }
            }
          }
          board[i][j].adjacentMines = count;
        }
      }
    }
  }

  // ============================================
  // MANEJO DE CLIC IZQUIERDO
  // ============================================
  function handleCellClick(e) {
    if (gameOver) return;

    const cellElement = e.target;
    const row = parseInt(cellElement.dataset.row);
    const col = parseInt(cellElement.dataset.col);
    const cell = board[row][col];

    if (cell.isRevealed || cell.isFlagged) return;

    if (!gameStarted) {
      startGame(row, col);
    }

    if (cell.isMine) {
      gameOver = true;
      revealAllMines();
      cellElement.classList.add("mine");
      endGame(false);
      return;
    }

    revealCell(row, col);

    if (revealedCount === config.rows * config.cols - config.mines) {
      endGame(true);
    }
  }

  // ============================================
  // MANEJO DE CLIC DERECHO (BANDERAS)
  // ============================================
  function handleRightClick(e) {
    e.preventDefault();

    if (gameOver || !gameStarted) return;

    const cellElement = e.target;
    const row = parseInt(cellElement.dataset.row);
    const col = parseInt(cellElement.dataset.col);
    const cell = board[row][col];

    if (cell.isRevealed) return;

    if (cell.isFlagged) {
      cell.isFlagged = false;
      cellElement.classList.remove("flagged");
      flagsPlaced--;
    } else {
      if (flagsPlaced >= config.mines) return;
      cell.isFlagged = true;
      cellElement.classList.add("flagged");
      flagsPlaced++;
    }

    updateMinesCount();
  }

  // ============================================
  // INICIO DEL JUEGO Y TEMPORIZADOR
  // ============================================
  function startGame(row, col) {
    gameStarted = true;
    placeMines(row, col);
    startTimer();
  }

  function startTimer() {
    timer = setInterval(() => {
      seconds++;
      timeElement.textContent = seconds;
    }, 1000);
  }

  // ============================================
  // REVELADO DE CELDAS
  // ============================================
  function revealCell(row, col) {
    if (row < 0 || row >= config.rows || col < 0 || col >= config.cols) return;

    const cell = board[row][col];
    if (cell.isRevealed || cell.isFlagged) return;

    cell.isRevealed = true;
    cell.element.classList.add("revealed");
    revealedCount++;

    if (cell.adjacentMines > 0) {
      cell.element.textContent = cell.adjacentMines;
      cell.element.classList.add(`adjacent-${cell.adjacentMines}`);
    } else {
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          if (di !== 0 || dj !== 0) {
            revealCell(row + di, col + dj);
          }
        }
      }
    }
  }

  // ============================================
  // REVELAR TODAS LAS MINAS
  // ============================================
  function revealAllMines() {
    for (let i = 0; i < config.rows; i++) {
      for (let j = 0; j < config.cols; j++) {
        if (board[i][j].isMine) {
          board[i][j].element.classList.add("mine");
        }
      }
    }
  }

  function updateMinesCount() {
    minesCountElement.textContent = config.mines - flagsPlaced;
  }

  function updateBestTime() {
    const bestTime = localStorage.getItem(
      `minesweeper_best_${config.difficulty}`
    );
    bestTimeElement.textContent = bestTime ? `${bestTime}s` : "";
  }

  // ============================================
  // FINALIZAR EL JUEGO
  // OPCIÓN A: MOSTRAR 🏆 EN LAS MINAS AL GANAR
  // ============================================
  function endGame(isWin) {
    gameOver = true;
    clearInterval(timer);

    if (isWin) {
      document.body.classList.add("win");
      messageElement.textContent = "¡Felicidades! ¡Has ganado!";
      messageElement.className = "message win";

      const bestKey = `minesweeper_best_${config.difficulty}`;
      const bestTime = localStorage.getItem(bestKey);

      if (!bestTime || seconds < parseInt(bestTime)) {
        localStorage.setItem(bestKey, seconds.toString());
        updateBestTime();
      }

      // 🏆 Mostrar copa en TODAS las minas
      for (let i = 0; i < config.rows; i++) {
        for (let j = 0; j < config.cols; j++) {
          const cell = board[i][j];
          if (cell.isMine) {
            cell.element.classList.add("flagged");
            cell.element.textContent = "🏆";
          }
        }
      }
    } else {
      document.body.classList.remove("win");
      messageElement.textContent = "¡Game Over! Inténtalo de nuevo.";
      messageElement.className = "message game-over";
      revealAllMines();
    }
  }

  // ============================================
  // EVENTOS
  // ============================================
  newGameButton.addEventListener("click", initGame);

  difficultySelect.addEventListener("change", (e) => {
    config.difficulty = e.target.value;
    customSettings.style.display =
      config.difficulty === "custom" ? "flex" : "none";
  });

  customMines.addEventListener("input", (e) => {
    const maxMines = Math.floor(config.rows * config.cols * 0.35);
    if (parseInt(e.target.value) > maxMines) {
      e.target.value = maxMines;
    }
  });

  // Iniciar el juego
  initGame();
});
