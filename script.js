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
    // Get a reference to the "Show Tidbit" link
    const cryptoTidbitLink = document.getElementById("cryptoTidbitLink");

    // Add a click event listener to the link
    cryptoTidbitLink.addEventListener("click", function(event) {
        // Prevent the default behavior of the link (don't navigate)
        event.preventDefault();

        // Get a random tidbit from the cryptoTidbits array
        const randomIndex = Math.floor(Math.random() * cryptoTidbits.length);
        const randomTidbit = cryptoTidbits[randomIndex];

        // Display the tidbit in an alert (you can use a different method to display it)
        alert(randomTidbit);
    });
});
