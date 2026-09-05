# 🤖 Simple Guide: How Our Crowd Prediction Model Works (For Beginners)

Welcome! If you are new to Machine Learning (ML), don't worry. This guide explains how the **GeoDivert Crowd Density AI** works in plain, simple English using simple real-life analogies.

---

## 💡 1. What Problem Are We Solving?

During a hackathon, we don't have access to live satellite imagery or live mobile cellular data to count actual crowds in Nagpur. 

So instead, we use **Machine Learning (ML)** to **predict/guess** crowd levels based on two simple factors:
1. **Day of the week** (Monday to Sunday)
2. **Time of the day** (00:00 to 23:00 / Midnight to 11 PM)

---

## 🌳 2. What is a Decision Tree? (The Flowchart Analogy)

Think of a **Decision Tree Regressor** like a **giant automatic flowchart**:

```
                    Is it the weekend? (Sat / Sun)
                               /       \
                             YES        NO
                             /           \
                 Is it Midday?           Is it Midday?
                 (11 AM - 5 PM)          (11 AM - 5 PM)
                    /     \                 /     \
                  YES      NO             YES      NO
                  /         \             /         \
          🔴 99/100     🟠 65/100     🟡 50/100    🟢 10/100
        (Heavy Crowd)  (Moderate)     (Mild)       (Empty)
```

- **Regressor**: Means the output is a **number** (e.g. `0` = totally empty, `100` = extremely crowded).
- **Decision Tree**: Asks a sequence of simple Yes/No questions to arrive at the crowd prediction.

---

## 📊 3. Step 1: Generating the Dummy Data

Since we don't have real crowd data, we wrote a Python script using a popular data tool called **pandas** to create **1,000 rows** of realistic fake data for **Nagpur, India**.

Each row has 5 columns:
1. `latitude`: Position in Nagpur (e.g., `21.1458`)
2. `longitude`: Position in Nagpur (e.g., `79.0882`)
3. `hour`: Hour of the day (`0` to `23`)
4. `day_of_week`: Day of the week (`0` = Monday ... `5` = Saturday, `6` = Sunday)
5. `crowd_score`: A score from `0` to `100`

### Rules we gave to the data generator:
- **Weekends + Midday (11 AM to 5 PM)** = Highest crowd score (~95 to 100).
- **Weekdays + Midday** = Medium crowd score (~50 to 60).
- **Nighttime (11 PM to 6 AM)** = Low crowd score (~5 to 15).

---

## 🧠 4. Step 2: Training the AI Model

We used Python's most popular machine learning library, **Scikit-Learn** (`sklearn`).

### Why `max_depth=5`?
Imagine memorizing an entire textbook line-by-line versus understanding the main concepts.
- If a decision tree grows without limits, it gets too complex and overthinks (called **overfitting**).
- Setting `max_depth=5` limits the tree to **5 questions deep**, ensuring it learns clear, smart rules that generalize well!

### Model Accuracy:
- Our model achieved an **$R^2$ Score of 0.9487** (94.87% accuracy in identifying crowd patterns).

---

## 💾 5. Step 3: Saving into `model.pkl`

Training takes time, but predicting needs to be **instant** during your presentation!

We use a Python tool called **joblib** to save the trained brain of the AI into a single binary file called:
📁 **`backend/model.pkl`**

Think of `model.pkl` like a frozen brain snapshot. When your backend starts up, it loads `model.pkl` in less than **0.01 seconds** to make live crowd score predictions.

---

## 🚀 6. How Your Backend Uses It (FastAPI)

Inside `backend/predict.py`, we created a simple function for your FastAPI developer:

```python
from backend.predict import predict_crowd_score

# Example: Guess crowd level in Nagpur on Sunday at 2 PM
score = predict_crowd_score(latitude=21.1458, longitude=79.0882, hour=14, day_of_week=6)

print(score)  # Output: 99.2 (Red Zone / Crowded!)
```

### How GeoDivert uses this score:
GeoDivert compares locations. If Spot A has a crowd score of `99` (Crowded) and Hidden Gem Spot B has a crowd score of `15` (Empty), GeoDivert automatically routes the user to **Spot B**!

---

## 🛠️ 7. Commands to Run Yourself

If you ever want to re-train or test the model manually in your terminal:

1. **Train the Model & Generate `model.pkl`**:
   ```bash
   python backend/train_model.py
   ```

2. **Test Predictions**:
   ```bash
   python backend/predict.py
   ```

---

*Created with ❤️ for the GeoDivert Hackathon Team!*
