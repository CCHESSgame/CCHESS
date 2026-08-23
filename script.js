import {
    auth,
    db,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    doc,
    setDoc,
    getDoc
} from "./firebase.js";


/* ELEMENTS */

const authModal = document.getElementById("authModal");
const accountModal = document.getElementById("accountModal");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const loginNav = document.getElementById("loginNav");
const heroLogin = document.getElementById("heroLogin");

const navPlay = document.getElementById("navPlay");
const heroPlay = document.getElementById("heroPlay");

const closeAuth = document.getElementById("closeAuth");
const closeAccount = document.getElementById("closeAccount");

const switchAuth = document.getElementById("switchAuth");
const switchText = document.getElementById("switchText");

const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");

const authMessage = document.getElementById("authMessage");

const accountUsername = document.getElementById("accountUsername");
const accountEmail = document.getElementById("accountEmail");

const logoutButton = document.getElementById("logoutButton");
const accountPlay = document.getElementById("accountPlay");


let registerMode = false;


/* MODALS */

function openAuth() {
    authModal.classList.remove("hidden");
    authMessage.textContent = "";
}

function closeAuthModal() {
    authModal.classList.add("hidden");
    authMessage.textContent = "";
}

function openAccount() {
    accountModal.classList.remove("hidden");
}

function closeAccountModal() {
    accountModal.classList.add("hidden");
}


/* LOGIN / REGISTER SWITCH */

function updateAuthMode() {

    authMessage.textContent = "";

    if (registerMode) {

        loginForm.classList.add("hidden");
        registerForm.classList.remove("hidden");

        authTitle.textContent = "Create your account";

        authSubtitle.textContent =
            "Join CCHESS and start playing.";

        switchText.textContent =
            "Already have an account?";

        switchAuth.textContent =
            "Log in";

    } else {

        registerForm.classList.add("hidden");
        loginForm.classList.remove("hidden");

        authTitle.textContent =
            "Welcome to CCHESS";

        authSubtitle.textContent =
            "Log in to continue playing.";

        switchText.textContent =
            "Don't have an account?";

        switchAuth.textContent =
            "Create one";
    }
}


switchAuth.addEventListener("click", () => {

    registerMode = !registerMode;

    updateAuthMode();

});


/* OPEN AUTH */

heroLogin.addEventListener("click", () => {

    registerMode = true;

    updateAuthMode();

    openAuth();

});


/* CLOSE */

closeAuth.addEventListener("click", closeAuthModal);

closeAccount.addEventListener("click", closeAccountModal);


authModal.addEventListener("click", (event) => {

    if (event.target === authModal) {
        closeAuthModal();
    }

});


accountModal.addEventListener("click", (event) => {

    if (event.target === accountModal) {
        closeAccountModal();
    }

});


/* SHOW PASSWORD */

document.querySelectorAll(".show-password").forEach(button => {

    button.addEventListener("click", () => {

        const target = document.getElementById(
            button.dataset.target
        );

        if (target.type === "password") {

            target.type = "text";

            button.textContent = "Hide";

        } else {

            target.type = "password";

            button.textContent = "Show";
        }

    });

});


/* ERROR MESSAGES */

function firebaseError(error) {

    switch (error.code) {

        case "auth/email-already-in-use":
            return "That email is already registered.";

        case "auth/invalid-email":
            return "Please enter a valid email.";

        case "auth/weak-password":
            return "Password must be at least 6 characters.";

        case "auth/invalid-credential":
            return "Incorrect email or password.";

        case "auth/user-not-found":
            return "No account exists with that email.";

        case "auth/wrong-password":
            return "Incorrect password.";

        case "auth/too-many-requests":
            return "Too many attempts. Try again later.";

        default:
            return "Something went wrong. Please try again.";
    }
}


/* REGISTER */

registerForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    authMessage.textContent = "Creating account...";

    const username =
        document.getElementById("registerUsername").value.trim();

    const email =
        document.getElementById("registerEmail").value.trim();

    const password =
        document.getElementById("registerPassword").value;


    if (username.length < 3) {

        authMessage.textContent =
            "Username must be at least 3 characters.";

        return;
    }


    try {

        const result =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );


        await setDoc(
            doc(db, "users", result.user.uid),
            {
                username: username,
                email: email,
                createdAt: new Date().toISOString(),
                gamesPlayed: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                rating: 1200
            }
        );


        authMessage.textContent =
            "Account created!";

        setTimeout(() => {

            closeAuthModal();

        }, 700);


    } catch (error) {

        console.error(error);

        authMessage.textContent =
            firebaseError(error);

    }

});


/* LOGIN */

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    authMessage.textContent = "Logging in...";


    const email =
        document.getElementById("loginEmail").value.trim();

    const password =
        document.getElementById("loginPassword").value;


    try {

        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );


        authMessage.textContent =
            "Welcome back!";

        setTimeout(() => {

            closeAuthModal();

        }, 500);


    } catch (error) {

        console.error(error);

        authMessage.textContent =
            firebaseError(error);

    }

});


/* AUTH STATE */

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        loginNav.textContent = "Log in";

        return;
    }


    try {

        const profile =
            await getDoc(
                doc(db, "users", user.uid)
            );


        if (profile.exists()) {

            const data = profile.data();

            accountUsername.textContent =
                data.username || "Player";

        } else {

            accountUsername.textContent =
                "Player";

        }


        accountEmail.textContent =
            user.email || "";

        loginNav.textContent =
            "Account";


    } catch (error) {

        console.error(error);

        accountUsername.textContent =
            "Player";

        accountEmail.textContent =
            user.email || "";
    }

});


/* ACCOUNT BUTTON */

loginNav.addEventListener("click", () => {

    if (auth.currentUser) {

        openAccount();

    } else {

        openAuth();

    }

});


/* LOGOUT */

logoutButton.addEventListener("click", async () => {

    try {

        await signOut(auth);

        closeAccountModal();

    } catch (error) {

        console.error(error);

    }

});


/* PLAY CHESS */

function playChess() {

    /*
     * If the user is logged in,
     * send them directly to the chess board.
     */

    if (auth.currentUser) {

        window.location.href = "play.html";

        return;
    }


    /*
     * If they aren't logged in,
     * open the login window instead.
     */

    registerMode = false;

    updateAuthMode();

    openAuth();

}


/* PLAY BUTTONS */

heroPlay.addEventListener("click", playChess);

navPlay.addEventListener("click", playChess);

accountPlay.addEventListener("click", playChess);


/* LEARN MORE */

document.getElementById("learnMore")?.addEventListener(
    "click",
    () => {

        document
            .getElementById("features")
            .scrollIntoView({
                behavior: "smooth"
            });

    }
);