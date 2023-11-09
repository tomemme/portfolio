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
// document.addEventListener("DOMContentLoaded", function() {
//     // Get a reference to the "Show Tidbit" link
//     const cryptoTidbitLink = document.getElementById("cryptoTidbitLink");

//     // Add a click event listener to the link
//     cryptoTidbitLink.addEventListener("click", function(event) {
//         // Prevent the default behavior of the link (don't navigate)
//         event.preventDefault();

//         // Get a random tidbit from the cryptoTidbits array
//         const randomIndex = Math.floor(Math.random() * cryptoTidbits.length);
//         const randomTidbit = cryptoTidbits[randomIndex];

//         // Display the tidbit in an alert (you can use a different method to display it)
//         alert(randomTidbit);
//     });
// });

// JavaScript code
document.addEventListener("DOMContentLoaded", function() {
    const notecards = document.querySelectorAll(".notecard");
    const shuffleButton = document.getElementById("shuffleButton");

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

    // Function to display a random notecard
    function showRandomNotecard() {
        shuffle(notecards);
        notecards.forEach((notecard, index) => {
            setTimeout(() => {
                notecard.style.display = "block";
            }, index * 1000); // Adjust the delay time as needed
        });
    }

    // Add a click event listener to the "Show Random Tidbit" button
    shuffleButton.addEventListener("click", showRandomNotecard);
});
