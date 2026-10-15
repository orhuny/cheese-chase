# Building the iOS app with Codemagic (no Mac needed)

Codemagic builds the app on a cloud Mac, signs it with your Apple certificate, and uploads it to **TestFlight**, where you install it on your iPhone. Everything below happens in a web browser and PowerShell on Windows.

Websites change their menus. If a button has moved, search the page for the words in **bold**.

**Before you start**, finish steps 1 and 2 of `docs/revenuecat-setup.md`: the Apple Developer account, the App ID `com.orhunyaman.cheesechase`, and the app created in App Store Connect. The RevenueCat part can wait, but the shop will say "Unavailable" until it's done.

---

## Step 1: Put the code on GitHub
1. Create a free account at github.com.
2. Click **+ → New repository**. Name it `cheese-chase`, choose **Private**, and **don't** add a README. Click **Create repository**.
3. In PowerShell, in `C:\Git\CheeseChase`. The first two lines are needed only once, and you replace `YOUR-NAME` with your GitHub username:
   ```powershell
   git config --global user.name "Your Name"
   git config --global user.email "you@example.com"
   git add .
   git commit -m "Cheese Chase: first version"
   git remote add origin https://github.com/YOUR-NAME/cheese-chase.git
   git push -u origin main
   ```
   A browser window opens to sign in to GitHub the first time. Afterwards, refresh the GitHub page and your files are there.

## Step 2: Create an App Store Connect API key
This lets Codemagic talk to Apple for you: create certificates, find profiles, and upload builds.
1. appstoreconnect.apple.com → **Users and Access → Integrations → App Store Connect API → Team Keys → +** (the first time, you may need to click **Request Access**).
2. Name: `Codemagic`. Access: **App Manager**. Click **Generate**.
3. **Download** the `.p8` file. You can only download it once, so keep it somewhere safe and private.
4. Write down the **Key ID** (next to the key) and the **Issuer ID** (above the list).

## Step 3: Connect Codemagic
1. Sign up at codemagic.io **with your GitHub account**. The free plan includes monthly build minutes on Mac mini M2; check their current pricing.
2. **Add application** → **GitHub** → choose `cheese-chase`. If asked for a project type, pick **Ionic Capacitor App** (or **Other**). Codemagic will find `codemagic.yaml`.
3. Go to **Team settings → Team integrations → Developer Portal → Manage keys → Add key**:
   - **App Store Connect API key name**: `CheeseChase` (remember this exact name)
   - **Issuer ID** and **Key ID** from Step 2
   - Upload the `.p8` file, then click **Save**.

## Step 4: Signing certificate (made by Codemagic)
1. **Team settings → codemagic.yaml settings → Code signing identities → iOS certificates → Generate certificate**.
2. Reference name: `cheesechase_distribution`. Type: **Apple Distribution**. Key: `CheeseChase`. Click **Create certificate**.
3. **Download** the certificate and **copy the password** it shows. Codemagic only shows them once, so keep both in a safe place such as a password manager.
4. If Codemagic asks you to, open the **Upload certificate** tab and upload that same `.p12` with its password and reference name.

Apple allows only a few distribution certificates per account. If you hit the limit, revoke an old unused one at developer.apple.com → **Certificates**.

## Step 5: Provisioning profile
A profile ties together your app ID and certificate. You make it on Apple's site, then Codemagic downloads it.
1. developer.apple.com → **Certificates, Identifiers & Profiles → Profiles → +**.
2. Choose **Distribution → App Store Connect** → **Continue**. App ID: `com.orhunyaman.cheesechase`. Certificate: the one from Step 4 (the newest **Apple Distribution**). Name: `Cheese Chase App Store`. Click **Generate**.
3. Back in Codemagic: **Code signing identities → iOS provisioning profiles → Fetch profiles**. Tick `Cheese Chase App Store`, give it a reference name such as `cheesechase_appstore`, and click **Download selected**.

## Step 6: Fill in codemagic.yaml
1. Find your app's **Apple ID** number: App Store Connect → your app → **App Information** → **Apple ID**, e.g. `6741234567`.
2. Open `codemagic.yaml` and replace the two placeholders:
   ```yaml
   integrations:
     app_store_connect: CheeseChase        # the key name from Step 3
   ...
       APP_STORE_APPLE_ID: "6741234567"    # your number, keep the quotes
   ```
3. Save, then send the change to GitHub:
   ```powershell
   git add codemagic.yaml
   git commit -m "Codemagic settings"
   git push
   ```

## Step 7: Build!
1. In Codemagic, open the app → **Start new build** → workflow **iOS → TestFlight**, branch **main** → **Start new build**.
2. It takes about 10–25 minutes. Each step shows a ✓, and you can click a step to see its log.
3. When it's green, the build is uploaded. Apple then **processes** it for about 5–30 minutes, and you'll get an email.

## Step 8: Install on your iPhone with TestFlight
1. App Store Connect → your app → **TestFlight**. When the build shows **Ready to Test**:
2. Under **Internal Testing**, click **+**, create a group (e.g. `Me`), and add yourself. Internal testers must be users on your App Store Connect team; you already are.
3. On your iPhone, install **TestFlight** from the App Store and open the invite email (or the TestFlight app). Tap **Install**.
4. Purchases in TestFlight use Apple's test store and are **free**.

---

## Every update after this
1. Change the game and test it with `npm run dev`.
2. For a **new App Store version**, raise `"version"` in `package.json` (e.g. `1.0.0` → `1.0.1`). The build number goes up automatically on each build.
3. Then run:
   ```powershell
   git add .
   git commit -m "What I changed"
   git push
   ```
4. In Codemagic, click **Start new build**.

## If a build fails
Open the red step, read the last lines of its log, then check here:

| Message mentions… | Fix |
|---|---|
| `Set APP_STORE_APPLE_ID` | Step 6 |
| integration / API key not found | The name in `codemagic.yaml` must match Step 3 exactly |
| `No matching profiles` / certificate | Steps 4–5: the profile must use the same certificate Codemagic has |
| `bundle identifier` | The App ID must be exactly `com.orhunyaman.cheesechase` everywhere |
| Swift package / `Package.swift` | Usually temporary; start the build again. If it repeats, send me the log. |
| `npm ci` | Commit `package-lock.json` (it should be in your repo) |

If you're stuck, copy the last ~30 lines of the failed step's log and send them to me.
