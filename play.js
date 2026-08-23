import {
    auth,
    db,
    onAuthStateChanged,
    doc,
    getDoc,
    setDoc
} from "./firebase.js";

import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    updateDoc,
    serverTimestamp,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   CCHESS 2.0
   PLAY ENGINE
========================================================= */


/* =========================================================
   DOM
========================================================= */

const boardElement = document.getElementById("chessBoard");
const moveHistoryElement = document.getElementById("moveHistory");
const moveCountElement = document.getElementById("moveCount");

const turnElement = document.getElementById("turn");
const turnDescriptionElement = document.getElementById("turnDescription");

const whiteClockElement =
    document.getElementById("whiteClock") ||
    document.querySelector("#whiteClock");

const blackClockElement =
    document.getElementById("blackClock") ||
    document.querySelector("#blackClock");

const gameOverModal = document.getElementById("gameOverModal");
const confirmModal = document.getElementById("confirmModal");

const gameOverTitle = document.getElementById("gameOverTitle");
const gameOverMessage = document.getElementById("gameOverMessage");

const newGameButton =
    document.getElementById("newGame") ||
    document.getElementById("restartGame");

const restartButton =
    document.getElementById("restartGame") ||
    document.getElementById("newGame");

const flipButton = document.getElementById("flipBoard");
const resignButton = document.getElementById("resignGame");
const drawButton = document.getElementById("offerDraw");

const closeGameOver =
    document.getElementById("closeGameOver") ||
    gameOverModal?.querySelector(".close-button");

const closeConfirm =
    document.getElementById("closeConfirm") ||
    confirmModal?.querySelector(".close-button");


/* =========================================================
   GAME STATE
========================================================= */

const EMPTY = null;

const initialBoard = [
    ["br", "bn", "bb", "bq", "bk", "bb", "bn", "br"],
    ["bp", "bp", "bp", "bp", "bp", "bp", "bp", "bp"],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ["wp", "wp", "wp", "wp", "wp", "wp", "wp", "wp"],
    ["wr", "wn", "wb", "wq", "wk", "wb", "wn", "wr"]
];

let board = cloneBoard(initialBoard);

let currentTurn = "w";
let selectedSquare = null;
let legalMoves = [];
let boardFlipped = false;

let moveHistory = [];
let positionHistory = [];

let gameStarted = false;
let gameFinished = false;

let enPassantTarget = null;

let castlingRights = {
    wK: true,
    wQ: true,
    bK: true,
    bQ: true
};

let clocks = {
    w: 600,
    b: 600
};

let activeClock = null;
let clockInterval = null;

let currentUser = null;
let profile = null;

let onlineGameId = null;
let onlineUnsubscribe = null;

let localPlayerColor = "w";

let pendingPromotion = null;

let stats = {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    rating: 1200,
    highestRating: 1200,
    winStreak: 0,
    bestWinStreak: 0
};

let achievements = [];

let settings = {
    boardTheme: "classic",
    animations: true,
    sounds: true
};


/* =========================================================
   PIECES
========================================================= */

const PIECES = {
    wp: "♙",
    wr: "♖",
    wn: "♘",
    wb: "♗",
    wq: "♕",
    wk: "♔",

    bp: "♟",
    br: "♜",
    bn: "♞",
    bb: "♝",
    bq: "♛",
    bk: "♚"
};


/* =========================================================
   UTILITIES
========================================================= */

function cloneBoard(value) {
    return value.map(row => [...row]);
}

function pieceColor(piece) {
    if (!piece) return null;
    return piece[0];
}

function pieceType(piece) {
    if (!piece) return null;
    return piece[1];
}

function opposite(color) {
    return color === "w" ? "b" : "w";
}

function squareName(row, col) {
    return `${String.fromCharCode(97 + col)}${8 - row}`;
}

function parseSquare(square) {
    return {
        row: 8 - Number(square[1]),
        col: square.charCodeAt(0) - 97
    };
}

function isInside(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function cloneCastlingRights() {
    return { ...castlingRights };
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


/* =========================================================
   BOARD RENDERING
========================================================= */

function renderBoard() {
    if (!boardElement) return;

    boardElement.innerHTML = "";

    for (let visualRow = 0; visualRow < 8; visualRow++) {
        for (let visualCol = 0; visualCol < 8; visualCol++) {

            const row = boardFlipped ? 7 - visualRow : visualRow;
            const col = boardFlipped ? 7 - visualCol : visualCol;

            const square = document.createElement("div");

            square.className =
                `square ${(row + col) % 2 === 0 ? "light" : "dark"}`;

            square.dataset.row = row;
            square.dataset.col = col;

            const squareKey = `${row}-${col}`;

            if (
                selectedSquare &&
                selectedSquare.row === row &&
                selectedSquare.col === col
            ) {
                square.classList.add("selected");
            }

            if (
                legalMoves.some(
                    move => move.row === row && move.col === col
                )
            ) {
                const targetPiece = board[row][col];

                square.classList.add(
                    targetPiece ? "capture" : "legal"
                );
            }

            const piece = board[row][col];

            if (piece) {
                const pieceElement = document.createElement("span");

                pieceElement.className =
                    `piece ${
                        pieceColor(piece) === "w"
                            ? "white-piece"
                            : "black-piece"
                    }`;

                pieceElement.textContent = PIECES[piece];

                square.appendChild(pieceElement);
            }

            const coordinateFile =
                boardFlipped
                    ? 7 - col === 7
                    : col === 7;

            const coordinateRank =
                boardFlipped
                    ? row === 0
                    : row === 0;

            if (coordinateFile) {
                const file = document.createElement("span");
                file.className = "coordinates coordinate-file";
                file.textContent =
                    String.fromCharCode(97 + col);
                square.appendChild(file);
            }

            if (coordinateRank) {
                const rank = document.createElement("span");
                rank.className = "coordinates coordinate-rank";
                rank.textContent = String(8 - row);
                square.appendChild(rank);
            }

            square.addEventListener("click", () => {
                handleSquareClick(row, col);
            });

            boardElement.appendChild(square);
        }
    }
}


/* =========================================================
   MOVE GENERATION
========================================================= */

function generatePseudoMoves(row, col, position = board) {

    const piece = position[row][col];

    if (!piece) return [];

    const color = pieceColor(piece);
    const type = pieceType(piece);

    const moves = [];

    const addMove = (r, c, extra = {}) => {
        if (!isInside(r, c)) return;

        const target = position[r][c];

        if (!target || pieceColor(target) !== color) {
            moves.push({
                row: r,
                col: c,
                ...extra
            });
        }
    };

    const addSlidingMoves = directions => {

        for (const [dr, dc] of directions) {

            let r = row + dr;
            let c = col + dc;

            while (isInside(r, c)) {

                const target = position[r][c];

                if (!target) {
                    moves.push({ row: r, col: c });
                } else {

                    if (pieceColor(target) !== color) {
                        moves.push({
                            row: r,
                            col: c
                        });
                    }

                    break;
                }

                r += dr;
                c += dc;
            }
        }
    };


    if (type === "p") {

        const direction = color === "w" ? -1 : 1;
        const startRow = color === "w" ? 6 : 1;

        const oneForward = row + direction;

        if (
            isInside(oneForward, col) &&
            !position[oneForward][col]
        ) {

            moves.push({
                row: oneForward,
                col
            });

            const twoForward = row + direction * 2;

            if (
                row === startRow &&
                !position[twoForward][col]
            ) {
                moves.push({
                    row: twoForward,
                    col,
                    doublePawn: true
                });
            }
        }

        for (const dc of [-1, 1]) {

            const r = row + direction;
            const c = col + dc;

            if (!isInside(r, c)) continue;

            const target = position[r][c];

            if (
                target &&
                pieceColor(target) !== color
            ) {
                moves.push({
                    row: r,
                    col: c
                });
            }

            if (
                enPassantTarget &&
                enPassantTarget.row === r &&
                enPassantTarget.col === c
            ) {
                moves.push({
                    row: r,
                    col: c,
                    enPassant: true
                });
            }
        }
    }


    if (type === "n") {

        const jumps = [
            [-2, -1],
            [-2, 1],
            [-1, -2],
            [-1, 2],
            [1, -2],
            [1, 2],
            [2, -1],
            [2, 1]
        ];

        for (const [dr, dc] of jumps) {
            addMove(row + dr, col + dc);
        }
    }


    if (type === "b") {

        addSlidingMoves([
            [-1, -1],
            [-1, 1],
            [1, -1],
            [1, 1]
        ]);
    }


    if (type === "r") {

        addSlidingMoves([
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1]
        ]);
    }


    if (type === "q") {

        addSlidingMoves([
            [-1, -1],
            [-1, 1],
            [1, -1],
            [1, 1],
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1]
        ]);
    }


    if (type === "k") {

        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {

                if (dr === 0 && dc === 0) continue;

                addMove(row + dr, col + dc);
            }
        }

        /* CASTLING */

        if (color === "w" && row === 7 && col === 4) {

            if (
                castlingRights.wK &&
                position[7][5] === null &&
                position[7][6] === null &&
                position[7][7] === "wr" &&
                !isSquareAttacked(position, 7, 4, "b") &&
                !isSquareAttacked(position, 7, 5, "b") &&
                !isSquareAttacked(position, 7, 6, "b")
            ) {
                moves.push({
                    row: 7,
                    col: 6,
                    castle: "K"
                });
            }

            if (
                castlingRights.wQ &&
                position[7][1] === null &&
                position[7][2] === null &&
                position[7][3] === null &&
                position[7][0] === "wr" &&
                !isSquareAttacked(position, 7, 4, "b") &&
                !isSquareAttacked(position, 7, 3, "b") &&
                !isSquareAttacked(position, 7, 2, "b")
            ) {
                moves.push({
                    row: 7,
                    col: 2,
                    castle: "Q"
                });
            }
        }


        if (color === "b" && row === 0 && col === 4) {

            if (
                castlingRights.bK &&
                position[0][5] === null &&
                position[0][6] === null &&
                position[0][7] === "br" &&
                !isSquareAttacked(position, 0, 4, "w") &&
                !isSquareAttacked(position, 0, 5, "w") &&
                !isSquareAttacked(position, 0, 6, "w")
            ) {
                moves.push({
                    row: 0,
                    col: 6,
                    castle: "K"
                });
            }

            if (
                castlingRights.bQ &&
                position[0][1] === null &&
                position[0][2] === null &&
                position[0][3] === null &&
                position[0][0] === "br" &&
                !isSquareAttacked(position, 0, 4, "w") &&
                !isSquareAttacked(position, 0, 3, "w") &&
                !isSquareAttacked(position, 0, 2, "w")
            ) {
                moves.push({
                    row: 0,
                    col: 2,
                    castle: "Q"
                });
            }
        }
    }

    return moves;
}


/* =========================================================
   ATTACK DETECTION
========================================================= */

function isSquareAttacked(position, row, col, byColor) {

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {

            const piece = position[r][c];

            if (!piece || pieceColor(piece) !== byColor) {
                continue;
            }

            const type = pieceType(piece);

            if (type === "p") {

                const direction =
                    byColor === "w" ? -1 : 1;

                if (
                    r + direction === row &&
                    Math.abs(c - col) === 1
                ) {
                    return true;
                }

                continue;
            }

            if (type === "k") {

                if (
                    Math.abs(r - row) <= 1 &&
                    Math.abs(c - col) <= 1
                ) {
                    return true;
                }

                continue;
            }

            const pseudo = generatePseudoMoves(r, c, position);

            if (
                pseudo.some(
                    move =>
                        move.row === row &&
                        move.col === col
                )
            ) {
                return true;
            }
        }
    }

    return false;
}


function findKing(position, color) {

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {

            if (position[row][col] === `${color}k`) {
                return { row, col };
            }
        }
    }

    return null;
}


function isInCheck(position, color) {

    const king = findKing(position, color);

    if (!king) return true;

    return isSquareAttacked(
        position,
        king.row,
        king.col,
        opposite(color)
    );
}


/* =========================================================
   MAKE / UNMAKE MOVE
========================================================= */

function simulateMove(position, from, move) {

    const next = cloneBoard(position);

    const piece = next[from.row][from.col];

    next[from.row][from.col] = null;

    if (move.enPassant) {

        const direction =
            pieceColor(piece) === "w" ? 1 : -1;

        next[move.row + direction][move.col] = null;
    }

    next[move.row][move.col] = piece;

    if (move.castle === "K") {

        const row = move.row;

        next[row][5] = next[row][7];
        next[row][7] = null;
    }

    if (move.castle === "Q") {

        const row = move.row;

        next[row][3] = next[row][0];
        next[row][0] = null;
    }

    return next;
}


function generateLegalMoves(row, col) {

    const piece = board[row][col];

    if (!piece) return [];

    const color = pieceColor(piece);

    const pseudo = generatePseudoMoves(row, col);

    return pseudo.filter(move => {

        const next = simulateMove(
            board,
            { row, col },
            move
        );

        return !isInCheck(next, color);
    });
}


function allLegalMoves(color) {

    const result = [];

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {

            const piece = board[row][col];

            if (
                piece &&
                pieceColor(piece) === color
            ) {

                for (const move of generateLegalMoves(row, col)) {

                    result.push({
                        from: { row, col },
                        to: move
                    });
                }
            }
        }
    }

    return result;
}


/* =========================================================
   CASTLING / SPECIAL RULES
========================================================= */

function updateCastlingRights(piece, from, to) {

    if (piece === "wk") {
        castlingRights.wK = false;
        castlingRights.wQ = false;
    }

    if (piece === "bk") {
        castlingRights.bK = false;
        castlingRights.bQ = false;
    }

    if (piece === "wr") {

        if (from.row === 7 && from.col === 0)
            castlingRights.wQ = false;

        if (from.row === 7 && from.col === 7)
            castlingRights.wK = false;
    }

    if (piece === "br") {

        if (from.row === 0 && from.col === 0)
            castlingRights.bQ = false;

        if (from.row === 0 && from.col === 7)
            castlingRights.bK = false;
    }

    const captured = board[to.row][to.col];

    if (captured === "wr") {

        if (to.row === 7 && to.col === 0)
            castlingRights.wQ = false;

        if (to.row === 7 && to.col === 7)
            castlingRights.wK = false;
    }

    if (captured === "br") {

        if (to.row === 0 && to.col === 0)
            castlingRights.bQ = false;

        if (to.row === 0 && to.col === 7)
            castlingRights.bK = false;
    }
}


/* =========================================================
   MOVE EXECUTION
========================================================= */

async function makeMove(from, move, promotion = "q") {

    if (gameFinished) return;

    const piece = board[from.row][from.col];

    if (!piece) return;

    const movingColor = pieceColor(piece);

    if (movingColor !== currentTurn) return;

    const destinationPiece = board[move.row][move.col];

    updateCastlingRights(piece, from, move);

    board = simulateMove(board, from, move);

    /* PROMOTION */

    if (
        pieceType(piece) === "p" &&
        (move.row === 0 || move.row === 7)
    ) {
        board[move.row][move.col] =
            `${movingColor}${promotion}`;
    }

    /* EN PASSANT TARGET */

    enPassantTarget = null;

    if (
        pieceType(piece) === "p" &&
        Math.abs(move.row - from.row) === 2
    ) {
        enPassantTarget = {
            row: (move.row + from.row) / 2,
            col: move.col
        };
    }

    /* HISTORY */

    const notation = createNotation(
        piece,
        from,
        move,
        destinationPiece,
        promotion
    );

    moveHistory.push({
        from: { ...from },
        to: { ...move },
        piece,
        captured: destinationPiece,
        notation,
        color: movingColor,
        timestamp: Date.now()
    });

    positionHistory.push({
        board: cloneBoard(board),
        castlingRights: cloneCastlingRights(),
        enPassantTarget: enPassantTarget
            ? { ...enPassantTarget }
            : null
    });

    currentTurn = opposite(currentTurn);

    selectedSquare = null;
    legalMoves = [];

    gameStarted = true;

    stopClock();
    startClock();

    renderBoard();
    renderMoveHistory();
    updateTurnUI();

    await saveOnlineMove();

    await checkGameState();

    saveLocalGameState();
}


/* =========================================================
   NOTATION
========================================================= */

function createNotation(
    piece,
    from,
    move,
    captured,
    promotion
) {

    if (move.castle === "K") return "O-O";
    if (move.castle === "Q") return "O-O-O";

    const type = pieceType(piece);

    const letters = {
        p: "",
        n: "N",
        b: "B",
        r: "R",
        q: "Q",
        k: "K"
    };

    let notation = letters[type];

    if (captured) {

        if (type === "p") {
            notation += String.fromCharCode(97 + from.col);
        }

        notation += "x";
    }

    notation += squareName(move.row, move.col);

    if (
        type === "p" &&
        (move.row === 0 || move.row === 7)
    ) {
        notation += `=${promotion.toUpperCase()}`;
    }

    return notation;
}


/* =========================================================
   USER INTERACTION
========================================================= */

function handleSquareClick(row, col) {

    if (gameFinished) return;

    if (
        onlineGameId &&
        currentTurn !== localPlayerColor
    ) {
        return;
    }

    const piece = board[row][col];

    if (selectedSquare) {

        const selectedMove = legalMoves.find(
            move =>
                move.row === row &&
                move.col === col
        );

        if (selectedMove) {

            if (
                pieceType(
                    board[
                        selectedSquare.row
                    ][
                        selectedSquare.col
                    ]
                ) === "p" &&
                (row === 0 || row === 7)
            ) {

                pendingPromotion = {
                    from: { ...selectedSquare },
                    move: selectedMove
                };

                showPromotionChooser();

                return;
            }

            makeMove(
                { ...selectedSquare },
                selectedMove
            );

            return;
        }
    }

    if (
        piece &&
        pieceColor(piece) === currentTurn
    ) {

        selectedSquare = { row, col };

        legalMoves = generateLegalMoves(
            row,
            col
        );

        renderBoard();

        return;
    }

    selectedSquare = null;
    legalMoves = [];

    renderBoard();
}


/* =========================================================
   PROMOTION
========================================================= */

function showPromotionChooser() {

    const existing =
        document.getElementById("promotionModal");

    if (existing) existing.remove();

    const modal = document.createElement("div");

    modal.id = "promotionModal";

    modal.className = "modal-backdrop";

    modal.innerHTML = `
        <div class="game-over-modal glass">
            <div class="game-over-icon">♛</div>

            <span class="section-label">
                PROMOTION
            </span>

            <h2>Choose a piece</h2>

            <p>
                Select the piece you want your pawn
                to become.
            </p>

            <div class="promotion-options"
                 style="
                    display:grid;
                    grid-template-columns:repeat(4,1fr);
                    gap:8px;
                    margin-top:22px;
                 ">
                <button class="primary-action" data-piece="q">♛</button>
                <button class="secondary-action" data-piece="r">♜</button>
                <button class="secondary-action" data-piece="b">♝</button>
                <button class="secondary-action" data-piece="n">♞</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelectorAll("[data-piece]").forEach(button => {

        button.addEventListener("click", () => {

            const promotion =
                button.dataset.piece;

            modal.remove();

            if (pendingPromotion) {

                makeMove(
                    pendingPromotion.from,
                    pendingPromotion.move,
                    promotion
                );
            }

            pendingPromotion = null;
        });
    });
}


/* =========================================================
   MOVE HISTORY UI
========================================================= */

function renderMoveHistory() {

    if (!moveHistoryElement) return;

    if (!moveHistory.length) {

        moveHistoryElement.innerHTML = `
            <div class="empty-moves">
                <div class="empty-icon">♟</div>

                <p>
                    Your moves will appear here
                    once the game begins.
                </p>
            </div>
        `;

        if (moveCountElement) {
            moveCountElement.textContent = "0 moves";
        }

        return;
    }

    const rows = [];

    for (
        let i = 0;
        i < moveHistory.length;
        i += 2
    ) {

        const white = moveHistory[i];
        const black = moveHistory[i + 1];

        rows.push(`
            <div class="move-row">
                <span class="move-number">
                    ${Math.floor(i / 2) + 1}.
                </span>

                <span class="move ${
                    !black ? "latest" : ""
                }">
                    ${white?.notation || ""}
                </span>

                <span class="move ${
                    black && i + 1 === moveHistory.length
                        ? "latest"
                        : ""
                }">
                    ${black?.notation || ""}
                </span>
            </div>
        `);
    }

    moveHistoryElement.innerHTML =
        rows.join("");

    moveHistoryElement.scrollTop =
        moveHistoryElement.scrollHeight;

    if (moveCountElement) {

        const count = moveHistory.length;

        moveCountElement.textContent =
            `${count} move${count === 1 ? "" : "s"}`;
    }
}


/* =========================================================
   TURN UI
========================================================= */

function updateTurnUI() {

    const name =
        currentTurn === "w"
            ? "White"
            : "Black";

    if (turnElement) {
        turnElement.textContent =
            `${name}'s turn`;
    }

    if (turnDescriptionElement) {

        turnDescriptionElement.textContent =
            currentTurn === localPlayerColor
                ? "Your move."
                : "Waiting for your opponent.";
    }
}


/* =========================================================
   CLOCKS
========================================================= */

function startClock() {

    if (clockInterval || gameFinished) return;

    activeClock = currentTurn;

    clockInterval = setInterval(() => {

        if (clocks[activeClock] <= 0) {

            clocks[activeClock] = 0;

            updateClockUI();

            stopClock();

            finishGame(
                opposite(activeClock),
                "Time"
            );

            return;
        }

        clocks[activeClock]--;

        updateClockUI();

    }, 1000);
}


function stopClock() {

    if (clockInterval) {
        clearInterval(clockInterval);
        clockInterval = null;
    }
}


function updateClockUI() {

    const format = seconds => {

        const mins =
            Math.floor(seconds / 60);

        const secs =
            seconds % 60;

        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    };

    if (whiteClockElement) {
        whiteClockElement.textContent =
            format(clocks.w);
    }

    if (blackClockElement) {
        blackClockElement.textContent =
            format(clocks.b);
    }
}


/* =========================================================
   GAME STATE
========================================================= */

async function checkGameState() {

    const legal = allLegalMoves(currentTurn);

    const check =
        isInCheck(board, currentTurn);

    if (!legal.length) {

        if (check) {

            finishGame(
                opposite(currentTurn),
                "Checkmate"
            );

        } else {

            finishDraw("Stalemate");
        }

        return;
    }

    if (check) {

        if (turnDescriptionElement) {
            turnDescriptionElement.textContent =
                currentTurn === localPlayerColor
                    ? "You are in check."
                    : "Opponent is in check.";
        }
    }
}


function finishGame(winner, reason) {

    if (gameFinished) return;

    gameFinished = true;

    stopClock();

    const playerWon =
        winner === localPlayerColor;

    if (reason === "Checkmate") {

        showGameOver(
            playerWon
                ? "Checkmate!"
                : "Checkmate",
            playerWon
                ? "You won the game."
                : "Your opponent won the game."
        );
    }

    if (reason === "Time") {

        showGameOver(
            playerWon
                ? "Time!",
            playerWon
                ? "Your opponent ran out of time."
                : "You ran out of time."
        );
    }

    updateStats(
        playerWon ? "win" : "loss"
    );

    saveCompletedGame(
        playerWon ? "win" : "loss"
    );
}


function finishDraw(reason = "Draw") {

    if (gameFinished) return;

    gameFinished = true;

    stopClock();

    showGameOver(
        "Draw",
        reason
    );

    updateStats("draw");

    saveCompletedGame("draw");
}


/* =========================================================
   GAME OVER MODAL
========================================================= */

function showGameOver(title, message) {

    if (gameOverTitle) {
        gameOverTitle.textContent = title;
    }

    if (gameOverMessage) {
        gameOverMessage.textContent = message;
    }

    if (gameOverModal) {
        gameOverModal.classList.remove("hidden");
    }
}


function hideModal(modal) {

    if (modal) {
        modal.classList.add("hidden");
    }
}


/* =========================================================
   RESTART
========================================================= */

function resetGame() {

    stopClock();

    board = cloneBoard(initialBoard);

    currentTurn = "w";

    selectedSquare = null;
    legalMoves = [];

    moveHistory = [];
    positionHistory = [];

    enPassantTarget = null;

    castlingRights = {
        wK: true,
        wQ: true,
        bK: true,
        bQ: true
    };

    clocks = {
        w: 600,
        b: 600
    };

    gameStarted = false;
    gameFinished = false;

    pendingPromotion = null;

    hideModal(gameOverModal);
    hideModal(confirmModal);

    renderBoard();
    renderMoveHistory();
    updateClockUI();
    updateTurnUI();

    saveLocalGameState();
}


/* =========================================================
   RESIGN
========================================================= */

function resignGame() {

    if (gameFinished) return;

    finishGame(
        opposite(localPlayerColor),
        "Resignation"
    );
}


/* =========================================================
   DRAW
========================================================= */

function offerDraw() {

    if (gameFinished) return;

    if (onlineGameId) {

        sendDrawOffer();

        return;
    }

    finishDraw("Draw agreed");
}


/* =========================================================
   FIREBASE PROFILE
========================================================= */

onAuthStateChanged(auth, async user => {

    currentUser = user;

    if (!user) {

        profile = null;

        return;
    }

    await loadProfile(user.uid);

    await ensureProfile(user);

    await loadSettings();

    await checkAchievements();
});


async function ensureProfile(user) {

    const ref =
        doc(db, "users", user.uid);

    const snapshot =
        await getDoc(ref);

    if (snapshot.exists()) {

        profile = {
            ...snapshot.data(),
            uid: user.uid
        };

        if (profile.stats) {
            stats = {
                ...stats,
                ...profile.stats
            };
        }

        return;
    }

    profile = {
        uid: user.uid,
        username:
            user.displayName ||
            user.email?.split("@")[0] ||
            "Player",

        email: user.email || "",

        stats,

        achievements: [],

        settings
    };

    await setDoc(ref, profile);
}


async function loadProfile(uid) {

    try {

        const snapshot =
            await getDoc(
                doc(db, "users", uid)
            );

        if (!snapshot.exists()) return;

        profile = {
            uid,
            ...snapshot.data()
        };

        if (profile.stats) {
            stats = {
                ...stats,
                ...profile.stats
            };
        }

        if (profile.settings) {
            settings = {
                ...settings,
                ...profile.settings
            };
        }

        achievements =
            profile.achievements || [];

    } catch (error) {

        console.error(
            "CCHESS profile error:",
            error
        );
    }
}


/* =========================================================
   STATS
========================================================= */

async function updateStats(result) {

    if (!currentUser) return;

    if (result === "win") {

        stats.gamesPlayed++;
        stats.wins++;
        stats.winStreak++;

        stats.bestWinStreak =
            Math.max(
                stats.bestWinStreak,
                stats.winStreak
            );

        stats.rating += 10;

    } else if (result === "loss") {

        stats.gamesPlayed++;
        stats.losses++;

        stats.winStreak = 0;

        stats.rating =
            Math.max(100, stats.rating - 10);

    } else {

        stats.gamesPlayed++;
        stats.draws++;
    }

    stats.highestRating =
        Math.max(
            stats.highestRating,
            stats.rating
        );

    try {

        await updateDoc(
            doc(db, "users", currentUser.uid),
            {
                stats
            }
        );

    } catch (error) {

        console.error(
            "Could not save stats:",
            error
        );
    }
}


/* =========================================================
   ACHIEVEMENTS
========================================================= */

const ACHIEVEMENTS = {

    firstWin: {
        id: "first-win",
        title: "First Victory",
        description: "Win your first game."
    },

    firstCheckmate: {
        id: "first-checkmate",
        title: "Checkmate",
        description: "Win by checkmate."
    },

    fiveWins: {
        id: "five-wins",
        title: "Getting Started",
        description: "Win five games."
    },

    tenWins: {
        id: "ten-wins",
        title: "Chess Regular",
        description: "Win ten games."
    },

    streakFive: {
        id: "five-streak",
        title: "On Fire",
        description: "Reach a five-game win streak."
    },

    rating1500: {
        id: "rating-1500",
        title: "1500 Club",
        description: "Reach a 1500 rating."
    }
};


async function checkAchievements() {

    if (!currentUser) return;

    const unlocked =
        new Set(achievements);

    const unlock = async achievement => {

        if (unlocked.has(achievement.id)) {
            return;
        }

        unlocked.add(achievement.id);

        achievements.push(
            achievement.id
        );

        try {

            await updateDoc(
                doc(
                    db,
                    "users",
                    currentUser.uid
                ),
                {
                    achievements:
                        arrayUnion(
                            achievement.id
                        )
                }
            );

            showAchievement(
                achievement
            );

        } catch (error) {

            console.error(
                "Achievement error:",
                error
            );
        }
    };


    if (stats.wins >= 1) {
        await unlock(
            ACHIEVEMENTS.firstWin
        );
    }

    if (stats.wins >= 5) {
        await unlock(
            ACHIEVEMENTS.fiveWins
        );
    }

    if (stats.wins >= 10) {
        await unlock(
            ACHIEVEMENTS.tenWins
        );
    }

    if (stats.winStreak >= 5) {
        await unlock(
            ACHIEVEMENTS.streakFive
        );
    }

    if (stats.rating >= 1500) {
        await unlock(
            ACHIEVEMENTS.rating1500
        );
    }
}


function showAchievement(achievement) {

    const toast = document.createElement("div");

    toast.style.cssText = `
        position:fixed;
        right:22px;
        bottom:22px;
        z-index:9999;
        padding:16px 18px;
        border-radius:18px;
        background:rgba(25,27,36,.92);
        border:1px solid rgba(255,255,255,.15);
        backdrop-filter:blur(20px);
        color:white;
        box-shadow:0 20px 50px rgba(0,0,0,.35);
        animation:cchessAchievementIn .3s ease;
    `;

    toast.innerHTML = `
        <div style="
            font-size:9px;
            letter-spacing:.15em;
            opacity:.45;
            font-weight:700;
        ">
            ACHIEVEMENT UNLOCKED
        </div>

        <strong style="
            display:block;
            margin-top:6px;
        ">
            ${achievement.title}
        </strong>

        <div style="
            margin-top:4px;
            font-size:11px;
            opacity:.6;
        ">
            ${achievement.description}
        </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4500);
}


/* =========================================================
   COMPLETED GAMES
========================================================= */

async function saveCompletedGame(result) {

    if (!currentUser) return;

    try {

        await addDoc(
            collection(db, "games"),
            {
                playerId:
                    currentUser.uid,

                playerColor:
                    localPlayerColor,

                result,

                moves:
                    moveHistory.map(
                        move => move.notation
                    ),

                moveCount:
                    moveHistory.length,

                startedAt:
                    serverTimestamp(),

                completedAt:
                    serverTimestamp(),

                rating:
                    stats.rating
            }
        );

        await checkAchievements();

    } catch (error) {

        console.error(
            "Could not save game:",
            error
        );
    }
}


/* =========================================================
   ONLINE MULTIPLAYER
========================================================= */

async function createOnlineGame() {

    if (!currentUser) {

        alert(
            "Log in to CCHESS before starting an online game."
        );

        return null;
    }

    try {

        const game = await addDoc(
            collection(db, "games"),
            {
                white: currentUser.uid,

                black: null,

                status: "waiting",

                turn: "w",

                board: cloneBoard(initialBoard),

                moves: [],

                clocks: {
                    w: 600,
                    b: 600
                },

                createdAt:
                    serverTimestamp()
            }
        );

        onlineGameId = game.id;

        localPlayerColor = "w";

        subscribeToOnlineGame(
            onlineGameId
        );

        return game.id;

    } catch (error) {

        console.error(
            "Could not create online game:",
            error
        );

        return null;
    }
}


async function quickMatch() {

    if (!currentUser) {

        alert(
            "Log in to use Quick Match."
        );

        return;
    }

    try {

        const waitingQuery = query(
            collection(db, "games"),
            where("status", "==", "waiting"),
            limit(10)
        );

        const snapshot =
            await getDocs(waitingQuery);

        const available =
            snapshot.docs.find(
                docSnap =>
                    docSnap.data().white !==
                    currentUser.uid
            );

        if (available) {

            await updateDoc(
                available.ref,
                {
                    black:
                        currentUser.uid,

                    status:
                        "active"
                }
            );

            onlineGameId =
                available.id;

            localPlayerColor = "b";

            subscribeToOnlineGame(
                onlineGameId
            );

            return;
        }

        await createOnlineGame();

    } catch (error) {

        console.error(
            "Quick Match error:",
            error
        );
    }
}


function subscribeToOnlineGame(gameId) {

    if (onlineUnsubscribe) {
        onlineUnsubscribe();
    }

    const ref =
        doc(db, "games", gameId);

    onlineUnsubscribe =
        onSnapshot(ref, snapshot => {

            if (!snapshot.exists()) return;

            const data =
                snapshot.data();

            if (
                data.white ===
                currentUser?.uid
            ) {
                localPlayerColor = "w";
            }

            if (
                data.black ===
                currentUser?.uid
            ) {
                localPlayerColor = "b";
            }

            if (
                data.board &&
                data.moves
            ) {

                board =
                    data.board.map(row => [...row]);

                moveHistory =
                    data.moves;

                currentTurn =
                    data.turn || "w";

                renderBoard();
                renderMoveHistory();
                updateTurnUI();
            }

            if (
                data.status ===
                "finished"
            ) {
                gameFinished = true;
                stopClock();
            }
        });
}


async function saveOnlineMove() {

    if (
        !onlineGameId ||
        !currentUser
    ) {
        return;
    }

    try {

        await updateDoc(
            doc(
                db,
                "games",
                onlineGameId
            ),
            {
                board: cloneBoard(board),

                turn: currentTurn,

                moves:
                    moveHistory.map(
                        move => ({
                            notation:
                                move.notation,

                            from:
                                move.from,

                            to:
                                move.to,

                            color:
                                move.color
                        })
                    ),

                clocks
            }
        );

    } catch (error) {

        console.error(
            "Could not sync move:",
            error
        );
    }
}


async function sendDrawOffer() {

    if (!onlineGameId) return;

    try {

        await updateDoc(
            doc(
                db,
                "games",
                onlineGameId
            ),
            {
                drawOffer:
                    currentUser.uid
            }
        );

    } catch (error) {

        console.error(
            "Draw offer error:",
            error
        );
    }
}


/* =========================================================
   REPLAY DATA
========================================================= */

function getReplayData() {

    return {
        moves: moveHistory.map(
            move => ({
                from: move.from,
                to: move.to,
                piece: move.piece,
                captured: move.captured,
                notation: move.notation
            })
        ),

        moveCount:
            moveHistory.length
    };
}


/* =========================================================
   SIMPLE GAME ANALYSIS
========================================================= */

function evaluateMaterial(position) {

    const values = {
        p: 1,
        n: 3,
        b: 3,
        r: 5,
        q: 9,
        k: 0
    };

    let score = 0;

    for (const row of position) {

        for (const piece of row) {

            if (!piece) continue;

            const value =
                values[pieceType(piece)];

            score +=
                pieceColor(piece) === "w"
                    ? value
                    : -value;
        }
    }

    return Number(
        score.toFixed(2)
    );
}


function analyzeCurrentGame() {

    const analysis = [];

    let previousScore = 0;

    for (let i = 0; i < positionHistory.length; i++) {

        const position =
            positionHistory[i].board;

        const score =
            evaluateMaterial(position);

        const difference =
            Math.abs(score - previousScore);

        let classification =
            "Good";

        if (difference >= 5) {
            classification = "Blunder";
        } else if (difference >= 3) {
            classification = "Mistake";
        } else if (difference >= 1.5) {
            classification = "Inaccuracy";
        }

        analysis.push({
            move:
                i + 1,

            evaluation:
                score,

            classification
        });

        previousScore = score;
    }

    return analysis;
}


/* =========================================================
   LOCAL GAME STORAGE
========================================================= */

function saveLocalGameState() {

    try {

        localStorage.setItem(
            "cchess-last-game",
            JSON.stringify({
                board,
                currentTurn,
                moveHistory,
                castlingRights,
                enPassantTarget,
                clocks
            })
        );

    } catch {
        /* Storage unavailable. */
    }
}


function loadLocalGameState() {

    try {

        const raw =
            localStorage.getItem(
                "cchess-last-game"
            );

        if (!raw) return;

        const saved =
            JSON.parse(raw);

        if (!saved.board) return;

        board =
            saved.board;

        currentTurn =
            saved.currentTurn || "w";

        moveHistory =
            saved.moveHistory || [];

        castlingRights =
            saved.castlingRights || {
                wK: true,
                wQ: true,
                bK: true,
                bQ: true
            };

        enPassantTarget =
            saved.enPassantTarget || null;

        clocks =
            saved.clocks || {
                w: 600,
                b: 600
            };

    } catch {
        resetGame();
    }
}


/* =========================================================
   SETTINGS / CUSTOMIZATION
========================================================= */

async function loadSettings() {

    if (!currentUser) return;

    try {

        const snapshot =
            await getDoc(
                doc(
                    db,
                    "users",
                    currentUser.uid
                )
            );

        if (!snapshot.exists()) return;

        const data =
            snapshot.data();

        if (data.settings) {

            settings = {
                ...settings,
                ...data.settings
            };
        }

        applySettings();

    } catch (error) {

        console.error(
            "Settings error:",
            error
        );
    }
}


function applySettings() {

    if (!boardElement) return;

    boardElement.dataset.theme =
        settings.boardTheme;
}


/* =========================================================
   BOARD FLIP
========================================================= */

function flipBoard() {

    boardFlipped =
        !boardFlipped;

    renderBoard();
}


/* =========================================================
   EVENT LISTENERS
========================================================= */

if (newGameButton) {
    newGameButton.addEventListener(
        "click",
        resetGame
    );
}

if (restartButton) {
    restartButton.addEventListener(
        "click",
        resetGame
    );
}

if (flipButton) {
    flipButton.addEventListener(
        "click",
        flipBoard
    );
}

if (resignButton) {
    resignButton.addEventListener(
        "click",
        resignGame
    );
}

if (drawButton) {
    drawButton.addEventListener(
        "click",
        offerDraw
    );
}

if (closeGameOver) {

    closeGameOver.addEventListener(
        "click",
        () => hideModal(gameOverModal)
    );
}

if (closeConfirm) {

    closeConfirm.addEventListener(
        "click",
        () => hideModal(confirmModal)
    );
}


/* =========================================================
   CCHESS SIDEBAR API
   These functions allow the new sidebar UI to
   control the actual game engine.
========================================================= */

window.CCHESS = {

    newGame: resetGame,

    flipBoard,

    resign: resignGame,

    offerDraw,

    quickMatch,

    createOnlineGame,

    analyzeGame:
        analyzeCurrentGame,

    getReplay:
        getReplayData,

    getStats:
        () => ({ ...stats }),

    getProfile:
        () => profile,

    getAchievements:
        () => [...achievements],

    getSettings:
        () => ({ ...settings }),

    getGameState: () => ({
        board: cloneBoard(board),
        turn: currentTurn,
        moves: [...moveHistory],
        finished: gameFinished,
        onlineGameId,
        localPlayerColor
    })
};


/* =========================================================
   INITIALIZE
========================================================= */

loadLocalGameState();

renderBoard();

renderMoveHistory();

updateClockUI();

updateTurnUI();

applySettings();

if (gameStarted) {
    startClock();
}

console.log(
    "%cCCHESS 2.0",
    "font-weight:800;font-size:20px"
);

console.log(
    "Chess engine initialized."
);
