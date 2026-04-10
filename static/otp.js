import { auth } from "/static/firebase.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";


async function verifyOTP() {
  const entered = document.getElementById("otpInput").value.trim();
  const otp     = localStorage.getItem("otp");

  if (!otp) {
    document.getElementById("msg").innerText = "Session expired. Please login again.";
    setTimeout(() => window.location = "/", 2000);
    return;
  }

  
  const otpTime = parseInt(localStorage.getItem("otpTime") || "0");
  if (Date.now() - otpTime > 5 * 60 * 1000) {
    document.getElementById("msg").innerText = "OTP expired. Please request a new one.";
    localStorage.removeItem("otp");
    localStorage.removeItem("otpTime");
    return;
  }

  if (entered === otp) {
    document.getElementById("msg").innerText = "OTP Verified ✅";

    
    try {
      const { db }   = await import("/static/firebase.js");
      const uid      = localStorage.getItem("uid");
      const email    = localStorage.getItem("email");

      const device        = localStorage.getItem("pendingDevice")         || "Unknown";
      const location      = localStorage.getItem("pendingLocation")       || "Unknown";
      const time          = localStorage.getItem("pendingTime")           || new Date().toLocaleTimeString();
      const loginCount    = parseInt(localStorage.getItem("pendingLoginCount"))    || 1;
      const failedAttempts = parseInt(localStorage.getItem("pendingFailedAttempts")) || 0;

      const ref = doc(db, "activity", uid);

      await setDoc(ref, {
        email,
        location,
        device,
        date:            new Date().toISOString().split("T")[0],
        time,
        loginCount,
        failedAttempts   
      });

      
      localStorage.setItem(email + "_failedAttempts", 0);

      
      localStorage.removeItem("pendingDevice");
      localStorage.removeItem("pendingLocation");
      localStorage.removeItem("pendingTime");
      localStorage.removeItem("pendingLoginCount");
      localStorage.removeItem("pendingFailedAttempts");
      localStorage.removeItem("otp");
      localStorage.removeItem("otpTime");

    } catch (e) {
      console.error("Failed to store activity after OTP:", e);
    }

    setTimeout(() => window.location = "/home", 1000);

  } else {
    document.getElementById("msg").innerText = "Wrong OTP ❌";
  }
}


async function resendOTP() {
  const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

  localStorage.setItem("otp",     newOtp);
  localStorage.setItem("otpTime", Date.now());

  const email = localStorage.getItem("email");

  if (!email) {
    document.getElementById("msg").innerText = "Session lost. Please login again.";
    setTimeout(() => window.location = "/", 2000);
    return;
  }

  try {
    await fetch("/send-otp", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, otp: newOtp })
    });
    document.getElementById("msg").innerText = "New OTP sent 📩";
  } catch {
    document.getElementById("msg").innerText = "Failed to resend OTP. Try again.";
  }
}


document.getElementById("verifyBtn")?.addEventListener("click", verifyOTP);
document.getElementById("resendBtn")?.addEventListener("click", resendOTP);
