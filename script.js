document.addEventListener('DOMContentLoaded', function() {
    const words = [
        "Innovative", "Creative", "Leader", "Rosh Godol", "Developer", 
        "Enthusiast", "Explorer", "Techie", "Hospital Corpsman", 
        "Fleet Marine Force", "Critical Thinker", "Outdoorsy", "Humanitarian",
    ];
    
    const cloud = document.getElementById('wordCloud');

    if (cloud) {
        const cloudHeight = cloud.clientHeight;
        const cloudWidth = cloud.clientWidth;
        const speed = 2; // Speed of the bouncing words

        words.forEach(word => {
            let span = document.createElement('span');
            span.textContent = word;
            span.style.position = 'absolute';
            span.style.left = `${Math.random() * cloudWidth}px`;
            span.style.top = `${Math.random() * cloudHeight}px`;
            span.style.color = '#2f6e2f'; // Retro green color
            span.style.fontFamily = "'Courier New', Courier, monospace"; // Monospace font
            cloud.appendChild(span);

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
        console.error('Element #wordCloud not found');
    }
});
