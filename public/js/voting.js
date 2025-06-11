// Voting functionality for Fox Voting App

document.addEventListener('DOMContentLoaded', function() {
    loadRandomFoxes();
    startPopularFoxPopup();
    initializeTrendingImagePopup();
});

async function loadRandomFoxes() {
    try {
        console.log('Loading random foxes...');
        const response = await fetch('/vote/random-foxes');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Loaded foxes:', data);
        
        displayFoxes(data.fox1, data.fox2);
    } catch (error) {
        console.error('Error loading foxes:', error);
        document.getElementById('voting-section').innerHTML = 
            '<div class="error">Kunne ikke laste rever. Prøv igjen senere.<br><button id="retry-btn" class="btn btn-primary" style="margin-top: 1rem;">Prøv igjen</button></div>';
        
        // Add event listener for retry button
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', loadRandomFoxes);
        }
    }
}

function displayFoxes(fox1, fox2) {
    const votingSection = document.getElementById('voting-section');
    
    votingSection.innerHTML = `
        <div class="fox-comparison">
            <div class="fox-option" data-fox-number="${fox1.number}">
                <img src="${fox1.url}" alt="Fox ${fox1.number}" loading="lazy" crossorigin="anonymous">
                <button class="vote-btn" data-fox-number="${fox1.number}">Velg denne reven</button>
                <span class="fox-label">Rev #${fox1.number}</span>
            </div>
            <div class="vs-divider">VS</div>
            <div class="fox-option" data-fox-number="${fox2.number}">
                <img src="${fox2.url}" alt="Fox ${fox2.number}" loading="lazy" crossorigin="anonymous">
                <button class="vote-btn" data-fox-number="${fox2.number}">Velg denne reven</button>
                <span class="fox-label">Rev #${fox2.number}</span>
            </div>
        </div>
    `;
    
    // Add error handling for images
    const images = votingSection.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('error', function() {
            console.warn('Failed to load fox image:', this.src);
            this.style.display = 'none';
            const foxOption = this.closest('.fox-option');
            if (foxOption) {
                foxOption.style.opacity = '0.7';
                const label = foxOption.querySelector('.fox-label');
                if (label) {
                    label.textContent += ' (Bilde ikke tilgjengelig)';
                }
            }
        });
    });
    
    // Add event listeners to vote buttons
    const voteButtons = document.querySelectorAll('.vote-btn');
    voteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const foxNumber = parseInt(this.getAttribute('data-fox-number'));
            vote(foxNumber);
        });
    });
}

async function vote(foxNumber) {
    console.log('Voting for fox:', foxNumber);
    
    // Disable voting buttons to prevent double-voting
    const voteButtons = document.querySelectorAll('.vote-btn');
    voteButtons.forEach(btn => {
        btn.disabled = true;
        const btnFoxNumber = parseInt(btn.getAttribute('data-fox-number'));
        if (btnFoxNumber === foxNumber) {
            btn.textContent = 'Stemt';
        } else {
            btn.textContent = 'Ikke stemt';
        }
    });

    try {
        const response = await fetch(`/vote/vote/${foxNumber}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Include cookies for authentication
        });
        
        console.log('Vote response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Vote result:', result);
        
        if (result.success) {
            // Highlight the chosen fox
            const chosenFox = document.querySelector(`[data-fox-number="${foxNumber}"]`);
            if (chosenFox) {
                chosenFox.classList.add('chosen');
            }
            
            showToast(`${result.message} (${result.totalVotes} totale stemmer)`, 'info');
            
            // Show result and load new foxes after delay
            setTimeout(() => {
                loadRandomFoxes();
            }, 2000);
        } else {
            showToast(result.error || 'Kunne ikke registrere stemme', 'error');
            // Re-enable buttons on error
            voteButtons.forEach(btn => {
                btn.disabled = false;
                btn.textContent = 'Velg denne reven';
            });
        }
    } catch (error) {
        console.error('Voting error:', error);
        showToast('Nettverksfeil. Prøv igjen senere.', 'error');
        // Re-enable buttons on error
        voteButtons.forEach(btn => {
            btn.disabled = false;
            btn.textContent = 'Velg denne reven';
        });
    }
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 300);
}

// Popular fox popup functionality
function startPopularFoxPopup() {
    function showPopularFoxPopup() {
        fetch('/vote/most-popular')
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.log('No popular fox data available yet');
                    return;
                }
                
                displayPopularFoxPopup(data);
            })
            .catch(error => {
                console.error('Error fetching popular fox:', error);
            });
    }
    
    // Show popup every 30-60 seconds (random interval)
    function scheduleNextPopup() {
        const interval = Math.random() * 30000 + 30000; // 30-60 seconds
        setTimeout(() => {
            showPopularFoxPopup();
            scheduleNextPopup();
        }, interval);
    }
    
    // Start the popup cycle after initial delay
    setTimeout(scheduleNextPopup, 30000); // First popup after 30 seconds
}

function displayPopularFoxPopup(foxData) {
    // Remove existing popup if any
    const existingPopup = document.getElementById('popular-fox-popup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    // Create side popup element
    const popup = document.createElement('div');
    popup.id = 'popular-fox-popup';
    popup.className = 'side-popup';
    popup.innerHTML = `
        <div class="side-popup-content">
            <button class="side-popup-close" onclick="closeSidePopup()">&times;</button>
            <div class="side-popup-text">
                <strong>🏆 Mest populære rev:</strong><br>
                Rev #${foxData.foxNumber} med ${foxData.totalVotes} stemmer!
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Show popup with animation
    setTimeout(() => popup.classList.add('show'), 100);
    
    // Auto-close after 5 seconds
    setTimeout(() => {
        closeSidePopup();
    }, 5000);
}

function closePopularFoxPopup() {
    closeSidePopup();
}

function closeSidePopup() {
    const popup = document.getElementById('popular-fox-popup');
    if (popup) {
        popup.classList.remove('show');
        setTimeout(() => {
            if (popup.parentNode) {
                popup.remove();
            }
        }, 300);
    }
}

// Initialize trending image popup functionality
function initializeTrendingImagePopup() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('trending-fox-image')) {
            const foxNumber = e.target.getAttribute('data-fox-number');
            const foxImageSrc = e.target.src;
            const foxAlt = e.target.alt;
            
            // Get vote count from the trending info
            const trendingFox = e.target.closest('.trending-fox');
            const voteCountElement = trendingFox.querySelector('.vote-count');
            const voteCount = voteCountElement ? voteCountElement.textContent : '';
            
            showImagePopup(foxImageSrc, foxNumber, voteCount, foxAlt);
        }
    });
    
    // Close popup when clicking overlay or close button
    const imagePopup = document.getElementById('image-popup');
    if (imagePopup) {
        const overlay = imagePopup.querySelector('.popup-overlay');
        const closeBtn = imagePopup.querySelector('.popup-close');
        
        if (overlay) {
            overlay.addEventListener('click', closeImagePopup);
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', closeImagePopup);
        }
        
        // Close on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && imagePopup.classList.contains('show')) {
                closeImagePopup();
            }
        });
    }
}

function showImagePopup(imageSrc, foxNumber, voteCount, altText) {
    const popup = document.getElementById('image-popup');
    const popupImage = document.getElementById('popup-image');
    const popupFoxNumber = document.getElementById('popup-fox-number');
    const popupVoteCount = document.getElementById('popup-vote-count');
    
    if (popup && popupImage && popupFoxNumber && popupVoteCount) {
        popupImage.src = imageSrc;
        popupImage.alt = altText;
        popupFoxNumber.textContent = `Rev #${foxNumber}`;
        popupVoteCount.textContent = voteCount;
        
        // Handle image load error
        popupImage.onerror = function() {
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjhkN2RhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkJpbGRlIGlra2UgZnVubmV0PC90ZXh0Pjwvc3ZnPg==';
        };
        
        popup.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
}

function closeImagePopup() {
    const popup = document.getElementById('image-popup');
    if (popup) {
        popup.classList.remove('show');
        document.body.style.overflow = ''; // Restore scrolling
    }
}

// Socket.io for real-time updates
if (typeof io !== 'undefined') {
    const socket = io();
    
    socket.on('connect', function() {
        console.log('Connected to voting server for real-time updates');
    });
    
    socket.on('voteUpdate', function(data) {
        console.log('Vote update received:', data);
        updateVoteCounts(data);
    });
    
    socket.on('foxVoteUpdate', function(data) {
        console.log('Fox-specific vote update:', data);
        updateVoteCounts(data);
        updateTrendingFoxes(data);
    });
}

// Update vote counts in real-time
function updateVoteCounts(data) {
    const foxNumber = data.foxNumber;
    
    // Update trending fox vote counts
    const trendingFoxes = document.querySelectorAll('.trending-fox');
    trendingFoxes.forEach(fox => {
        const img = fox.querySelector('.trending-fox-image');
        if (img && img.getAttribute('data-fox-number') == foxNumber) {
            const voteCountElement = fox.querySelector('.vote-count');
            if (voteCountElement) {
                voteCountElement.textContent = `${data.totalVotes} stemmer`;
                
                // Add visual feedback for update
                fox.classList.add('vote-updated');
                setTimeout(() => {
                    fox.classList.remove('vote-updated');
                }, 2000);
            }
        }
    });
    
    // Update any displayed vote counts in popups
    const popupVoteCount = document.getElementById('popup-vote-count');
    const popupFoxNumber = document.getElementById('popup-fox-number');
    if (popupVoteCount && popupFoxNumber && 
        popupFoxNumber.textContent.includes(foxNumber.toString())) {
        popupVoteCount.textContent = `${data.totalVotes} stemmer`;
    }
    
    // Update any other fox-specific vote displays
    updateFoxVoteDisplays(foxNumber, data.totalVotes, data.registeredVotes);
}

// Update trending foxes section
function updateTrendingFoxes(data) {
    // Show notification for significant vote milestones
    if (data.totalVotes % 10 === 0 && data.totalVotes > 0) {
        showToast(`🎉 Rev #${data.foxNumber} har nådd ${data.totalVotes} stemmer!`, 'info');
    }
}

// Update fox vote displays throughout the page
function updateFoxVoteDisplays(foxNumber, totalVotes, registeredVotes) {
    // Update any elements with fox-specific vote counts
    const voteElements = document.querySelectorAll(`[data-fox-votes="${foxNumber}"]`);
    voteElements.forEach(element => {
        if (element.classList.contains('total-votes')) {
            element.textContent = `${totalVotes} totalt`;
        } else if (element.classList.contains('registered-votes')) {
            element.textContent = `${registeredVotes} registrerte stemmer`;
        } else {
            element.textContent = `${totalVotes} stemmer`;
        }
        
        // Add update animation
        element.classList.add('vote-count-updated');
        setTimeout(() => {
            element.classList.remove('vote-count-updated');
        }, 1500);
    });
}
