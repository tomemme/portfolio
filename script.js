// script.js
document.addEventListener('DOMContentLoaded', function() {
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

                if (randomEntry) {
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

                    console.log('XLSX data', jsonData);

                    // Set a timeout to hide the image box after a few seconds (e.g., 3 seconds)
                    setTimeout(function() {
                        randomImageBox.style.display = 'none';
                    }, 3000);// Adjust the time (3000 milliseconds = 3 seconds)
                }else {
                    console.error('No random entry found in JSON data');
                }
            });
        })
        .catch(error => {
            console.error('Error loading XLSX file:', error);
        });
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
    console.log(cloud); //log element shouldnt be null

    if (cloud) {
        const cloudHeight = cloud.clientHeight;
        console.log(cloudHeight);
        const cloudWidth = cloud.clientWidth;

        words.forEach(word => {
            let span = document.createElement('span');
            span.textContent = word;
            span.style.position = 'absolute';
            span.style.left = `${Math.random() * cloudWidth}px`;
            span.style.top = `${Math.random() * cloudHeight}px`;
            span.style.opacity = 0;
            span.style.transition = 'all 2s';
            cloud.appendChild(span);
        });

        setTimeout(() => {
            document.querySelectorAll('#wordCloud span').forEach(span => {
                span.style.opacity = 1;
                span.style.transform = `translate(-50%, -50%)`;
                });
        }, 100);
    } else {
        console.error('Element #wordCloud not found');
    }
    
});





