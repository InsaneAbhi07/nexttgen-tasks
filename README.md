# NexttGen Team Tasks

A shared to-do list, reminder and history portal for the NexttGen team (4–5 people).
It's plain HTML/CSS/JS with **no database and no server**, so it runs on **GitHub Pages**.

## How the data is shared without a database

```
 Browser (Rohit)  ─┐                         ┌─ GitHub Pages repo (public)
 Browser (Priya)  ─┼─ GitHub REST API ──────►│   index.html, assets/   ← the app
 Browser (Karan)  ─┘   read/write one file   └─ Data repo (PRIVATE)
        │                                         data/db.json        ← all users, tasks, history
        └─ localStorage cache (works offline, instant UI)
```

* Every user, task and history entry lives in **one JSON file** (`data/db.json`) in a **private** GitHub repo.
* Each browser keeps a copy in `localStorage`, so the UI is instant. It **pulls every 30 seconds**,
  and again whenever you switch back to the tab. It **pushes right after every change**.
* **Two people saving at once:** before writing, the app fetches the latest file and merges it record by record
  (the newest `updatedAt` wins). It then writes with the file's `sha`. If someone else wrote first, GitHub rejects
  the write and the app retries. Deletes are "soft", so a merge can never bring a deleted task back.
* Each save is a git commit, so you get a complete audit trail and backup in the repo for free.

**Why "same day" and "3–4 days" show up on everyone's dashboard:** every task has a `due` date. The dashboard
groups all team tasks into **Overdue → Today → Tomorrow → each of the next days → Later**. The date strip at the top
shows the load for today plus the next 6 days. Because everyone reads the same `db.json`, a task Priya adds for
Thursday appears on your Thursday row within 30 seconds.

## Setup (about 5 minutes)

1. **App repo** (public): push this folder to e.g. `InsaneAbhi07/nexttgen-tasks`, then go to
   *Settings → Pages → Deploy from branch → `main` / root*. It will be served at
   `https://insaneabhi07.github.io/nexttgen-tasks/`.
2. **Data repo** (private): create an empty private repo, e.g. `InsaneAbhi07/nexttgen-tasks-data`, with a README so
   that `main` exists.
3. **Token:** go to GitHub → *Settings → Developer settings → Fine-grained tokens → Generate*.
   * Repository access: **only** `nexttgen-tasks-data`
   * Permissions: **Contents → Read and write** (nothing else)
   * Expiry: whatever your team policy allows (you can renew it later)
4. Open the portal, then go to **Settings → Team workspace**. Enter the owner, repo and token, and click **Save & connect**.
   The app creates `data/db.json` on the first save.
5. Click **Copy invite link** and send it **privately** to each teammate. Opening it connects their browser.
   They then **Register** with their name, a username and a password and are added to the common dashboard.

> Want to just look first? Open `index.html` and click **Load demo team**, then sign in as
> username `rohit`, password `nexttgen`. Demo mode is local only.

## Features

| Area | What it does |
|---|---|
| **Dashboard** | Team-wide, date-wise list (Overdue / Today / Tomorrow / next days / Later), a 7-day load strip, and filters by member, status and search |
| **My Tasks** | Your tasks only, with your weekly count and completion streak |
| **Week** | 7-column calendar for any week, with "+ Add" on each day |
| **Team** | Per-person open / today / overdue / done counts, what each person is working on now, and a 5-day workload table |
| **History** | Every create / complete / reschedule / reassign, grouped by day (Today, 3, 7 or 30 days) and filterable by person. Each task also has its own history |
| **Reminders** | Browser notifications (10 min / 30 min / 1 h / 1 day before, or at due time), a bell with overdue/today/next 3 days, and a daily digest toast |
| **Repeat** | Daily / weekdays / weekly / monthly. Completing one creates the next |

### The "smart" parts (rule-based, no AI API, no cost)

* **Smart add bar**: type `Client demo tomorrow 4pm @priya #high` and it picks out the date, time, assignee,
  priority and tags. It understands `today`, `tomorrow`, `kal`, `parso`, `fri`, `next week`, `in 3 days`, `15/10`
  (dd/mm), `5pm`, `17:30`, `@name`, `#tag`, `#high`/`!!`. Press `/` anywhere to jump to it.
* **Auto priority**: words like *bug, fix, client, deploy, prod, urgent* suggest High, and *research, docs, refactor* suggest Low.
* **Your focus now**: scores your open tasks (overdue, due today, priority, in progress) and picks the top 3.
* **Smart insights**: flags your overdue tasks (with a one-click move to today), heavy days (push the low-priority ones
  to tomorrow), a busy upcoming day, unbalanced workload across the team, tasks stuck "in progress" for 3+ days,
  the weekly completion trend and your streak.
* **One-click standup**: builds Yesterday / Today / Blockers from your real tasks. You can copy it or share it to WhatsApp.

## Honest limitations (static hosting)

* **Login is a team convenience, not real security.** Passwords are salted and SHA-256 hashed, but everyone who has
  the token can technically read the data file. That's fine for a small trusted team. Keep the data repo private
  and share invite links only in DMs.
* **Reminders fire only while the portal is open** in some tab (pin it). True push or email when the browser is closed
  needs a server. If you need that later, a scheduled GitHub Action can read `db.json` and send emails.
* Each GitHub token allows 5,000 API calls per hour. 5 people polling every 30 seconds use about 600 per hour, well within the limit.
* Keep `db.json` under 1 MB. Activity is capped at 2,000 entries. Use **Settings → Export JSON** for archives.

## Files

```
index.html            app shell
assets/css/style.css  NexttGen theme (light + dark)
assets/js/store.js    data layer: localStorage + GitHub sync & merge
assets/js/smart.js    parser, priority guess, date grouping, focus, insights, standup
assets/js/app.js      UI, views, reminders, demo data
assets/img/           NexttGen logo + NG icon
```
