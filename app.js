tconst configured =
  SUPABASE_URL &&
  !SUPABASE_URL.includes('PASTE_YOUR') &&
  SUPABASE_PUBLISHABLE_KEY &&
  !SUPABASE_PUBLISHABLE_KEY.includes('PASTE_YOUR');

const db = configured
  ? window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    )
  : null;

let listings = [];
let activeCat = 'All';
let editingId = null;
let currentUser = null;

let favorites = JSON.parse(
  localStorage.getItem('markethubFavorites') || '[]'
);

const $ = (id) => document.getElementById(id);

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));

const icon = (category) => ({
  Phones: '📱',
  Electronics: '💻',
  Fashion: '👕',
  Home: '🏠',
  Vehicles: '🚗',
  Other: '🛍️'
}[category] || '🛍️');


/* =========================
   STATUS
========================= */

function status(message, type = 'info') {
  $('status').textContent = message;
  $('status').className = 'status ' + type;
}

function hideStatus() {
  $('status').className = 'status hidden';
}


/* =========================
   AUTH UI
========================= */

function updateAccountUI() {
const loginBtn = $('loginBtn');
const logoutBtn = $('logoutBtn');
const profileBtn = $('profileBtn');
const accountEmail = $('accountEmail');

  if (currentUser) {
    email.textContent = currentUser.email || '';
    loginBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    profileBtn.classList.remove('hidden');
  } else {
    email.textContent = '';
    loginBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    profileBtn.classList.add('hidden');
  }
}

function openAuthModal() {
  $('authModal').classList.remove('hidden');
  $('authEmail').focus();
}

function closeAuthModal() {
  $('authModal').classList.add('hidden');
  $('authMessage').textContent = '';
  $('authMessage').className = 'status hidden';
  $('authForm').reset();
}

function authMessage(message, type = 'info') {
  $('authMessage').textContent = message;
  $('authMessage').className = 'status ' + type;
}


/* =========================
   LOAD CURRENT USER
========================= */

async function loadCurrentUser() {
  if (!db) return;

  const {
    data: { user }
  } = await db.auth.getUser();

  currentUser = user || null;

  updateAccountUI();
  render();
}


/* =========================
   RENDER LISTINGS
========================= */

function render() {
  const query = $('searchInput').value.toLowerCase().trim();

  const results = listings.filter((item) => {
    const matchesCategory =
      activeCat === 'All' || item.category === activeCat;

    const text = `
      ${item.name}
      ${item.category}
      ${item.location}
      ${item.description}
    `.toLowerCase();

    return matchesCategory && text.includes(query);
  });

  $('count').textContent =
    `${results.length} item${results.length === 1 ? '' : 's'}`;

  $('listings').innerHTML = results.length
    ? results.map((item) => {
        const fav = favorites.includes(Number(item.id));

        const isOwner =
          currentUser &&
          item.user_id &&
          String(item.user_id) === String(currentUser.id);

        const image = item.image_url
          ? `<img
               class="listing-img"
               src="${esc(item.image_url)}"
               alt="${esc(item.name)}">`
          : `<div class="photo-placeholder">
               ${esc(item.icon || icon(item.category))}
             </div>`;

        const whatsappNumber = String(item.phone || '')
          .replace(/[^0-9]/g, '');

        return `
          <article class="card">

            <div class="photo">
              ${image}
            </div>

            <button
              class="favorite ${fav ? 'selected' : ''}"
              data-fav="${item.id}">
              ${fav ? '♥' : '♡'}
            </button>

            <div class="card-body">

              <h3>${esc(item.name)}</h3>

              <div class="price">
                K ${Number(item.price).toLocaleString()}
              </div>

              <div class="meta">
                ${esc(item.category)} · ${esc(item.location)}
              </div>

              <div class="meta">
                ${esc(item.description || '')}
              </div>

              <div class="actions">

                <a
                  class="contact"
                  href="tel:${esc(item.phone)}">
                  📞 Call
                </a>

                ${
                  whatsappNumber
                    ? `
                      <a
                        class="whatsapp"
                        target="_blank"
                        rel="noopener"
                        href="https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                          'Hi, I saw your ' +
                          item.name +
                          ' listing on MarketHub.'
                        )}">
                        💬 WhatsApp
                      </a>
                    `
                    : ''
                }

                ${
                  isOwner
                    ? `
                      <button
                        class="contact edit-btn"
                        data-edit="${item.id}"
                        type="button">
                        ✏️ Edit
                      </button>

                      <button
                        class="contact delete-btn"
                        data-delete="${item.id}"
                        type="button">
                        🗑️ Delete
                      </button>
                    `
                    : ''
                }

              </div>

            </div>

          </article>
        `;
      }).join('')
    : `
      <div class="empty">
        <h3>No listings found</h3>
        <p>Try another search or category.</p>
      </div>
    `;


  /* FAVORITES */

  document.querySelectorAll('[data-fav]').forEach((button) => {
    button.onclick = () => {
      const id = Number(button.dataset.fav);

      favorites = favorites.includes(id)
        ? favorites.filter((x) => x !== id)
        : [...favorites, id];

      localStorage.setItem(
        'markethubFavorites',
        JSON.stringify(favorites)
      );

      render();
    };
  });


  /* EDIT */

  document.querySelectorAll('[data-edit]').forEach((button) => {
    button.onclick = () => {
      openEdit(Number(button.dataset.edit));
    };
  });


  /* DELETE */

  document.querySelectorAll('[data-delete]').forEach((button) => {
    button.onclick = () => {
      deleteListing(Number(button.dataset.delete));
    };
  });
}


/* =========================
   LOAD LISTINGS
========================= */

async function load() {
  if (!configured) {
    status(
      'Database is not connected. Check config.js.',
      'warning'
    );
    return;
  }

  status('Loading listings...');

  const { data, error } = await db
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);

    status(
      'Could not load listings. Check your Supabase setup.',
      'error'
    );

    return;
  }

  listings = data || [];

  hideStatus();
  render();
}


/* =========================
   LISTING MODAL
========================= */

function openModal() {
  if (!currentUser) {
    openAuthModal();
    authMessage(
      'Please log in or create an account before selling.',
      'warning'
    );
    return;
  }

  editingId = null;

  $('listingForm').reset();

  const title = document.querySelector('.modal-box h2');
  const subtitle = document.querySelector('.modal-sub');

  if (title) {
    title.textContent = 'List an item';
  }

  if (subtitle) {
    subtitle.textContent =
      'Add your item to MarketHub.';
  }

  $('publishBtn').textContent = 'Publish listing';

  $('itemImage').required = true;

  $('modal').classList.remove('hidden');
}

function closeModal() {
  $('modal').classList.add('hidden');

  editingId = null;

  $('listingForm').reset();

  const title = document.querySelector('.modal-box h2');
  const subtitle = document.querySelector('.modal-sub');

  if (title) {
    title.textContent = 'List an item';
  }

  if (subtitle) {
    subtitle.textContent =
      'Add your item to MarketHub.';
  }

  $('publishBtn').textContent = 'Publish listing';

  $('itemImage').required = true;
}


/* =========================
   EDIT LISTING
========================= */
function renderProfile() {
  if (!currentUser) return;

  const profileEmail = $('profileEmail');
  const profileListingCount = $('profileListingCount');
  const myListings = $('myListings');

  profileEmail.textContent = currentUser.email || '';

  const mine = listings.filter(item =>
    item.user_id &&
    String(item.user_id) === String(currentUser.id)
  );

  profileListingCount.textContent =
    `${mine.length} item${mine.length === 1 ? '' : 's'}`;

  if (!mine.length) {
    myListings.innerHTML = `
      <p class="profile-empty">
        You have not posted any listings yet.
      </p>
    `;
    return;
  }

  myListings.innerHTML = mine.map(item => {
    const image = item.image_url
      ? `<img src="${item.image_url}" alt="${item.name}">`
      : `<div class="profile-no-image">📦</div>`;

    return `
      <div class="profile-listing">
        ${image}

        <div class="profile-listing-info">
          <strong>${item.name || 'Unnamed item'}</strong>

          <span>
            ${item.price ? `K${item.price}` : 'Price not set'}
          </span>

          <small>
            ${item.category || 'Other'} • ${item.location || 'No location'}
          </small>

          <div class="profile-listing-actions">
            <button
              class="account-btn"
              type="button"
              data-profile-edit="${item.id}">
              Edit
            </button>

            <button
              class="account-btn"
              type="button"
              data-profile-delete="${item.id}">
              Delete
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  myListings.querySelectorAll('[data-profile-edit]').forEach(button => {
    button.addEventListener('click', () => {
      closeProfileModal();
      openEdit(button.dataset.profileEdit);
    });
  });

  myListings.querySelectorAll('[data-profile-delete]').forEach(button => {
    button.addEventListener('click', () => {
      deleteListing(button.dataset.profileDelete);
    });
  });
}


function openProfileModal() {
  if (!currentUser) {
    openAuthModal();
    return;
  }

  renderProfile();

  $('profileModal').classList.remove('hidden');
}


function closeProfileModal() {
  $('profileModal').classList.add('hidden');
}
function openEdit(id) {
  if (!currentUser) {
    openAuthModal();
    return;
  }

  const item = listings.find(
    (listing) => Number(listing.id) === Number(id)
  );

  if (!item) {
    status(
      'Listing could not be found.',
      'error'
    );
    return;
  }

  if (
    !item.user_id ||
    String(item.user_id) !== String(currentUser.id)
  ) {
    status(
      'You can only edit your own listings.',
      'warning'
    );
    return;
  }

  editingId = Number(id);

  $('itemName').value = item.name || '';
  $('itemPrice').value = item.price || '';
  $('itemCategory').value =
    item.category || 'Other';
  $('itemLocation').value =
    item.location || '';
  $('itemPhone').value =
    item.phone || '';
  $('itemDescription').value =
    item.description || '';

  $('itemImage').required = false;

  const title = document.querySelector('.modal-box h2');
  const subtitle = document.querySelector('.modal-sub');

  if (title) {
    title.textContent = 'Edit listing';
  }

  if (subtitle) {
    subtitle.textContent =
      'Change your listing details and save your changes.';
  }

  $('publishBtn').textContent = 'Save changes';

  $('modal').classList.remove('hidden');
}


/* =========================
   DELETE LISTING
========================= */

async function deleteListing(id) {
  if (!currentUser) {
    openAuthModal();
    return;
  }

  const item = listings.find(
    (listing) => Number(listing.id) === Number(id)
  );

  if (!item) {
    status(
      'Listing could not be found.',
      'error'
    );
    return;
  }

  if (
    !item.user_id ||
    String(item.user_id) !== String(currentUser.id)
  ) {
    status(
      'You can only delete your own listings.',
      'warning'
    );
    return;
  }

  const confirmed = confirm(
    `Delete "${item.name}"?\n\nThis action cannot be undone.`
  );

  if (!confirmed) {
    return;
  }

  status('Deleting listing...');

  try {
    const { error } = await db
      .from('listings')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUser.id);

    if (error) {
      throw error;
    }

    listings = listings.filter(
      (listing) =>
        Number(listing.id) !== Number(id)
    );

    favorites = favorites.filter(
      (favoriteId) =>
        Number(favoriteId) !== Number(id)
    );

    localStorage.setItem(
      'markethubFavorites',
      JSON.stringify(favorites)
    );

    render();

    status(
      'Listing deleted successfully.',
      'success'
    );

  } catch (error) {
    console.error(error);

    status(
      'Delete failed: ' + error.message,
      'error'
    );
  }
}


/* =========================
   CREATE ACCOUNT
========================= */

async function createAccount() {
  if (!db) {
    authMessage(
      'Supabase is not connected.',
      'error'
    );
    return;
  }

  const email = $('authEmail').value.trim();
  const password = $('authPassword').value;

  if (!email || !password) {
    authMessage(
      'Enter your email and password.',
      'warning'
    );
    return;
  }

  $('signupSubmit').disabled = true;

  authMessage(
    'Creating your account...'
  );

  try {
    const { data, error } =
      await db.auth.signUp({
        email,
        password
      });

    if (error) {
      throw error;
    }

    if (data.session) {
      currentUser = data.user;

      updateAccountUI();
      closeAuthModal();

      status(
        'Account created successfully!',
        'success'
      );

      render();

    } else {
      authMessage(
        'Account created. Check your email to confirm your account, then log in.',
        'success'
      );
    }

  } catch (error) {
    console.error(error);

    authMessage(
      'Sign up failed: ' + error.message,
      'error'
    );

  } finally {
    $('signupSubmit').disabled = false;
  }
}


/* =========================
   LOG IN
========================= */

async function login() {
  if (!db) {
    authMessage(
      'Supabase is not connected.',
      'error'
    );
    return;
  }

  const email = $('authEmail').value.trim();
  const password = $('authPassword').value;

  if (!email || !password) {
    authMessage(
      'Enter your email and password.',
      'warning'
    );
    return;
  }

  $('loginSubmit').disabled = true;

  authMessage(
    'Logging in...'
  );

  try {
    const { data, error } =
      await db.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      throw error;
    }

    currentUser = data.user;

    updateAccountUI();

    closeAuthModal();

    status(
      'Logged in successfully!',
      'success'
    );

    render();

  } catch (error) {
    console.error(error);

    authMessage(
      'Login failed: ' + error.message,
      'error'
    );

  } finally {
    $('loginSubmit').disabled = false;
  }
}


/* =========================
   LOG OUT
========================= */

async function logout() {
  if (!db) return;

  const { error } =
    await db.auth.signOut();

  if (error) {
    console.error(error);

    status(
      'Logout failed: ' + error.message,
      'error'
    );

    return;
  }

  currentUser = null;

  updateAccountUI();

  render();

  status(
    'You have been logged out.',
    'success'
  );
}


/* =========================
   BUTTON EVENTS
========================= */
$('profileBtn').onclick = openProfileModal;

$('closeProfileModal').onclick = closeProfileModal;

$('profileModal').onclick = (event) => {
  if (event.target.id === 'profileModal') {
    closeProfileModal();
  }
};

$('profileSellBtn').onclick = () => {
  closeProfileModal();
  openModal();
};
$('loginBtn').onclick = openAuthModal;

$('logoutBtn').onclick = logout;

$('closeAuthModal').onclick =
  closeAuthModal;

$('authModal').onclick = (event) => {
  if (event.target.id === 'authModal') {
    closeAuthModal();
  }
};

$('authForm').onsubmit = async (event) => {
  event.preventDefault();
  await login();
};

$('signupSubmit').onclick =
  createAccount;


$('sellTopBtn').onclick =
  openModal;

$('floatingSell').onclick =
  openModal;

$('closeModal').onclick =
  closeModal;

$('modal').onclick = (event) => {
  if (event.target.id === 'modal') {
    closeModal();
  }
};

$('searchInput').oninput =
  render;


/* =========================
   CATEGORIES
========================= */

document.querySelectorAll('.cat').forEach((button) => {
  button.onclick = () => {

    document
      .querySelectorAll('.cat')
      .forEach((item) =>
        item.classList.remove('active')
      );

    button.classList.add('active');

    activeCat =
      button.dataset.cat;

    render();
  };
});


/* =========================
   PUBLISH / UPDATE
========================= */

$('listingForm').onsubmit =
  async (event) => {

    event.preventDefault();

    if (!configured) {
      status(
        'Connect Supabase first.',
        'warning'
      );
      return;
    }

    if (!currentUser) {
      closeModal();
      openAuthModal();

      authMessage(
        'Please log in before publishing a listing.',
        'warning'
      );

      return;
    }

    const button =
      $('publishBtn');

    const file =
      $('itemImage').files[0];

    button.disabled = true;

    try {

      const category =
        $('itemCategory').value;

      let imageUrl = null;

      /*
        EDITING:
        Keep the old image unless
        a new photo is selected.
      */

      if (editingId) {

        const existing =
          listings.find(
            (item) =>
              Number(item.id) ===
              Number(editingId)
          );

        if (
          !existing ||
          String(existing.user_id) !==
          String(currentUser.id)
        ) {
          throw new Error(
            'You can only edit your own listing.'
          );
        }

        imageUrl =
          existing.image_url || null;
      }


      /*
        UPLOAD NEW PHOTO
      */

      if (file) {

        if (
          file.size >
          5 * 1024 * 1024
        ) {

          status(
            'Photo is too large. Maximum size is 5 MB.',
            'warning'
          );

          button.disabled = false;

          return;
        }

        button.textContent =
          'Uploading photo...';

        const extension =
          (
            file.name.split('.').pop() ||
            'jpg'
          ).toLowerCase();

        const safeExtension =
          [
            'jpg',
            'jpeg',
            'png',
            'webp'
          ].includes(extension)
            ? extension
            : 'jpg';

        const path =
          `${crypto.randomUUID()}.${safeExtension}`;

        const {
          error: uploadError
        } =
          await db.storage
            .from('listing-images')
            .upload(
              path,
              file,
              {
                contentType:
                  file.type,
                upsert: false
              }
            );

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: publicData
        } =
          db.storage
            .from('listing-images')
            .getPublicUrl(path);

        imageUrl =
          publicData.publicUrl;
      }


      const listing = {
        name:
          $('itemName')
            .value
            .trim(),

        price:
          Number(
            $('itemPrice').value
          ),

        category:

          category,

        location:
          $('itemLocation')
            .value
            .trim(),

        phone:
          $('itemPhone')
            .value
            .trim(),

        description:
          $('itemDescription')
            .value
            .trim(),

        icon:
          icon(category),

        image_url:
          imageUrl
      };


      /*
        UPDATE
      */

      if (editingId) {

        button.textContent =
          'Saving changes...';

        const {
          data,
          error
        } =
          await db
            .from('listings')
            .update(listing)
            .eq(
              'id',
              editingId
            )
            .eq(
              'user_id',
              currentUser.id
            )
            .select()
            .single();

        if (error) {
          throw error;
        }

        listings =
          listings.map(
            (item) =>
              Number(item.id) ===
              Number(editingId)
                ? data
                : item
          );

        render();

        closeModal();

        status(
          'Listing updated successfully!',
          'success'
        );

      } else {


        /*
          NEW LISTING
        */

        if (!file) {

          status(
            'Please choose a photo.',
            'warning'
          );

          button.disabled =
            false;

          return;
        }

        button.textContent =
          'Publishing listing...';


        const newListing = {
          ...listing,

          user_id:
            currentUser.id
        };


        const {
          data,
          error
        } =
          await db
            .from('listings')
            .insert(newListing)
            .select()
            .single();

        if (error) {
          throw error;
        }

        listings.unshift(data);

        render();

        closeModal();

        status(
          'Listing published successfully! Everyone can now see it.',
          'success'
        );
      }

    } catch (error) {

      console.error(error);

      status(
        'Operation failed: ' +
        error.message,
        'error'
      );

    } finally {

      button.disabled =
        false;

      button.textContent =
        editingId
          ? 'Save changes'
          : 'Publish listing';
    }
  };


/* =========================
   AUTH STATE CHANGES
========================= */

if (db) {

  db.auth.onAuthStateChange(
    (_event, session) => {

      currentUser =
        session?.user || null;

      updateAccountUI();

      render();
    }
  );
}


/* =========================
   SERVICE WORKER
========================= */

if ('serviceWorker' in navigator) {

  navigator.serviceWorker
    .register('sw.js')
    .catch(console.warn);
}


/* =========================
   START
========================= */

loadCurrentUser();
load();
