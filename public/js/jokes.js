let currentJoke = null;
let selectedRating = 0;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Jokes.js loaded, initializing...');
    loadRandomJoke();
    setupStarRating();
    setupButtons();
    
    // Socket.io for real-time updates - use global socket variable
    if (typeof socket !== 'undefined' && socket) {
        socket.on('ratingUpdate', function(data) {
            console.log('Rating update received:', data);
            // Could update UI if the same joke is being displayed
            if (currentJoke && data.jokeId === currentJoke.id) {
                // Update the current joke's rating display
                updateCurrentJokeRating(data);
            }
        });
        
        socket.on('jokeRatingUpdate', function(data) {
            console.log('Joke rating update received:', data);
            if (currentJoke && data.jokeId === currentJoke.id) {
                updateCurrentJokeRating(data);
            }
        });
        
        socket.on('topJokesUpdate', function(data) {
            console.log('Top jokes update received:', data);
            updateTopJokesSection(data);
        });
    } else {
        console.log('Socket.IO not available - real-time updates disabled');
    }
});

// Load a random joke
async function loadRandomJoke() {
    console.log('Loading random joke...');
    const jokeSection = document.getElementById('joke-section');
    const ratingSection = document.getElementById('rating-section');
    
    // Reset UI
    jokeSection.innerHTML = '<div class="loading">Loading joke...</div>';
    ratingSection.style.display = 'none';
    selectedRating = 0;
    updateStarDisplay();
    
    try {
        console.log('Fetching joke from /joke/random');
        const response = await fetch('/joke/random');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const joke = await response.json();
        console.log('Received joke:', joke);
        
        if (joke.error) {
            throw new Error(joke.error);
        }
        
        currentJoke = joke;
        displayJoke(joke);
        ratingSection.style.display = 'block';
        
    } catch (error) {
        console.error('Error loading joke:', error);
        jokeSection.innerHTML = `
            <div class="error">
                <p>Sorry, couldn't load a joke right now. Please try again!</p>
                <button onclick="loadRandomJoke()" class="btn btn-primary">Try Again</button>
            </div>
        `;
    }
}

// Display joke in the UI
function displayJoke(joke) {
    const jokeSection = document.getElementById('joke-section');
    
    jokeSection.innerHTML = `
        <div class="joke-display">
            <div class="joke-text">${joke.text}</div>
            ${joke.totalRatings > 0 ? `
                <div class="joke-current-rating">
                    Current rating: ⭐ ${joke.averageRating} (${joke.totalRatings} ratings)
                </div>
            ` : ''}
            <div class="joke-category">${joke.category}</div>
        </div>
    `;
}

// Setup star rating functionality
function setupStarRating() {
    const stars = document.querySelectorAll('.star');
    
    stars.forEach((star, index) => {
        star.addEventListener('click', function() {
            selectedRating = parseInt(this.dataset.rating);
            updateStarDisplay();
            updateSubmitButton();
        });
        
        star.addEventListener('mouseenter', function() {
            const rating = parseInt(this.dataset.rating);
            highlightStars(rating);
        });
    });
    
    document.querySelector('.star-rating').addEventListener('mouseleave', function() {
        updateStarDisplay();
    });
}

// Update star display based on selection
function updateStarDisplay() {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        const rating = index + 1;
        star.classList.toggle('selected', rating <= selectedRating);
        star.textContent = rating <= selectedRating ? '★' : '☆';
    });
    updateNextButton();
}

// Highlight stars on hover
function highlightStars(rating) {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        const starRating = index + 1;
        star.classList.toggle('hover', starRating <= rating);
        star.textContent = starRating <= rating ? '★' : '☆';
    });
}

// Update submit button state
function updateSubmitButton() {
    const submitBtn = document.getElementById('submit-rating');
    submitBtn.disabled = selectedRating === 0;
    submitBtn.textContent = selectedRating === 0 ? 'Select a Rating' : `Rate ${selectedRating} Star${selectedRating > 1 ? 's' : ''}`;
}

// Update next button state
function updateNextButton() {
    const nextBtn = document.getElementById('next-joke');
    nextBtn.disabled = selectedRating === 0;
    nextBtn.textContent = selectedRating === 0 ? 'Select a Rating First' : 'Next Joke';
}

// Setup button event listeners
function setupButtons() {
    const nextBtn = document.getElementById('next-joke');
    
    nextBtn.addEventListener('click', submitRatingAndLoadNext);
}

// Submit rating and load next joke
async function submitRatingAndLoadNext() {
    if (!currentJoke || selectedRating === 0) return;
    
    const nextBtn = document.getElementById('next-joke');
    const originalText = nextBtn.textContent;
    
    nextBtn.disabled = true;
    nextBtn.textContent = 'Submitting...';
    
    try {
        const response = await fetch(`/joke/rate/${currentJoke.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rating: selectedRating })
        });
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        // Show rating result briefly
        showRatingResult(result);
        
        // Load next joke after showing result
        setTimeout(() => {
            loadRandomJoke();
        }, 2000);
        
    } catch (error) {
        console.error('Error submitting rating:', error);
        showToast(error.message || 'Failed to submit rating', 'error');
        
        nextBtn.disabled = false;
        nextBtn.textContent = originalText;
    }
}

// Show rating result
function showRatingResult(result) {
    const jokeSection = document.getElementById('joke-section');
    const ratingSection = document.getElementById('rating-section');
    
    // Hide rating section during result display
    ratingSection.style.display = 'none';
    
    // Show result in the joke section
    jokeSection.innerHTML = `
        <div class="joke-display">
            <h3>Thanks for your rating!</h3>
            <p>You rated this joke <strong>${selectedRating} star${selectedRating > 1 ? 's' : ''}</strong></p>
            <p>Average rating: <strong>⭐ ${result.averageRating}</strong> (${result.totalRatings} total ratings)</p>
            <p>Loading next joke...</p>
        </div>
    `;
}

// Show toast notification
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 4000);
}

// Update top jokes section in real-time
async function updateTopJokesSection(updateData) {
    const topJokesSection = document.querySelector('.top-jokes-section');
    if (!topJokesSection) return;
    
    try {
        console.log('Updating top jokes section...');
        
        // Fetch current top jokes
        const response = await fetch('/joke/current-top');
        if (!response.ok) throw new Error('Failed to fetch top jokes');
        
        const topJokes = await response.json();
        
        // Update the jokes grid
        const jokesGrid = topJokesSection.querySelector('.jokes-grid');
        if (jokesGrid && topJokes.length > 0) {
            jokesGrid.innerHTML = topJokes.map((joke, index) => `
                <div class="top-joke ${joke.jokeId === updateData.jokeId ? 'updated' : ''}" data-joke-id="${joke.jokeId}">
                    <div class="joke-rank">#${index + 1}</div>
                    <div class="joke-text">${joke.text}</div>
                    <div class="joke-stats">
                        <span class="rating">⭐ ${joke.averageRating}</span>
                        <span class="total-ratings">(${joke.totalRatings} ratings)</span>
                    </div>
                </div>
            `).join('');
            
            // Show visual feedback for the updated joke
            const updatedJoke = jokesGrid.querySelector(`[data-joke-id="${updateData.jokeId}"]`);
            if (updatedJoke) {
                updatedJoke.classList.add('rating-updated');
                setTimeout(() => {
                    updatedJoke.classList.remove('rating-updated', 'updated');
                }, 3000);
            }
            
            // Show toast notification for significant changes
            if (updateData.totalRatings % 5 === 0 && updateData.totalRatings > 0) {
                showToast(`🎉 A joke just reached ${updateData.totalRatings} ratings! Check the top jokes.`, 'info');
            }
        }
    } catch (error) {
        console.error('Error updating top jokes section:', error);
    }
}

// Update current joke rating display with animation
function updateCurrentJokeRating(data) {
    const ratingDisplay = document.querySelector('.joke-current-rating');
    if (ratingDisplay && data.averageRating && data.totalRatings) {
        ratingDisplay.innerHTML = `Current rating: ⭐ ${data.averageRating} (${data.totalRatings} ratings)`;
        
        // Add update animation
        ratingDisplay.classList.add('rating-count-updated');
        setTimeout(() => {
            ratingDisplay.classList.remove('rating-count-updated');
        }, 2000);
    }
}
