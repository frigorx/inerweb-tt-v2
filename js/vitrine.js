/**
 * vitrine.js — Animations et interactions pour la page vitrine inerWeb
 * Compteurs animés, carrousel, scroll animations
 */
(function () {
    'use strict';

    // ===== IntersectionObserver — animations au scroll =====
    var animElements = document.querySelectorAll('.fade-in, .slide-up');

    var observerOptions = {
        root: null,
        rootMargin: '0px 0px -60px 0px',
        threshold: 0.15
    };

    var scrollObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                scrollObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animElements.forEach(function (el) {
        scrollObserver.observe(el);
    });

    // ===== Compteurs animés =====
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function animateCounter(el) {
        var target = parseInt(el.getAttribute('data-target'), 10);
        var duration = 1500;
        var start = null;

        function step(timestamp) {
            if (!start) start = timestamp;
            var progress = Math.min((timestamp - start) / duration, 1);
            var value = Math.round(easeOutCubic(progress) * target);
            el.textContent = value;
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                el.textContent = target;
            }
        }

        requestAnimationFrame(step);
    }

    var counters = document.querySelectorAll('.counter');
    var counterObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(function (c) {
        counterObserver.observe(c);
    });

    // ===== Carrousel témoignages =====
    var track = document.getElementById('carouselTrack');
    var dots = document.querySelectorAll('.carousel-dot');
    var carousel = document.getElementById('carousel');
    var currentSlide = 0;
    var totalSlides = dots.length;
    var autoInterval = null;

    function goToSlide(index) {
        currentSlide = index;
        track.style.transform = 'translateX(-' + (index * 100) + '%)';
        dots.forEach(function (d, i) {
            d.classList.toggle('active', i === index);
        });
    }

    function nextSlide() {
        goToSlide((currentSlide + 1) % totalSlides);
    }

    function startAuto() {
        autoInterval = setInterval(nextSlide, 5000);
    }

    function stopAuto() {
        clearInterval(autoInterval);
    }

    dots.forEach(function (dot) {
        dot.addEventListener('click', function () {
            goToSlide(parseInt(this.getAttribute('data-index'), 10));
            stopAuto();
            startAuto();
        });
    });

    if (carousel) {
        carousel.addEventListener('mouseenter', stopAuto);
        carousel.addEventListener('mouseleave', startAuto);
    }

    startAuto();

    // ===== Smooth scroll pour les ancres =====
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
        link.addEventListener('click', function (e) {
            var target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

})();
