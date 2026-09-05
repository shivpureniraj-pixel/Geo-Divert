# 🚀 Geo-Divert — Developer Guide & Team Workflow

Welcome to **Geo-Divert**! This project is organized into `frontend` and `backend` directories.

To keep our development fast, safe, and free of chaotic merge conflicts (especially during hackathons and team builds), all team members follow the simple **Feature Branching Workflow** detailed below.

---

## 📁 Repository Structure

```text
Geo-Divert/
├── frontend/    # Frontend UI code
├── backend/     # Backend server / API code
└── README.md    # Developer guide & instructions
```

---

## 🌿 How Branching Works (Simplified)

Think of our project like a **tree**:
- **`main` branch (The Trunk):** Contains stable, working, production-ready code. **Never code directly on `main`!**
- **Feature Branches (The Branches):** Parallel, isolated workspaces where you build your feature. Anything broken on a feature branch will **never** affect the rest of the team or break the app.

---

## 🛠️ Step-by-Step Daily Workflow

### 1️⃣ Start with the Latest Code
Before starting any new feature, make sure you have the newest code from GitHub:
```bash
git checkout main
git pull origin main
```

### 2️⃣ Create Your Feature Branch
Create and switch to your own dedicated branch (name it after what you are building):
```bash
git checkout -b feature/login-page
# Or for backend work:
git checkout -b feature/user-api
```
> 💡 *This creates an exact copy of `main` at that moment and switches your workspace safely onto your new branch.*

### 3️⃣ Work & Save Your Changes
Build your feature inside your branch. Save and commit your work regularly:
```bash
git add .
git commit -m "Add user login form UI"
```

### 4️⃣ Push Your Branch to GitHub
When your feature is ready (or you want feedback), push your branch to GitHub:
```bash
git push -u origin feature/login-page
```

### 5️⃣ Open a Pull Request (PR) & Merge
1. Go to our GitHub repository: [Geo-Divert on GitHub](https://github.com/shivpureniraj-pixel/Geo-Divert).
2. Click **"Compare & pull request"**.
3. Review your changes and click **"Create pull request"**.
4. Once reviewed/approved, click **"Merge pull request"** to combine your feature into `main`.
5. Safely delete your feature branch on GitHub once merged!

---

## 🛡️ 5 Golden Rules to Avoid Merge Conflicts

1. **Never work directly on `main`:** Always create a `feature/name` branch.
2. **One Feature per Branch:** Keep your branches small and focused on a single task.
3. **Pull `main` frequently:** Update your local `main` branch daily so you are never working on outdated code.
4. **Communicate with your team:** Assign roles early so two developers aren't editing the exact same file at the exact same time.
5. **Clean up old branches:** Delete your feature branch locally and on GitHub once it is merged into `main`.

```bash
# Clean up your local branch after merging
git checkout main
git pull origin main
git branch -d feature/login-page
```

Happy Coding! 🚀
