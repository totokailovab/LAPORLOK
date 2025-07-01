// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCvQrWfDbIgv0mUfkXs9HnY8-0xkuTx11w",
    authDomain: "fir-67ac6.firebaseapp.com",
    projectId: "fir-67ac6",
    storageBucket: "fir-67ac6.firebasestorage.app",
    messagingSenderId: "550072969983",
    appId: "1:550072969983:web:92eda0bba3afc01bfbfaca",
    measurementId: "G-NMY8SNVEDN"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();
const db = firebase.firestore();
const storage = firebase.storage();

// Global variables
let map, mapLaporan;
let userMarker = null;
let allMarkers = [];

// Initialize maps when the page loads
window.onload = function() {
    initializeMaps();
    loadReports();
};

// Initialize Google Maps
function initializeMaps() {
    // Initialize form map
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -6.175392, lng: 106.827153 }, // Default to Jakarta
        zoom: 12
    });

    // Initialize reports map
    mapLaporan = new google.maps.Map(document.getElementById('mapLaporan'), {
        center: { lat: -6.175392, lng: 106.827153 },
        zoom: 10
    });

    // Get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                map.setCenter(pos);
                mapLaporan.setCenter(pos);

                // Add marker for user's location
                if (userMarker) userMarker.setMap(null);
                userMarker = new google.maps.Marker({
                    position: pos,
                    map: map,
                    draggable: true,
                    title: 'Lokasi Anda'
                });

                // Update hidden inputs when marker is dragged
                google.maps.event.addListener(userMarker, 'dragend', function() {
                    const position = userMarker.getPosition();
                    document.getElementById('latitude').value = position.lat();
                    document.getElementById('longitude').value = position.lng();
                });

                // Set initial coordinates
                document.getElementById('latitude').value = pos.lat;
                document.getElementById('longitude').value = pos.lng;
            },
            () => {
                handleLocationError(true);
            }
        );
    } else {
        handleLocationError(false);
    }
}

// Handle location errors
function handleLocationError(browserHasGeolocation) {
    alert(browserHasGeolocation ?
        'Error: Layanan lokasi gagal.' :
        'Error: Browser Anda tidak mendukung geolokasi.');
}

// Handle form submission
document.getElementById('formLaporan').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const loading = document.createElement('div');
    loading.className = 'loading';
    loading.innerHTML = 'Mengirim laporan...';
    document.body.appendChild(loading);
    loading.style.display = 'block';

    try {
        const description = this.querySelector('textarea').value;
        const photoFile = this.querySelector('input[type=file]').files[0];
        const latitude = document.getElementById('latitude').value;
        const longitude = document.getElementById('longitude').value;

        // Upload photo to Firebase Storage
        const photoRef = storage.ref(`reports/${Date.now()}_${photoFile.name}`);
        const photoSnapshot = await photoRef.put(photoFile);
        const photoUrl = await photoSnapshot.ref.getDownloadURL();

        // Save report to Firestore
        await db.collection('reports').add({
            description: description,
            photoUrl: photoUrl,
            location: new firebase.firestore.GeoPoint(parseFloat(latitude), parseFloat(longitude)),
            status: 'pending',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Show success message
        const alert = document.createElement('div');
        alert.className = 'alert alert-success';
        alert.innerHTML = 'Laporan berhasil dikirim!';
        document.body.appendChild(alert);
        alert.style.display = 'block';

        // Reset form
        this.reset();
        setTimeout(() => alert.remove(), 3000);

        // Refresh markers
        loadReports();

    } catch (error) {
        console.error('Error submitting report:', error);
        alert('Terjadi kesalahan saat mengirim laporan. Silakan coba lagi.');
    } finally {
        loading.style.display = 'none';
    }
});

// Load and display reports on the map
async function loadReports() {
    try {
        // Clear existing markers
        allMarkers.forEach(marker => marker.setMap(null));
        allMarkers = [];

        const snapshot = await db.collection('reports').get();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const marker = new google.maps.Marker({
                position: { 
                    lat: data.location.latitude, 
                    lng: data.location.longitude 
                },
                map: mapLaporan,
                title: data.description
            });

            // Add info window
            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="max-width: 200px;">
                        <img src="${data.photoUrl}" style="width: 100%; margin-bottom: 10px;">
                        <p>${data.description}</p>
                        <p><strong>Status:</strong> ${data.status}</p>
                        <p><small>Dilaporkan: ${data.timestamp.toDate().toLocaleDateString()}</small></p>
                    </div>
                `
            });

            marker.addListener('click', () => {
                infoWindow.open(mapLaporan, marker);
            });

            allMarkers.push(marker);
        });

    } catch (error) {
        console.error('Error loading reports:', error);
    }
}