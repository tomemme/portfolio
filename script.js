// script.js

const imageBoxes = document.querySelectorAll('.image-box');
const showRandomImageButton = document.getElementById('showRandomImage');
const wordPlaceholder = document.getElementById('wordPlaceholder');
const tidbitPlaceholder = document.getElementById('tidbitPlaceholder');

// Load the XLSX file (you'll need to adjust the path to your file)
fetch('docs/cryptotidbits.xlsx')
    .then(response => response.arrayBuffer())
    .then(data => {
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0]; // Assuming data is in the first sheet
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        showRandomImageButton.addEventListener('click', function() {
            // Select a random entry from the XLSX data
            console.log('Button clicked');
            const randomIndex = Math.floor(Math.random() * jsonData.length);
            const randomEntry = jsonData[randomIndex];

            // Populate the placeholders with the data
            wordPlaceholder.textContent = randomEntry.word;
            tidbitPlaceholder.textContent = randomEntry.tidbit;

            // Hide all other image boxes
            imageBoxes.forEach(box => {
                box.style.display = 'none';
            });

            // Display the image box with data
            const randomImageBox = imageBoxes[0]; // Assuming you have only one image box
            randomImageBox.style.display = 'block';

            console.log('XLSX date', jsonData);

            // Set a timeout to hide the image box after a few seconds (e.g., 3 seconds)
            setTimeout(function() {
                randomImageBox.style.display = 'none';
            }, 3000); // Adjust the time (3000 milliseconds = 3 seconds)
        });


    })
    .catch(error => {
        console.error('Error loading XLSX file:', error);
    });



const educationSections = document.querySelectorAll('.education-container .education-section');
const schoolImages = document.querySelectorAll('.education-container img');


educationSections.forEach((section, index) => {
    const h3Element = section.querySelector('h3');
    const schoolImage = schoolImages[index];

    h3Element.addEventListener('mouseover', function() {
        schoolImage.style.display = 'block';
    });

    h3Element.addEventListener('mouseout', function() {
        schoolImage.style.display = 'none';
    });
});

//section of code for wordCloud
document.addEventListener('DOMContentLoaded', function() {
    const words = ["Innovative", "Creative", "Leader", "Rosh Godol", "Developer", "Enthusiast", "Explorer", "Techie", 
        "Hospital Corpsman","Fleet Marine Force","Critical Thinker","Outdoorsy","Humanitarian",
    ];
    const cloud = document.getElementById('wordCloud');
    const cloudHeight = cloud.clientHeight;
    const cloudWidth = cloud.clientWidth;

    function doesOverlap(elem, otherElems) {
        const rect1 = elem.getBoundingClientRect();
        for (let i = 0; i < otherElems.length; i++) {
            const rect2 = otherElems[i].getBoundingClientRect();
            if (!(rect1.right < rect2.left || rect1.left > rect2.right | rect1.bottom < rect2.top || rect1.top > rect2.bottom)) {
                return true;
            }
        }
        return false;
    }

    words.forEach(word => {
        const span = document.createElement('span');
        span.textContent = word;
        do {
            span.style.left = `${Math.random() * (cloud.clientWidth - 100)}px`;  // -100 to reduce overflow probability
            span.style.top = `${Math.random() * (cloud.clientHeight - 50)}px`;  // -50 to reduce overflow probability
            cloud.appendChild(span);
        } while (doesOverlap(span, Array.from(cloud.children).slice(0, -1)));  // Check overlap except the current
    });

    setTimeout(() => {
        document.querySelectorAll('#wordCloud span').forEach(span => {
            span.style.opacity = 1;
            span.style.transform = `translate(-50%, -50%)`;
        });
    }, 100);
});





