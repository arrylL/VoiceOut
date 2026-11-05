<!doctype html>
<?php
require 'db_connect.php';
?>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>VoiceOut – Student Portal</title>
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;800&family=Figtree:wght@400;500;600&display=swap"
    />
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <section id="auth" style="position: relative">
      <button
        class="btn ghost"
        id="adm-btn"
        style="
          position: absolute;
          top: calc(1rem + env(safe-area-inset-top, 0px));
          right: 1rem;
          z-index: 2;
          background: var(--surface);
        "
      >
        Admin
      </button>
      <div class="aside">
        <div class="brand">
          <img
            class="brand-logo"
            data-seal
            alt="Southern Luzon State University – Lucena Campus seal"
            width="360"
            height="360"
          />
          <div class="brand-text">
            <h1>VoiceOut</h1>
            <span class="brand-tagline">Students speak, SLSU listens</span>
          </div>
        </div>
        <p>Send your concern straight to school administration. Track it until it’s resolved.</p>
      </div>
      <div class="authbox">
        <div class="card">
          <div class="tabs" role="tablist">
            <button role="tab" id="t-login" aria-selected="true">Log in</button>
            <button role="tab" id="t-signup" aria-selected="false">Create account</button>
          </div>
          <form id="login" novalidate>
            <label for="l-id">Student ID</label>
            <input type="text" id="l-id" autocomplete="username" />
            <label for="l-pw">Password</label>
            <input type="password" id="l-pw" autocomplete="current-password" />
            <p class="err" id="l-err" role="alert"></p>
            <button class="btn" style="width: 100%" type="submit">Log in</button>
            <p style="text-align: center">
              <button type="button" class="link" id="forgot">Forgot password?</button>
            </p>
          </form>
          <form id="signup" class="hidden" novalidate>
            <label for="s-name">Name</label>
            <input type="text" id="s-name" autocomplete="name" />
            <label for="s-id">Student ID</label>
            <input type="text" id="s-id" />
            <label for="s-dept">Department</label>
            <select id="s-dept">
              <option value="">Select department</option>
              <option>Bachelor of Industrial Technology</option>
              <option>Bachelor of Technical-Vocational Teacher Education</option>
            </select>
            <div id="prog-wrap" class="hidden">
              <label for="s-prog">Program</label>
              <select id="s-prog">
                <option value="">Select program</option>
                <option>FSM</option>
                <option>Automotive</option>
                <option>Electrical</option>
                <option>Programming</option>
              </select>
            </div>
            <label for="s-pw">Password</label>
            <input type="password" id="s-pw" autocomplete="new-password" />
            <label for="s-sq">Secret question</label>
            <select id="s-sq"></select>
            <label for="s-sa">Your answer</label>
            <input type="text" id="s-sa" autocomplete="off" />
            <p class="meta" style="margin: 0.4rem 0 0">
              Used to reset your password if you forget it. Only you should know the answer.
            </p>
            <p class="err" id="s-err" role="alert"></p>
            <button class="btn" style="width: 100%" type="submit">Create account</button>
          </form>
        </div>
      </div>
    </section>

    <div id="app" class="hidden">
      <header class="top ctr">
        <span class="logo">
          <img class="seal" data-seal alt="SLSU Lucena seal" width="44" height="44" />
          <span class="wordmark-block">
            <span class="wordmark">VoiceOut</span>
            <span class="tagline">Students speak, SLSU listens</span>
          </span>
        </span>
        <nav aria-label="Main">
          <button data-v="home">Home</button>
          <button data-v="complain">Complain</button>
          <button data-v="status">My concerns</button>
          <button data-v="notifs">
            Notifications
            <span class="badge hidden" id="badge">0</span>
          </button>
        </nav>
        <!-- SEPARATED CORNER SETTINGS BUTTON -->
        <div class="top-actions">
          <button class="btn ghost corner-settings" id="open-settings" aria-label="Settings">
            <span aria-hidden="true">⚙</span> <span class="corner-label">Settings</span>
          </button>
        </div>
      </header>
      <main id="view"></main>
    </div>

    <!-- Settings Drawer -->
    <div id="settings-overlay"></div>
    <aside id="settings-drawer" aria-hidden="true"></aside>

    <div id="admin" class="hidden"></div>
    <dialog id="fdlg"></dialog>
    <dialog id="tdlg"></dialog>
    <dialog id="caldlg" style="max-width: 640px; max-height: 90vh; padding: 0; display: flex; flex-direction: column; overflow: hidden;"></dialog>
    <dialog id="cdlg" style="max-width: 640px; max-height: 90vh; overflow: auto"></dialog>
    <dialog id="rdlg">
      <h3>Resolve concern</h3>
      <label for="r-t">Remarks for the student</label>
      <textarea id="r-t" placeholder="Explain what was done…"></textarea>
      <p class="err" id="r-err" role="alert"></p>
      <div class="actions" style="justify-content: flex-end">
        <button class="btn ghost" id="r-no">Cancel</button>
        <button class="btn" id="r-yes">Mark as resolved</button>
      </div>
    </dialog>
    <dialog id="dlg">
      <h3 id="d-title"></h3>
      <p id="d-body" style="color: var(--muted)"></p>
      <div class="actions" style="justify-content: flex-end">
        <button class="btn ghost" id="d-no"></button>
        <button class="btn" id="d-yes"></button>
      </div>
    </dialog>
    <div id="toast" class="hidden" role="status"></div>

    <script src="script.js"></script>
  </body>
</html>