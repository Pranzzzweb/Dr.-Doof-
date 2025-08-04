// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Website loaded successfully!');
    
    // Initialize all functions
    initNavigation();
    initButtons();
    initAnimations();
});

// Navigation functionality
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-links a');
    
    // Smooth scrolling for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Highlight active navigation link on scroll
    window.addEventListener('scroll', highlightActiveNavLink);
}

// Button functionality
function initButtons() {
    const getStartedBtn = document.getElementById('get-started-btn');
    
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', function() {
            alert('Welcome to our project! This will connect to the backend soon.');
            // Later: Replace with actual functionality
            // window.location.href = '/dashboard';
        });
    }
}

// Animation and scroll effects
function initAnimations() {
    // Fade in elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe all feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
}

// Highlight active navigation link
function highlightActiveNavLink() {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-links a');
    
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        
        if (scrollY >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
}

// Utility functions that other team members can use
const Utils = {
    // Show/hide elements
    show: function(element) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        if (element) element.classList.remove('hidden');
    },
    
    hide: function(element) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        if (element) element.classList.add('hidden');
    },
    
    // AJAX helper for backend communication
    apiCall: async function(url, method = 'GET', data = null) {
        try {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                }
            };
            
            if (data) {
                options.body = JSON.stringify(data);
            }
            
            const response = await fetch(url, options);
            const result = await response.json();
            
            return result;
        } catch (error) {
            console.error('API call failed:', error);
            return { error: 'Network error' };
        }
    },
    
    // Local storage helpers
    saveToStorage: function(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },
    
    getFromStorage: function(key) {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    }
};

// Make Utils available globally
window.Utils = Utils;
