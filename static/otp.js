// ================= VERIFY OTP =================
async function verifyOTP() {
  const entered = document.getElementById("otpInput").value.trim();

  const otp = localStorage.getItem("otp");

  const email = localStorage.getItem("email");

  if (!otp) {
    document.getElementById("msg").innerText = "OTP not found.";
    return;
  }

  if (entered === otp) {

    document.getElementById("msg").innerText = "OTP Verified ✅";

    const failedAttempts =
      parseInt(localStorage.getItem(email + "_finalFailedAttempts")) || 0;

    await storeData(failedAttempts);

    localStorage.setItem(email + "_failedAttempts", 0);

    setTimeout(() => {
      window.location = "/home";
    }, 1000);

  } else {
    document.getElementById("msg").innerText = "Wrong OTP ❌";
  }
}

// ================= RESEND OTP =================
async function resendOTP() {
  const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

  localStorage.setItem("otp", newOtp);
  localStorage.setItem("otpTime", Date.now());

  await fetch("/send-otp", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      email: localStorage.getItem("email"),
      otp: newOtp
    })
  });

  document.getElementById("msg").innerText = "New OTP sent 📧";
}

// ================= STORE DATA =================
async function storeData(failedAttempts) {
  const { db } = await import("/static/firebase.js");
  const { doc, setDoc, getDoc } = await import(
    "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js"
  );

  const uid = localStorage.getItem("uid");
  const email = localStorage.getItem("email");

  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toLocaleTimeString();

  const device = /Android|iPhone/i.test(navigator.userAgent)
    ? "Mobile"
    : "Laptop";

  const location = "India";

  const ref = doc(db, "activity", uid);
  const snap = await getDoc(ref);

  let loginCount = 1;
  if (snap.exists()) {
    loginCount = (snap.data().loginCount || 0) + 1;
  }

  await setDoc(ref, {
    email,
    location,
    device,
    date,
    time,
    loginCount,
    failedAttempts
  });
}

// EVENTS
document.getElementById("verifyBtn").addEventListener("click", verifyOTP);
document.getElementById("resendBtn").addEventListener("click", resendOTP);
