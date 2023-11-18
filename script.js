// script.js

// You can add JavaScript functionality here, e.g., handling project clicks, animations, etc.
const cryptoTidbits = [
    "Nonce - A number used in mining to determine block difficulty by adding leading zeros to hash.",
    "Halving - An event that occurs every 210,000 blocks, cutting mining rewards in half to maintain scarcity. Bitcoin's current reward: 6.25 BTC",
    "Rollup - Layer 2 solution for Ethereum, enabling faster and cost-effective transactions through off-chain processing. Optimistic Rollup is one popular implementation.",
    "Decentralization -Distribution of authority and control in a blockchain network, eliminating single points of failure. Enhances security and censorship resistance.",
    "Smart Contracts - Self-executing agreements on the blockchain, automatically enforcing terms without intermediaries.",
    "Fork - Splitting of a blockchain into two separate chains, usually due to a difference in consensus rules.",
];

// JavaScript code
document.addEventListener("DOMContentLoaded", function() {
    const notecards = document.querySelectorAll(".notecard");
    const shuffleButton = document.getElementById("shuffleButton");
    let currentNotecardIndex = -1; // Start with no notecard displayed

    // Shuffle the notecards using Fisher-Yates algorithm
    function shuffle(array) {
        let currentIndex = array.length, randomIndex, temporaryValue;

        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;

            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }
    }

    // Function to hide the current notecard
    function hideCurrentNotecard() {
        if (currentNotecardIndex !== -1) {
            notecards[currentNotecardIndex].style.display = "none";
        }
    }

    // Function to display a random notecard
    function showRandomNotecard() {
        hideCurrentNotecard(); // Hide the previous notecard
        shuffle(notecards);
        currentNotecardIndex = 0; // Start with the first notecard
        notecards[currentNotecardIndex].style.display = "block";
    }

    // Add a click event listener to the "Show Random Tidbit" button
    shuffleButton.addEventListener("click", showRandomNotecard);
});

//logic to display hover over images. orignal method
// const h3Element = document.querySelector('.education-section h3');
// const schoolImage = document.getElementById('schoolImage');

// h3Element.addEventListener('mouseover', function() {
//     schoolImage.style.display = 'block';
// });

// h3Element.addEventListener('mouseout', function() {
//     schoolImage.style.display = 'none';
// });

const educationSections = document.querySelectorAll('.education-container .education-section');
const schoolImages = document.querySelectorAll('.education-container img');

educationSections.forEach((section, index) => {
    const h3Element = section.querySelector('h3');
    const schoolImage = schoolImages[index];

    h3Element.addEventListener('mouseover', function() {
        schoolImage.style.display = 'block';
        section.classList.add('blur-background');
    });

    h3Element.addEventListener('mouseout', function() {
        schoolImage.style.display = 'none';
        section.classList.remove('blur-background')
    });
});

