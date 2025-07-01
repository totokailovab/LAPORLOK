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
const auth = firebase.auth();

// Check authentication state
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = '../login.html';
    }
});

// Logout functionality
document.getElementById('btnLogout').addEventListener('click', () => {
    auth.signOut().then(() => {
        window.location.href = '../login.html';
    }).catch(error => {
        console.error('Logout error:', error);
        showToast('Error saat logout', 'danger');
    });
});

// Load dashboard statistics
function loadStatistics() {
    db.collection('reports').get().then(snapshot => {
        let total = 0;
        let pending = 0;
        let processing = 0;
        let completed = 0;

        snapshot.forEach(doc => {
            total++;
            switch(doc.data().status) {
                case 'pending':
                    pending++;
                    break;
                case 'processing':
                    processing++;
                    break;
                case 'completed':
                    completed++;
                    break;
            }
        });

        document.getElementById('totalLaporan').textContent = total;
        document.getElementById('menungguVerifikasi').textContent = pending;
        document.getElementById('sedangDiproses').textContent = processing;
        document.getElementById('selesai').textContent = completed;
    });
}

// Load reports table
function loadReportsTable() {
    const tableBody = document.getElementById('reportTableBody');
    tableBody.innerHTML = '';

    db.collection('reports')
        .orderBy('timestamp', 'desc')
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const data = doc.data();
                const row = document.createElement('tr');
                
                // Format date
                const date = data.timestamp.toDate().toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });

                // Create status badge
                const statusBadge = document.createElement('span');
                statusBadge.className = `badge badge-${data.status}`;
                statusBadge.textContent = getStatusText(data.status);

                row.innerHTML = `
                    <td>${date}</td>
                    <td>${data.description.substring(0, 50)}...</td>
                    <td>${data.location.latitude.toFixed(6)}, ${data.location.longitude.toFixed(6)}</td>
                    <td>${statusBadge.outerHTML}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="showReportDetails('${doc.id}')">Detail</button>
                    </td>
                `;

                tableBody.appendChild(row);
            });
        });
}

// Show report details in modal
async function showReportDetails(reportId) {
    const doc = await db.collection('reports').doc(reportId).get();
    const data = doc.data();

    // Set modal content
    document.getElementById('modalImage').src = data.photoUrl;
    document.getElementById('modalDescription').textContent = data.description;
    document.getElementById('modalStatus').value = data.status;
    document.getElementById('modalNotes').value = data.notes || '';

    // Initialize map
    const modalMap = new google.maps.Map(document.getElementById('modalMap'), {
        center: { 
            lat: data.location.latitude, 
            lng: data.location.longitude 
        },
        zoom: 15
    });

    // Add marker
    new google.maps.Marker({
        position: { 
            lat: data.location.latitude, 
            lng: data.location.longitude 
        },
        map: modalMap
    });

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('reportModal'));
    modal.show();

    // Update status button handler
    document.getElementById('btnUpdateStatus').onclick = async () => {
        const newStatus = document.getElementById('modalStatus').value;
        const notes = document.getElementById('modalNotes').value;

        try {
            await db.collection('reports').doc(reportId).update({
                status: newStatus,
                notes: notes,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Send notification to user (you can implement this using Firebase Cloud Messaging)
            // sendStatusUpdateNotification(reportId, newStatus);

            showToast('Status berhasil diperbarui', 'success');
            modal.hide();
            loadReportsTable();
            loadStatistics();
        } catch (error) {
            console.error('Error updating status:', error);
            showToast('Error saat memperbarui status', 'danger');
        }
    };
}

// Helper function to get status text
function getStatusText(status) {
    const statusMap = {
        'pending': 'Menunggu Verifikasi',
        'processing': 'Sedang Diproses',
        'completed': 'Selesai',
        'rejected': 'Ditolak'
    };
    return statusMap[status] || status;
}

// Show toast notification
function showToast(message, type = 'success') {
    const toastContainer = document.querySelector('.toast-container') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast bg-${type} text-white`;
    toast.innerHTML = `
        <div class="toast-body">
            ${message}
        </div>
    `;

    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// Create toast container if it doesn't exist
function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    loadStatistics();
    loadReportsTable();
});