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


/* =========================================================
   CCHESS 2.0 — MAIN SCRIPT
========================================================= */


/* =========================================================
   DOM HELPERS
========================================================= */

const $ = (id) => document.getElementById(id);

const authModal = $("authModal");
const accountModal = $("accountModal");

const loginForm = $("loginForm");
const registerForm = $("registerForm");

const loginNav = $("loginNav");
const heroLogin = $("heroLogin");

const navPlay = $("navPlay");
const heroPlay = $("heroPlay");
const accountPlay = $("accountPlay");

const closeAuth = $("closeAuth");
const closeAccount = $("closeAccount");

const switchAuth = $("switchAuth");
const switchText = $("switchText");

const authTitle = $("authTitle");
const authSubtitle = $("authSubtitle");
const authMessage = $("authMessage");

const accountUsername = $("accountUsername");
const accountEmail = $("accountEmail");

const logoutButton = $("logoutButton");


/* =========================================================
   STATE
========================================================= */

let authMode = "login";
let currentUser = null;
let currentProfile = null;


/* =========================================================
   NAVIGATION
========================================================= */

function goToPlay() {
    window.location.href = "play.html";
}

function goHome() {
    window.location.href = "index.html";
}

function openFeature(feature) {
    const routes = {
        play: "play.html",
        puzzles: "puzzles.html",
        analysis: "analysis.html",
        profile: "profile.html",
        achievements: "achievements.html",
        community: "community.html",
        customize: "customize.html",
        settings: "settings.html"
    };

    const destination = routes[feature];

    if (!destination) {
        return;
    }

    window.location.href = destination;
}


/* =========================================================
   AUTH MODAL
========================================================= */

function openAuth(mode = "login") {
    authMode = mode;

    authModal?.classList.remove("hidden");

    updateAuthMode();

    if (authMessage) {
        authMessage.textContent = "";
    }

    document.body.style.overflow = "hidden";
}

function closeAuthModal() {
    authModal?.classList.add("hidden");

    document.body.style.overflow = "";

    if (authMessage) {
        authMessage.textContent = "";
    }
}

function updateAuthMode() {
    const isLogin = authMode === "login";

    loginForm?.classList.toggle("hidden", !isLogin);
    registerForm?.classList.toggle("hidden", isLogin);

    if (authTitle) {
        authTitle.textContent = isLogin
            ? "Welcome to CCHESS"
            : "Create your CCHESS account";
    }

    if (authSubtitle) {
        authSubtitle.textContent = isLogin
            ? "Log in to continue playing."
            : "Create an account and start playing.";
    }

    if (switchText) {
        switchText.textContent = isLogin
            ? "Don't have an account?"
            : "Already have an account?";
    }

    if (switchAuth) {
        switchAuth.textContent = isLogin
            ? "Create one"
            : "Log in";
    }
}


/* =========================================================
   AUTH MESSAGES
========================================================= */

function showAuthMessage(message, success = false) {
    if (!authMessage) return;

    authMessage.textContent = message;

    authMessage.style.color = success
        ? "rgba(180, 255, 207, 0.85)"
        : "";
}


/* =========================================================
   LOGIN
========================================================= */

loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = $("loginEmail")?.value.trim();
    const password = $("loginPassword")?.value;

    if (!email || !password) {
        showAuthMessage("Please enter your email and password.");
        return;
    }

    const submitButton =
        loginForm.querySelector(".auth-submit");

    setButtonLoading(submitButton, true);

    try {
        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        showAuthMessage(
            "Logged in successfully.",
            true
        );

        setTimeout(() => {
            closeAuthModal();
        }, 350);

    } catch (error) {
        showAuthMessage(
            friendlyAuthError(error)
        );
    } finally {
        setButtonLoading(submitButton, false);
    }
});


/* =========================================================
   REGISTER
========================================================= */

registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username =
        $("registerUsername")?.value.trim();

    const email =
        $("registerEmail")?.value.trim();

    const password =
        $("registerPassword")?.value;

    if (!username || !email || !password) {
        showAuthMessage(
            "Please complete every field."
        );

        return;
    }

    if (username.length < 2) {
        showAuthMessage(
            "Your username must be at least 2 characters."
        );

        return;
    }

    if (password.length < 6) {
        showAuthMessage(
            "Your password must be at least 6 characters."
        );

        return;
    }

    const submitButton =
        registerForm.querySelector(".auth-submit");

    setButtonLoading(submitButton, true);

    try {
        const credential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

        const user = credential.user;

        const profile = {
            username,
            email,
            rating: 1200,

            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,

            winStreak: 0,
            highestRating: 1200,

            createdAt: Date.now()
        };

        await setDoc(
            doc(db, "users", user.uid),
            profile,
            { merge: true }
        );

        currentProfile = profile;

        showAuthMessage(
            "Account created successfully.",
            true
        );

        setTimeout(() => {
            closeAuthModal();
        }, 500);

    } catch (error) {
        showAuthMessage(
            friendlyAuthError(error)
        );
    } finally {
        setButtonLoading(submitButton, false);
    }
});


/* =========================================================
   AUTH STATE
========================================================= */

onAuthStateChanged(auth, async (user) => {
    currentUser = user || null;

    if (!user) {
        currentProfile = null;
        updateLoggedOutUI();
        return;
    }

    try {
        const profileRef =
            doc(db, "users", user.uid);

        const snapshot =
            await getDoc(profileRef);

        if (snapshot.exists()) {
            currentProfile = snapshot.data();
        } else {
            currentProfile = {
                username:
                    user.email?.split("@")[0] ||
                    "Player",

                email: user.email || "",

                rating: 1200,
                gamesPlayed: 0,
                wins: 0,
                losses: 0,
                draws: 0,

                winStreak: 0,
                highestRating: 1200,

                createdAt: Date.now()
            };

            await setDoc(
                profileRef,
                currentProfile,
                { merge: true }
            );
        }

        updateLoggedInUI();

    } catch (error) {
        console.error(
            "CCHESS profile error:",
            error
        );

        updateLoggedInUI();
    }
});


/* =========================================================
   ACCOUNT UI
========================================================= */

function getUsername() {
    return (
        currentProfile?.username ||
        currentUser?.displayName ||
        currentUser?.email?.split("@")[0] ||
        "Player"
    );
}

function updateLoggedInUI() {
    if (loginNav) {
        loginNav.textContent = getUsername();
    }

    if (accountUsername) {
        accountUsername.textContent =
            getUsername();
    }

    if (accountEmail) {
        accountEmail.textContent =
            currentUser?.email || "";
    }

    document.body.classList.add("logged-in");
}

function updateLoggedOutUI() {
    if (loginNav) {
        loginNav.textContent = "Log in";
    }

    document.body.classList.remove("logged-in");
}


/* =========================================================
   LOGIN BUTTON
========================================================= */

loginNav?.addEventListener("click", () => {
    if (currentUser) {
        accountModal?.classList.remove("hidden");
        document.body.style.overflow = "hidden";
    } else {
        openAuth("login");
    }
});


/* =========================================================
   CREATE ACCOUNT
========================================================= */

heroLogin?.addEventListener("click", () => {
    openAuth("register");
});


/* =========================================================
   PLAY BUTTONS
========================================================= */

navPlay?.addEventListener("click", goToPlay);

heroPlay?.addEventListener("click", goToPlay);

accountPlay?.addEventListener("click", () => {
    closeAccountModal();
    goToPlay();
});


/* =========================================================
   AUTH SWITCH
========================================================= */

switchAuth?.addEventListener("click", () => {
    authMode =
        authMode === "login"
            ? "register"
            : "login";

    updateAuthMode();

    if (authMessage) {
        authMessage.textContent = "";
    }
});


/* =========================================================
   CLOSE AUTH
========================================================= */

closeAuth?.addEventListener(
    "click",
    closeAuthModal
);


/* =========================================================
   CLOSE ACCOUNT
========================================================= */

function closeAccountModal() {
    accountModal?.classList.add("hidden");

    document.body.style.overflow = "";
}

closeAccount?.addEventListener(
    "click",
    closeAccountModal
);


/* =========================================================
   MODAL BACKDROP CLICK
========================================================= */

authModal?.addEventListener("click", (event) => {
    if (event.target === authModal) {
        closeAuthModal();
    }
});

accountModal?.addEventListener("click", (event) => {
    if (event.target === accountModal) {
        closeAccountModal();
    }
});


/* =========================================================
   ESCAPE KEY
========================================================= */

document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
        return;
    }

    closeAuthModal();
    closeAccountModal();
});


/* =========================================================
   PASSWORD VISIBILITY
========================================================= */

document.addEventListener("click", (event) => {
    const button =
        event.target.closest(".show-password");

    if (!button) return;

    const targetId =
        button.dataset.target;

    const input = $(targetId);

    if (!input) return;

    const showing =
        input.type === "text";

    input.type =
        showing ? "password" : "text";

    button.textContent =
        showing ? "Show" : "Hide";
});


/* =========================================================
   SIDEBAR SYSTEM
========================================================= */

function setupSidebar() {
    const sidebar =
        document.querySelector(
            "[data-cchess-sidebar]"
        );

    const toggle =
        document.querySelector(
            "[data-sidebar-toggle]"
        );

    const overlay =
        document.querySelector(
            "[data-sidebar-overlay]"
        );

    if (!sidebar) return;

    const closeSidebar = () => {
        sidebar.classList.remove("open");
        document.body.classList.remove(
            "sidebar-open"
        );
    };

    const openSidebar = () => {
        sidebar.classList.add("open");
        document.body.classList.add(
            "sidebar-open"
        );
    };

    toggle?.addEventListener("click", () => {
        if (sidebar.classList.contains("open")) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    overlay?.addEventListener(
        "click",
        closeSidebar
    );

    sidebar
        .querySelectorAll("[data-feature]")
        .forEach((item) => {
            item.addEventListener(
                "click",
                () => {
                    const feature =
                        item.dataset.feature;

                    openFeature(feature);

                    closeSidebar();
                }
            );
        });

    document.addEventListener(
        "keydown",
        (event) => {
            if (
                event.key === "Escape" &&
                sidebar.classList.contains("open")
            ) {
                closeSidebar();
            }
        }
    );
}

setupSidebar();


/* =========================================================
   ACTIVE SIDEBAR ITEM
========================================================= */

function setActiveNavigation() {
    const path =
        window.location.pathname
            .split("/")
            .pop();

    document
        .querySelectorAll(
            "[data-route]"
        )
        .forEach((item) => {
            const route =
                item.dataset.route;

            item.classList.toggle(
                "active",
                route === path
            );
        });
}

setActiveNavigation();


/* =========================================================
   FEATURE BUTTONS
========================================================= */

document
    .querySelectorAll("[data-feature]")
    .forEach((element) => {
        element.addEventListener(
            "click",
            () => {
                const feature =
                    element.dataset.feature;

                openFeature(feature);
            }
        );
    });


/* =========================================================
   QUICK ACTIONS
========================================================= */

document
    .querySelectorAll(
        "[data-action='play']"
    )
    .forEach((button) => {
        button.addEventListener(
            "click",
            goToPlay
        );
    });


/* =========================================================
   SCROLL NAVIGATION
========================================================= */

document
    .querySelectorAll(
        'a[href^="#"]'
    )
    .forEach((link) => {
        link.addEventListener(
            "click",
            (event) => {
                const targetId =
                    link.getAttribute("href");

                if (
                    !targetId ||
                    targetId === "#"
                ) {
                    return;
                }

                const target =
                    document.querySelector(
                        targetId
                    );

                if (!target) return;

                event.preventDefault();

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        );
    });


/* =========================================================
   BUTTON LOADING
========================================================= */

function setButtonLoading(
    button,
    loading
) {
    if (!button) return;

    if (loading) {
        button.dataset.originalText =
            button.textContent;

        button.textContent = "Please wait…";

        button.disabled = true;

        button.style.opacity = "0.7";
    } else {
        button.textContent =
            button.dataset.originalText ||
            button.textContent;

        button.disabled = false;

        button.style.opacity = "";
    }
}


/* =========================================================
   FIREBASE ERROR TRANSLATION
========================================================= */

function friendlyAuthError(error) {
    const code =
        error?.code || "";

    const errors = {
        "auth/invalid-email":
            "That email address isn't valid.",

        "auth/user-not-found":
            "No CCHESS account exists with that email.",

        "auth/wrong-password":
            "Incorrect email or password.",

        "auth/invalid-credential":
            "Incorrect email or password.",

        "auth/email-already-in-use":
            "An account already exists with that email.",

        "auth/weak-password":
            "Your password is too weak.",

        "auth/network-request-failed":
            "Network error. Check your connection.",

        "auth/too-many-requests":
            "Too many attempts. Try again later.",

        "auth/user-disabled":
            "This account has been disabled."
    };

    return (
        errors[code] ||
        error?.message ||
        "Something went wrong. Please try again."
    );
}


/* =========================================================
   LOGOUT
========================================================= */

logoutButton?.addEventListener(
    "click",
    async () => {
        try {
            await signOut(auth);

            closeAccountModal();

            currentUser = null;
            currentProfile = null;

            updateLoggedOutUI();

        } catch (error) {
            console.error(
                "CCHESS logout error:",
                error
            );
        }
    }
);


/* =========================================================
   ACCOUNT MODAL — USERNAME / PROFILE DATA
========================================================= */

async function refreshProfile() {
    if (!currentUser) {
        return null;
    }

    try {
        const profileRef =
            doc(
                db,
                "users",
                currentUser.uid
            );

        const snapshot =
            await getDoc(profileRef);

        if (!snapshot.exists()) {
            return null;
        }

        currentProfile =
            snapshot.data();

        updateLoggedInUI();

        return currentProfile;

    } catch (error) {
        console.error(
            "Could not refresh profile:",
            error
        );

        return null;
    }
}


/* =========================================================
   CCHESS 2.0 PROFILE HELPERS
========================================================= */

export async function updatePlayerStats(
    stats = {}
) {
    if (!currentUser) {
        return;
    }

    const ref =
        doc(
            db,
            "users",
            currentUser.uid
        );

    const updated = {
        ...(currentProfile || {}),
        ...stats
    };

    await setDoc(
        ref,
        updated,
        { merge: true }
    );

    currentProfile = updated;

    updateLoggedInUI();
}

export function getCurrentPlayer() {
    return {
        user: currentUser,
        profile: currentProfile
    };
}


/* =========================================================
   PREVENT DOUBLE SUBMISSIONS
========================================================= */

[
    loginForm,
    registerForm
]
    .filter(Boolean)
    .forEach((form) => {
        form.addEventListener(
            "keydown",
            (event) => {
                if (
                    event.key === "Enter" &&
                    event.target.tagName === "INPUT"
                ) {
                    return;
                }
            }
        );
    });


/* =========================================================
   INITIAL UI
========================================================= */

updateAuthMode();
updateLoggedOutUI();


/* =========================================================
   CCHESS VERSION
========================================================= */

document.documentElement.dataset.cchessVersion =
    "2.0";


console.log(
    "%cCCHESS 2.0",
    "font-size:20px;font-weight:800;"
);

console.log(
    "Chess. Reimagined."
);
