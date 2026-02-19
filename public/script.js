document.addEventListener('DOMContentLoaded', () => {
    // Handle the hamburger menu toggle (works on all pages with .navbar and .menu-toggle)
    const menuToggle = document.querySelector('.menu-toggle');
    const navbar = document.querySelector('.navbar');
  
    if (menuToggle && navbar) {
      menuToggle.addEventListener('click', () => {
        navbar.classList.toggle('active');
      });
    }
  
    // Handle collapsible sections for Educational Background and Work History
    const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
    collapsibleHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const targetId = header.getAttribute('data-target');
        const target = document.querySelector(targetId);
        if (target) {
          target.style.display = target.style.display === 'none' ? 'block' : 'none';
          header.classList.toggle('active');
        }
      });
    });
  
    // Check if #wordCloud exists before initializing the word cloud
    const wordCloud = document.getElementById('wordCloud');
    if (wordCloud) {
      const words = [
        "Innovative", "Creative", "Leader", "Rosh Godol", "Developer", 
        "Enthusiast", "Explorer", "Techie", "Hospital Corpsman", 
        "Fleet Marine Force", "Critical Thinker", "Outdoorsy", "Humanitarian",
      ];
      
      const cloudHeight = wordCloud.clientHeight;
      const cloudWidth = wordCloud.clientWidth;
      const speed = 1; // Speed of the bouncing words
  
      words.forEach(word => {
        let span = document.createElement('span');
        span.textContent = word;
        span.style.position = 'absolute';
        span.style.left = `${Math.random() * cloudWidth}px`;
        span.style.top = `${Math.random() * cloudHeight}px`;
        span.style.color = '#2f6e2f'; // Retro green color
        span.style.fontFamily = "'Courier New', Courier, monospace"; // Monospace font
        wordCloud.appendChild(span);
  
        // Set random initial direction
        let directionX = (Math.random() < 0.5 ? -1 : 1) * speed;
        let directionY = (Math.random() < 0.5 ? -1 : 1) * speed;
  
        function moveWord() {
          let left = parseFloat(span.style.left);
          let top = parseFloat(span.style.top);
  
          if (left <= 0 || left >= cloudWidth - span.clientWidth) {
            directionX *= -1; // Reverse direction on X-axis
          }
          if (top <= 0 || top >= cloudHeight - span.clientHeight) {
            directionY *= -1; // Reverse direction on Y-axis
          }
  
          span.style.left = `${left + directionX}px`;
          span.style.top = `${top + directionY}px`;
  
          requestAnimationFrame(moveWord);
        }
  
        moveWord();
      });
    } else {
      console.log('Word cloud not found on this page.'); // Non-error log for clarity
    }
});