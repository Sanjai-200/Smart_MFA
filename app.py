from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pickle
import pandas as pd
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
import requests

app = Flask(__name__)
CORS(app)

# ================= CONFIG =================
EMAIL_SENDER = "smart7mfa@gmail.com"
EMAIL_PASSWORD = "rnokxuzddimxpgob"

# ================= LOAD MODEL =================
try:
    with open("model.pkl", "rb") as f:
        model = pickle.load(f)
    print("✅ ML model loaded")
except Exception as e:
    print("❌ Model load error:", e)
    model = None


# ================= EMAIL =================
def send_email(to_email, otp):
    msg = MIMEText(f"""
Hello,

Your OTP is: {otp}
Valid for 2 minutes.

- Smart MFA
""")

    msg["Subject"] = "OTP Verification"
    msg["From"] = EMAIL_SENDER
    msg["To"] = to_email

    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(EMAIL_SENDER, EMAIL_PASSWORD)
        server.sendmail(EMAIL_SENDER, to_email, msg.as_string())
        server.quit()

        print("✅ OTP sent:", to_email)
        return True
    except Exception as e:
        print("❌ Email error:", e)
        return False


# ================= LOCATION =================
def get_location(request):
    try:
        ip = request.headers.get("X-Forwarded-For", request.remote_addr)

        if ip == "127.0.0.1":
            ip = requests.get("https://api.ipify.org").text

        res = requests.get(f"http://ip-api.com/json/{ip}")
        data = res.json()

        location = data.get("country", "Unknown")

        print("🌍 IP:", ip)
        print("🌍 Location:", location)

        return location
    except:
        return "Unknown"


# ================= ROUTES =================
@app.route("/")
def login():
    return render_template("index.html")

@app.route("/signup")
def signup():
    return render_template("signup.html")

@app.route("/otp")
def otp():
    return render_template("otp.html")

@app.route("/home")
def home():
    return render_template("home.html")


# ================= OTP =================
@app.route("/send-otp", methods=["POST"])
def send_otp():
    data = request.get_json()

    email = data.get("email")
    otp = data.get("otp")

    if not email or not otp:
        return jsonify({"success": False}), 400

    success = send_email(email, otp)

    return jsonify({"success": success})


# ================= HELPERS =================
def safe_int(v, d=0):
    try:
        return int(v)
    except:
        return d

def parse_time(t):
    try:
        return datetime.strptime(t, "%I:%M:%S %p").hour
    except:
        return 12

def parse_location(loc):
    return 0 if str(loc).lower() in ["india", "unknown"] else 1

def parse_device(dev):
    return 1 if "mobile" in str(dev).lower() else 0


# ================= ENCODE =================
def encode(data):
    return pd.DataFrame([[
        parse_device(data.get("device")),
        parse_location(data.get("location")),
        safe_int(data.get("loginCount"), 1),
        parse_time(data.get("time")),
        safe_int(data.get("failedAttempts"), 0)
    ]], columns=["device","location","loginCount","hour","failedAttempts"])


# ================= PREDICT =================
@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()

    try:
        location = get_location(request)
        data["location"] = location

        input_data = encode(data)

        pred = int(model.predict(input_data)[0]) if model else 0

    except Exception as e:
        print("❌ ML Error:", e)
        pred = 0

    print("📊", data)
    print("🔮 Prediction:", pred)

    return jsonify({"prediction": pred})


# ================= RUN =================
if __name__ == "__main__":
    app.run(debug=True)
