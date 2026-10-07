# Foodrun — Setup Checklist (do this by hand)

These are the things **only you can do**: creating accounts and copying keys. Nothing here is code.

Tick each box as you finish it. Do them in order — later steps depend on earlier ones.

Legend: `[ ]` not done · `[x]` done

---

## Before you start

- [ ] **Install Git** — open a terminal and type `git --version`. If it prints a version, you're fine. If not, download it from https://git-scm.com and install with all the default options.
- [ ] **Install Node.js (LTS version)** — download from https://nodejs.org. Choose the one marked **LTS**, not "Current". Install with all the default options. Then open a new terminal and check:

  ```
  node --version
  npm --version
  ```

  Both should print a version number.

---

## 1. GitHub (where the code lives)

- [ ] Go to https://github.com and create a free account (verify your email).
- [ ] Create a new repository:
  - Click the **+** icon at the top right → **New repository**.
  - Repository name: **`Ogunfoods`**
  - Choose **Private** (recommended — nobody else needs to see it).
  - **Do not** tick "Add a README file" or ".gitignore" — the local project already has them.
  - Click **Create repository**.
- [ ] Copy the repository's URL. It looks like `https://github.com/YOUR-NAME/Ogunfoods.git`.

> **Why:** GitHub is the bridge between your laptop and Vercel. Vercel deploys from GitHub, so the code must be there.

---

## 2. Supabase (the database and login)

- [ ] Go to https://supabase.com and click **Start your project**. Sign in with GitHub — it's the easiest option.
- [ ] Click **New project**.
  - **Organization:** accept the default (free plan).
  - **Project name:** `foodrun`
  - **Database password:** generate a strong one and **save it in a password manager**. You rarely need it, but if you lose it you'll have to reset it.
  - **Region:** choose **West Africa (Cape Town)** if offered; otherwise pick the closest region to Nigeria.
  - Click **Create new project** and wait a minute or two for it to finish.

### 2a. Where to find the URL and anon key

- [ ] In the left sidebar, click the **gear icon → Project Settings**.
- [ ] Click **API** (under "Configuration").
- [ ] You will see two things to copy:
  - **Project URL** — looks like `https://abcdefgh.supabase.co`
  - **anon public** key — a very long line of letters and numbers under "Project API keys", labelled `anon` / `public`.
- [ ] Copy both. You'll paste them in step 4.

> **What these are:**
> The **Project URL** is the address of your database.
> The **anon key** is a *public* key — it is designed to be visible in the browser. That's safe, **as long as row-level security is switched on** (Phase 1 does that). Never use the **service_role** key in your website code — that one bypasses all security.

### 2b. Turn on phone login

- [ ] In Supabase, go to **Authentication → Providers**.
- [ ] Find **Phone** and make sure it is **enabled**.
- [ ] For testing, set the OTP to a **fixed test code** (e.g. `123456`) so you don't need real SMS. You can change this before going live.
- [ ] Still under **Authentication**, open **URL Configuration** and add your site URL once you have it from Vercel (step 3) — e.g. `https://your-app.vercel.app`.

---

## 3. Vercel (where the website runs)

- [ ] Go to https://vercel.com and sign up with **GitHub**.
- [ ] You do **not** need to create anything yet — the first deploy happens later in the build.

> **Why:** Vercel hosts the site for free and auto-deploys whenever you push to GitHub.

---

## 4. Store the keys safely in `.env.local`

This is the most important step. **Never paste keys into your code.**

- [ ] In your project folder, create a file named **`.env.local`** (exactly that name — the dot matters).
- [ ] Paste this into it, filling in your two values from step 2a:

  ```
  NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
  ```

  Windows Notepad sometimes saves files as `.txt`. If that happens, create the file from the terminal instead — ask Claude to do it for you.

- [ ] **Check that Git is ignoring it.** In the project folder run:

  ```
  git status --short
  ```

  `.env.local` must **not** appear in the list. If it does, stop and tell Claude — something is wrong with `.gitignore`.

- [ ] **Double-check you never committed it:**

  ```
  git log --all --name-only | grep env
  ```

  Nothing should come back. If `.env.local` ever gets committed by accident, the key is compromised — regenerate it in Supabase (Settings → API → regenerate anon key) and tell Claude.

> **Rules**
> 1. `.env.local` stays on your laptop. It is not on GitHub and never goes in a screenshot.
> 2. Keys live in `.env.local`, read in code as `process.env.NEXT_PUBLIC_SUPABASE_URL`.
> 3. Add `.env*` to `.gitignore` — the project's `.gitignore` already does this; just don't remove it.
> 4. `.env.example` (a file with the *names* but no real values) is safe to commit. `.env.local` is not.

---

## 5. First commit

- [ ] Ask Claude to run `git init`, create `.gitignore`, and make the first commit — **or** run these yourself in the project folder:

  ```
  git add .
  git commit -m "Add planning docs: CLAUDE.md, SPEC, ROADMAP, setup checklist"
  ```

- [ ] Push to GitHub:

  ```
  git remote add origin https://github.com/YOUR-NAME/Ogunfoods.git
  git push -u origin main
  ```

  If `git push` asks for a password, GitHub no longer accepts account passwords — you need a **Personal Access Token** or the **GitHub CLI**. Ask Claude to help set this up.

- [ ] Refresh your GitHub repository page and confirm the files are there.

---

## 6. Before launch — content you must fill in

- [ ] **Delivery areas:** add the real list of areas you deliver to (Supabase → `delivery_areas` table).
- [ ] **Bank account details:** correct account number and name in the `settings` table.
- [ ] **Fees:** delivery fee amount, service fee percentage, minimum order ₦500.
- [ ] **Restaurants and menus:** real names, addresses, opening hours, image URLs, prices.
- [ ] **Your admin profile:** make sure your own row in `profiles` has `role = admin`.
- [ ] **Your agent's phone numbers:** added to `profiles` with `role = agent`.
- [ ] **Turn off the test OTP** and use real SMS (Supabase → Authentication → Providers → Phone).
- [ ] **Add your live URL** to Supabase Authentication → URL Configuration → Redirect URLs.

---

## Quick reference — what each account is for

| Service | What it does | Costs |
| --- | --- | --- |
| **GitHub** | Stores the code | Free |
| **Supabase** | Database, phone login, realtime, security | Free tier to start |
| **Vercel** | Hosts the website | Free tier to start |

---

## If something goes wrong

- **Site can't reach the database** → check `.env.local` exists, has both values, and you restarted the dev server after saving it.
- **"Invalid API key"** → you probably pasted the `service_role` key instead of `anon`, or copied it with a stray space.
- **Login code never arrives** → for now you should be using a **fixed test code** (step 2b), so the code is the one you set, not one that was sent.
- **Keys leaked** → don't panic. Regenerate them in Supabase (Settings → API), put the new ones in `.env.local`, and tell Claude.
