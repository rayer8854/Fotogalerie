// API Base URL
const API_URL = 'http://localhost:5000/api';

// State
let currentUser = null;
let currentToken = null;
let allImages = [];

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkAutoVerify();
    checkResetPasswordFlow();
    loadUserFromStorage();
    loadGallery();
});

// Event Listeners
function setupEventListeners() {
    // Auth Forms
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('forgotPasswordForm').addEventListener('submit', handleForgotPassword);
    document.getElementById('resetPasswordForm').addEventListener('submit', handleResetPassword);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('uploadForm').addEventListener('submit', handleUpload);

    // Navigation
    document.getElementById('btnLoginNav').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('loginPage');
    });
    document.getElementById('btnRegisterNav').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('registerPage');
    });
    document.getElementById('btnUpload').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('uploadPage');
    });
    document.getElementById('btnMyImages').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('myImagesPage');
        loadMyImages();
    });
    document.getElementById('btnLogout').addEventListener('click', handleLogout);
    document.getElementById('navHome').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('galleryPage');
    });

    // File Preview
    document.getElementById('uploadFile').addEventListener('change', showImagePreview);

    // Gallery Filters
    document.getElementById('filterCategory').addEventListener('change', filterGallery);
    document.getElementById('filterYear').addEventListener('change', filterGallery);

    // Edit Form
    const editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.addEventListener('submit', saveImageChanges);
    }

    // Modal
    document.querySelector('.close').addEventListener('click', closeModal);
    const closeZoomBtn = document.getElementById('closeZoomBtn');
    if (closeZoomBtn) {
        closeZoomBtn.addEventListener('click', closeZoomModal);
    }
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('imageModal');
        const zoomModal = document.getElementById('zoomModal');
        if (e.target == modal) {
            closeModal();
        }
        if (e.target == zoomModal) {
            closeZoomModal();
        }
    });
}

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        const messageEl = document.getElementById('loginMessage');

        if (data.success) {
            currentUser = data.user;
            currentToken = data.token;
            localStorage.setItem('token', currentToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            showMessage(messageEl, 'Erfolgreich angemeldet!', 'success');
            updateUI();
            setTimeout(() => showPage('galleryPage'), 500);
        } else {
            showMessage(messageEl, data.message, 'error');
        }
    } catch (error) {
        console.error('Login Error:', error);
        showMessage(document.getElementById('loginMessage'), 'Fehler beim Anmelden', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, passwordConfirm })
        });

        const data = await response.json();
        const messageEl = document.getElementById('registerMessage');

        if (data.success) {
            showMessage(messageEl, 'Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail. Sie werden zum Login weitergeleitet.', 'success');
            document.getElementById('registerForm').reset();
            setTimeout(() => showPage('loginPage'), 1500);
        } else {
            showMessage(messageEl, data.message, 'error');
        }
    } catch (error) {
        console.error('Register Error:', error);
        showMessage(document.getElementById('registerMessage'), 'Fehler bei der Registrierung', 'error');
    }
}

function handleLogout() {
    if (confirm('Sind Sie sicher, dass Sie sich abmelden möchten?')) {
        currentUser = null;
        currentToken = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        updateUI();
        showPage('loginPage');
        showToast('Erfolgreich abgemeldet', 'success');
    }
}

// Check for auto-verification
function checkAutoVerify() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (window.location.pathname === '/verify' && token) {
        verifyEmail(token);
        window.history.replaceState({}, document.title, '/');
    }
}

async function verifyEmail(token) {
    try {
        const response = await fetch(`${API_URL}/auth/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });

        const data = await response.json();
        const messageEl = document.getElementById('verifyMessage');

        if (data.success) {
            showMessage(messageEl, 'E-Mail erfolgreich verifiziert! Sie können sich jetzt anmelden.', 'success');
            setTimeout(() => showPage('loginPage'), 2000);
        } else {
            showMessage(messageEl, data.message, 'error');
        }
    } catch (error) {
        console.error('Verify Error:', error);
        showMessage(document.getElementById('verifyMessage'), 'Fehler bei der Verifizierung', 'error');
    }
}

function checkResetPasswordFlow() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (window.location.pathname === '/reset-password') {
        if (token) {
            document.getElementById('resetToken').value = token;
            showPage('resetPasswordPage');
            // Token aus der URL entfernen, aber App wieder auf die normale Root-Route setzen
            window.history.replaceState({}, document.title, '/');
            return;
        }

        // Fallback: Route wurde ohne Token aufgerufen
        showPage('forgotPasswordPage');
        showMessage(
            document.getElementById('forgotMessage'),
            'Der Reset-Link ist unvollständig oder abgelaufen. Bitte fordern Sie einen neuen Link an.',
            'error'
        );
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value;

    try {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();
        const messageEl = document.getElementById('forgotMessage');

        if (data.success) {
            showMessage(messageEl, data.message, 'success');
            document.getElementById('forgotPasswordForm').reset();
        } else {
            showMessage(messageEl, data.message || 'Fehler beim Senden', 'error');
        }
    } catch (error) {
        console.error('Forgot Password Error:', error);
        showMessage(document.getElementById('forgotMessage'), 'Fehler beim Senden', 'error');
    }
}

async function handleResetPassword(e) {
    e.preventDefault();
    const token = document.getElementById('resetToken').value;
    const password = document.getElementById('resetPassword').value;
    const passwordConfirm = document.getElementById('resetPasswordConfirm').value;

    try {
        const response = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password, passwordConfirm })
        });

        const data = await response.json();
        const messageEl = document.getElementById('resetMessage');

        if (data.success) {
            showMessage(messageEl, data.message, 'success');
            document.getElementById('resetPasswordForm').reset();
            setTimeout(() => showPage('loginPage'), 1500);
        } else {
            showMessage(messageEl, data.message || 'Fehler beim Zurücksetzen', 'error');
        }
    } catch (error) {
        console.error('Reset Password Error:', error);
        showMessage(document.getElementById('resetMessage'), 'Fehler beim Zurücksetzen', 'error');
    }
}

// Upload Functions
async function handleUpload(e) {
    e.preventDefault();

    if (!currentToken) {
        showToast('Bitte melden Sie sich an', 'error');
        return;
    }

    const file = document.getElementById('uploadFile').files[0];
    const description = document.getElementById('uploadDescription').value;
    const category = document.getElementById('uploadCategory').value;
    const yearSelect = document.getElementById('uploadYear');
    const year = yearSelect.value;
    const yearLabel = yearSelect.options[yearSelect.selectedIndex].text;

    if (!file || !category) {
        showMessage(document.getElementById('uploadMessage'), 'Bitte wählen Sie eine Datei und eine Bildkategorie aus', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('image', file);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('year', year);
    formData.append('yearLabel', year ? yearLabel : '');

    try {
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });

        const data = await response.json();
        const messageEl = document.getElementById('uploadMessage');

        if (data.success) {
            showMessage(messageEl, 'Bild erfolgreich hochgeladen!', 'success');
            document.getElementById('uploadForm').reset();
            document.getElementById('imagePreview').style.display = 'none';
            setTimeout(() => {
                loadGallery();
                showPage('galleryPage');
            }, 1000);
        } else {
            showMessage(messageEl, data.message, 'error');
        }
    } catch (error) {
        console.error('Upload Error:', error);
        showMessage(document.getElementById('uploadMessage'), 'Fehler beim Hochladen', 'error');
    }
}

function showImagePreview(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const preview = document.getElementById('imagePreview');
            document.getElementById('previewImg').src = event.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// Gallery Functions
async function loadGallery() {
    try {
        const response = await fetch(`${API_URL}/images`);
        const data = await response.json();

        if (data.success) {
            allImages = data.images;
            displayGallery(allImages);
        }
    } catch (error) {
        console.error('Gallery Load Error:', error);
        showToast('Fehler beim Laden der Galerie', 'error');
    }
}

async function loadMyImages() {
    if (!currentToken) {
        showToast('Bitte melden Sie sich an', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/my-images`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        const data = await response.json();

        if (data.success) {
            displayMyImages(data.images);
        }
    } catch (error) {
        console.error('My Images Error:', error);
        showToast('Fehler beim Laden Ihrer Bilder', 'error');
    }
}

function displayGallery(images) {
    const container = document.getElementById('galleryContainer');
    container.innerHTML = '';

    if (images.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">Noch keine Bilder in der Galerie</p>';
        return;
    }

    images.forEach(image => {
        const item = createGalleryItem(image, false);
        container.appendChild(item);
    });
}

function displayMyImages(images) {
    const container = document.getElementById('myImagesContainer');
    container.innerHTML = '';

    if (images.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">Sie haben noch keine Bilder hochgeladen</p>';
        return;
    }

    images.forEach(image => {
        const item = createGalleryItem(image, true);
        container.appendChild(item);
    });
}

function createGalleryItem(image, isMyImage) {
    const item = document.createElement('div');
    item.className = 'gallery-item';

    const imageUrl = `http://localhost:5000/uploads/${image.filename}`;
    const categoryText = image.category || 'Nicht angegeben';
    const yearText = image.year_label || getYearLabelFromNumber(image.year) || image.year || 'Unbekannt';
    const descriptionText = image.description || 'Keine Beschreibung';

    item.innerHTML = `
        <img src="${imageUrl}" alt="${image.original_filename}" class="gallery-item-image" 
             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23eee%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 fill=%22%23999%22%3EBild nicht gefunden%3C/text%3E%3C/svg%3E'">
        <div class="gallery-item-info">
            <div class="gallery-item-title">${image.original_filename}</div>
            <div class="gallery-item-description">${descriptionText}</div>
            <div class="gallery-item-meta">
                <span>${categoryText}</span>
                <span>${yearText}</span>
            </div>
            <div class="gallery-item-uploader">Von: ${image.uploader_name}</div>
        </div>
    `;

    item.addEventListener('click', () => {
        openModal(image, isMyImage);
    });

    return item;
}

function openModal(image, isMyImage) {
    const modal = document.getElementById('imageModal');
    const imageUrl = `http://localhost:5000/uploads/${image.filename}`;

    document.getElementById('modalImage').src = imageUrl;
    document.getElementById('modalTitle').textContent = image.original_filename;
    document.getElementById('modalDescription').textContent = image.description || 'Keine Beschreibung';
    document.getElementById('modalLocation').textContent = image.category || 'Nicht angegeben';
    document.getElementById('modalYear').textContent = image.year_label || getYearLabelFromNumber(image.year) || image.year || 'Unbekannt';
    document.getElementById('modalUploader').textContent = image.uploader_name;

    const uploadedDate = new Date(image.uploaded_at).toLocaleDateString('de-DE');
    document.getElementById('modalDate').textContent = uploadedDate;

    const zoomBtn = document.getElementById('zoomImageBtn');
    if (zoomBtn) {
        zoomBtn.onclick = () => openZoomModal(imageUrl);
    }

    const deleteBtn = document.getElementById('deleteImageBtn');
    const editBtn = document.getElementById('editImageBtn');
    if (isMyImage) {
        deleteBtn.style.display = 'block';
        editBtn.style.display = 'block';
        deleteBtn.onclick = () => deleteImage(image.id);
        editBtn.onclick = () => openEditModal(image);
    } else {
        deleteBtn.style.display = 'none';
        editBtn.style.display = 'none';
    }

    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('imageModal').classList.remove('active');
}

function openZoomModal(imageUrl) {
    document.getElementById('zoomImage').src = imageUrl;
    document.getElementById('zoomModal').classList.add('active');
}

function closeZoomModal() {
    document.getElementById('zoomModal').classList.remove('active');
}

function openEditModal(image) {
    document.getElementById('editDescription').value = image.description || '';
    document.getElementById('editCategory').value = image.category || '';
    const editYear = document.getElementById('editYear');
    if (image.year) {
        editYear.value = String(image.year);
    } else {
        const labelToValueMap = {
            'vor 1940': '1939',
            '1940 - 1960': '1950',
            '1960 - 1980': '1970',
            '1980 - 2000': '1990',
            '2000 - 2020': '2010',
            'ab 2020': '2020'
        };
        editYear.value = labelToValueMap[image.year_label] || '';
    }
    document.getElementById('editForm').dataset.imageId = image.id;
    document.getElementById('editMessage').style.display = 'none';
    document.getElementById('editModal').classList.add('active');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
}

async function saveImageChanges(e) {
    e.preventDefault();

    const imageId = document.getElementById('editForm').dataset.imageId;
    const description = document.getElementById('editDescription').value;
    const category = document.getElementById('editCategory').value;
    const editYearSelect = document.getElementById('editYear');
    const year = editYearSelect.value;
    const yearLabel = editYearSelect.options[editYearSelect.selectedIndex].text;

    if (!category) {
        showMessage(document.getElementById('editMessage'), 'Bitte wählen Sie eine Bildkategorie aus', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/image/${imageId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ description, category, year, yearLabel: year ? yearLabel : '' })
        });

        const data = await response.json();

        if (data.success) {
            showMessage(document.getElementById('editMessage'), 'Änderungen gespeichert', 'success');
            await loadMyImages();
            await loadGallery();
            setTimeout(() => {
                closeEditModal();
                closeModal();
            }, 500);
        } else {
            showMessage(document.getElementById('editMessage'), data.message || 'Fehler beim Speichern', 'error');
        }
    } catch (error) {
        console.error('Edit Error:', error);
        showMessage(document.getElementById('editMessage'), 'Fehler beim Speichern', 'error');
    }
}

async function deleteImage(imageId) {
    if (!confirm('Sind Sie sicher, dass Sie dieses Bild löschen möchten?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/image/${imageId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        const data = await response.json();

        if (data.success) {
            closeModal();
            showToast('Bild erfolgreich gelöscht', 'success');
            loadMyImages();
            loadGallery();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('Delete Error:', error);
        showToast('Fehler beim Löschen', 'error');
    }
}

function filterGallery() {
    const category = document.getElementById('filterCategory').value;
    const year = document.getElementById('filterYear').value;

    const filtered = allImages.filter(image => {
        const categoryMatch = !category || image.category === category;
        const yearMatch = !year || getYearFilterValue(image.year, image.year_label) === year;
        return categoryMatch && yearMatch;
    });

    displayGallery(filtered);
}

function getYearLabelFromNumber(year) {
    const y = parseInt(year);
    if (Number.isNaN(y)) return '';
    if (y < 1940) return 'vor 1940';
    if (y < 1960) return '1940 - 1960';
    if (y < 1980) return '1960 - 1980';
    if (y < 2000) return '1980 - 2000';
    if (y < 2020) return '2000 - 2020';
    return 'ab 2020';
}

function getYearFilterValue(year, yearLabel) {
    if (yearLabel === 'vor 1940') return '1939';
    if (yearLabel === '1940 - 1960') return '1950';
    if (yearLabel === '1960 - 1980') return '1970';
    if (yearLabel === '1980 - 2000') return '1990';
    if (yearLabel === '2000 - 2020') return '2010';
    if (yearLabel === 'ab 2020') return '2020';

    const y = parseInt(year);
    if (Number.isNaN(y)) return '';
    if (y < 1940) return '1939';
    if (y < 1960) return '1950';
    if (y < 1980) return '1970';
    if (y < 2000) return '1990';
    if (y < 2020) return '2010';
    return '2020';
}

// UI Functions
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    // Reset form wenn Login/Register Seite
    if (pageId === 'loginPage') {
        document.getElementById('loginForm').reset();
    } else if (pageId === 'registerPage') {
        document.getElementById('registerForm').reset();
    }
}

function updateUI() {
    const authMenu = document.getElementById('authMenu');
    const userMenu = document.getElementById('userMenu');
    const isAuthFlowRoute = window.location.pathname === '/reset-password' || window.location.pathname === '/verify';

    if (currentUser) {
        authMenu.style.display = 'none';
        userMenu.style.display = 'flex';
        document.getElementById('userNameDisplay').textContent = `${currentUser.username}`;
        if (!isAuthFlowRoute) {
            showPage('galleryPage');
        }
    } else {
        authMenu.style.display = 'flex';
        userMenu.style.display = 'none';
        if (!isAuthFlowRoute) {
            showPage('loginPage');
        }
    }
}

function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `message ${type}`;
    element.style.display = 'block';

    if (type === 'success') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 3000);
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function loadUserFromStorage() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
        currentToken = token;
        currentUser = JSON.parse(user);
        updateUI();
    }
}
