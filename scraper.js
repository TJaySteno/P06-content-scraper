'use strict'

// Require dependencies
const fs = require('fs');
const cheerio = require('cheerio');
const rp = require('request-promise');
const Papa = require('papaparse');

// Create 'data' folder or make a note in console if one already exists or another error arises
try {
  fs.mkdirSync('data');
  console.log('data directory created');
} catch (err) {
  if (err.code == 'EEXIST') {
    console.error('data directory already exists');
  } else {
    console.error(err.message);
  }
}

// Request catalog page, return an array with links to details pages
function scrapeCatalogPage () {
  return new Promise((res,rej) => {
    console.log('1', 'scrapeCatalogPage  ', 'request page, find links to shirts');

    const shirtCatalogPage = {
      url: 'http://shirts4mike.com/shirts.php',
      transform: body => cheerio.load(body)
    };

    const shirtPaths = [];
    rp(shirtCatalogPage)
      .then($ => $('.products li a'))
      .then($shirts => {
        $shirts.each(function () {
          shirtPaths.push(this.attribs.href);
        });
      })
      .then(() => res(shirtPaths));
  });
}



function getShirtDetails ($shirtContent) {
}



async function scrapeDetailsPages (shirtPaths, time) {
  return new Promise((res,rej) => {
    console.log('2', 'scrapeDetailsPage', 'request page, find details');

    const detailsForShirts = [];

    shirtPaths.forEach(shirtPath => {
      const shirtDetailsPage = {
        url: 'http://shirts4mike.com/' + shirtPath,
        transform: body => cheerio.load(body)
      };

      rp(shirtDetailsPage)
        .then($ => $('#content').find('.wrapper'))
        .then($shirtContent => {
          return {
            title: $shirtContent.find('img')[0].attribs.alt,
            price: $shirtContent.find('.price').text(),
            imageUrl: $shirtContent.find('img')[0].attribs.src,
            url: shirtDetailsPage.url,
            time: time
          }
        })
        .then(shirtDetails => detailsForShirts.push(shirtDetails));
    });

    setTimeout(function () {
      if (detailsForShirts.length === shirtPaths.length) res(detailsForShirts);
      else rej(new Error('whoops'));
    }, 2000);
  });
}

function formatCSVfile (detailsForShirts, date) {
  return new Promise((res,rej) => {
    setTimeout(function () {
      console.log('3', 'formatCSVfile', 'call other functions, store data in folder');
      console.log(detailsForShirts);

      const fileName = `data/${date}.csv`;
      const csv = Papa.unparse(detailsForShirts);
      fs.writeFile(fileName, csv, err => {
          if (err) handler(err);
          else console.log('file saved');
        });

      res('csvFile');
    }, 10);
  });
}

function handler (err) {
  console.error(err);
}

const createFile = async () => {
  try {

    const date = new Date();
    const currentTime = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
    const currentDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

    const shirtPaths = await scrapeCatalogPage();
    const detailsForShirts = await scrapeDetailsPages(shirtPaths, currentTime);
    const csvFile = await formatCSVfile(detailsForShirts, currentDate);

    // await console.log($, detailsForShirts, csvFile)

  } catch (err) { handler(err) };
}

createFile();
