let selectedFiles = [];

// Get DOM elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const filesList = document.getElementById('filesList');
const filesContainer = document.getElementById('filesContainer');
const fileCount = document.getElementById('fileCount');
const continueBtn = document.getElementById('continueBtn');

// Click to open file dialog
dropZone.addEventListener('click', () => {
    fileInput.click();
});

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Highlight drop zone when dragging over it
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('drag-over');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('drag-over');
    }, false);
});

// Handle dropped files
dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
});

// Handle selected files from file input
fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// Process files
function handleFiles(files) {
    const fileArray = Array.from(files);

    // Filter for image files only
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
        alert('Please select image files only');
        return;
    }

    // Add new files to selected files
    selectedFiles = [...selectedFiles, ...imageFiles];

    // Display files
    displayFiles();
}

// Display selected files
function displayFiles() {
    if (selectedFiles.length === 0) {
        filesList.style.display = 'none';
        return;
    }

    filesList.style.display = 'block';

    filesContainer.innerHTML = '';

    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';

        // Create thumbnail
        const img = document.createElement('img');
        img.className = 'file-thumbnail';

        // Read file as data URL for thumbnail
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Create file name
        const fileName = document.createElement('div');
        fileName.className = 'file-name';
        fileName.textContent = file.name;

        // Create remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-file';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeFile(index);
        };

        fileItem.appendChild(removeBtn);
        fileItem.appendChild(img);
        fileItem.appendChild(fileName);
        filesContainer.appendChild(fileItem);
    });

    // Update count
    fileCount.textContent = `${selectedFiles.length} photo${selectedFiles.length !== 1 ? 's' : ''} selected`;
}

// Remove file from selection
function removeFile(index) {
    selectedFiles.splice(index, 1);
    displayFiles();
}

// Continue to itinerary
continueBtn.addEventListener('click', () => {
    // In a real app, you would upload files here
    // For now, just navigate to the itinerary page
    window.location.href = 'index.html';
});
