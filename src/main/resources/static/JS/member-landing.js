// Scroll-reveal: content fades/slides in, background stays fixed
const revealEls = document.querySelectorAll('.reveal');
const dots = document.querySelectorAll('.section-dots a');
const sections = document.querySelectorAll('.section[data-section]');

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.15 });

revealEls.forEach(el => revealObserver.observe(el));

// Dot navigation highlight
const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const id = entry.target.dataset.section;
            dots.forEach(d => d.classList.toggle('active', d.dataset.dot === id));
        }
    });
}, { threshold: 0.4 });

sections.forEach(s => sectionObserver.observe(s));

// Nav background on scroll
window.addEventListener('scroll', () => {
    document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

// Dot click smooth scroll
dots.forEach(dot => {
    dot.addEventListener('click', e => {
        e.preventDefault();
        document.querySelector(dot.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' });
    });
});

// --- REVIEWS CAROUSEL ---
document.addEventListener('DOMContentLoaded', () => {
    const track = document.getElementById('reviewsTrack');
    const prevBtn = document.getElementById('prevReview');
    const nextBtn = document.getElementById('nextReview');
    
    if (!track) return;

    loadTrainerCards();

    let reviews = [];
    let currentIndex = 0;
    let autoSlideInterval;

    // Fetch reviews from backend
    fetch('/api/feedback')
        .then(res => res.json())
        .then(data => {
            // Filter to only those with comments to ensure the carousel looks good
            reviews = data.filter(f => f.comment && f.comment.trim() !== '');
            if(reviews.length === 0) {
                // Fallback to dummy data if DB is empty
                reviews = [
                    { memberName: 'Alex M.', rating: 5, comment: 'The best gym I have ever joined! The trainers are fantastic and the equipment is state-of-the-art.' },
                    { memberName: 'Sarah K.', rating: 5, comment: 'Love the new aqua centre and recovery suite. Completely transformed my post-workout routine.' },
                    { memberName: 'David J.', rating: 4, comment: 'Great facilities and very clean. The app makes booking classes so easy.' }
                ];
            }
            renderReviews();
            startAutoSlide();
        })
        .catch(err => {
            console.error('Error fetching reviews:', err);
            track.innerHTML = '<div style="width:100%; text-align:center; color:#ef4444;">Unable to load reviews.</div>';
        });

    function renderReviews() {
        track.innerHTML = '';
        
        // Filter: Only show APPROVED feedback on landing page
        const approvedReviews = reviews.filter(f => f.approved);
        const displayReviews = approvedReviews.length > 0 ? approvedReviews : reviews.slice(0, 3);

        displayReviews.forEach(review => {
            const slide = document.createElement('div');
            slide.style.width = '100%';
            slide.style.flexShrink = '0';
            slide.style.padding = '0 20px';
            slide.style.boxSizing = 'border-box';
            
            const stars = Array(5).fill(0).map((_, i) => `<i class="fas fa-star" style="color:${i < review.rating ? '#f59e0b' : 'rgba(255,255,255,0.1)'}; margin:0 2px;"></i>`).join('');
            
            let displayName = review.isAnonymous ? 'Anonymous Member' : (review.memberName || 'Gym Member');

            let trainerMention = '';
            if (review.targetType === 'TRAINER' && review.trainerName) {
                trainerMention = `<div style="color: #94a3b8; font-size: 0.75rem; font-weight: 600; text-transform:uppercase; margin-top:4px; letter-spacing:0.5px;">Feedback for ${review.trainerName}</div>`;
            }

            slide.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; text-align:center;">
                    <div style="font-size:1.15rem; color:#f59e0b; margin-bottom:18px;">${stars}</div>
                    <p style="font-size:1.35rem; font-style:italic; line-height:1.6; color:#f0f9ff; margin-bottom:28px; max-width:700px;">"${review.comment}"</p>
                    <div style="font-weight:800; color:#38bdf8; font-size:1.1rem; text-transform:uppercase; letter-spacing:1px; line-height:1.2;">
                        ${displayName}
                        ${trainerMention}
                    </div>
                </div>
            `;
            track.appendChild(slide);
        });
        updateCarousel();
    }

    function updateCarousel() {
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
    }

    function nextSlide() {
        if(reviews.length <= 1) return;
        currentIndex = (currentIndex + 1) % reviews.length;
        updateCarousel();
    }

    function prevSlide() {
        if(reviews.length <= 1) return;
        currentIndex = (currentIndex - 1 + reviews.length) % reviews.length;
        updateCarousel();
    }

    function startAutoSlide() {
        if(reviews.length <= 1) return;
        autoSlideInterval = setInterval(nextSlide, 5000);
    }

    function resetAutoSlide() {
        clearInterval(autoSlideInterval);
        startAutoSlide();
    }

    if(nextBtn) nextBtn.addEventListener('click', () => { nextSlide(); resetAutoSlide(); });
    if(prevBtn) prevBtn.addEventListener('click', () => { prevSlide(); resetAutoSlide(); });
});

// --- TRAINER CARDS ---
async function loadTrainerCards() {
    const container = document.getElementById('trainerCards');
    if (!container) return;

    try {
        const [trainersRes, feedbackRes] = await Promise.all([
            fetch('/api/trainers'),
            fetch('/api/feedback')
        ]);
        const trainers = await trainersRes.json();
        const allFeedback = await feedbackRes.json();

        if (!trainers || trainers.length === 0) {
            container.innerHTML = '<div style="color:rgba(255,255,255,0.4);">No trainers available yet.</div>';
            return;
        }

        container.innerHTML = '';
        trainers.forEach(trainer => {
            // Calculate average rating from approved trainer feedback
            const trainerFeedbacks = allFeedback.filter(f =>
                f.targetType === 'TRAINER' && f.trainerId === trainer.id && f.approved
            );
            const avgRating = trainerFeedbacks.length > 0
                ? (trainerFeedbacks.reduce((sum, f) => sum + f.rating, 0) / trainerFeedbacks.length)
                : 0;
            const roundedRating = Math.round(avgRating);

            const starsHtml = Array(5).fill(0).map((_, i) =>
                `<i class="fas fa-star" style="color:${i < roundedRating ? '#f59e0b' : 'rgba(255,255,255,0.15)'}; font-size:0.85rem; margin:0 1px;"></i>`
            ).join('');

            // Avatar: use landingPagePhoto (admin-set) only — never profilePhoto
            let avatarHtml;
            if (trainer.landingPagePhoto) {
                avatarHtml = `<img src="${trainer.landingPagePhoto}" alt="${trainer.name}" style="width:100%; height:100%; object-fit:cover;">`;
            } else {
                const initials = (trainer.name || 'T').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                avatarHtml = `<span style="font-size:1.8rem; font-weight:800; color:#f59e0b;">${initials}</span>`;
            }

            const ratingLabel = trainerFeedbacks.length > 0
                ? `${avgRating.toFixed(1)} <span style="color:rgba(255,255,255,0.4); font-size:0.8rem;">(${trainerFeedbacks.length} review${trainerFeedbacks.length !== 1 ? 's' : ''})</span>`
                : `<span style="color:rgba(255,255,255,0.35); font-size:0.85rem;">No reviews yet</span>`;

            const card = document.createElement('div');
            card.style.cssText = `
                width: 200px; background: linear-gradient(145deg, rgba(255,255,255,0.07), rgba(0,0,0,0.25));
                border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; padding: 28px 20px 24px;
                text-align: center; backdrop-filter: blur(10px);
                transition: transform 0.3s, box-shadow 0.3s;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            `;
            card.onmouseover = () => { card.style.transform = 'translateY(-6px)'; card.style.boxShadow = '0 12px 32px rgba(245,158,11,0.2)'; };
            card.onmouseout  = () => { card.style.transform = 'translateY(0)'; card.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)'; };

            card.innerHTML = `
                <div style="width:90px; height:90px; border-radius:50%; background:linear-gradient(135deg,#1e3a5f,#0f296b);
                    border:3px solid rgba(245,158,11,0.5); margin:0 auto 16px; display:flex; align-items:center;
                    justify-content:center; overflow:hidden; box-shadow:0 0 0 4px rgba(245,158,11,0.1);">
                    ${avatarHtml}
                </div>
                <div style="font-weight:800; font-size:1.05rem; color:#f0f9ff; margin-bottom:5px;">${trainer.name}</div>
                <div style="font-size:0.78rem; color:#38bdf8; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:12px;">${trainer.specialization || 'Fitness Trainer'}</div>
                <div style="margin-bottom:6px;">${starsHtml}</div>
                <div style="font-size:0.85rem; font-weight:700; color:#f59e0b;">${ratingLabel}</div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error('Error loading trainer cards:', err);
        if (container) container.innerHTML = '<div style="color:rgba(255,255,255,0.4);">Unable to load trainers.</div>';
    }
}