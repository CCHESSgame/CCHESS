/* =========================================================
   CCHESS — PLAY ENGINE
   ========================================================= */

const boardElement = document.getElementById("chessBoard");
const gameStatus = document.getElementById("gameStatus");
const turnText = document.getElementById("turnText");
const turnDescription = document.getElementById("turnDescription");
const moveHistoryElement = document.getElementById("moveHistory");
const moveCountElement = document.getElementById("moveCount");

const newGameButton = document.getElementById("newGameButton");
const restartButton = document.getElementById("restartButton");
const flipBoardButton = document.getElementById("flipBoardButton");

const resignButton = document.getElementById("resignButton");
const drawButton = document.getElementById("drawButton");

const whiteClock = document.getElementById("whiteClock");
const blackClock = document.getElementById("blackClock");

const gameOverModal = document.getElementById("gameOverModal");
const gameOverTitle = document.getElementById("gameOverTitle");
const gameOverMessage = document.getElementById("gameOverMessage");
const gameOverRestart = document.getElementById("gameOverRestart");
const closeGameOver = document.getElementById("closeGameOver");

const resignModal = document.getElementById("resignModal");
const cancelResign = document.getElementById("cancelResign");
const confirmResign = document.getElementById("confirmResign");

const accountName = document.getElementById("accountName");


/* =========================================================
   PIECES
   ========================================================= */

const PIECES = {
    white: {
        king: "♔",
        queen: "♕",
        rook: "♖",
        bishop: "♗",
        knight: "♘",
        pawn: "♙"
    },

    black: {
        king: "♚",
        queen: "♛",
        rook: "♜",
        bishop: "♝",
        knight: "♞",
        pawn: "♟"
    }
};


/* =========================================================
   GAME STATE
   ========================================================= */

let board = [];
let currentTurn = "white";

let selectedSquare = null;

let legalMovesForSelected = [];

let boardFlipped = false;

let moveHistory = [];

let gameOver = false;

let enPassantTarget = null;

let castlingRights = {
    whiteKing: true,
    whiteQueen: true,
    blackKing: true,
    blackQueen: true
};


/* =========================================================
   CLOCKS
   ========================================================= */

const STARTING_TIME = 10 * 60;

let whiteTime = STARTING_TIME;
let blackTime = STARTING_TIME;

let clockInterval = null;


/* =========================================================
   INITIAL POSITION
   ========================================================= */

function createInitialBoard() {

    const emptyRow = () => Array(8).fill(null);

    const newBoard = [
        emptyRow(),
        emptyRow(),
        emptyRow(),
        emptyRow(),
        emptyRow(),
        emptyRow(),
        emptyRow(),
        emptyRow()
    ];

    const backRank = [
        "rook",
        "knight",
        "bishop",
        "queen",
        "king",
        "bishop",
        "knight",
        "rook"
    ];

    for (let col = 0; col < 8; col++) {

        newBoard[0][col] = {
            color: "black",
            type: backRank[col]
        };

        newBoard[1][col] = {
            color: "black",
            type: "pawn"
        };

        newBoard[6][col] = {
            color: "white",
            type: "pawn"
        };

        newBoard[7][col] = {
            color: "white",
            type: backRank[col]
        };
    }

    return newBoard;
}


/* =========================================================
   RESET GAME
   ========================================================= */

function resetGame() {

    board = createInitialBoard();

    currentTurn = "white";

    selectedSquare = null;

    legalMovesForSelected = [];

    moveHistory = [];

    gameOver = false;

    enPassantTarget = null;

    castlingRights = {
        whiteKing: true,
        whiteQueen: true,
        blackKing: true,
        blackQueen: true
    };

    whiteTime = STARTING_TIME;
    blackTime = STARTING_TIME;

    closeModal(gameOverModal);
    closeModal(resignModal);

    startClock();

    renderBoard();
    renderMoveHistory();
    updateGameUI();
}


/* =========================================================
   RENDER BOARD
   ========================================================= */

function renderBoard() {

    boardElement.innerHTML = "";

    const rowOrder = boardFlipped
        ? [7, 6, 5, 4, 3, 2, 1, 0]
        : [0, 1, 2, 3, 4, 5, 6, 7];

    const colOrder = boardFlipped
        ? [7, 6, 5, 4, 3, 2, 1, 0]
        : [0, 1, 2, 3, 4, 5, 6, 7];

    rowOrder.forEach(row => {

        colOrder.forEach(col => {

            const square = document.createElement("div");

            square.classList.add("square");

            const isLight = (row + col) % 2 === 0;

            square.classList.add(
                isLight ? "light" : "dark"
            );

            square.dataset.row = row;
            square.dataset.col = col;

            const piece = board[row][col];

            if (piece) {

                const pieceElement =
                    document.createElement("span");

                pieceElement.classList.add("piece");

                pieceElement.classList.add(
                    piece.color === "white"
                        ? "white-piece"
                        : "black-piece"
                );

                pieceElement.textContent =
                    PIECES[piece.color][piece.type];

                square.appendChild(pieceElement);
            }

            if (
                selectedSquare &&
                selectedSquare.row === row &&
                selectedSquare.col === col
            ) {
                square.classList.add("selected");
            }

            const isLegalMove =
                legalMovesForSelected.some(
                    move =>
                        move.row === row &&
                        move.col === col
                );

            if (isLegalMove) {

                if (board[row][col]) {
                    square.classList.add("capture");
                } else {
                    square.classList.add("legal");
                }
            }

            addCoordinates(
                square,
                row,
                col
            );

            square.addEventListener(
                "click",
                () => handleSquareClick(row, col)
            );

            boardElement.appendChild(square);
        });
    });
}


/* =========================================================
   BOARD COORDINATES
   ========================================================= */

function addCoordinates(square, row, col) {

    const actualFile =
        String.fromCharCode(97 + col);

    const actualRank =
        8 - row;

    if (
        (!boardFlipped && row === 7) ||
        (boardFlipped && row === 0)
    ) {

        const file = document.createElement("span");

        file.className =
            "coordinates coordinate-file";

        file.textContent = actualFile;

        square.appendChild(file);
    }

    if (
        (!boardFlipped && col === 0) ||
        (boardFlipped && col === 7)
    ) {

        const rank = document.createElement("span");

        rank.className =
            "coordinates coordinate-rank";

        rank.textContent = actualRank;

        square.appendChild(rank);
    }
}


/* =========================================================
   HANDLE CLICK
   ========================================================= */

function handleSquareClick(row, col) {

    if (gameOver) {
        return;
    }

    const piece = board[row][col];

    if (selectedSquare) {

        const isLegal =
            legalMovesForSelected.some(
                move =>
                    move.row === row &&
                    move.col === col
            );

        if (isLegal) {

            makeMove(
                selectedSquare.row,
                selectedSquare.col,
                row,
                col
            );

            return;
        }

        if (
            piece &&
            piece.color === currentTurn
        ) {

            selectSquare(row, col);

            return;
        }

        clearSelection();

        return;
    }

    if (
        piece &&
        piece.color === currentTurn
    ) {

        selectSquare(row, col);
    }
}


/* =========================================================
   SELECT PIECE
   ========================================================= */

function selectSquare(row, col) {

    const piece = board[row][col];

    if (!piece) {
        return;
    }

    if (piece.color !== currentTurn) {
        return;
    }

    selectedSquare = {
        row,
        col
    };

    legalMovesForSelected =
        getLegalMoves(row, col);

    renderBoard();
}


/* =========================================================
   CLEAR SELECTION
   ========================================================= */

function clearSelection() {

    selectedSquare = null;

    legalMovesForSelected = [];

    renderBoard();
}


/* =========================================================
   MOVE GENERATION
   ========================================================= */

function getLegalMoves(row, col) {

    const piece = board[row][col];

    if (!piece) {
        return [];
    }

    const pseudoMoves =
        getPseudoLegalMoves(
            row,
            col,
            board
        );

    return pseudoMoves.filter(move => {

        const simulated =
            cloneBoard(board);

        applyMoveToBoard(
            simulated,
            row,
            col,
            move.row,
            move.col
        );

        return !isKingInCheck(
            simulated,
            piece.color
        );
    });
}


/* =========================================================
   PSEUDO LEGAL MOVES
   ========================================================= */

function getPseudoLegalMoves(
    row,
    col,
    position
) {

    const piece = position[row][col];

    if (!piece) {
        return [];
    }

    switch (piece.type) {

        case "pawn":
            return getPawnMoves(
                row,
                col,
                piece,
                position
            );

        case "knight":
            return getKnightMoves(
                row,
                col,
                piece,
                position
            );

        case "bishop":
            return getSlidingMoves(
                row,
                col,
                piece,
                position,
                [
                    [1, 1],
                    [1, -1],
                    [-1, 1],
                    [-1, -1]
                ]
            );

        case "rook":
            return getSlidingMoves(
                row,
                col,
                piece,
                position,
                [
                    [1, 0],
                    [-1, 0],
                    [0, 1],
                    [0, -1]
                ]
            );

        case "queen":
            return getSlidingMoves(
                row,
                col,
                piece,
                position,
                [
                    [1, 1],
                    [1, -1],
                    [-1, 1],
                    [-1, -1],
                    [1, 0],
                    [-1, 0],
                    [0, 1],
                    [0, -1]
                ]
            );

        case "king":
            return getKingMoves(
                row,
                col,
                piece,
                position
            );

        default:
            return [];
    }
}


/* =========================================================
   PAWN
   ========================================================= */

function getPawnMoves(
    row,
    col,
    piece,
    position
) {

    const moves = [];

    const direction =
        piece.color === "white"
            ? -1
            : 1;

    const startingRow =
        piece.color === "white"
            ? 6
            : 1;

    const oneForward =
        row + direction;

    if (
        isInside(oneForward, col) &&
        !position[oneForward][col]
    ) {

        moves.push({
            row: oneForward,
            col
        });

        const twoForward =
            row + direction * 2;

        if (
            row === startingRow &&
            !position[twoForward][col]
        ) {

            moves.push({
                row: twoForward,
                col
            });
        }
    }

    for (const colOffset of [-1, 1]) {

        const targetRow =
            row + direction;

        const targetCol =
            col + colOffset;

        if (
            !isInside(
                targetRow,
                targetCol
            )
        ) {
            continue;
        }

        const target =
            position[targetRow][targetCol];

        if (
            target &&
            target.color !== piece.color
        ) {

            moves.push({
                row: targetRow,
                col: targetCol
            });
        }

        if (
            enPassantTarget &&
            enPassantTarget.row === targetRow &&
            enPassantTarget.col === targetCol
        ) {

            moves.push({
                row: targetRow,
                col: targetCol,
                enPassant: true
            });
        }
    }

    return moves;
}


/* =========================================================
   KNIGHT
   ========================================================= */

function getKnightMoves(
    row,
    col,
    piece,
    position
) {

    const moves = [];

    const offsets = [
        [2, 1],
        [2, -1],
        [-2, 1],
        [-2, -1],
        [1, 2],
        [1, -2],
        [-1, 2],
        [-1, -2]
    ];

    for (const [rowOffset, colOffset] of offsets) {

        const targetRow = row + rowOffset;
        const targetCol = col + colOffset;

        if (
            !isInside(
                targetRow,
                targetCol
            )
        ) {
            continue;
        }

        const target =
            position[targetRow][targetCol];

        if (
            !target ||
            target.color !== piece.color
        ) {

            moves.push({
                row: targetRow,
                col: targetCol
            });
        }
    }

    return moves;
}


/* =========================================================
   SLIDING PIECES
   ========================================================= */

function getSlidingMoves(
    row,
    col,
    piece,
    position,
    directions
) {

    const moves = [];

    for (const [rowDirection, colDirection] of directions) {

        let targetRow =
            row + rowDirection;

        let targetCol =
            col + colDirection;

        while (
            isInside(
                targetRow,
                targetCol
            )
        ) {

            const target =
                position[targetRow][targetCol];

            if (!target) {

                moves.push({
                    row: targetRow,
                    col: targetCol
                });

            } else {

                if (
                    target.color !== piece.color
                ) {

                    moves.push({
                        row: targetRow,
                        col: targetCol
                    });
                }

                break;
            }

            targetRow += rowDirection;
            targetCol += colDirection;
        }
    }

    return moves;
}


/* =========================================================
   KING
   ========================================================= */

function getKingMoves(
    row,
    col,
    piece,
    position
) {

    const moves = [];

    const offsets = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1]
    ];

    for (const [rowOffset, colOffset] of offsets) {

        const targetRow = row + rowOffset;
        const targetCol = col + colOffset;

        if (
            !isInside(
                targetRow,
                targetCol
            )
        ) {
            continue;
        }

        const target =
            position[targetRow][targetCol];

        if (
            !target ||
            target.color !== piece.color
        ) {

            moves.push({
                row: targetRow,
                col: targetCol
            });
        }
    }

    /*
       Castling
    */

    if (
        piece.color === "white" &&
        row === 7 &&
        col === 4
    ) {

        if (
            castlingRights.whiteKing &&
            position[7][5] === null &&
            position[7][6] === null &&
            position[7][7] &&
            position[7][7].type === "rook" &&
            !isSquareAttacked(
                position,
                7,
                4,
                "black"
            ) &&
            !isSquareAttacked(
                position,
                7,
                5,
                "black"
            ) &&
            !isSquareAttacked(
                position,
                7,
                6,
                "black"
            )
        ) {

            moves.push({
                row: 7,
                col: 6,
                castle: "king"
            });
        }

        if (
            castlingRights.whiteQueen &&
            position[7][1] === null &&
            position[7][2] === null &&
            position[7][3] === null &&
            position[7][0] &&
            position[7][0].type === "rook" &&
            !isSquareAttacked(
                position,
                7,
                4,
                "black"
            ) &&
            !isSquareAttacked(
                position,
                7,
                3,
                "black"
            ) &&
            !isSquareAttacked(
                position,
                7,
                2,
                "black"
            )
        ) {

            moves.push({
                row: 7,
                col: 2,
                castle: "queen"
            });
        }
    }

    if (
        piece.color === "black" &&
        row === 0 &&
        col === 4
    ) {

        if (
            castlingRights.blackKing &&
            position[0][5] === null &&
            position[0][6] === null &&
            position[0][7] &&
            position[0][7].type === "rook" &&
            !isSquareAttacked(
                position,
                0,
                4,
                "white"
            ) &&
            !isSquareAttacked(
                position,
                0,
                5,
                "white"
            ) &&
            !isSquareAttacked(
                position,
                0,
                6,
                "white"
            )
        ) {

            moves.push({
                row: 0,
                col: 6,
                castle: "king"
            });
        }

        if (
            castlingRights.blackQueen &&
            position[0][1] === null &&
            position[0][2] === null &&
            position[0][3] === null &&
            position[0][0] &&
            position[0][0].type === "rook" &&
            !isSquareAttacked(
                position,
                0,
                4,
                "white"
            ) &&
            !isSquareAttacked(
                position,
                0,
                3,
                "white"
            ) &&
            !isSquareAttacked(
                position,
                0,
                2,
                "white"
            )
        ) {

            moves.push({
                row: 0,
                col: 2,
                castle: "queen"
            });
        }
    }

    return moves;
}


/* =========================================================
   MAKE MOVE
   ========================================================= */

function makeMove(
    fromRow,
    fromCol,
    toRow,
    toCol
) {

    const piece =
        board[fromRow][fromCol];

    const legalMove =
        legalMovesForSelected.find(
            move =>
                move.row === toRow &&
                move.col === toCol
        );

    if (!piece || !legalMove) {
        return;
    }

    const capturedPiece =
        board[toRow][toCol];

    const notation =
        createNotation(
            fromRow,
            fromCol,
            toRow,
            toCol,
            piece,
            capturedPiece,
            legalMove
        );

    /*
       En passant capture
    */

    if (legalMove.enPassant) {

        const capturedPawnRow =
            piece.color === "white"
                ? toRow + 1
                : toRow - 1;

        board[capturedPawnRow][toCol] = null;
    }


    /*
       Move piece
    */

    board[toRow][toCol] =
        board[fromRow][fromCol];

    board[fromRow][fromCol] = null;


    /*
       Castling
    */

    if (
        legalMove.castle === "king"
    ) {

        board[toRow][5] =
            board[toRow][7];

        board[toRow][7] = null;
    }

    if (
        legalMove.castle === "queen"
    ) {

        board[toRow][3] =
            board[toRow][0];

        board[toRow][0] = null;
    }


    /*
       Update castling rights
    */

    updateCastlingRights(
        piece,
        fromRow,
        fromCol,
        toRow,
        toCol,
        capturedPiece
    );


    /*
       En passant target
    */

    enPassantTarget = null;

    if (
        piece.type === "pawn" &&
        Math.abs(toRow - fromRow) === 2
    ) {

        enPassantTarget = {
            row:
                (fromRow + toRow) / 2,

            col: fromCol
        };
    }


    /*
       Promotion
    */

    if (
        piece.type === "pawn" &&
        (toRow === 0 || toRow === 7)
    ) {

        promotePawn(
            toRow,
            toCol,
            piece.color
        );
    }


    moveHistory.push(notation);

    currentTurn =
        currentTurn === "white"
            ? "black"
            : "white";

    selectedSquare = null;

    legalMovesForSelected = [];

    renderBoard();

    renderMoveHistory();

    updateGameUI();

    checkGameState();
}


/* =========================================================
   PROMOTION
   ========================================================= */

function promotePawn(row, col, color) {

    const choice = prompt(
        "Promote your pawn to:\n\n" +
        "Q = Queen\n" +
        "R = Rook\n" +
        "B = Bishop\n" +
        "N = Knight"
    );

    const selected =
        String(choice || "Q")
            .trim()
            .toUpperCase();

    const promotionMap = {
        Q: "queen",
        R: "rook",
        B: "bishop",
        N: "knight"
    };

    board[row][col].type =
        promotionMap[selected] || "queen";
}


/* =========================================================
   CASTLING RIGHTS
   ========================================================= */

function updateCastlingRights(
    piece,
    fromRow,
    fromCol,
    toRow,
    toCol,
    capturedPiece
) {

    if (piece.type === "king") {

        if (piece.color === "white") {

            castlingRights.whiteKing = false;
            castlingRights.whiteQueen = false;

        } else {

            castlingRights.blackKing = false;
            castlingRights.blackQueen = false;
        }
    }


    if (piece.type === "rook") {

        if (
            fromRow === 7 &&
            fromCol === 0
        ) {
            castlingRights.whiteQueen = false;
        }

        if (
            fromRow === 7 &&
            fromCol === 7
        ) {
            castlingRights.whiteKing = false;
        }

        if (
            fromRow === 0 &&
            fromCol === 0
        ) {
            castlingRights.blackQueen = false;
        }

        if (
            fromRow === 0 &&
            fromCol === 7
        ) {
            castlingRights.blackKing = false;
        }
    }


    if (
        capturedPiece &&
        capturedPiece.type === "rook"
    ) {

        if (
            toRow === 7 &&
            toCol === 0
        ) {
            castlingRights.whiteQueen = false;
        }

        if (
            toRow === 7 &&
            toCol === 7
        ) {
            castlingRights.whiteKing = false;
        }

        if (
            toRow === 0 &&
            toCol === 0
        ) {
            castlingRights.blackQueen = false;
        }

        if (
            toRow === 0 &&
            toCol === 7
        ) {
            castlingRights.blackKing = false;
        }
    }
}


/* =========================================================
   CHECK DETECTION
   ========================================================= */

function isKingInCheck(
    position,
    color
) {

    let kingRow = -1;
    let kingCol = -1;

    for (let row = 0; row < 8; row++) {

        for (let col = 0; col < 8; col++) {

            const piece =
                position[row][col];

            if (
                piece &&
                piece.color === color &&
                piece.type === "king"
            ) {

                kingRow = row;
                kingCol = col;
            }
        }
    }

    if (kingRow === -1) {
        return true;
    }

    const opponent =
        color === "white"
            ? "black"
            : "white";

    return isSquareAttacked(
        position,
        kingRow,
        kingCol,
        opponent
    );
}


/* =========================================================
   ATTACK DETECTION
   ========================================================= */

function isSquareAttacked(
    position,
    row,
    col,
    byColor
) {

    for (let fromRow = 0; fromRow < 8; fromRow++) {

        for (let fromCol = 0; fromCol < 8; fromCol++) {

            const piece =
                position[fromRow][fromCol];

            if (
                !piece ||
                piece.color !== byColor
            ) {
                continue;
            }

            if (
                piece.type === "pawn"
            ) {

                const direction =
                    byColor === "white"
                        ? -1
                        : 1;

                if (
                    fromRow + direction === row &&
                    Math.abs(fromCol - col) === 1
                ) {
                    return true;
                }
            }

            else if (
                piece.type === "knight"
            ) {

                const rowDifference =
                    Math.abs(fromRow - row);

                const colDifference =
                    Math.abs(fromCol - col);

                if (
                    (
                        rowDifference === 2 &&
                        colDifference === 1
                    ) ||
                    (
                        rowDifference === 1 &&
                        colDifference === 2
                    )
                ) {
                    return true;
                }
            }

            else if (
                piece.type === "king"
            ) {

                if (
                    Math.max(
                        Math.abs(fromRow - row),
                        Math.abs(fromCol - col)
                    ) === 1
                ) {
                    return true;
                }
            }

            else {

                const rowDifference =
                    row - fromRow;

                const colDifference =
                    col - fromCol;

                const sameRow =
                    rowDifference === 0;

                const sameCol =
                    colDifference === 0;

                const diagonal =
                    Math.abs(rowDifference) ===
                    Math.abs(colDifference);

                let validDirection = false;

                if (
                    piece.type === "rook"
                ) {
                    validDirection =
                        sameRow || sameCol;
                }

                if (
                    piece.type === "bishop"
                ) {
                    validDirection = diagonal;
                }

                if (
                    piece.type === "queen"
                ) {
                    validDirection =
                        sameRow ||
                        sameCol ||
                        diagonal;
                }

                if (!validDirection) {
                    continue;
                }

                const stepRow =
                    Math.sign(rowDifference);

                const stepCol =
                    Math.sign(colDifference);

                let testRow =
                    fromRow + stepRow;

                let testCol =
                    fromCol + stepCol;

                let blocked = false;

                while (
                    testRow !== row ||
                    testCol !== col
                ) {

                    if (
                        position[testRow][testCol]
                    ) {
                        blocked = true;
                        break;
                    }

                    testRow += stepRow;
                    testCol += stepCol;
                }

                if (!blocked) {
                    return true;
                }
            }
        }
    }

    return false;
}


/* =========================================================
   GAME STATE CHECK
   ========================================================= */

function checkGameState() {

    const hasLegalMoves =
        hasAnyLegalMoves(currentTurn);

    const inCheck =
        isKingInCheck(
            board,
            currentTurn
        );

    if (!hasLegalMoves) {

        gameOver = true;

        stopClock();

        if (inCheck) {

            const winner =
                currentTurn === "white"
                    ? "Black"
                    : "White";

            showGameOver(
                "Checkmate",
                `${winner} wins the game.`
            );

        } else {

            showGameOver(
                "Stalemate",
                "The game ends in a draw."
            );
        }

        return;
    }

    if (inCheck) {

        gameStatus.textContent =
            `${capitalize(currentTurn)} is in check`;

        turnDescription.textContent =
            "Your king is under attack.";

    } else {

        turnDescription.textContent =
            "Make your move.";
    }
}


/* =========================================================
   ANY LEGAL MOVES
   ========================================================= */

function hasAnyLegalMoves(color) {

    for (let row = 0; row < 8; row++) {

        for (let col = 0; col < 8; col++) {

            const piece =
                board[row][col];

            if (
                piece &&
                piece.color === color
            ) {

                if (
                    getLegalMoves(row, col).length > 0
                ) {
                    return true;
                }
            }
        }
    }

    return false;
}


/* =========================================================
   APPLY MOVE TO SIMULATION
   ========================================================= */

function applyMoveToBoard(
    position,
    fromRow,
    fromCol,
    toRow,
    toCol
) {

    const piece =
        position[fromRow][fromCol];

    if (!piece) {
        return;
    }

    position[toRow][toCol] = {
        ...piece
    };

    position[fromRow][fromCol] = null;

    /*
       En passant simulation
    */

    if (
        piece.type === "pawn" &&
        enPassantTarget &&
        toRow === enPassantTarget.row &&
        toCol === enPassantTarget.col &&
        fromCol !== toCol &&
        !position[toRow][toCol]
    ) {

        const capturedPawnRow =
            piece.color === "white"
                ? toRow + 1
                : toRow - 1;

        position[capturedPawnRow][toCol] = null;
    }
}


/* =========================================================
   CLONE BOARD
   ========================================================= */

function cloneBoard(position) {

    return position.map(row =>
        row.map(piece =>
            piece
                ? { ...piece }
                : null
        )
    );
}


/* =========================================================
   MOVE NOTATION
   ========================================================= */

function createNotation(
    fromRow,
    fromCol,
    toRow,
    toCol,
    piece,
    capturedPiece,
    move
) {

    if (move.castle === "king") {
        return "O-O";
    }

    if (move.castle === "queen") {
        return "O-O-O";
    }

    const files =
        "abcdefgh";

    const pieceLetter = {
        pawn: "",
        knight: "N",
        bishop: "B",
        rook: "R",
        queen: "Q",
        king: "K"
    };

    let notation =
        pieceLetter[piece.type];

    if (
        capturedPiece ||
        move.enPassant
    ) {

        if (piece.type === "pawn") {
            notation += files[fromCol];
        }

        notation += "x";
    }

    notation +=
        files[toCol] +
        (8 - toRow);

    return notation;
}


/* =========================================================
   MOVE HISTORY
   ========================================================= */

function renderMoveHistory() {

    if (moveHistory.length === 0) {

        moveHistoryElement.innerHTML = `
            <div class="empty-moves">
                <div class="empty-icon">
                    ♟
                </div>

                <p>
                    Your moves will appear here.
                </p>
            </div>
        `;

        moveCountElement.textContent =
            "0 moves";

        return;
    }

    moveHistoryElement.innerHTML = "";

    for (
        let index = 0;
        index < moveHistory.length;
        index += 2
    ) {

        const row =
            document.createElement("div");

        row.className = "move-row";

        const number =
            document.createElement("span");

        number.className = "move-number";

        number.textContent =
            `${Math.floor(index / 2) + 1}.`;

        const whiteMove =
            document.createElement("span");

        whiteMove.className = "move";

        whiteMove.textContent =
            moveHistory[index] || "";

        const blackMove =
            document.createElement("span");

        blackMove.className = "move";

        blackMove.textContent =
            moveHistory[index + 1] || "";

        if (
            index === moveHistory.length - 1 ||
            index + 1 === moveHistory.length - 1
        ) {
            if (
                index + 1 ===
                moveHistory.length - 1
            ) {
                blackMove.classList.add("latest");
            } else {
                whiteMove.classList.add("latest");
            }
        }

        row.appendChild(number);
        row.appendChild(whiteMove);
        row.appendChild(blackMove);

        moveHistoryElement.appendChild(row);
    }

    moveCountElement.textContent =
        `${moveHistory.length} ${
            moveHistory.length === 1
                ? "move"
                : "moves"
        }`;

    moveHistoryElement.scrollTop =
        moveHistoryElement.scrollHeight;
}


/* =========================================================
   GAME UI
   ========================================================= */

function updateGameUI() {

    const capitalized =
        capitalize(currentTurn);

    turnText.textContent =
        capitalized;

    gameStatus.textContent =
        `${capitalized}'s turn`;

    updateClockDisplay();
}


/* =========================================================
   CLOCK
   ========================================================= */

function startClock() {

    stopClock();

    clockInterval =
        setInterval(() => {

            if (gameOver) {
                return;
            }

            if (currentTurn === "white") {

                whiteTime--;

                if (whiteTime <= 0) {

                    whiteTime = 0;

                    gameOver = true;

                    stopClock();

                    showGameOver(
                        "Time!",
                        "Black wins on time."
                    );
                }

            } else {

                blackTime--;

                if (blackTime <= 0) {

                    blackTime = 0;

                    gameOver = true;

                    stopClock();

                    showGameOver(
                        "Time!",
                        "White wins on time."
                    );
                }
            }

            updateClockDisplay();

        }, 1000);
}


function stopClock() {

    if (clockInterval) {

        clearInterval(clockInterval);

        clockInterval = null;
    }
}


function updateClockDisplay() {

    whiteClock.textContent =
        formatTime(whiteTime);

    blackClock.textContent =
        formatTime(blackTime);
}


function formatTime(seconds) {

    const minutes =
        Math.floor(seconds / 60);

    const remainingSeconds =
        seconds % 60;

    return `${minutes}:${String(
        remainingSeconds
    ).padStart(2, "0")}`;
}


/* =========================================================
   GAME OVER
   ========================================================= */

function showGameOver(
    title,
    message
) {

    gameOverTitle.textContent =
        title;

    gameOverMessage.textContent =
        message;

    gameOverModal.classList.remove(
        "hidden"
    );

    updateGameUI();
}


/* =========================================================
   MODAL HELPERS
   ========================================================= */

function closeModal(modal) {

    modal.classList.add("hidden");
}


/* =========================================================
   RESIGN
   ========================================================= */

resignButton.addEventListener(
    "click",
    () => {

        if (gameOver) {
            return;
        }

        resignModal.classList.remove(
            "hidden"
        );
    }
);


cancelResign.addEventListener(
    "click",
    () => {

        closeModal(resignModal);
    }
);


confirmResign.addEventListener(
    "click",
    () => {

        gameOver = true;

        stopClock();

        closeModal(resignModal);

        const winner =
            currentTurn === "white"
                ? "Black"
                : "White";

        showGameOver(
            "Game Resigned",
            `${winner} wins because the opponent resigned.`
        );
    }
);


/* =========================================================
   DRAW
   ========================================================= */

drawButton.addEventListener(
    "click",
    () => {

        if (gameOver) {
            return;
        }

        showGameOver(
            "Draw",
            "The game was agreed as a draw."
        );

        gameOver = true;

        stopClock();
    }
);


/* =========================================================
   RESTART
   ========================================================= */

newGameButton.addEventListener(
    "click",
    resetGame
);

restartButton.addEventListener(
    "click",
    resetGame
);

gameOverRestart.addEventListener(
    "click",
    resetGame
);

closeGameOver.addEventListener(
    "click",
    () => {

        closeModal(gameOverModal);
    }
);


/* =========================================================
   FLIP BOARD
   ========================================================= */

flipBoardButton.addEventListener(
    "click",
    () => {

        boardFlipped =
            !boardFlipped;

        renderBoard();
    }
);


/* =========================================================
   KEYBOARD ESCAPE
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (event.key === "Escape") {

            closeModal(gameOverModal);

            closeModal(resignModal);

            clearSelection();
        }
    }
);


/* =========================================================
   ACCOUNT DISPLAY
   ========================================================= */

function loadAccountName() {

    /*
       Firebase integration can be connected
       here without changing the chess engine.

       For now, if Firebase has already exposed
       a current user, use their email.
    */

    if (
        window.currentUser &&
        window.currentUser.email
    ) {

        accountName.textContent =
            window.currentUser.email;

        return;
    }

    accountName.textContent =
        "Guest";
}


/* =========================================================
   HELPERS
   ========================================================= */

function isInside(row, col) {

    return (
        row >= 0 &&
        row < 8 &&
        col >= 0 &&
        col < 8
    );
}


function capitalize(value) {

    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
    );
}


/* =========================================================
   START CCHESS
   ========================================================= */

resetGame();

loadAccountName();