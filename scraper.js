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

// Create 'data' folder or make a note in console if one already exists or another error arises
try {
  fs.mkdirSync('data');
  console.log('DATA: data directory created');
} catch (err) {
  if (err.code == 'EEXIST') console.error('DATA: data directory already exists');
  else console.error(err.message);
}

/************************************************
  PRIMARY FUNCTIONS
************************************************/

// Request catalog page, return an array with links to details pages
function scrapeCatalogPage () {
  return new Promise((resolve, reject) => {
    console.log('scraping catalog page...');

    const catalogPage = createRpOptions(rootURL + 'shirts.php');
    const shirtPaths = [];

    // Get page, then find shirts divs, then store the url ids, then return them as an array
    rp(catalogPage)
      .then($ => $('.products li a'),
            err => { throw err })
      .then($shirts => {
        $shirts.each(function () {
          shirtPaths.push(this.attribs.href);
        });
      })
      .then(() => resolve(shirtPaths))
      .catch(err => handler(err));
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

      // Get specific shirt's page, then find content div, then store shirt details, then (when all shirts have been stored) return all as an array of objects
      rp(detailsPage)
        .then($ => $('#content').find('.wrapper'),
              err => { throw err })
        .then($shirtContent => {
          return {
            title: $shirtContent.find('img')[0].attribs.alt,
            price: $shirtContent.find('.price').text(),
            imageUrl: $shirtContent.find('img')[0].attribs.src,
            url: detailsPage.url,
            time: time
          }
        })
        .then(shirtDetails => {
          detailsForShirts.push(shirtDetails);
          counter++;
          if (counter === shirtPaths.length) resolve(detailsForShirts);
        })
        .catch(err => handler(err));
    });
  });
}

// Using an array of objects respresenting shirts, create and return a csv file
function formatCSVfile (detailsForShirts) {
  return new Promise((resolve,reject) => {
    console.log('saving csv file to data directory...');

    const fileName = `data/${date}.csv`;
    const csv = Papa.unparse(detailsForShirts);
    fs.writeFile(fileName, csv, err => {
        if (err) reject(err);
        else resolve('FILE SAVED');
      });
  });
}

// Get shirt url ids, then shirt details, finally create a CSV file with the data
const createFile = async () => {
  try {

    const shirtPaths = await scrapeCatalogPage();
    const detailsForShirts = await scrapeDetailsPages(shirtPaths);
    console.log(await formatCSVfile(detailsForShirts));

  } catch (err) { handler(err) };
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

// Error handler
function handler (err) {
  if (err.error.code === 'ENOENT' || err.error.code === 'ENOTFOUND') {
    console.error('...\n' +
                  '404, unable to find URL\n' +
                  err.message)
  } else console.error(err.error);
}

/************************************************
  BEGIN
************************************************/

createFile();
