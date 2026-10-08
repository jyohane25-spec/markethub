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
  const el = $('status');
  if (!el) return;

  el.textContent = message;
  el.className = `status ${type}`;
}

function hideStatus() {
  const el = $('status');
  if (!el) return;

  el.className = 'status hidden';
}

function render() {
  const search = $('searchInput');

  const query = search
    ? search.value.toLowerCase().trim()
    : '';

  const filtered = listings.filter((item) => {
    const matchesCategory =
      activeCat === 'All' || item.category === activeCat;

    const searchableText = `
      ${item.name || ''}
      ${item.category || ''}
      ${item.location || ''}
      ${item.description || ''}
    `.toLowerCase();

    return matchesCategory && searchableText.includes(query);
  });

  $('count').textContent =
    `${filtered.length} item${filtered.length === 1 ? '' : 's'}`;

  if (!filtered.length) {
    $('listings').innerHTML = `
      <div class="empty">
        <h3>No listings found</h3>
        <p>Try another search or category.</p>
      </div>
    `;
    return;
  }

  $('listings').innerHTML = filtered.map((item) => {
    const favorite = favorites.includes(Number(item.id));

    const image = item.image_url
      ? `
        <img
          class="listing-img"
          src="${esc(item.image_url)}"
          alt="${esc(item.name)}"
          loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
        >
        <div
          class="photo-placeholder"
          style="display:none"
        >
          ${esc(item.icon || icon(item.category))}
        </div>
      `
      : `
        <div class="photo-placeholder">
          ${esc(item.icon || icon(item.category))}
        </div>
      `;

    const phone = String(item.phone || '');
    const whatsappNumber = phone.replace(/[^0-9]/g, '');

    const whatsappButton = whatsappNumber
      ? `
        <a
          class="whatsapp"
          target="_blank"
          rel="noopener noreferrer"
          href="https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
            `Hi, I saw your ${item.name} listing on MarketHub.`
          )}"
        >
          💬 WhatsApp
        </a>
      `
      : '';

    return `
      <article class="card">
        <div class="photo">
          ${image}
        </div>

        <button
          class="favorite ${favorite ? 'selected' : ''}"
          data-fav="${esc(item.id)}"
          aria-label="${favorite ? 'Remove from favorites' : 'Add to favorites'}"
          title="${favorite ? 'Remove from favorites' : 'Add to favorites'}"
        >
          ${favorite ? '♥' : '♡'}
        </button>

        <div class="card-body">
          <h3>${esc(item.name)}</h3>

          <div class="price">
            K ${Number(item.price || 0).toLocaleString()}
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
              href="tel:${esc(phone)}"
            >
              📞 Call
            </a>

            ${whatsappButton}
          </div>
        </div>
      </article>
    `;
  }).join('');

  document.querySelectorAll('[data-fav]').forEach((button) => {
    button.onclick = () => {
      const id = Number(button.dataset.fav);

      if (favorites.includes(id)) {
        favorites = favorites.filter((value) => value !== id);
      } else {
        favorites = [...favorites, id];
      }

      localStorage.setItem(
        'markethubFavorites',
        JSON.stringify(favorites)
      );

      render();
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

  const {
    data,
    error
  } = await db
    .from('listings')
    .select('*')
    .order('created_at', {
      ascending: false
    });

  if (error) {
    console.error('Load listings error:', error);

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
  $('modal').classList.remove('hidden');

  setTimeout(() => {
    $('itemImage')?.focus();
  }, 50);
}

function closeModal() {
  $('modal').classList.add('hidden');
}

function resetPublishButton() {
  const button = $('publishBtn');

  if (!button) return;

  button.disabled = false;
  button.textContent = 'Publish listing';
}

function addImagePreview() {
  const input = $('itemImage');

  if (!input || document.getElementById('imagePreview')) {
    return;
  }

  const preview = document.createElement('div');

  preview.id = 'imagePreview';

  preview.style.marginTop = '10px';
  preview.style.display = 'none';

  preview.innerHTML = `
    <img
      id="previewImage"
      alt="Selected photo preview"
      style="
        width:100%;
        max-height:220px;
        object-fit:cover;
        border-radius:12px;
        display:block;
      "
    >
    <small
      id="previewText"
      style="display:block;margin-top:6px;"
    ></small>
  `;

  input.parentElement.appendChild(preview);

  input.addEventListener('change', () => {
    const file = input.files?.[0];

    if (!file) {
      preview.style.display = 'none';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      preview.style.display = 'none';
      status('Photo is too large. Maximum size is 5 MB.', 'warning');
      input.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      $('previewImage').src = reader.result;
      $('previewText').textContent = `Selected: ${file.name}`;
      preview.style.display = 'block';
      hideStatus();
    };

    reader.readAsDataURL(file);
  });
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

  const file = $('itemImage').files?.[0];

  if (!file) {
    status('Please choose a photo.', 'warning');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    status(
      'Photo is too large. Maximum size is 5 MB.',
      'warning'
    );
    return;
  }

  const name = $('itemName').value.trim();
  const price = Number($('itemPrice').value);
  const category = $('itemCategory').value;
  const location = $('itemLocation').value.trim();
  const phone = $('itemPhone').value.trim();
  const description = $('itemDescription').value.trim();

  if (!name) {
    status('Please enter an item name.', 'warning');
    $('itemName').focus();
    return;
  }

  if (!Number.isFinite(price) || price < 0) {
    status('Please enter a valid price.', 'warning');
    $('itemPrice').focus();
    return;
  }

  if (!location) {
    status('Please enter the item location.', 'warning');
    $('itemLocation').focus();
    return;
  }

  if (!phone) {
    status('Please enter the seller phone number.', 'warning');
    $('itemPhone').focus();
    return;
  }

  const button = $('publishBtn');

  button.disabled = true;
  button.textContent = 'Uploading photo...';

  try {
    const originalExtension =
      (file.name.split('.').pop() || 'jpg').toLowerCase();

    const extension =
      ['jpg', 'jpeg', 'png', 'webp'].includes(originalExtension)
        ? originalExtension
        : 'jpg';

    const uniqueId =
      window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const filePath = `${uniqueId}.${extension}`;

    const {
      error: uploadError
    } = await db
      .storage
      .from('listing-images')
      .upload(
        filePath,
        file,
        {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false
        }
      );

    if (uploadError) {
      throw uploadError;
    }

    button.textContent = 'Publishing listing...';

    const {
      data: publicData
    } = db
      .storage
      .from('listing-images')
      .getPublicUrl(filePath);

    const listing = {
      name,
      price,
      category,
      location,
      phone,
      description,
      icon: icon(category),
      image_url: publicData.publicUrl
    };

    const {
      data,
      error: insertError
    } = await db
      .from('listings')
      .insert(listing)
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    /*
      IMPORTANT:
      Close and reset the form BEFORE rendering.
      This fixes the problem where the List an item
      window remained open after publishing.
    */
    event.target.reset();

    const preview = $('imagePreview');

    if (preview) {
      preview.style.display = 'none';
    }

    closeModal();

    /*
      Add the new listing immediately so the seller
      sees it without waiting for another database load.
    */
    listings = [
      data,
      ...listings.filter(
        (item) => Number(item.id) !== Number(data.id)
      )
    ];

    render();

    status(
      'Listing published successfully! Everyone can now see it.',
      'success'
    );

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

  } catch (error) {
    console.error('Publishing error:', error);

    status(
      `Publishing failed: ${error.message || 'Unknown error'}`,
      'error'
    );

  } finally {
    resetPublishButton();
  }
};

addImagePreview();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('sw.js')
    .catch((error) => console.warn('Service worker:', error));
}

load();
