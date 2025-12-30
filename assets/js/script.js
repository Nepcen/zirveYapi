// Zirve Yapı - Minimal JavaScript

// Splash Screen Management
const splashManager = {
    elem: document.getElementById('splash-screen'),
    minTimePromise: new Promise(resolve => setTimeout(resolve, 1000)), // Min 1 sn

    hide() {
        if (this.elem) {
            this.elem.style.opacity = '0';
            this.elem.style.visibility = 'hidden';
        }
    }
};

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    navbar.style.boxShadow = window.scrollY > 50 ? '0 2px 10px rgba(0,0,0,0.1)' : 'none';
});

// Simple form handling
document.querySelector('.form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Mesajınız gönderildi. Teşekkürler!');
    e.target.reset();
});

// =========================================
// MASONRY GALLERY - LIGHTBOX FUNCTIONALITY
// =========================================
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxVideo = document.getElementById('lightboxVideo');
const lightboxVideoSource = document.getElementById('lightboxVideoSource');
const lightboxClose = document.querySelector('.lightbox-close');
const lightboxPrev = document.querySelector('.lightbox-prev');
const lightboxNext = document.querySelector('.lightbox-next');


let currentItemIndex = 0;

// Open lightbox
function openLightbox(item) {
    // GalleryManager.allItems is already in JSON order (horizontal logical order)
    currentItemIndex = GalleryManager.allItems.indexOf(item);
    updateLightboxContent();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Update lightbox content based on item type
function updateLightboxContent() {
    const item = GalleryManager.allItems[currentItemIndex];
    if (!item) return;

    const isVideo = item.dataset.type === 'video';

    // Always stop any playing video first
    stopVideo();

    if (isVideo) {
        // Show video, hide image
        lightboxImage.classList.add('hidden');
        lightboxVideo.classList.remove('hidden');

        // Set video source (lazy load - video only loads when opened)
        const videoSrc = item.dataset.src;
        if (lightboxVideoSource.src !== videoSrc) {
            lightboxVideoSource.src = videoSrc;
            lightboxVideo.load(); // Reload video with new source
        }

        // Auto-play video when opened
        lightboxVideo.play().catch(() => {
            // Autoplay may be blocked by browser, that's okay
        });
    } else {
        // Show image, hide video
        lightboxImage.classList.remove('hidden');
        lightboxVideo.classList.add('hidden');

        lightboxImage.src = item.dataset.src;
        lightboxImage.alt = item.dataset.alt || '';
    }
}

// Stop video playback
function stopVideo() {
    if (lightboxVideo) {
        lightboxVideo.pause();
        lightboxVideo.currentTime = 0;
    }
}

// Close lightbox
function closeLightbox() {
    stopVideo();
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
}

// Navigate lightbox
function navigateLightbox(direction) {
    // Stop current video before navigating
    stopVideo();

    const totalItems = GalleryManager.allItems.length;
    let nextIndex = currentItemIndex;

    // Loop to skip null/spacer items
    // Although spacers are not in allItems array (we filter them in createItemElement),
    // this logic ensures robustness if they were included.
    // Actually, createItemElement returns null for spacers and renderItems checks 'if (!el) return',
    // so spacers are NOT in allItems. Logic is simple.

    if (direction === 'next') {
        nextIndex = (currentItemIndex + 1) % totalItems;
    } else {
        nextIndex = (currentItemIndex - 1 + totalItems) % totalItems;
    }

    currentItemIndex = nextIndex;
    updateLightboxContent();
}

// Initialize gallery click events - GalleryManager handles this now

// Lightbox controls
lightboxClose?.addEventListener('click', closeLightbox);
lightboxPrev?.addEventListener('click', () => navigateLightbox('prev'));
lightboxNext?.addEventListener('click', () => navigateLightbox('next'));

// Close on backdrop click
lightbox?.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (!lightbox?.classList.contains('active')) return;

    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox('prev');
    if (e.key === 'ArrowRight') navigateLightbox('next');

    // Space bar to pause/play video
    if (e.key === ' ' && !lightboxVideo.classList.contains('hidden')) {
        e.preventDefault();
        if (lightboxVideo.paused) {
            lightboxVideo.play();
        } else {
            lightboxVideo.pause();
        }
    }
});

// =========================================
// GALLERY MANAGER
// =========================================
const GalleryManager = {
    data: null,
    currentPartIndex: 0,
    galleryContainer: document.getElementById('gallery'),
    loadMoreContainer: document.getElementById('loadMoreContainer'),
    loadMoreBtn: document.getElementById('loadMoreBtn'),
    columns: [],
    allItems: [],

    async init() {
        if (!this.galleryContainer) return; // Ensure gallery container exists

        try {
            await this.loadData();

            // Initial column setup
            this.createColumns();

            // Force checking column count again just in case (for mobile)
            this.reorganizeGallery();

            this.setupResizeListener();
            this.loadPart();
            this.setupLoadMore();
        } catch (error) {
            console.error('Galeri başlatma hatası:', error);
            this.galleryContainer.innerHTML = '<p style="text-align:center; width:100%;">Galeri yüklenirken bir sorun oluştu.</p>';
        }
    },

    setupResizeListener() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.reorganizeGallery();
            }, 200);
        });
    },

    reorganizeGallery() {
        const newColCount = this.getColumnCount();
        if (newColCount === this.columns.length) return; // No change needed

        // Clear container and recreate columns
        this.galleryContainer.innerHTML = '';
        this.columns = [];
        this.createColumns();

        // Redistribute all currently loaded items
        this.allItems.forEach((item, index) => {
            const columnIndex = index % this.columns.length;
            this.columns[columnIndex].appendChild(item);
        });
    },

    getColumnCount() {
        const width = window.innerWidth;
        if (width <= 480) return 2; // Mobile: 2 columns requested
        if (width <= 768) return 2; // Tablet portrait: 2
        if (width <= 1100) return 3; // Tablet landscape: 3
        return 4; // Desktop: 4
    },

    createColumns() {
        const colCount = this.getColumnCount();
        this.galleryContainer.innerHTML = ''; // Ensure empty start
        this.columns = [];

        for (let i = 0; i < colCount; i++) {
            const col = document.createElement('div');
            col.className = 'masonry-column';
            this.galleryContainer.appendChild(col);
            this.columns.push(col);
        }
    },

    async loadData() {
        try {
            // Cache busting
            const response = await fetch(`assets/data/gallery.json?v=${new Date().getTime()}`);
            if (!response.ok) throw new Error('Veri yüklenemedi');
            this.data = await response.json();
        } catch (error) {
            console.error('Galeri verisi hatası:', error);
            this.galleryContainer.innerHTML = '<p class="error">Galeri yüklenirken bir sorun oluştu.</p>';
        }
    },

    loadPart() {
        if (!this.data || !this.data.parts || this.currentPartIndex >= this.data.parts.length) {
            this.hideLoadMore();
            return;
        }

        const part = this.data.parts[this.currentPartIndex];
        this.renderItems(part.items);
        this.currentPartIndex++;

        // Eğer son part ise butonu gizle
        if (this.currentPartIndex >= this.data.parts.length) {
            this.hideLoadMore();
        }
    },

    renderItems(items) {
        // Items are distributed round-robin to columns
        // This ensures new items are added to the bottom without shifting old ones

        // Calculate current total item count to continue distribution correctly
        let currentTotalCount = this.allItems.length;

        items.forEach((item, i) => {
            const el = this.createItemElement(item);

            // Boş obje (spacer) kontrolü
            if (!el) return;

            this.allItems.push(el); // Store for resize

            const columnIndex = (currentTotalCount + i) % this.columns.length;
            this.columns[columnIndex].appendChild(el);

            // Trigger reflow for animation
            requestAnimationFrame(() => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            });
        });

        this.updateClickEvents();
    },

    createItemElement(item) {
        // Boş obje kontrolü - Spacer
        if (!item.src && !item.type) return null;

        const div = document.createElement('div');
        div.className = 'masonry-item skeleton-item';
        div.style.opacity = '0';
        div.style.transform = 'translateY(20px)';

        // Veri tiplerini dataset'e kaydet (Lightbox için)
        div.dataset.type = item.type;
        div.dataset.src = item.src;
        if (item.cover) div.dataset.cover = item.cover;
        if (item.alt) div.dataset.alt = item.alt;

        if (item.type === 'video') {
            const img = document.createElement('img');
            img.src = item.cover || 'assets/images/placeholder-video.jpg';
            img.alt = item.alt || 'Galeri Videosu';
            img.className = 'gallery-item';
            img.loading = 'lazy';

            img.onload = () => div.classList.remove('skeleton-item');

            const icon = document.createElement('div');
            icon.className = 'video-play-icon';
            icon.innerHTML = '<i class="fas fa-play"></i>';

            div.appendChild(img);
            div.appendChild(icon);
        } else {
            const img = document.createElement('img');
            img.src = item.src;
            img.alt = item.alt || 'Galeri Görseli';
            img.className = 'gallery-item';
            img.loading = 'lazy';

            img.onload = () => div.classList.remove('skeleton-item');

            div.appendChild(img);
        }

        return div;
    },

    setupLoadMore() {
        if (this.loadMoreBtn) {
            this.loadMoreBtn.addEventListener('click', () => {
                this.loadPart();
            });
        }
    },

    hideLoadMore() {
        if (this.loadMoreContainer) {
            this.loadMoreContainer.style.display = 'none';
        }
    },

    updateClickEvents() {
        this.allItems.forEach(item => {
            if (!item.hasAttribute('data-click-listener')) {
                item.addEventListener('click', () => openLightbox(item));
                item.setAttribute('data-click-listener', 'true');
            }
        });
    }
};

// =========================================
// PERFORMANCE OPTIMIZATIONS
// =========================================
let imageObserver;

// Intersection Observer for lazy loading detection
if ('IntersectionObserver' in window) {
    imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.complete && img.naturalHeight !== 0) {
                    img.classList.add('loaded');
                } else {
                    img.onload = () => img.classList.add('loaded');
                }
                imageObserver.unobserve(img);
            }
        });
    }, {
        rootMargin: '50px 0px',
        threshold: 0.01
    });
}

// Initialize Gallery & Splash Screen
document.addEventListener('DOMContentLoaded', async () => {
    // Paralel başlat: Zamanlayıcı zaten başladı, Galeri'yi başlat
    try {
        await GalleryManager.init();
    } catch (e) {
        console.error('Galeri başlatma hatası:', e);
    }

    // Galeri hazır (veya hata verdi), şimdi min süreyi bekle
    await splashManager.minTimePromise;

    // Her şey hazır, splash'i kapat
    splashManager.hide();
});
