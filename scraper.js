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

// Scrape a page for desired info, return in an object
function scrapeTshirtDetails (page, time) {
  return rp(page)
    .then($ => {
      const $shirtSection = $('#content').find('.wrapper');

      return {
        title: $shirtSection.find('img')[0].attribs.alt,
        price: $shirtSection.find('.price').text(),
        imageUrl: $shirtSection.find('img')[0].attribs.src,
        url: page.uri,
        time: time }
    })

    .catch(function (err) {
      handler(err);
    });
}

// Request details page for a specific shirt, return important information as an object
async function getTShirtInfo (tshirtID, time) {

  const shirtDetailsPage = {
    uri: 'http://shirts4mike.com/' + tshirtID,
    transform: body => cheerio.load(body)
  };

  const shirtInfo = await scrapeTshirtDetails(shirtDetailsPage, time);
  console.log(shirtInfo.title);

  return shirtInfo;
}

// Request catalog page, retrieve objects with info on individual shirts, and return an array containing said objects
function scrapeTshirtData (time) {

  const shirtCatalogPage = {
    uri: 'http://shirts4mike.com/shirts.php',
    transform: body => cheerio.load(body)
  };

  return rp(shirtCatalogPage)
    .then($ => {

      const $shirts = $('.products li a');
      const allShirtsInfo = [];

      $shirts.each(async function () {
        allShirtsInfo.push(await getTShirtInfo(this.attribs.href, time));
      });

      return allShirtsInfo;

    })
    .catch(err => handler(err));
}

//
async function createCSVfile () {

  const date = new Date();

  const currentTime = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
  const currentDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const fileName = `data/${currentDate}.csv`;

  const tShirtData = await scrapeTshirtData(currentTime);
  const csv = await Papa.unparse(tShirtData);

  fs.writeFile(fileName, csv, err => {
    if (err) handler(err);
    else console.log('file saved');
  });
}

function handler (err) {
  console.error(err);
}

createCSVfile();

// BUG: loads shirts synchronously, making them not appear in csv
// NOTE: need to create error code for 404
// NOTE: log errors to scraper-error.log
