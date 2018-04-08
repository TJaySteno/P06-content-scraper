'use strict'

/************************************************
  SETUP
************************************************/

// Require dependencies
const fs = require('fs');
const cheerio = require('cheerio');
const rp = require('request-promise');
const Papa = require('papaparse');

// Store root url, and current date & time
const rootURL = 'http://shirts4mike.com/';
const dateString = new Date().toISOString();
const date = dateString.slice(0,10);
const time = dateString.slice(11,19);

// Check for data directory and create if it doesn't exist
try {
  fs.statSync('data');
  console.log('DATA DIR: already exists');
} catch (err) {
  fs.mkdirSync('data');
  console.log('DATA DIR: created');
}

/************************************************
  PRIMARY FUNCTIONS
************************************************/

// Request catalog page, return an array with links to details pages
function scrapeCatalogPage () {
  return new Promise((resolve, reject) => {
    console.log('\nscraping catalog page...');

    const catalogPage = createRpOptions(rootURL + 'shirts.php');

    // Get page, then find shirts divs, then store the url ids, then return them as an array
    rp(catalogPage)
    .then($ => $('.products li a'),
    err => { throw err })
    .then($shirts => getShirtPaths($shirts))
    .then(shirtPaths => resolve(shirtPaths))
    .catch(err => handle(err));
  });
}

// Using an array of url ids, return an array of objects containing each shirt's details
function scrapeDetailsPages (shirtPaths) {
  return new Promise((resolve,reject) => {
    console.log('retrieving individual shirt details...');

    const detailsForShirts = [];
    let counter = 0;

    shirtPaths.forEach(shirtPath => {
      const detailsPage = createRpOptions(rootURL + shirtPath);

      // Get specific shirt's page, then find content div, then store shirt details, then (when all shirts have been stored) return as an array of objects
      rp(detailsPage)
        .then($ => $('#content').find('.wrapper'),
              err => { throw err })
        .then($shirtContent => getShirtDetails($shirtContent, detailsPage.url))
        .then(shirtDetails => {
          counter++;
          detailsForShirts.push(shirtDetails);
          if (counter === shirtPaths.length) resolve(detailsForShirts);
        })
        .catch(err => handle(err));
    });
  });
}

// Using an array of objects respresenting details on all shirts, create and return a csv file
function formatCSVfile (detailsForShirts) {
  return new Promise((resolve,reject) => {
    console.log('saving csv file to data directory...');

    const fileName = `data/${date}.csv`;
    const csv = Papa.unparse(detailsForShirts);
    fs.writeFile(fileName, csv, err => {
        if (err) reject(err);
        else resolve('\nFILE SAVED');
      });
  });
}

// Get shirt url ids, then shirt details, then create a CSV file with the data
const createFile = async () => {
  try {

    const shirtPaths = await scrapeCatalogPage();
    const detailsForShirts = await scrapeDetailsPages(shirtPaths);
    console.log(await formatCSVfile(detailsForShirts));

  } catch (err) { handle(err) };
}

/************************************************
  HELPER FUNCTIONS
************************************************/

// Return instruction options for request-promise
function createRpOptions (url) {
  return {
    url: url,
    transform: body => cheerio.load(body)
  };
}

// Using array of shirt elements, return an array of unique url ids
function getShirtPaths ($shirts) {
  const shirtPaths = [];
  $shirts.each(
    function () { shirtPaths.push(this.attribs.href) });
  return shirtPaths;
}

// Find and store shirt details as an object
function getShirtDetails ($shirtContent, url) {
  return {
    title: $shirtContent.find('img')[0].attribs.alt,
    price: $shirtContent.find('.price').text(),
    imageUrl: $shirtContent.find('img')[0].attribs.src,
    url: url,
    time: time
  }
}

/************************************************
  ERROR HANDLER
************************************************/

// Log issues to console and to 'scraper-error.log'; first line checks for connection issues
function handle (err) {
  if (err.statusCode !== 404 && err.error.code !== ('ENOENT' && 'ENOTFOUND')) console.error('...\n', err.error);
  else {
    console.error('...\n' +
                  'Unable to connect to URL\n' +
                  err.message)
  }

  const message = `${new Date().toISOString()} - ${err}\n\n`;

  fs.appendFile('scraper-error.log', message, err => {
    if (err) console.error(err);
    console.log('\nERROR LOGGED');
  });
}


/************************************************
  BEGIN
************************************************/

createFile();
