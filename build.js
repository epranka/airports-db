const csv = require("csv-parser");
const https = require("https");
const path = require("path");
const fs = require("fs");

const resolve = (pathname) => {
    return path.resolve(__dirname, pathname);
};

const parseCSV = (pathname) => {
    const items = [];
    return new Promise((resolve) => {
        fs.createReadStream(pathname)
            .pipe(csv())
            .on("data", (data) => items.push(data))
            .on("end", () => resolve(items));
    });
};

const mapArrayByKey = (array, key, multiple = false) => {
    const object = {};
    for (const item of array) {
        const keyValue = item[key];
        if (multiple) {
            if (!object[keyValue]) object[keyValue] = [];
            object[keyValue].push(item);
        } else {
            object[keyValue] = item;
        }
    }
    return object;
};

const downloadFile = (origin, destination) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destination, { flags: "w" });
        https.get(origin, function (response) {
            response.pipe(file);
            file.on("finish", function () {
                file.close(resolve);
            });
        }).on("error", function (err) {
            fs.unlink(dest);
            reject(err);
        });
    });
};

const build = async () => {
    // Download airports
    await downloadFile(
        "https://ourairports.com/data/airports.csv",
        resolve("raw/airports.csv")
    );

    // Download runways
    await downloadFile(
        "https://ourairports.com/data/runways.csv",
        resolve("raw/runways.csv")
    );

    // Download frequencies
    await downloadFile(
        "https://ourairports.com/data/airport-frequencies.csv",
        resolve("raw/airport-frequencies.csv")
    );

    // Download countries
    await downloadFile(
        "https://ourairports.com/data/countries.csv",
        resolve("raw/countries.csv")
    );

    // Download regions
    await downloadFile(
        "https://ourairports.com/data/regions.csv",
        resolve("raw/regions.csv")
    );

    // Download navaids
    await downloadFile(
        "https://ourairports.com/data/navaids.csv",
        resolve("raw/navaids.csv")
    );

    // Read raw airports
    const airportsArray = await parseCSV(resolve("raw/airports.csv"));

    // Read raw runways
    const runwaysArray = await parseCSV(resolve("raw/runways.csv"));
    // Map runways to object by airport ident
    const runways = mapArrayByKey(runwaysArray, "airport_ident", true);

    // Read raw frequencies
    const freqsArray = await parseCSV(resolve("raw/airport-frequencies.csv"));
    // Map frequencies to object by airport ident
    const freqs = mapArrayByKey(freqsArray, "airport_ident", true);

    // Read raw countries
    const countriesArray = await parseCSV(resolve("raw/countries.csv"));
    // Map countries to object by country code
    const countries = mapArrayByKey(countriesArray, "code");

    // Read raw regions
    const regionsArray = await parseCSV(resolve("raw/regions.csv"));
    // Map regions to object by code
    const regions = mapArrayByKey(regionsArray, "code");

    // Read raw navaids
    const navaidsArray = await parseCSV(resolve("raw/navaids.csv"));
    // Map navaids to object by code
    const navaids = mapArrayByKey(navaidsArray, "associated_airport", true);

    let index = 0;
    for (const airport of airportsArray) {
        console.log(airport.ident, index++, "/", airportsArray.length);
        // Full fill
        airport.runways = runways[airport.ident];
        airport.freqs = freqs[airport.ident];
        airport.country = countries[airport.iso_country] || null;
        airport.region = regions[airport.iso_region] || null;
        airport.navaids = navaids[airport.ident];
        // Write to file
        fs.writeFileSync(
            resolve("icao/" + airport.ident + ".json"),
            JSON.stringify(airport, null, 4)
        );
    }
};

build();
