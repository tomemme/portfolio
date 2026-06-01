/*!
* Start Bootstrap - Grayscale v7.0.6 (https://startbootstrap.com/theme/grayscale)
* Copyright 2013-2023 Start Bootstrap
* Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-grayscale/blob/master/LICENSE)
*/
//
// Scripts
// 

window.addEventListener('DOMContentLoaded', event => {

    // Navbar shrink function
    var navbarShrink = function () {
        const navbarCollapsible = document.body.querySelector('#mainNav');
        if (!navbarCollapsible) {
            return;
        }
        if (window.scrollY === 0) {
            navbarCollapsible.classList.remove('navbar-shrink')
        } else {
            navbarCollapsible.classList.add('navbar-shrink')
        }

    };

    // Shrink the navbar 
    navbarShrink();

    // Shrink the navbar when page is scrolled
    document.addEventListener('scroll', navbarShrink);

    // Activate Bootstrap scrollspy on the main nav element
    const mainNav = document.body.querySelector('#mainNav');
    if (mainNav && window.bootstrap && bootstrap.ScrollSpy) {
        new bootstrap.ScrollSpy(document.body, {
            target: '#mainNav',
            rootMargin: '0px 0px -40%',
        });
    };

    const navbarToggler = document.body.querySelector('.navbar-toggler');
    const navbarResponsive = document.body.querySelector('#navbarResponsive');

    if (navbarToggler && navbarResponsive && !(window.bootstrap && bootstrap.Collapse)) {
        navbarToggler.addEventListener('click', () => {
            const isExpanded = navbarToggler.getAttribute('aria-expanded') === 'true';
            navbarToggler.setAttribute('aria-expanded', String(!isExpanded));
            navbarResponsive.classList.toggle('show', !isExpanded);
        });
    }

    // Collapse responsive navbar when toggler is visible
    const responsiveNavItems = [].slice.call(
        document.querySelectorAll('#navbarResponsive .nav-link')
    );
    responsiveNavItems.map(function (responsiveNavItem) {
        responsiveNavItem.addEventListener('click', () => {
            if (navbarToggler && navbarResponsive && window.getComputedStyle(navbarToggler).display !== 'none') {
                navbarResponsive.classList.remove('show');
                navbarToggler.setAttribute('aria-expanded', 'false');
            }
        });
    });

    const tisAboutSection = document.querySelector('.tis-about-section');
    if (tisAboutSection && 'IntersectionObserver' in window) {
        const aboutObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                tisAboutSection.classList.toggle('about-section-active', entry.isIntersecting);
            });
        }, { threshold: 0.35 });

        aboutObserver.observe(tisAboutSection);
    } else if (tisAboutSection) {
        tisAboutSection.classList.add('about-section-active');
    }

});
