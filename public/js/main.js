// Main JavaScript file for Fox Voting App

// Socket.IO is initialized in layout.ejs - just use the global socket variable
if (typeof socket !== 'undefined' && socket) {
    socket.on('voteUpdate', function(data) {
        console.log('Vote update received:', data);
        updateTrendingSection();
    });
    
    socket.on('ratingUpdate', function(data) {
        console.log('Rating update received:', data);
        updateTrendingSection();
    });
    
    socket.on('topJokesUpdate', function(data) {
        console.log('Top jokes update received in main.js:', data);
        // This will be handled by jokes.js if it's loaded
        // Otherwise, we can add a fallback here
        if (typeof updateTopJokesSection === 'undefined') {
            updateMainPageTopJokes(data);
        }
    });
}

// Fallback function for updating top jokes when jokes.js is not loaded
async function updateMainPageTopJokes(updateData) {
    const topJokesSection = document.querySelector('.top-jokes-section');
    if (!topJokesSection) return;
    
    try {
        const response = await fetch('/joke/current-top');
        if (!response.ok) throw new Error('Failed to fetch top jokes');
        
        const topJokes = await response.json();
        
        const jokesGrid = topJokesSection.querySelector('.jokes-grid');
        if (jokesGrid && topJokes.length > 0) {
            jokesGrid.classList.add('updating');
            
            setTimeout(() => {
                jokesGrid.innerHTML = topJokes.map((joke, index) => `
                    <div class="top-joke joke-clickable ${joke.jokeId === updateData.jokeId ? 'updated' : ''}" 
                         data-joke-id="${joke.jokeId}" 
                         data-joke-text="${joke.text}" 
                         data-joke-category="${joke.category}" 
                         data-joke-rating="${joke.averageRating}" 
                         data-joke-total="${joke.totalRatings}">
                        <div class="joke-rank">#${index + 1}</div>
                        <div class="joke-text">${joke.text}</div>
                        <div class="joke-stats">
                            <span class="rating">⭐ ${joke.averageRating}</span>
                            <span class="total-ratings">(${joke.totalRatings} ratings)</span>
                        </div>
                    </div>
                `).join('');
                
                jokesGrid.classList.remove('updating');
                
                // Re-initialize click handlers for new content
                if (typeof initializeJokeClickHandlers === 'function') {
                    initializeJokeClickHandlers();
                }
                
                // Highlight updated joke
                const updatedJoke = jokesGrid.querySelector(`[data-joke-id="${updateData.jokeId}"]`);
                if (updatedJoke) {
                    updatedJoke.classList.add('rating-updated');
                    setTimeout(() => {
                        updatedJoke.classList.remove('rating-updated', 'updated');
                    }, 3000);
                }
            }, 500);
        }
    } catch (error) {
        console.error('Error updating main page top jokes:', error);
    }
}

// Global popup functions - ensure they're always available
window.showJokePopup = function(jokeData, rank) {
    const popup = document.getElementById('joke-popup');
    const popupRank = document.getElementById('popup-joke-rank');
    const popupText = document.getElementById('popup-joke-text');  
    const popupCategory = document.getElementById('popup-joke-category');
    const popupRating = document.getElementById('popup-rating');
    const popupTotalRatings = document.getElementById('popup-total-ratings');
    
    if (popup && popupText && popupCategory && popupRating && popupTotalRatings) {
        popupRank.textContent = rank;
        popupText.textContent = jokeData.text;
        popupCategory.textContent = jokeData.category || 'General';
        popupRating.textContent = `⭐ ${jokeData.rating}`;
        popupTotalRatings.textContent = `(${jokeData.totalRatings} ratings)`;
        
        popup.classList.add('show');
        document.body.classList.add('popup-open');
        document.body.style.overflow = 'hidden';
    }
};

window.closeJokePopup = function() {
    const popup = document.getElementById('joke-popup');
    if (popup) {
        popup.classList.remove('show');
        document.body.classList.remove('popup-open');
        document.body.style.overflow = '';
    }
};

// Initialize joke click handlers
document.addEventListener('DOMContentLoaded', function() {
    initializeJokeClickHandlers();
    initializePopupCloseHandlers();
    
    // Close popup with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            window.closeJokePopup();
        }
    });
});

function initializePopupCloseHandlers() {
    // Initialize close button functionality
    const popup = document.getElementById('joke-popup');
    if (popup) {
        const closeBtn = popup.querySelector('.popup-close');
        const overlay = popup.querySelector('.popup-overlay');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.closeJokePopup();
            });
        }
        
        if (overlay) {
            overlay.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.closeJokePopup();
            });
        }
        
        // Prevent popup content clicks from closing
        const popupContent = popup.querySelector('.popup-content');
        if (popupContent) {
            popupContent.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        }
    }
}

function initializeJokeClickHandlers() {
    // Remove any existing listeners to prevent duplicates
    document.removeEventListener('click', handleJokeClick);
    document.addEventListener('click', handleJokeClick);
}

function handleJokeClick(e) {
    const jokeElement = e.target.closest('.joke-clickable');
    if (jokeElement) {
        e.preventDefault();
        e.stopPropagation();
        
        const jokeData = {
            id: jokeElement.getAttribute('data-joke-id'),
            text: jokeElement.getAttribute('data-joke-text'),
            category: jokeElement.getAttribute('data-joke-category'), 
            rating: jokeElement.getAttribute('data-joke-rating'),
            totalRatings: jokeElement.getAttribute('data-joke-total')
        };
        
        // Get the rank from the joke element
        const rankElement = jokeElement.querySelector('.joke-rank');
        const rank = rankElement ? rankElement.textContent : '#?';
        
        window.showJokePopup(jokeData, rank);
    }
}

// Make function globally available
window.initializeJokeClickHandlers = initializeJokeClickHandlers;
window.initializePopupCloseHandlers = initializePopupCloseHandlers;

// Utility functions
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
    }, 4000);
}

// Update trending section
async function updateTrendingSection() {
    const trendingSection = document.querySelector('.trending-section');
    if (!trendingSection) return;
    
    try {
        // This would fetch updated trending data
        // Implementation depends on your API structure
        console.log('Updating trending section...');
    } catch (error) {
        console.error('Error updating trending section:', error);
    }
}

// Handle form submissions with better UX
document.addEventListener('DOMContentLoaded', function() {
    // Add loading states to forms
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Laster...';
                
                // Re-enable after 3 seconds as fallback
                setTimeout(() => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = submitBtn.getAttribute('data-original-text') || 'Send';
                }, 3000);
            }
        });
    });
    
    // Store original button text
    document.querySelectorAll('button[type="submit"]').forEach(btn => {
        btn.setAttribute('data-original-text', btn.textContent);
    });
});

// Image lazy loading fallback
document.addEventListener('DOMContentLoaded', function() {
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    // Fallback for browsers that don't support lazy loading
    if ('loading' in HTMLImageElement.prototype) {
        // Native lazy loading is supported
        return;
    }
    
    // Implement intersection observer for older browsers
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });
        
        images.forEach(img => {
            imageObserver.observe(img);
        });
    } else {
        // Fallback: load all images immediately
        images.forEach(img => {
            img.src = img.dataset.src || img.src;
        });
    }
});

// Error handling for failed image loads  
document.addEventListener('DOMContentLoaded', function() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('error', function() {
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvcnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkJpbGRlIGlra2UgZnVubmV0PC90ZXh0Pjwvc3ZnPg==';
            this.alt = 'Bilde ikke funnet';
        });
    });
});

// Smooth scrolling for anchor links
document.addEventListener('DOMContentLoaded', function() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});
