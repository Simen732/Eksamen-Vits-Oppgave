// Voting functionality for Fox Voting App

document.addEventListener('DOMContentLoaded', function() {
    loadRandomFoxes();
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
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1zbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkJpbGRlIGlra2UgZnVubmV0PC90ZXh0Pjwvc3ZnPg==';
            this.alt = 'Bilde ikke funnet';
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
        btn.textContent = 'Stemmer...';
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
            
            showToast(`${result.message} (${result.totalVotes} totale stemmer)`, 'success');
            
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

// Socket.io for real-time updates
if (typeof io !== 'undefined') {
    const socket = io();
    socket.on('voteUpdate', function(data) {
        console.log('Vote update:', data);
    });
}
