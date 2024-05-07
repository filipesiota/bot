import { configDotenv } from "dotenv";
import puppeteer from "puppeteer";
import fs from 'fs';
import CsvReadableStream from 'csv-reader';
import AutoDetectDecoderStream from 'autodetect-decoder-stream';
import momentTz from "moment-timezone";

const app = () => {
    configDotenv.apply();
    initBot();
}

const initBot = async () => {    
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto("https://tosalvo.ong.br/login.php");

    /*=============================
    # DO LOGIN
    =============================*/
    const credentials = {
        username: process.env.LOGIN_USERNAME,
        password: process.env.LOGIN_PASSWORD
    }

    const idLoginInput = "#login_s";
    const idPasswordInput = "#senha_s";
    const idLoginButton = ".btn.btn-success.btn-block";

    await page.waitForSelector(idLoginInput);
    await page.type(idLoginInput, credentials.username);
    await page.type(idPasswordInput, credentials.password);
    await page.tap(idLoginButton);

    /*=============================
    # GET DATA FROM CSV
    =============================*/
    const filePath = "./assets/2024_05_06_tosalvo_ccr.csv";
    const data = getCsvData(filePath);
    const database = [];

    for await (const row of data) {
        const person = parseRow(row);
        database.push(person);
    }

    /*=============================
    # INSERT DATA
    =============================*/
    let counter = 0;

    const loop = setInterval(async () => {
        if (counter === database.length) {
            clearInterval(loop);

            console.log(`Foram importados ${counter} registro(s)`);
            await browser.close();
            return;
        }

        const person = database[counter];

        try {
            const idCreateButton = ".btn.btn-warning";
            await page.waitForSelector(idCreateButton);
            await page.tap(idCreateButton);
    
            const idPopUp = ".modal.fade.in";
            const idNameInput = `${idPopUp} #nome`;
            const idAgeInput = `${idPopUp} #idade`;
            const idCityInput = `${idPopUp} #cidade`;
            const idPlaceInput = `${idPopUp} #local`;
            const idSubmitButton = `${idPopUp} .ladda-button.btn.btn-warning`;
            const idPostSubmitButton = ".sa-button-container .confirm";
    
            await page.waitForSelector(idNameInput);
            
            const nameInputContent = await page.evaluate(() => {
                const nameInput = document.querySelector(idNameInput);

                return nameInput ? nameInput.value : "";
            });

            if (nameInputContent === "") {
                await page.type(idNameInput, person.name);
                await page.type(idAgeInput, person.age);
                await page.type(idCityInput, person.city);
                await page.type(idPlaceInput, person.place);
            }
            
            await page.tap(idSubmitButton);
    
            await page.waitForSelector(idPostSubmitButton);
            await page.tap(idPostSubmitButton);

            console.log(person.name);
            counter++;
        } catch (error) {
            console.log(`${error.message} => ${person.name}`);
        }
    }, 2000);
}

const getCsvData = (filePath) => {
    const decoderStream = new AutoDetectDecoderStream({ defaultEncoding: '1255' });
    const csvStream = new CsvReadableStream({ trim: true });

    return fs.createReadStream(filePath)
        .pipe(decoderStream)
        .pipe(csvStream);
}

const parseRow = (row) => {
    const columns = {
        name: 0,
        birthDate: 1,
        neighborhood: 2
    }

    const name = row[columns.name];
    const birthDate = row[columns.birthDate];
    const neighborhood = row[columns.neighborhood];

    const age = birthDate !== "" ? calculateAge(birthDate) : "";
    const city = neighborhood !== "" ? neighborhood : process.env.DEFAULT_CITY;
    const place = process.env.DEFAULT_PLACE;

    return {
        name,
        age,
        city,
        place
    }
}

const calculateAge = (birthDateString) => {
    const currentDate = momentTz(new Date(), "America/Sao Paulo");
    const birthDate = momentTz(birthDateString, "M/D/YYYY", "America/Sao Paulo");

    const ageInYears = currentDate.diff(birthDate, "years");

    if (ageInYears > 0) {
        return ageInYears.toString();
    }

    const ageInMonths = currentDate.diff(birthDate, "months");

    if (ageInMonths > 0) {
        const monthLabel = ageInMonths > 1 ? "MESES" : "MÊS";

        return `${ageInMonths.toString()} ${monthLabel}`;
    }

    const ageInDays = currentDate.diff(birthDate, "days");
    const dayLabel = ageInDays > 1 ? "DIAS" : "DIA";

    return `${ageInDays.toString()} ${dayLabel}`;
}

app();
