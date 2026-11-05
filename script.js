const $ = (s, r = document) => r.querySelector(s);

const SEAL_SRC = 'https://www.slsu.edu.ph/wp-content/uploads/2023/05/Campuses/SLSU%20Lucena/slsu%20lucena%20logo.png';

document.querySelectorAll('img[data-seal]').forEach((img) => (img.src = SEAL_SRC));

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const KEY = 'vo_db_v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch (e) {
    return null;
  }
}

const d0 = load() || {};
const fixC = (a) => (a || []).map((c) => (c.createdAt ? c : { ...c, createdAt: c.id }));
const state = {
  user: null,
  users: d0.users || [],
  concerns: fixC(d0.concerns),
  notifs: d0.notifs || [],
  view: 'home',
};

function save() {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ users: state.users, concerns: state.concerns, notifs: state.notifs })
    );
  } catch (e) {}
}

const mine = () => state.concerns.filter((c) => c.uid === state.user.id),
  myN = () => state.notifs.filter((n) => n.uid === state.user.id);

function toast(m) {
  const t = $('#toast');
  t.textContent = m;
  t.classList.remove('hidden');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.add('hidden'), 2600);
}

function confirmBox({ title, body, yes, no, danger }, cb) {
  const d = $('#dlg');
  $('#d-title').textContent = title;
  $('#d-body').textContent = body;
  $('#d-yes').textContent = yes;
  $('#d-no').textContent = no;
  $('#d-yes').className = 'btn' + (danger ? ' danger' : '');
  $('#d-yes').onclick = () => {
    d.close();
    cb();
  };
  $('#d-no').onclick = () => d.close();
  d.showModal();
}

/* AUTH */
function authTab(login) {
  $('#login').classList.toggle('hidden', !login);
  $('#signup').classList.toggle('hidden', login);
  $('#t-login').setAttribute('aria-selected', login);
  $('#t-signup').setAttribute('aria-selected', !login);
}

$('#t-login').onclick = () => authTab(true);
$('#t-signup').onclick = () => authTab(false);
$('#forgot').onclick = () => openForgot();
$('#s-dept').onchange = (e) =>
  $('#prog-wrap').classList.toggle('hidden', !e.target.value.includes('Teacher'));

$('#login').onsubmit = async (e) => {
  e.preventDefault();
  const id = $('#l-id').value.trim(),
    pw = $('#l-pw').value;

  $('#l-err').textContent = 'Checking...';

  try {
    const res = await fetch('login_process.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: id, password: pw })
    });
    const result = await res.json();

    if (result.status === 'success') {
      state.user = {
        db_id: result.user.id,
        id: result.user.student_id,
        name: result.user.name,
        dept: result.user.department,
        role: result.user.role
      };
      enter();
    } else {
      $('#l-err').textContent = result.message;
    }
  } catch (err) {
    console.error(err);
    $('#l-err').textContent = 'Connection error. Check XAMPP.';
  }
};

$('#signup').onsubmit = async (e) => {
  e.preventDefault();

  const u = {
    name: $('#s-name').value.trim(),
    id: $('#s-id').value.trim(),
    dept: $('#s-dept').value,
    prog: $('#s-prog').value,
    pw: $('#s-pw').value,
    sq: $('#s-sq').value,
    sa: norm($('#s-sa').value),
  };

  const need = !u.dept.includes('Teacher') || u.prog;
  let m = '';
  if (!u.name || !u.id || !u.dept || !u.pw) m = 'Fill in all fields.';
  else if (!need) m = 'Choose your program.';
  else if (u.pw.length < 6) m = 'Password must be at least 6 characters.';
  else if (u.sa.length < 2) m = 'Answer your secret question.';

  $('#s-err').textContent = m;
  if (m) return;

  $('#s-err').textContent = 'Creating account...';

  try {
    const response = await fetch('register_process.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: u.name,
        student_id: u.id,
        department: u.dept,
        password: u.pw,
        secret_question: u.sq,
        secret_answer: u.sa
      })
    });

    const result = await response.json();

    if (result.status === 'success') {
      state.users.push(u);
      state.user = u;
      enter();
      toast('Account created. Welcome to VoiceOut!');
    } else {
      $('#s-err').textContent = result.message;
    }
  } catch (error) {
    console.error(error);
    $('#s-err').textContent = 'Connection error. Check if XAMPP is running.';
  }
};

function enter() {
  $('#auth').classList.add('hidden');
  $('#app').classList.remove('hidden');
  go('home');
}

async function logout() {
  try {
    await fetch('logout.php');
  } catch (err) {
    console.error(err);
  }

  state.user = null;
  adminUser = '';
  adminIn = false;
  adminMode = false;

  closeSettingsDrawer();

  $('#admin').classList.add('hidden');
  $('#app').classList.add('hidden');
  $('#auth').classList.remove('hidden');

  $('#l-pw').value = '';
  $('#l-err').textContent = '';
  authTab(true);
}

/* NAV */
document.querySelectorAll('nav button').forEach((b) => {
  b.onclick = () => go(b.dataset.v);
});

$('#open-settings').onclick = () => openSettingsDrawer();

function go(v) {
  state.view = v;
  document
    .querySelectorAll('nav button')
    .forEach(
      (b) =>
        b.toggleAttribute('aria-current', b.dataset.v === v) || b.removeAttribute('aria-current')
    );
  document.querySelectorAll('nav button').forEach((b) => {
    if (b.dataset.v === v) b.setAttribute('aria-current', 'page');
  });
  if (v === 'notifs') {
    const el = $('#view');
    views[v](el);
    myN().forEach((n) => (n.read = true));
    save();
    badge();
    return;
  }
  views[v]($('#view'));
  badge();
  window.scrollTo(0, 0);
}

/* --- BADGE (fetches unread count from database) --- */
async function badge() {
  if (!state.user) {
    $('#badge').classList.add('hidden');
    return;
  }
  try {
    const res = await fetch('unread_count.php');
    const data = await res.json();
    const n = data.count || 0;
    const b = $('#badge');
    b.textContent = n;
    b.classList.toggle('hidden', !n);
  } catch (err) {
    console.error('Badge fetch failed:', err);
  }
}

/* --- SETTINGS DRAWER -------------------------------------------------- */
function openSettingsDrawer() {
  const drawer = $('#settings-drawer');
  const overlay = $('#settings-overlay');
  if (!drawer || !overlay) {
    console.warn('Settings drawer DOM missing');
    return;
  }

  drawerRenderRoot();
  overlay.classList.add('open');
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');

  overlay.onclick = closeSettingsDrawer;
  document.onkeydown = (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) closeSettingsDrawer();
  };
}

function closeSettingsDrawer() {
  const drawer = $('#settings-drawer');
  const overlay = $('#settings-overlay');
  if (!drawer || !overlay) return;
  drawer.classList.remove('open');
  overlay.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  document.onkeydown = null;
  document.querySelectorAll('nav button').forEach((b) => {
    b.toggleAttribute('aria-current', b.dataset.v === state.view);
  });
}

function drawerShell(title, bodyHTML, { back = false } = {}) {
  const drawer = $('#settings-drawer');
  drawer.innerHTML = `
    <div class="drawer-head">
      ${back
        ? `<button class="drawer-back" id="drawer-back" aria-label="Back">←</button>`
        : `<span style="width:40px"></span>`}
      <h2>${esc(title)}</h2>
      <button class="drawer-close" id="drawer-close" aria-label="Close">×</button>
    </div>
    <div class="drawer-body">${bodyHTML}</div>
  `;
  $('#drawer-close').onclick = closeSettingsDrawer;
  if (back) $('#drawer-back').onclick = drawerRenderRoot;
}

function drawerRenderRoot() {
  const isAdmin = (state.user && state.user.role === 'admin') || adminMode;

  const userLabel = isAdmin
    ? adminUser || 'Administrator'
    : state.user?.name || 'Signed in';
  const userSub = isAdmin ? 'Administrator' : (state.user?.id || '');
  const initial = (isAdmin ? (adminUser || 'A') : (state.user?.name || '?')).trim().charAt(0).toUpperCase() || '?';

  const adminItems = `
    <li><button data-open="admin-account">
      <span class="icon"><i class="ic ic-user"></i></span>
      <span class="label">Admin account<small>Username and role</small></span>
      <span class="chev">›</span>
    </button></li>
    <li><button data-open="password">
      <span class="icon"><i class="ic ic-lock"></i></span>
      <span class="label">Password &amp; security<small>Change your password</small></span>
      <span class="chev">›</span>
    </button></li>
    <li><button data-open="appearance">
      <span class="icon"><i class="ic ic-palette"></i></span>
      <span class="label">Appearance<small>Theme preference</small></span>
      <span class="chev">›</span>
    </button></li>
    <li><button data-open="about">
      <span class="icon"><i class="ic ic-info"></i></span>
      <span class="label">About VoiceOut<small>Who we are</small></span>
      <span class="chev">›</span>
    </button></li>
    <li><button data-open="help">
      <span class="icon"><i class="ic ic-chat"></i></span>
      <span class="label">Help &amp; support<small>Contact &amp; FAQ</small></span>
      <span class="chev">›</span>
    </button></li>
    <li><button data-open="logout" class="danger">
      <span class="icon"><i class="ic ic-logout"></i></span>
      <span class="label">Log out<small>End your session</small></span>
      <span class="chev">›</span>
    </button></li>
  `;

  const studentItems = `
    <li><button data-open="account">
      <span class="icon"><i class="ic ic-user"></i></span>
      <span class="label">Account details<small>Name, student ID, department</small></span>
      <span class="chev">›</span>
    </button></li>
    <li><button data-open="password">
      <span class="icon"><i class="ic ic-lock"></i></span>
      <span class="label">Password &amp; security<small>Change your password</small></span>
      <span class="chev">›</span>
    </button></li>
    <li><button data-open="about">
      <span class="icon"><i class="ic ic-info"></i></span>
      <span class="label">About VoiceOut<small>Who we are</small></span>
      <span class="chev">›</span>
    </button></li>
    <li><button data-open="help">
      <span class="icon"><i class="ic ic-chat"></i></span>
      <span class="label">Help &amp; support<small>Contact &amp; FAQ</small></span>
      <span class="chev">›</span>
    </button></li>
    <li><button data-open="logout" class="danger">
      <span class="icon"><i class="ic ic-logout"></i></span>
      <span class="label">Log out<small>End your session</small></span>
      <span class="chev">›</span>
    </button></li>
  `;

  const body = `
    <div style="display:flex;align-items:center;gap:0.9rem;margin-bottom:1rem">
      <div style="width:48px;height:48px;border-radius:50%;background:var(--brand);color:var(--brand-ink);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.2rem">
        ${esc(initial)}
      </div>
      <div style="min-width:0">
        <div style="font-weight:600">${esc(userLabel)}</div>
        <div class="meta" style="margin:0">${esc(userSub)}</div>
      </div>
    </div>
    <ul class="drawer-menu">
      ${isAdmin ? adminItems : studentItems}
    </ul>
  `;

  drawerShell('Settings', body);
  document.querySelectorAll('#settings-drawer .drawer-menu button').forEach((b) => {
    b.onclick = () => drawerRenderSection(b.dataset.open);
  });
}

function drawerRenderSection(key) {
  if (key === 'account')       return drawerAccount();
  if (key === 'admin-account') return drawerAdminAccount();
  if (key === 'password')      return drawerPassword();
  if (key === 'appearance')    return drawerAppearance();
  if (key === 'about')         return drawerAbout();
  if (key === 'help')          return drawerHelp();
  if (key === 'logout')        return drawerLogout();
}

function drawerAccount() {
  const u = state.user || {};
  const body = `
    <div class="drawer-section">
      <h3>Account details</h3>
      <p class="meta">These details are set when you registered. Contact administration to change your Student ID or department.</p>
      <dl class="kv">
        <dt>Name</dt><dd>${esc(u.name || '—')}</dd>
        <dt>Student ID</dt><dd>${esc(u.id || '—')}</dd>
        <dt>Department</dt><dd>${esc(u.dept || '—')}</dd>
        ${u.role ? `<dt>Role</dt><dd>${esc(u.role)}</dd>` : ''}
      </dl>
    </div>
  `;
  drawerShell('Account details', body, { back: true });
}

function drawerAdminAccount() {
  const body = `
    <div class="drawer-section">
      <h3>Admin account</h3>
      <p class="meta">Your administrator credentials are managed by the school. Contact the IT office if you need to update your username.</p>
      <dl class="kv">
        <dt>Username</dt><dd>${esc(adminUser || '—')}</dd>
        <dt>Role</dt><dd>School administrator</dd>
      </dl>
    </div>
  `;
  drawerShell('Admin account', body, { back: true });
}

function drawerPassword() {
  const u = state.user || {};
  const body = `
    <div class="drawer-section">
      <h3>Change password</h3>
      <form id="pf" novalidate>
        <label for="p-old">Current password</label>
        <input type="password" id="p-old" autocomplete="current-password" />
        <label for="p-new">New password</label>
        <input type="password" id="p-new" autocomplete="new-password" />
        <p class="err" id="p-err" role="alert"></p>
        <button class="btn" type="submit" style="width:100%">Change password</button>
      </form>
      <p style="margin-top:1rem">
        <button type="button" class="link" id="fp-set">Forgot your current password?</button>
      </p>
    </div>
  `;
  drawerShell('Password & security', body, { back: true });

  $('#pf').onsubmit = async (e) => {
    e.preventDefault();
    const current = $('#p-old').value;
    const newPw = $('#p-new').value;

    let m = '';
    if (!current) m = 'Enter your current password.';
    else if (newPw.length < 6) m = 'New password must be at least 6 characters.';
    $('#p-err').textContent = m;
    if (m) return;

    $('#p-err').textContent = 'Saving...';

    try {
      const res = await fetch('change_password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current, new: newPw }),
      });
      const result = await res.json();

      if (result.status === 'success') {
        $('#p-old').value = '';
        $('#p-new').value = '';
        $('#p-err').textContent = '';
        toast('Password changed.');
      } else {
        $('#p-err').textContent = result.message;
      }
    } catch (err) {
      console.error(err);
      $('#p-err').textContent = 'Connection error. Check XAMPP.';
    }
  };

  $('#fp-set').onclick = () => {
    if (u.id) $('#l-id').value = u.id;
    openForgot();
  };
}

function drawerAppearance() {
  const body = `
    <div class="drawer-section">
      <h3>Appearance</h3>
      <p class="meta">Choose how the admin interface looks. Your preference is remembered on this device.</p>
      <label for="s-theme">Theme</label>
      <select id="s-theme">
        <option value="system">Match my device</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  `;
  drawerShell('Appearance', body, { back: true });

  $('#s-theme').value = theme;
  $('#s-theme').onchange = (e) => {
    theme = e.target.value;
    theme === 'system'
      ? document.documentElement.removeAttribute('data-theme')
      : document.documentElement.setAttribute('data-theme', theme);
  };
}

function drawerAbout() {
  const body = `
    <div class="drawer-section">
      <h3>VoiceOut</h3>
      <p><em>Students speak, SLSU listens.</em></p>
      <p>VoiceOut is a student concern portal for Southern Luzon State University – Lucena Campus. It gives every student a direct, trackable line to school administration for issues about academics, facilities, fees, organizations, and conduct.</p>
      <p>Every concern you submit is logged, routed to the right office, and given a status: <strong>Pending</strong> → <strong>In review</strong> → <strong>Resolved</strong>. You'll see admin remarks on the concern once it's resolved.</p>
      <h3 style="margin-top:1.2rem">About SLSU Lucena</h3>
      <p>Southern Luzon State University – Lucena Campus is one of the university's satellite campuses serving students in Quezon Province. VoiceOut is built to support the campus's commitment to responsive, student-centered administration.</p>
      <p class="meta" style="margin-top:1.2rem">Version 1.0.0 · Built with 💚 for SLSU students</p>
    </div>
  `;
  drawerShell('About VoiceOut', body, { back: true });
}

function drawerHelp() {
  const body = `
    <div class="drawer-section">
      <h3>Contact us</h3>
      <dl class="kv">
        <dt>Email</dt><dd>voiceout@slsu.edu.ph</dd>
        <dt>Office</dt><dd>Student Affairs Office, Admin Building</dd>
        <dt>Hours</dt><dd>Mon–Fri, 8:00 AM – 5:00 PM</dd>
        <dt>Phone</dt><dd>(042) 123-4567 loc. 108</dd>
      </dl>
      <h3 style="margin-top:1.4rem">Frequently asked questions</h3>
      <ul class="faq">
        <li>
          <details>
            <summary>Who can see my concern?</summary>
            <p>Only the administration staff who handle concerns — and you, on your "My concerns" page. If you check "Send as anonymous", your name is hidden from the admin view.</p>
          </details>
        </li>
        <li>
          <details>
            <summary>How long does it take to resolve?</summary>
            <p>Most concerns are reviewed within 1–3 working days. Critical priority concerns are prioritized. You'll get a notification the moment the status changes.</p>
          </details>
        </li>
        <li>
          <details>
            <summary>Can I edit or delete a concern after sending it?</summary>
            <p>No — once submitted, a concern can't be edited. If you need to add more information, submit a follow-up concern with the same title.</p>
          </details>
        </li>
        <li>
          <details>
            <summary>I forgot my password. What do I do?</summary>
            <p>Click "Forgot password?" on the login screen. You'll answer the secret question you set when you registered. If you can't answer it, contact the Student Affairs Office with your Student ID.</p>
          </details>
        </li>
      </ul>
    </div>
  `;
  drawerShell('Help & support', body, { back: true });
}

function drawerLogout() {
  if (adminMode || (state.user && state.user.role === 'admin')) {
    confirmBox(
      {
        title: 'Log out of admin?',
        body: 'You’ll need your admin credentials to log back in.',
        yes: 'Log out',
        no: 'Stay',
      },
      () => {
        logout();
      }
    );
    return;
  }
  confirmBox(
    {
      title: 'Log out?',
      body: 'You’ll need your Student ID and password to log back in.',
      yes: 'Log out',
      no: 'Stay',
    },
    () => logout()
  );
}

const views = {
  home(el) {
    el.innerHTML = `<div class="home-bg">
      <section class="hero">
        <h1>Your concern deserves an answer.</h1>
        <p>
          VoiceOut is a central place for students to raise concerns about academics, facilities,
          fees, organizations, and conduct. Your concern goes directly to school administration, and
          you can follow its progress here.
        </p>
        <button class="btn big" id="cta">Complain Here</button>
      </section>
      <div class="steps">
        <div><strong>Send it</strong>Describe the concern, set its urgency, attach proof.</div>
        <div><strong>Track it</strong>See if it's Pending, In review, or Resolved.</div>
        <div><strong>Get a reply</strong>Read the admin's remarks once it's resolved.</div>
      </div>
      <footer class="school">
        <strong>School details</strong><br />[Southern Luzon State University Lucena Campus] · [Brgy. Ibabang Dupay, Lucena City] · [+639123456789] ·
        [slsulucena@gmail.com] · Office hours: Mon–Fri, 8:00 AM–5:00 PM
      </footer>
    </div>`;
    $('#cta').onclick = () => go('complain');
  },

  complain(el) {
    el.innerHTML = `<h2>Submit a concern</h2>
      <form class="card" id="cf" style="margin-top:1rem" novalidate>
        <label for="c-name">Name</label>
        <input type="text" id="c-name" value="${esc(state.user ? state.user.name : '')}" />
        <label class="inline"><input type="checkbox" id="c-anon" /> Send as anonymous</label>
        <label for="c-type">Concern type</label>
        <select id="c-type">
          <option value="">Select type</option>
          <option>Academic concerns</option>
          <option>Campus facilities</option>
          <option>Fees</option>
          <option>School organizations</option>
          <option>Faculty/Staff conduct</option>
          <option>Student conduct</option>
          <option>Others</option>
        </select>
        <div id="oth" class="hidden">
          <label for="c-oth">Please specify</label><input type="text" id="c-oth" />
        </div>
        <label for="c-title">Title</label><input type="text" id="c-title" maxlength="100" />
        <label for="c-desc">Description</label>
        <textarea id="c-desc" maxlength="1000" placeholder="Write your concern here…"></textarea>
        <div class="count"><span id="cnt">0</span>/1000</div>
        <label for="c-file">Attachment (optional image or file)</label>
        <input type="file" id="c-file" accept="image/*,.pdf,.docx,.txt" />
        <label>Urgency &amp; severity</label>
        <div class="levels">
          <label><input type="radio" name="lv" value="Low" checked /> Low</label>
          <label><input type="radio" name="lv" value="Moderate" /> Moderate</label>
          <label><input type="radio" name="lv" value="Critical priority" /> Critical priority</label>
        </div>
        <p class="err" id="c-err" role="alert"></p>
        <div class="actions">
          <button class="btn" type="submit">Send</button>
          <button class="btn ghost" type="button" id="c-cancel">Cancel</button>
        </div>
      </form>`;

    const anon = $('#c-anon');
    anon.onchange = () => {
      $('#c-name').disabled = anon.checked;
    };
    $('#c-type').onchange = (e) =>
      $('#oth').classList.toggle('hidden', e.target.value !== 'Others');
    $('#c-desc').oninput = (e) => ($('#cnt').textContent = e.target.value.length);

    $('#c-cancel').onclick = () =>
      confirmBox(
        {
          title: 'Cancel this concern?',
          body: 'What you wrote will be cleared.',
          yes: 'Yes, cancel',
          no: 'Keep writing',
          danger: true,
        },
        () => go('home')
      );

    $('#cf').onsubmit = (e) => {
      e.preventDefault();
      const type = $('#c-type').value,
        title = $('#c-title').value.trim(),
        desc = $('#c-desc').value.trim(),
        oth = $('#c-oth').value.trim();
      let m = '';
      if (!anon.checked && !$('#c-name').value.trim()) m = 'Enter your name or choose anonymous.';
      else if (!type) m = 'Select a concern type.';
      else if (type === 'Others' && !oth) m = 'Specify your concern type.';
      else if (!title) m = 'Add a title.';
      else if (!desc) m = 'Describe your concern.';
      $('#c-err').textContent = m;
      if (m) return;

      confirmBox(
        {
          title: 'Send this concern?',
          body: "It will go to school administration. You can't edit it after sending.",
          yes: 'Send concern',
          no: 'Review again',
        },
        async () => {
          const payload = {
            is_anonymous: anon.checked ? 1 : 0,
            concern_type: type === 'Others' ? 'Others: ' + oth : type,
            title: title,
            description: desc,
            urgency: document.querySelector('[name=lv]:checked').value,
          };

          try {
            const res = await fetch('submit_concern.php', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const result = await res.json();

            if (result.status === 'success') {
              toast('Concern sent.');
              go('status');
              badge();
            } else {
              $('#c-err').textContent = result.message;
            }
          } catch (err) {
            console.error(err);
            $('#c-err').textContent = 'Connection error. Check XAMPP.';
          }
        }
      );
    };
  },

  status(el) {
    fetch('get_concerns.php')
      .then((r) => r.json())
      .then((rows) => {
        state.concerns = rows;
        el.innerHTML = '';
        const order = ['Pending', 'In-review', 'Resolved'];
        el.innerHTML =
          `<h2>My concerns</h2>
           <p class="meta">Tap a concern to see its full details and attachment.</p>
           <div style="margin-top:1rem">` +
          (state.concerns.length
            ? state.concerns
                .map(
                  (c) => `
                <article class="card item click" data-open="${c.id}" tabindex="0">
                  <header>
                    <h3>${esc(c.title)}</h3>
                    <span class="pill ${c.status}">${c.status === 'In-review' ? 'In review' : c.status}</span>
                  </header>
                  <p class="meta">${esc(c.concern_type)} · Sent ${c.date} as ${esc(c.by)}</p>
                  <div class="track">${order.map((s, i) => `<i class="${i <= order.indexOf(c.status) ? 'on' : ''}"></i>`).join('')}</div>
                  <p style="margin:.4rem 0">${esc(c.desc)}</p>
                  ${c.status === 'Resolved' ? `<div class="remark"><strong>Admin remarks</strong><br />${esc(c.remark)}</div>` : ''}
                </article>
              `
                )
                .join('')
            : `<div class="card empty">No concerns yet.<br /><br /><button class="btn" id="go-c">Submit a concern</button></div>`) +
          `</div>`;
        const g = $('#go-c');
        if (g) g.onclick = () => go('complain');
        el.querySelectorAll('[data-open]').forEach((a) => {
          a.onclick = () => openC(a.dataset.open);
        });
      })
      .catch((err) => {
        console.error(err);
        el.innerHTML = '<div class="card empty">Could not load concerns. Is XAMPP running?</div>';
      });
  },

  notifs(el) {
    fetch('get_notifications.php')
      .then((r) => r.json())
      .then((rows) => {
        state.notifs = rows;
        if (rows.length) {
          fetch('mark_notifications_read.php').catch((e) => console.error(e));
        }
        el.innerHTML =
          `<h2>Notifications</h2>
           <p class="meta">${rows.length} notification${rows.length === 1 ? '' : 's'}</p>
           <div class="card" style="margin-top:1rem;padding:0">` +
          (rows.length
            ? rows
                .map(
                  (n) => `<div class="note ${n.read ? '' : 'new'}">
                    <span class="pill ${n.t === 'Resolved' ? 'Resolved' : 'In-review'}">${n.t}</span>
                    <div>
                      <strong>${esc(n.m)}</strong>
                      ${n.remark ? `<div class="meta">Admin remarks: ${esc(n.remark)}</div>` : ''}
                      <div class="meta">${n.d}</div>
                    </div>
                  </div>`
                )
                .join('')
            : `<div class="empty">Nothing yet. You'll be notified when an admin reviews or resolves your concern.</div>`) +
          `</div>`;
        badge();
      })
      .catch((err) => {
        console.error('Notifications fetch failed:', err);
        el.innerHTML = '<div class="card empty">Could not load notifications.</div>';
      });
  },
};

/* ADMIN */
const ADMIN_URL = 'https://claude.ai/artifact/TMtZSZzjiJgZX1akZAcvSu#admin';
let adminUser = '',
  adminIn = false,
  rid = null,
  adminMode = location.hash === '#admin',
  tab = 'an';

const af = { s: '', l: '', q: '' };

$('#adm-btn').onclick = () => {
  adminMode = true;
  mode();
};

function mode() {
  const a = adminMode;
  $('#admin').classList.toggle('hidden', !a);
  if (a) {
    $('#auth').classList.add('hidden');
    $('#app').classList.add('hidden');
    admRender();
  } else {
    $('#auth').classList.toggle('hidden', !!state.user);
    $('#app').classList.toggle('hidden', !state.user);
  }
}

function admRender() {
  const r = $('#admin');
  if (!adminIn) {
    r.innerHTML = `<div class="authbox bgpic" style="min-height:100vh">
      <img class="seal seal-corner" src="${SEAL_SRC}" alt="SLSU Lucena seal" />
      <form class="card" id="af" style="width:100%;max-width:400px" novalidate>
        <h2>Admin log in</h2>
        <p class="meta">For school administration only.</p>
        <label for="a-u">Username</label>
        <input type="text" id="a-u" autocomplete="username" />
        <label for="a-p">Password</label>
        <input type="password" id="a-p" autocomplete="current-password" />
        <p class="err" id="a-err" role="alert"></p>
        <button class="btn" style="width:100%" type="submit">Log in</button>
        <p style="text-align:center">
          <button type="button" class="link" id="a-back">Back to student log in</button>
        </p>
      </form>
    </div>`;
    $('#af').onsubmit = async (e) => {
      e.preventDefault();
      $('#a-err').textContent = 'Checking...';

      try {
        const res = await fetch('login_process.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: $('#a-u').value.trim(),
            password: $('#a-p').value,
          }),
        });
        const result = await res.json();

        if (result.status === 'success' && result.user.role === 'admin') {
          adminUser = result.user.student_id;
          adminIn = true;
          admRender();
        } else if (result.status === 'success') {
          $('#a-err').textContent = 'This account is not an administrator.';
        } else {
          $('#a-err').textContent = result.message || 'Invalid credentials.';
        }
      } catch (err) {
        console.error(err);
        $('#a-err').textContent = 'Connection error. Check XAMPP.';
      }
    };
    $('#a-back').onclick = () => {
      adminMode = false;
      mode();
    };
    return;
  }
  r.innerHTML = `<header class="top ctr">
      <span class="logo">
        <img class="seal" src="${SEAL_SRC}" alt="SLSU Lucena seal" width="44" height="44" />
        <span class="wordmark-block">
          <span class="wordmark">VoiceOut</span>
          <span class="tagline">Students speak, SLSU listens</span>
        </span>
        <span class="tag">Admin</span>
      </span>
      <nav aria-label="Admin">
        <button data-t="an">Analytics</button>
        <button data-t="con">Concerns</button>
      </nav>
      <div class="top-actions">
        <button class="btn ghost corner-settings" id="admin-open-settings" aria-label="Settings">
          <span aria-hidden="true"><i class="ic ic-gear"></i></span> <span class="corner-label">Settings</span>
        </button>
      </div>
    </header>
    <main style="max-width:100%">
      <section id="t-an"></section>
      <section id="t-con">
        <div class="stats" id="astats"></div>
        <div class="row" style="margin:1.4rem 0">
          <input type="text" id="f-q" placeholder="Search concerns" aria-label="Search concerns" />
          <select id="f-s" aria-label="Status">
            <option value="">All statuses</option>
            <option>Pending</option>
            <option>In-review</option>
            <option>Resolved</option>
          </select>
          <select id="f-l" aria-label="Urgency">
            <option value="">All urgency levels</option>
            <option>Low</option>
            <option>Moderate</option>
            <option>Critical priority</option>
          </select>
        </div>
        <div id="alist"></div>
      </section>
    </main>`;
  $('#f-q').value = af.q;
  $('#f-s').value = af.s;
  $('#f-l').value = af.l;
  $('#f-q').oninput = (e) => {
    af.q = e.target.value;
    admList();
  };
  $('#f-s').onchange = (e) => {
    af.s = e.target.value;
    admList();
  };
  $('#f-l').onchange = (e) => {
    af.l = e.target.value;
    admList();
  };
  $('#admin-open-settings').onclick = () => openSettingsDrawer();
  $('#alist').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) {
      const a = e.target.closest('[data-open]');
      if (a) openC(a.dataset.open);
      return;
    }
    if (b.dataset.r) setStatus(b.dataset.r, 'In-review', '');
    if (b.dataset.s) {
      rid = b.dataset.s;
      $('#r-t').value = '';
      $('#r-err').textContent = '';
      $('#rdlg').showModal();
    }
  };
  r.querySelectorAll('[data-t]').forEach(
    (b) =>
      (b.onclick = () => {
        tab = b.dataset.t;
        admTab();
      })
  );
  $('#t-an').onclick = async (e) => {
    if (e.target.closest('[data-calopen]')) {
      // Re-fetch concerns so the calendar reflects any new status changes
      try {
        const res = await fetch('admin_get_concerns.php');
        const rows = await res.json();
        if (Array.isArray(rows)) state.concerns = rows;
      } catch (err) {
        console.error('Calendar refresh failed:', err);
      }

      const t0 = new Date();
      calM = new Date(t0.getFullYear(), t0.getMonth(), 1);
      calSel = dk(t0);
      calRender();
      $('#caldlg').showModal();
      return;
    }
    if (e.target.closest('[data-calclose]')) {
      $('#caldlg').close();
      return;
    }
    const o = e.target.closest('[data-open]');
    if (o) {
      openC(o.dataset.open);
      return;
    }
    const n = e.target.closest('[data-cal]');
    if (n) {
      const v = +n.dataset.cal,
        t = new Date();
      calM = v
        ? new Date(calM.getFullYear(), calM.getMonth() + v, 1)
        : new Date(t.getFullYear(), t.getMonth(), 1);
      if (!v) calSel = dk(t);
      calRender();
      return;
    }
    const d = e.target.closest('[data-day]');
    if (d) {
      calSel = d.dataset.day;
      calRender();
    }
  };
  $('#caldlg').onclick = $('#t-an').onclick;
  $('#caldlg').onkeydown = (e) => {
    if (e.key === 'Enter' && e.target.dataset.open) openC(e.target.dataset.open);
  };
  $('#t-an').onkeydown = (e) => {
    if (e.key === 'Enter' && e.target.dataset.open) openC(e.target.dataset.open);
  };
  $('#alist').onkeydown = (e) => {
    if (e.key === 'Enter' && e.target.dataset.open) openC(e.target.dataset.open);
  };
  admList();
  admTab();
}

function admTab() {
  $('#t-an').classList.toggle('hidden', tab !== 'an');
  $('#t-con').classList.toggle('hidden', tab !== 'con');
  document.querySelectorAll('[data-t]').forEach((b) =>
    b.dataset.t === tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')
  );
  admAnalytics();
}

function admList() {
  fetch('admin_get_concerns.php')
    .then((r) => r.json())
    .then((rows) => {
      if (rows.status === 'error') {
        $('#alist').innerHTML = `<div class="card empty">${esc(rows.message)}</div>`;
        return;
      }
      state.concerns = rows;

      const C = rows,
        cnt = (s) => C.filter((c) => c.status === s).length,
        rank = { 'Critical priority': 0, Moderate: 1, Low: 2 };

      $('#astats').innerHTML = [
        ['Pending', cnt('Pending')],
        ['In review', cnt('In-review')],
        ['Resolved', cnt('Resolved')],
        [
          'Critical, still open',
          C.filter((c) => c.level === 'Critical priority' && c.status !== 'Resolved').length,
        ],
      ]
        .map(([l, n]) => `<div class="card"><b>${n}</b>${l}</div>`)
        .join('');

      const q = af.q.toLowerCase();
      const list = C.filter(
        (c) =>
          (!af.s || c.status === af.s) &&
          (!af.l || c.level === af.l) &&
          (!q || (c.title + ' ' + c.desc + ' ' + c.concern_type).toLowerCase().includes(q))
      ).sort(
        (a, b) =>
          (a.status === 'Resolved') - (b.status === 'Resolved') ||
          rank[a.level] - rank[b.level] ||
          b.id - a.id
      );

      $('#alist').innerHTML = list.length
        ? list
            .map(
              (c) => `<article class="card item click" data-open="${c.id}" tabindex="0">
                  <header>
                    <h3>${esc(c.title)}</h3>
                    <span class="pill ${c.status}">${c.status === 'In-review' ? 'In review' : c.status}</span>
                  </header>
                  <p class="meta">
                    ${esc(c.concern_type)} ·
                    <strong ${c.level === 'Critical priority' ? 'style="color:var(--bad)"' : ''}>${esc(c.level)}</strong>
                    · From ${esc(c.by)} · ${c.date}
                  </p>
                  <p style="margin:.4rem 0">${esc(c.desc)}</p>
                  ${c.remark ? `<div class="remark"><strong>Remarks sent to student</strong><br />${esc(c.remark)}</div>` : ''}
                  ${c.status !== 'Resolved' ? `<div class="actions" style="margin-top:.8rem">${c.status === 'Pending' ? `<button class="btn" data-r="${c.id}">Mark as in review</button>` : ''}<button class="btn ${c.status === 'Pending' ? 'ghost' : ''}" data-s="${c.id}">Resolve with remarks</button></div>` : ''}
                </article>`
            )
            .join('')
        : `<div class="card empty">${C.length ? 'No concerns match these filters.' : 'No concerns submitted yet.'}</div>`;

      admAnalytics();
    })
    .catch((err) => {
      console.error(err);
      $('#alist').innerHTML = '<div class="card empty">Could not load concerns.</div>';
    });
}

let calM = new Date(),
  calSel = null;
calM.setDate(1);
const dk = (d) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();

function calRender() {
  $('#caldlg').innerHTML = calHtml();
}

function calHtml() {
  const C = state.concerns,
    y = calM.getFullYear(),
    m = calM.getMonth(),
    first = new Date(y, m, 1).getDay(),
    dim = new Date(y, m + 1, 0).getDate(),
    now = dk(new Date());
  const by = {},
    rs = {};
  C.forEach((c) => {
    const k = dk(new Date(c.createdAt));
    (by[k] = by[k] || []).push(c);
    if (c.resolvedAt) {
      const r = dk(new Date(c.resolvedAt));
      (rs[r] = rs[r] || []).push(c);
    }
  });
  let cells =
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      .map((w) => `<span class="dow">${w}</span>`)
      .join('') + '<span></span>'.repeat(first);
  for (let d = 1; d <= dim; d++) {
    const k = y + '-' + (m + 1) + '-' + d,
      l = by[k] || [];
    cells += `<button class="day${k === calSel ? ' sel' : ''}${k === now ? ' today' : ''}" data-day="${k}" aria-label="${d} ${calM.toLocaleDateString('en-PH', { month: 'long' })}, ${l.length} concerns">
      ${d}${l.length ? `<b class="${l.some((c) => c.level === 'Critical priority') ? 'crit' : ''}">${l.length}</b>` : ''}
    </button>`;
  }
  const row = (c, t) => `<article class="card item click" data-open="${c.id}" tabindex="0" style="margin:.6rem 0 0">
      <header>
        <h3 style="font-size:1.05rem">${esc(c.title)}</h3>
        <span class="pill ${c.status}">${c.status === 'In-review' ? 'In review' : c.status}</span>
      </header>
      <p class="meta">
        ${new Date(t).toLocaleTimeString('en-PH', { timeStyle: 'short' })} · ${esc(c.concern_type)} ·
        ${esc(c.level)} · From ${esc(c.by)}
      </p>
    </article>`;
  let panel =
    '<p class="meta" style="margin-top:1rem">Select a date to see everything submitted or resolved that day.</p>';
    if (calSel) {
    const [yy, mm, dd] = calSel.split('-').map(Number),
      rawA = by[calSel] || [],
      b = rs[calSel] || [];

    // Remove concerns from the "Submitted" list if they were resolved on this same day
    const resolvedIds = new Set(b.map((c) => String(c.id)));
    const a = rawA.filter((c) => !(c.status === 'Resolved' && resolvedIds.has(String(c.id))));

    panel =
      `<h3 style="font-size:1.1rem;margin:1.2rem 0 .2rem">${new Date(yy, mm - 1, dd).toLocaleDateString('en-PH', { dateStyle: 'full' })}</h3><p class="meta">${a.length} submitted · ${b.length} resolved</p>` +
      (a.length ? `<p style="margin:.8rem 0 0"><strong>Submitted</strong></p>` + a.map((c) => row(c, c.createdAt)).join('') : '') +
      (b.length ? `<p style="margin:.8rem 0 0"><strong>Resolved</strong></p>` + b.map((c) => row(c, c.resolvedAt)).join('') : '') +
      (!a.length && !b.length ? '<div class="empty">No activity on this date.</div>' : '');
  }
  return `
    <div style="display:flex;flex-direction:column;max-height:90vh;">
      <div class="calh" style="flex:none;padding:1.25rem 1.5rem 0.9rem;border-bottom:1px solid var(--line);background:var(--surface);">
        <h3 style="font-size:1.2rem">${calM.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</h3>
        <div class="actions">
          <button class="btn ghost" data-cal="-1" aria-label="Previous month">‹</button>
          <button class="btn ghost" data-cal="0">Today</button>
          <button class="btn ghost" data-cal="1" aria-label="Next month">›</button>
        </div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:1.25rem 1.5rem 1rem;">
        <div class="cal">${cells}</div>
        ${panel}
      </div>
      <div style="flex:none;display:flex;justify-content:flex-end;gap:0.6rem;padding:1rem 1.5rem;border-top:1px solid var(--line);background:var(--surface);">
        <button class="btn ghost" data-calclose>Close</button>
      </div>
    </div>
  `;
}

let theme = 'system';

function pie(t, rows) {
  const tot = rows.reduce((a, r) => a + r[1], 0),
    live = rows.filter((r) => r[1]);
  let a0 = -Math.PI / 2;
  const sl = !tot
    ? ''
    : live.length === 1
      ? `<circle cx="50" cy="50" r="46" style="fill:${live[0][2]}" />`
      : live
          .map(([l, v, c]) => {
            const a1 = a0 + (v / tot) * 2 * Math.PI,
              P = (a, k) => (50 + 46 * Math[k](a)).toFixed(2),
              d = `<path d="M50 50L${P(a0, 'cos')} ${P(a0, 'sin')}A46 46 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${P(a1, 'cos')} ${P(a1, 'sin')}Z" style="fill:${c};stroke:var(--surface)" stroke-width="1" />`;
            a0 = a1;
            return d;
          })
          .join('');
  return (
    `<div class="card"><h3 style="font-size:1.1rem;margin-bottom:.8rem">${t}</h3>` +
    (tot
      ? `<div class="pie">
          <svg viewBox="0 0 100 100" role="img" aria-label="${t}: ${rows.map((r) => r[0] + ' ' + r[1]).join(', ')}">
            ${sl}
          </svg>
          <ul class="lg">
            ${rows.map(([l, v, c]) => `<li><i style="background:${c}"></i>${l}<b>${v} (${Math.round((v / tot) * 100)}%)</b></li>`).join('')}
          </ul>
        </div>`
      : '<p class="meta">No data yet.</p>') +
    `</div>`
  );
}

function lineChart() {
  const C = state.concerns,
    N = 14,
    days = [...Array(N)].map((_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (N - 1) + i);
      return d;
    });

  const cnt = (f) =>
    days.map(
      (d) =>
        C.filter((c) => {
          const t = f(c);
          if (!t) return false;
          const x = new Date(t);
          x.setHours(0, 0, 0, 0);
          return +x === +d;
        }).length
    );

  const submitted = cnt((c) => c.createdAt);
  const resolved  = cnt((c) => c.resolvedAt);

  const buildChart = (title, data, color) => {
    const mx = Math.max(1, ...data);
    const W = 320, H = 150, L = 26, B = 22, T = 10, R = 8;
    const X = (i) => L + (i * (W - L - R)) / (N - 1),
      Y = (v) => T + (H - T - B) * (1 - v / mx),
      pts = (a) => a.map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ');

    const grid = [0, 0.5, 1]
      .map((f) => {
        const v = Math.round(mx * f),
          y = Y(v);
        return `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" style="stroke:var(--line)" /><text x="${L - 4}" y="${y + 3}" text-anchor="end" style="fill:var(--muted)">${v}</text>`;
      })
      .join('');

    const xl = days
      .map((d, i) =>
        (N - 1 - i) % 2 === 0
          ? `<text x="${X(i)}" y="${H - 6}" text-anchor="middle" style="fill:var(--muted)">${d.getDate()}</text>`
          : ''
      )
      .join('');

    const line =
      `<polyline points="${pts(data)}" fill="none" stroke-width="2" stroke-linejoin="round" style="stroke:${color}"/>` +
      data
        .map(
          (v, i) =>
            `<circle cx="${X(i)}" cy="${Y(v)}" r="2.5" style="fill:${color}"><title>${days[i].toLocaleDateString('en-PH', { dateStyle: 'medium' })}: ${v}</title></circle>`
        )
        .join('');

    return `<div class="card">
      <h3 style="font-size:1.1rem;margin-bottom:.6rem">${title}</h3>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}" style="width:100%;height:auto;font-size:8px">
        ${grid}${xl}${line}
      </svg>
    </div>`;
  };

  return (
    buildChart('Submitted (last 14 days)', submitted, 'var(--brand)') +
    buildChart('Resolved (last 14 days)', resolved, 'var(--accent)')
  );
}

const SQ = [
  'What was the name of your first childhood pet?',
  'What was the name of your favorite childhood restaurant?',
  'What was your childhood nickname?',
  'What was the name of your elementary school?',
  'In what city or town were you born?',
  'What was the name of your favorite grade school teacher?',
  'What was the name of your childhood best friend?',
  'What was the name of the street you grew up on?',
  'What was your favorite food as a child?',
  'What was the make or model of your first mobile phone?',
  'What was the title of your favorite childhood cartoon or book?',
  'What was the first movie you watched in a cinema?',
];

const sqOpts = () => SQ.map((q) => `<option>${q}</option>`).join('');
$('#s-sq').innerHTML = sqOpts();

function openForgot() {
  const d = $('#fdlg');
  d.innerHTML = `<h3>Reset your password</h3>
    <p class="meta" style="margin:.5rem 0 0">Enter your Student ID. We'll ask the secret question you chose when you created your account.</p>
    <form id="ff" novalidate>
      <label for="f-id">Student ID</label><input type="text" id="f-id" />
      <p class="err" id="f-err" role="alert"></p>
      <div class="actions" style="justify-content:flex-end;margin-top:0">
        <button type="button" class="btn ghost" id="f-no">Cancel</button>
        <button class="btn" type="submit">Continue</button>
      </div>
    </form>`;
  $('#f-id').value = $('#l-id').value.trim();
  $('#f-no').onclick = () => d.close();
  $('#ff').onsubmit = async (e) => {
    e.preventDefault();
    const id = $('#f-id').value.trim();
    if (!id) {
      $('#f-err').textContent = 'Enter your Student ID.';
      return;
    }
    $('#f-err').textContent = 'Checking...';
    try {
      const res = await fetch('reset_password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lookup', student_id: id }),
      });
      const result = await res.json();
      if (result.status === 'success') {
        stepTwo(id, result.question);
      } else {
        $('#f-err').textContent = result.message;
      }
    } catch (err) {
      console.error(err);
      $('#f-err').textContent = 'Connection error. Is XAMPP running?';
    }
  };
  d.showModal();
}

function stepTwo(id, q) {
  const d = $('#fdlg');
  d.innerHTML = `<h3>Answer your secret question</h3>
    <p style="margin:.6rem 0 0"><strong>${esc(q)}</strong></p>
    <form id="fr" novalidate>
      <label for="f-a">Your answer</label>
      <input type="text" id="f-a" autocomplete="off" />
      <label for="f-p1">New password</label>
      <input type="password" id="f-p1" autocomplete="new-password" />
      <label for="f-p2">Confirm new password</label>
      <input type="password" id="f-p2" autocomplete="new-password" />
      <p class="err" id="f-err" role="alert"></p>
      <div class="actions" style="justify-content:flex-end;margin-top:0">
        <button type="button" class="btn ghost" id="f-no">Cancel</button>
        <button class="btn" type="submit">Reset password</button>
      </div>
    </form>`;
  $('#f-no').onclick = () => d.close();
  $('#fr').onsubmit = async (e) => {
    e.preventDefault();
    const a = $('#f-a').value;
    const p1 = $('#f-p1').value;
    const p2 = $('#f-p2').value;

    let m = '';
    if (norm(a).length < 2) m = 'Enter your answer.';
    else if (p1.length < 6) m = 'New password must be at least 6 characters.';
    else if (p1 !== p2) m = 'The passwords do not match.';
    $('#f-err').textContent = m;
    if (m) return;

    $('#f-err').textContent = 'Saving...';

    try {
      const res = await fetch('reset_password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', student_id: id, answer: a, new: p1 }),
      });
      const result = await res.json();
      if (result.status === 'success') {
        d.innerHTML = `<h3>Password changed</h3>
          <p class="meta">You can now log in with your new password.</p>
          <div class="actions" style="justify-content:flex-end">
            <button class="btn" id="f-x">Back to log in</button>
          </div>`;
        $('#l-id').value = id;
        $('#l-pw').value = '';
        $('#f-x').onclick = () => d.close();
      } else {
        $('#f-err').textContent = result.message;
      }
    } catch (err) {
      console.error(err);
      $('#f-err').textContent = 'Connection error.';
    }
  };
}

function admAnalytics() {
  const el = $('#t-an');
  if (!el) return;
  const C = state.concerns,
    n = C.length,
    res = C.filter((c) => c.status === 'Resolved'),
    H = 36e5;
  const rt = res.filter((c) => c.resolvedAt).map((c) => c.resolvedAt - c.createdAt),
    avg = rt.length ? rt.reduce((a, b) => a + b, 0) / rt.length : 0;
  const fmt = avg
    ? avg < H
      ? Math.max(1, Math.round(avg / 6e4)) + ' min'
      : avg < 48 * H
        ? Math.round(avg / H) + ' hr'
        : Math.round(avg / (24 * H)) + ' days'
    : '–';
  const pct = (x) => (n ? Math.round((x / n) * 100) + '%' : '–');
  const count = (f) => {
    const m = {};
    C.forEach((c) => {
      const k = f(c);
      m[k] = (m[k] || 0) + 1;
    });
    return m;
  };
  const tm = count((c) => (c.concern_type.startsWith('Others') ? 'Others' : c.concern_type));
  const lm = count((c) => c.level),
    sm = count((c) => c.status);
  const bars = (t, rows) => {
    const mx = Math.max(1, ...rows.map((r) => r[1]));
    return `<div class="card">
      <h3 style="font-size:1.1rem;margin-bottom:.6rem">${t}</h3>
      ${rows.length ? rows.map(([l, v, c]) => `<div class="bar"><span>${esc(l)}</span><div><i style="width:${(v / mx) * 100}%;background:${c || 'var(--brand)'}"></i></div><b>${v}</b></div>`).join('') : '<p class="meta">No data yet.</p>'}
    </div>`;
  };
  el.innerHTML = `<div class="calh">
      <h2>Analytics</h2>
      <button class="btn" data-calopen>Calendar</button>
    </div>
    <div class="stats">
      <div class="card"><b>${n}</b>Total concerns</div>
      <div class="card"><b>${pct(res.length)}</b>Resolution rate</div>
      <div class="card"><b>${fmt}</b>Avg. time to resolve</div>
      <div class="card"><b>${pct(C.filter((c) => c.by === 'Anonymous').length)}</b>Sent anonymously</div>
    </div>
    <div class="agrid">
      ${lineChart()}
      ${bars('Concerns by type', ['Academic concerns','Campus facilities','Fees','School organizations','Faculty/Staff conduct','Student conduct','Others'].map((t) => [t, tm[t] || 0]))}
      ${pie('Urgency level', [
        ['Low', lm.Low || 0, 'var(--ok)'],
        ['Moderate', lm.Moderate || 0, 'var(--accent)'],
        ['Critical priority', lm['Critical priority'] || 0, 'var(--bad)'],
      ])}
      ${pie('Status', [
        ['Pending', sm.Pending || 0, 'var(--muted)'],
        ['In review', sm['In-review'] || 0, 'var(--accent)'],
        ['Resolved', sm.Resolved || 0, 'var(--ok)'],
      ])}
    </div>`;
}

function dataBytes(u) {
  const bin = atob(u.split(',')[1]),
    a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}

function openC(id) {
  const c = state.concerns.find((x) => x.id == id);
  if (!c) return;
  const f = c.file && typeof c.file === 'object' ? c.file : null,
    d = $('#cdlg'),
    img = f && (f.type || '').startsWith('image/');
  d.innerHTML = `<header style="display:flex;justify-content:space-between;gap:1rem;align-items:start">
      <h3 style="min-width:0">${esc(c.title)}</h3>
      <span class="pill ${c.status}">${c.status === 'In-review' ? 'In review' : c.status}</span>
    </header>
    <p class="meta">${esc(c.concern_type)} · ${esc(c.level)} · From ${esc(c.by)} · ${c.date}</p>
    <p style="white-space:pre-wrap">${esc(c.desc)}</p>
    ${c.remark ? `<div class="remark"><strong>Admin remarks</strong><br />${esc(c.remark)}</div>` : ''}
    <div class="actions" style="justify-content:flex-end">
      <button class="btn" id="c-x">Close</button>
    </div>`;
  $('#c-x').onclick = () => d.close();
  d.showModal();
}

async function setStatus(id, st, remark) {
  const body = {
    id: id,
    status: st === 'In-review' ? 'In-review' : st,
    remark: remark || '',
  };

  try {
    const res = await fetch('admin_update_status.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await res.json();

    if (result.status === 'success') {
      toast(st === 'Resolved' ? 'Marked as resolved.' : 'Marked as in review.');
      admList();
    } else {
      toast('Error: ' + result.message);
    }
  } catch (err) {
    console.error(err);
    toast('Connection error.');
  }
}

$('#r-no').onclick = () => $('#rdlg').close();
$('#r-yes').onclick = () => {
  const t = $('#r-t').value.trim();
  if (!t) {
    $('#r-err').textContent = 'Write remarks for the student before resolving.';
    return;
  }
  $('#rdlg').close();
  setStatus(rid, 'Resolved', t);
};

addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  const d = load();
  if (!d) return;
  Object.assign(state, {
    users: d.users || state.users,
    concerns: fixC(d.concerns),
    notifs: d.notifs || [],
  });
  if (adminMode) {
    if (adminIn) {
      admList();
      admAnalytics();
    }
  } else if (state.user) {
    if (state.view === 'status') views.status($('#view'));
    else if (state.view === 'notifs') views.notifs($('#view'));
    badge();
  }
});

(async function autoLogin() {
  try {
    const res = await fetch('check_session.php');
    const data = await res.json();
    if (data.logged_in) {
      state.user = data.user;
      if (data.user.role === 'admin') {
        adminUser = data.user.id;
        adminIn = true;
        adminMode = true;
        mode();
        return;
      }
      enter();
    }
  } catch (err) {
    console.error('Session check failed:', err);
  }
})();

mode();