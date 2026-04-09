import { auth } from "/static/firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ROUTES
window.goSignup = () => window.location = "/signup";
window.goLogin  = () => window.location = "/";

// ================= DEVICE =================
function getDevice() {
  if (
    navigator.userAgentData?.mobile ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    window.innerWidth <= 768
  ) return "Mobile";
  return "Laptop";
}

// ================= LOCATION (VPN-aware, 3-API chain) =================
async function getLocation() {
  // API 1 - ipwho.is (detects VPN exit country)
  try {
    const res  = await fetch("https://ipwho.is/?t=" + Date.now(), { cache: "no-store" });
    const data = await res.json();
    if (data.success && data.country) return data.country;
  } catch {}

  // API 2 - ip-api.com (free, reliable)
  try {
    const res  = await fetch("https://ip-api.com/json/?fields=status,country");
    const data = await res.json();
    if (data.status === "success" && data.country) return data.country;
  } catch {}

  // API 3 - ipapi.co (last resort)
  try {
    const res  = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    if (data.country_name) return data.country_name;
  } catch {}

  return "Unknown";
}

// ================= SIGNUP =================
window.signup = async () => {
  const username = document.getElementById("username").value.trim();
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const { db }   = await import("/static/firebase.js");

    await setDoc(doc(db, "users", userCred.user.uid), { username, email });

    alert("Account created!");
    window.location = "/";

  } catch (e) {
    document.getElementById("msg").innerText = e.message;
  }
};

// ================= LOGIN =================
window.login = async () => {
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  // Get failed attempts for THIS session (reset each login attempt sequence)
  let failedAttempts = parseInt(localStorage.getItem(email + "_failedAttempts")) || 0;

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);

    // Store for use in otp.js after redirect
    localStorage.setItem("email", userCred.user.email);
    localStorage.setItem("uid",   userCred.user.uid);

    const device   = getDevice();
    const location = await getLocation();
    const time     = new Date().toLocaleTimeString();

    const { db } = await import("/static/firebase.js");
    const ref    = doc(db, "activity", userCred.user.uid);
    const snap   = await getDoc(ref);

    // loginCount: always +1 from stored value
    let loginCount = snap.exists() ? (snap.data().loginCount || 0) + 1 : 1;

    // Store context for otp.js to use after OTP verify
    localStorage.setItem("pendingDevice",        device);
    localStorage.setItem("pendingLocation",      location);
    localStorage.setItem("pendingTime",          time);
    localStorage.setItem("pendingLoginCount",    loginCount);
    localStorage.setItem("pendingFailedAttempts", failedAttempts);

    // Call ML prediction
    const res    = await fetch("/predict", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ device, location, loginCount, failedAttempts, time })
    });
    const result = await res.json();

    if (result.prediction === 0) {
      // SAFE — store activity and go home
      await setDoc(ref, {
        email,
        location,
        device,
        date:           new Date().toISOString().split("T")[0],
        time,
        loginCount,
        failedAttempts: failedAttempts   // overwrite with this session's count
      });

      // Reset failed attempts after successful login
      localStorage.setItem(email + "_failedAttempts", 0);

      window.location = "/home";

    } else {
      // RISKY — generate OTP and send
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      localStorage.setItem("otp",     otp);
      localStorage.setItem("otpTime", Date.now());

      await fetch("/send-otp", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: userCred.user.email, otp })
      });

      window.location = "/otp";
    }

  } catch (e) {
    // Wrong password / auth error → increment failed attempts
    failedAttempts++;
    localStorage.setItem(email + "_failedAttempts", failedAttempts);
    document.getElementById("msg").innerText = "Login failed ❌ (" + failedAttempts + ")";
  }
};
