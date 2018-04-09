'use strict'

/************************************************
  SETUP
************************************************/

// Require dependencies
const fs = require('fs');
const got = require('got');
const cheerio = require('cheerio');
const Papa = require('papaparse');

// Store root url, and current date & time
const rootURL = 'http://shirts4mike.com/';
const dateAndTime = new Date().toISOString();
const date = dateAndTime.slice(0,10);
const time = dateAndTime.slice(11,19);

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
async function scrapeCatalogPage () {
  try {
      console.log('\nscraping catalog page...');

      const response = await got(rootURL + 'shirts.php');

      const $ = cheerio.load(response.body);
      const $shirts = $('.products li a');
      const shirtPaths = [];

      $shirts.each(function () {
        shirtPaths.push(this.attribs.href) });

      return shirtPaths;

  } catch (err) { throw err };
}

// Using an array of shirt urls, return an array of objects containing each shirt's details
async function scrapeDetailsPages (shirtPaths) {
  try {
    console.log('retrieving individual shirt details...\n');

    const detailsForShirts = [];
    let counter = 0;

    for (const shirt of shirtPaths) {
      const shirtDetails = await scrapeShirtPage(shirt);
      detailsForShirts.push(shirtDetails);

      console.log(` * ${shirtDetails.Title}`);

      counter++;
      if (counter === shirtPaths.length) return detailsForShirts;
    }
  } catch (err) { throw err }
}

// Using an array of objects respresenting details on each shirt, create a csv file
function formatCSVfile (detailsForShirts) {
  console.log('\nsaving csv file to data directory...');

  const fileName = `data/${date}.csv`;
  const csv = Papa.unparse(detailsForShirts);

  fs.writeFile(fileName, csv, err => {
    if (err) throw err });

  return '\nFILE SAVED';
}

// Get shirt url ids, then details for all shirts, then create a CSV file with the data
const createFile = async () => {
  try {

    const shirtPaths = await scrapeCatalogPage();
    const detailsForShirts = await scrapeDetailsPages(shirtPaths);
    const status = formatCSVfile(detailsForShirts);

    console.log(status);

  } catch (err) { handle(err) };
}

/************************************************
  HELPER FUNCTIONS
************************************************/

// Using an array of shirt elements, return an array of unique url ids
function getShirtPaths ($shirts) {
  const shirtPaths = [];
  $shirts.each(
    function () { shirtPaths.push(this.attribs.href) });
  return shirtPaths;
}

// Using a shirt's url, find and return that shirt's details as an object
async function scrapeShirtPage (shirtPath) {

  const shirtURL = rootURL + shirtPath;
  const response = await got(shirtURL);

  const $ = cheerio.load(response.body);
  const $shirtContent = $('#content').find('.wrapper');
  return {
    Title: $shirtContent.find('img')[0].attribs.alt,
    Price: $shirtContent.find('.price').text(),
    ImageURL: $shirtContent.find('img')[0].attribs.src,
    URL: shirtURL,
    Time: time
  }
}

/************************************************
  ERROR HANDLER
************************************************/

// Convert errors to human-readable format, then log to the console and 'scraper-error.log'
function handle (err) {
  let message = `\n[${date}, ${time}] `;

  if (err.name === 'RequestError') message += `Bad Request, check connection and root URL (${err.code})\n`
  else if (err.statusCode >= 400) message += `Unable to locate webpage (${err.statusCode})\n`;
  else message += `${err.statusMessage} (${err.statusCode})\n`;

  message += `  ${err.stack}\n`;

  console.error(message);

  fs.appendFile('scraper-error.log', message, err => {
    if (err) console.error('\nThere was a problem logging the error to scraper-error.log\n', err);
    else console.log('ERROR LOGGED');
  })
}


/************************************************
  BEGIN
************************************************/

createFile();
