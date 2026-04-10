import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import pickle


df = pd.read_csv("dataset.csv")

print(df.head())


print("\n Risk Count:")
print(df["risk"].value_counts())


X = df[["device", "location", "loginCount", "hour", "failedAttempts"]]
y = df["risk"]


X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)


model = RandomForestClassifier()
model.fit(X_train, y_train)


y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print("\n Accuracy:", accuracy)


print("\n Testing model...")

test_safe = [[1, 0, 1, 10, 0]]
test_risk = [[1, 1, 10, 2, 5]]

print("Safe Test :", model.predict(test_safe)[0])
print("Risk Test :", model.predict(test_risk)[0])


with open("model.pkl", "wb") as f:
    pickle.dump(model, f)

print("\n✅ Model saved as model.pkl")
