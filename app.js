const configured =
  SUPABASE_URL &&
  !SUPABASE_URL.includes('PASTE_YOUR') &&
  SUPABASE_PUBLISHABLE_KEY &&
  !SUPABASE_PUBLISHABLE_KEY.includes('PASTE_YOUR');

const db = configured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;

let listings = [];
let activeCat = 'All';
let editingId = null;

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

function status(message, type = 'info') {
  $('status').textContent = message;
  $('status').className = 'status ' + type;
}

function hideStatus() {
  $('status').className = 'status hidden';
}

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

        const image = item.image_url
          ? `<img class="listing-img"
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

  document.querySelectorAll('[data-edit]').forEach((button) => {
    button.onclick = () => {
      openEdit(Number(button.dataset.edit));
    };
  });

  document.querySelectorAll('[data-delete]').forEach((button) => {
    button.onclick = () => {
      deleteListing(Number(button.dataset.delete));
    };
  });
}

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

function openModal() {
  editingId = null;

  $('listingForm').reset();

  const title = document.querySelector('.modal-box h2');
  const subtitle = document.querySelector('.modal-sub');

  if (title) title.textContent = 'List an item';

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

  if (title) title.textContent = 'List an item';

  if (subtitle) {
    subtitle.textContent =
      'Add your item to MarketHub.';
  }

  $('publishBtn').textContent = 'Publish listing';

  $('itemImage').required = true;
}

function openEdit(id) {
  const item = listings.find(
    (listing) => Number(listing.id) === Number(id)
  );

  if (!item) {
    status('Listing could not be found.', 'error');
    return;
  }

  editingId = Number(id);

  $('itemName').value = item.name || '';
  $('itemPrice').value = item.price || '';
  $('itemCategory').value = item.category || 'Other';
  $('itemLocation').value = item.location || '';
  $('itemPhone').value = item.phone || '';
  $('itemDescription').value = item.description || '';

  $('itemImage').required = false;

  const title = document.querySelector('.modal-box h2');
  const subtitle = document.querySelector('.modal-sub');

  if (title) title.textContent = 'Edit listing';

  if (subtitle) {
    subtitle.textContent =
      'Change your listing details and save your changes.';
  }

  $('publishBtn').textContent = 'Save changes';

  $('modal').classList.remove('hidden');
}

async function deleteListing(id) {
  const item = listings.find(
    (listing) => Number(listing.id) === Number(id)
  );

  if (!item) {
    status('Listing could not be found.', 'error');
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
      .eq('id', id);

    if (error) {
      throw error;
    }

    listings = listings.filter(
      (listing) => Number(listing.id) !== Number(id)
    );

    favorites = favorites.filter(
      (favoriteId) => Number(favoriteId) !== Number(id)
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

$('sellTopBtn').onclick = openModal;

$('floatingSell').onclick = openModal;

$('closeModal').onclick = closeModal;

$('modal').onclick = (event) => {
  if (event.target.id === 'modal') {
    closeModal();
  }
};

$('searchInput').oninput = render;

document.querySelectorAll('.cat').forEach((button) => {
  button.onclick = () => {
    document
      .querySelectorAll('.cat')
      .forEach((item) => item.classList.remove('active'));

    button.classList.add('active');

    activeCat = button.dataset.cat;

    render();
  };
});

$('listingForm').onsubmit = async (event) => {
  event.preventDefault();

  if (!configured) {
    status('Connect Supabase first.', 'warning');
    return;
  }

  const button = $('publishBtn');
  const file = $('itemImage').files[0];

  button.disabled = true;

  try {
    const category = $('itemCategory').value;

    let imageUrl = null;

    if (editingId) {
      const existing = listings.find(
        (item) => Number(item.id) === Number(editingId)
      );

      imageUrl = existing?.image_url || null;
    }

    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        status(
          'Photo is too large. Maximum size is 5 MB.',
          'warning'
        );

        button.disabled = false;
        return;
      }

      button.textContent = 'Uploading photo...';

      const extension =
        (file.name.split('.').pop() || 'jpg').toLowerCase();

      const safeExtension =
        ['jpg', 'jpeg', 'png', 'webp'].includes(extension)
          ? extension
          : 'jpg';

      const path =
        `${crypto.randomUUID()}.${safeExtension}`;

      const { error: uploadError } =
        await db.storage
          .from('listing-images')
          .upload(path, file, {
            contentType: file.type,
            upsert: false
          });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } =
        db.storage
          .from('listing-images')
          .getPublicUrl(path);

      imageUrl = publicData.publicUrl;
    }

    const listing = {
      name: $('itemName').value.trim(),
      price: Number($('itemPrice').value),
      category: category,
      location: $('itemLocation').value.trim(),
      phone: $('itemPhone').value.trim(),
      description: $('itemDescription').value.trim(),
      icon: icon(category),
      image_url: imageUrl
    };

    if (editingId) {
      button.textContent = 'Saving changes...';

      const { data, error } = await db
        .from('listings')
        .update(listing)
        .eq('id', editingId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      listings = listings.map((item) =>
        Number(item.id) === Number(editingId)
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

      if (!file) {
        status(
          'Please choose a photo.',
          'warning'
        );

        button.disabled = false;
        return;
      }

      button.textContent = 'Publishing listing...';

      const { data, error } = await db
        .from('listings')
        .insert(listing)
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
      'Operation failed: ' + error.message,
      'error'
    );

  } finally {
    button.disabled = false;

    if (editingId) {
      button.textContent = 'Save changes';
    } else {
      button.textContent = 'Publish listing';
    }
  }
};

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('sw.js')
    .catch(console.warn);
}

load();
