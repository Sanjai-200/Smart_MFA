const BASE_URL = window.location.origin;

// VERIFY
async function verifyOTP() {
  const entered = document.getElementById("otpInput").value;

  const otp = localStorage.getItem("otp");
  const time = localStorage.getItem("otpTime");

  if (!otp || !time) {
    document.getElementById("msg").innerText = "OTP missing ❌";
    return;
  }

  if (Date.now() - time > 2 * 60 * 1000) {
    document.getElementById("msg").innerText = "OTP expired ⏳";
    return;
  }

  if (entered === otp) {
    localStorage.removeItem("otp");
    localStorage.removeItem("otpTime");

    document.getElementById("msg").innerText = "Verified ✅";

    setTimeout(() => {
      window.location = "/home";
    }, 1000);
  } else {
    document.getElementById("msg").innerText = "Wrong OTP ❌";
  }
}

// RESEND
async function resendOTP() {
  const email = localStorage.getItem("email");

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  localStorage.setItem("otp", otp);
  localStorage.setItem("otpTime", Date.now());

  await fetch(BASE_URL + "/send-otp", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email, otp })
  });

  document.getElementById("msg").innerText = "OTP sent 📧";
}

// EVENTS
document.getElementById("verifyBtn").onclick = verifyOTP;
document.getElementById("resendBtn").onclick = resendOTP;
