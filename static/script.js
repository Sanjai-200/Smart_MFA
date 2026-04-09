const BASE_URL = window.location.origin; // 🔥 auto works in Render + local

// ================= LOGIN =================
window.login = async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  let failedAttempts = parseInt(localStorage.getItem("failedAttempts")) || 0;

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);

    localStorage.setItem("uid", userCred.user.uid);
    localStorage.setItem("email", userCred.user.email);

    const device = getDevice();
    const time = new Date().toLocaleTimeString();

    const response = await fetch(BASE_URL + "/predict", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        device,
        loginCount: 1,
        failedAttempts,
        time
      })
    });

    const result = await response.json();

    if (result.prediction === 0) {
      localStorage.setItem("failedAttempts", 0);
      window.location = "/home";
    } else {
      localStorage.setItem("finalFailedAttempts", failedAttempts);

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      localStorage.setItem("otp", otp);
      localStorage.setItem("otpTime", Date.now());

      await fetch(BASE_URL + "/send-otp", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          email: userCred.user.email,
          otp
        })
      });

      window.location = "/otp";
    }

  } catch {
    failedAttempts++;
    localStorage.setItem("failedAttempts", failedAttempts);

    document.getElementById("msg").innerText =
      `Login failed ❌ (${failedAttempts} attempts)`;
  }
};
