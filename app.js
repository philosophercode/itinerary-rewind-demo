// Load and display trip data
let tripData = null;
let map = null;

// Initialize the application
async function init() {
    try {
        // Load contextual trip data (fallback chain)
        let response;
        const cacheBuster = '?v=' + Date.now();
        try {
            response = await fetch('trip_data_contextual.json' + cacheBuster);
        } catch {
            try {
                response = await fetch('trip_data_enhanced.json' + cacheBuster);
            } catch {
                response = await fetch('trip_data.json' + cacheBuster);
            }
        }
        tripData = await response.json();

        // Populate all sections
        populateSummary();
        populateTripNarrative();
        initMap();
        populateLocationCards();
        populateTimeline();
        populateGallery();

        // Setup lightbox
        setupLightbox();

    } catch (error) {
        console.error('Error loading trip data:', error);
        document.body.innerHTML = '<div style="text-align: center; padding: 50px;"><h2>Error loading trip data</h2><p>Please make sure trip_data.json exists in the same directory.</p></div>';
    }
}

// Populate trip summary
function populateSummary() {
    const summary = tripData.summary;

    document.getElementById('duration').textContent = summary.duration_days;
    document.getElementById('photoCount').textContent = summary.total_photos;
    document.getElementById('locationCount').textContent = summary.unique_locations;
    document.getElementById('dateRange').textContent = `${summary.start_date} - ${summary.end_date}`;
}

// Populate trip narrative
function populateTripNarrative() {
    const container = document.getElementById('tripNarrative');

    if (tripData.trip_narrative) {
        container.innerHTML = tripData.trip_narrative;
    } else {
        // Fallback if no narrative exists
        container.innerHTML = `
            <h3>Your Journey</h3>
            <p>Explore your ${tripData.summary.duration_days}-day adventure through ${tripData.summary.unique_locations} unique locations,
            captured in ${tripData.summary.total_photos} stunning photographs.</p>
        `;
    }
}

// Initialize map
function initMap() {
    // Calculate center point from all locations
    const locations = tripData.locations.filter(loc => loc.coordinates);

    if (locations.length === 0) {
        document.getElementById('map').innerHTML = '<div style="padding: 50px; text-align: center; color: #64748b;">No GPS data available for map</div>';
        return;
    }

    const avgLat = locations.reduce((sum, loc) => sum + loc.coordinates.latitude, 0) / locations.length;
    const avgLon = locations.reduce((sum, loc) => sum + loc.coordinates.longitude, 0) / locations.length;

    // Initialize map
    map = L.map('map').setView([avgLat, avgLon], 7);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    // Add markers for each location
    locations.forEach((location, index) => {
        const marker = L.marker([location.coordinates.latitude, location.coordinates.longitude])
            .addTo(map);

        const popupContent = `
            <div style="min-width: 200px;">
                <h3 style="margin: 0 0 10px 0; font-size: 1.1rem;">${location.name}</h3>
                <p style="margin: 5px 0;"><strong>${location.photo_count}</strong> photos</p>
                <p style="margin: 5px 0; font-size: 0.9rem; color: #64748b;">${location.date_range}</p>
            </div>
        `;

        marker.bindPopup(popupContent);
    });

    // Add polyline connecting locations in order
    const itineraryPoints = tripData.itinerary
        .filter(day => day.coordinates)
        .map(day => [day.coordinates.latitude, day.coordinates.longitude]);

    if (itineraryPoints.length > 1) {
        L.polyline(itineraryPoints, {
            color: '#2563eb',
            weight: 2,
            opacity: 0.6,
            dashArray: '5, 10'
        }).addTo(map);
    }

    // Fit bounds to show all markers
    const bounds = L.latLngBounds(itineraryPoints);
    map.fitBounds(bounds, { padding: [50, 50] });
}

// Populate location cards
function populateLocationCards() {
    const container = document.getElementById('locationCards');
    container.innerHTML = '';

    tripData.locations.forEach(location => {
        const card = document.createElement('div');
        card.className = 'location-card';

        const coords = location.coordinates ?
            `${location.coordinates.latitude.toFixed(4)}, ${location.coordinates.longitude.toFixed(4)}` :
            'No GPS data';

        card.innerHTML = `
            <h3>${location.name}</h3>
            <div class="location-meta">
                <div><strong>${location.photo_count}</strong> photos</div>
                <div>${location.date_range}</div>
            </div>
            ${location.coordinates ? `<div class="location-coords">${coords}</div>` : ''}
        `;

        container.appendChild(card);
    });
}

// Populate timeline
function populateTimeline() {
    const container = document.getElementById('timeline');
    container.innerHTML = '';

    tripData.itinerary.forEach((day, index) => {
        const item = document.createElement('div');
        item.className = 'timeline-item';

        const photosHtml = day.photos.map(photo => {
            let exifHtml = '';
            if (photo.time) {
                exifHtml += `<div class="photo-time">${photo.time}</div>`;
            }
            if (photo.camera_make && photo.camera_model) {
                exifHtml += `<div class="photo-camera">${photo.camera_make} ${photo.camera_model}</div>`;
            }
            if (photo.aperture || photo.shutter_speed || photo.iso) {
                const settings = [];

                // Format aperture
                if (photo.aperture) {
                    const fstop = parseFloat(photo.aperture.replace('f/', ''));
                    settings.push(`f/${fstop.toFixed(1)}`);
                }

                // Format shutter speed
                if (photo.shutter_speed) {
                    const speed = parseFloat(photo.shutter_speed);
                    if (speed >= 1) {
                        settings.push(`${speed}s`);
                    } else {
                        const fraction = Math.round(1 / speed);
                        settings.push(`1/${fraction}s`);
                    }
                }

                if (photo.iso) settings.push(`ISO ${photo.iso}`);
                exifHtml += `<div class="photo-settings">${settings.join(' • ')}</div>`;
            }

            return `
                <div class="timeline-photo-wrapper">
                    <div class="timeline-photo" data-filepath="${photo.filepath}" data-filename="${photo.filename}">
                        <img src="${photo.filepath}" alt="${photo.filename}" loading="lazy">
                    </div>
                    ${exifHtml ? `<div class="photo-exif">${exifHtml}</div>` : ''}
                </div>
            `;
        }).join('');

        // Get time range if available
        const times = day.photos.filter(p => p.time).map(p => p.time);
        const timeRange = times.length > 0 ?
            (times.length > 1 ? `${times[0]} - ${times[times.length - 1]}` : times[0]) : '';

        // Build timeline item with description
        const dayNumber = day.day_number || (index + 1);
        const description = day.description || '';

        // Format description as intro + bullets
        let formattedDescription = '';
        if (description) {
            const sentences = description.match(/[^.!?]+[.!?]+/g) || [];
            if (sentences.length > 0) {
                // Take first 2-3 sentences as intro
                const introLength = Math.min(3, Math.ceil(sentences.length / 3));
                const intro = sentences.slice(0, introLength).join(' ');
                const remaining = sentences.slice(introLength);

                formattedDescription = `<p>${intro}</p>`;

                // Format remaining as bullets
                if (remaining.length > 0) {
                    formattedDescription += '<ul>';
                    remaining.forEach(sentence => {
                        formattedDescription += `<li>${sentence.trim()}</li>`;
                    });
                    formattedDescription += '</ul>';
                }
            }
        }

        item.innerHTML = `
            ${day.photos.length > 0 ? `<div class="timeline-photos">${photosHtml}</div>` : ''}
            <div class="timeline-content">
                <div class="timeline-day-number">Day ${dayNumber}</div>
                <div class="timeline-date">${day.formatted_date} (${day.day_name})</div>
                <div class="timeline-location">📍 ${day.location}</div>
                <div class="timeline-meta">
                    <span>📸 ${day.photo_count} photo${day.photo_count !== 1 ? 's' : ''}</span>
                    ${timeRange ? `<span>🕐 ${timeRange}</span>` : ''}
                </div>
                ${formattedDescription ? `<div class="timeline-description">${formattedDescription}</div>` : ''}
            </div>
        `;

        container.appendChild(item);
    });

    // Add click handlers for timeline photos
    document.querySelectorAll('.timeline-photo').forEach(photoEl => {
        photoEl.addEventListener('click', function() {
            const filepath = this.dataset.filepath;
            const filename = this.dataset.filename;
            // Find the photo data
            const photo = tripData.itinerary
                .flatMap(day => day.photos)
                .find(p => p.filepath === filepath);
            if (photo) {
                openLightbox(filepath, formatPhotoCaption(photo));
            }
        });
    });
}

// Populate gallery
function populateGallery() {
    const container = document.getElementById('gallery');
    container.innerHTML = '';

    tripData.all_photos.forEach(photo => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.onclick = () => openLightbox(photo.filepath, formatPhotoCaption(photo));

        const captionHtml = photo.date ? `
            <div class="gallery-caption">
                <div class="gallery-caption-date">${formatDate(photo.date)}</div>
                <div class="gallery-caption-time">${photo.time || ''}</div>
            </div>
        ` : '';

        item.innerHTML = `
            <img src="${photo.filepath}" alt="${photo.filename}" loading="lazy">
            ${captionHtml}
        `;

        container.appendChild(item);
    });
}

// Lightbox functionality
function setupLightbox() {
    const lightbox = document.getElementById('lightbox');
    const closeBtn = document.querySelector('.close');

    closeBtn.onclick = () => {
        lightbox.style.display = 'none';
    };

    lightbox.onclick = (e) => {
        if (e.target === lightbox) {
            lightbox.style.display = 'none';
        }
    };

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.style.display === 'block') {
            lightbox.style.display = 'none';
        }
    });
}

function openLightbox(imagePath, caption) {
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const captionText = document.getElementById('lightbox-caption');

    lightbox.style.display = 'block';
    img.src = imagePath;
    captionText.innerHTML = caption;
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPhotoCaption(photo) {
    let caption = `<strong>${photo.filename}</strong><br>`;

    if (photo.date && photo.time) {
        caption += `${formatDate(photo.date)} at ${photo.time}<br>`;
    }

    if (photo.camera_make && photo.camera_model) {
        caption += `${photo.camera_make} ${photo.camera_model}<br>`;
    }

    if (photo.gps) {
        caption += `📍 ${photo.gps.latitude.toFixed(4)}, ${photo.gps.longitude.toFixed(4)}<br>`;
    }

    if (photo.aperture || photo.shutter_speed || photo.iso) {
        const settings = [];

        // Format aperture
        if (photo.aperture) {
            const fstop = parseFloat(photo.aperture.replace('f/', ''));
            settings.push(`f/${fstop.toFixed(1)}`);
        }

        // Format shutter speed
        if (photo.shutter_speed) {
            const speed = parseFloat(photo.shutter_speed);
            if (speed >= 1) {
                settings.push(`${speed}s`);
            } else {
                const fraction = Math.round(1 / speed);
                settings.push(`1/${fraction}s`);
            }
        }

        if (photo.iso) settings.push(`ISO ${photo.iso}`);
        caption += `<span style="font-size: 0.9rem; opacity: 0.8;">${settings.join(' • ')}</span>`;
    }

    return caption;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
