import { configDotenv } from "dotenv";
import puppeteer from "puppeteer";
import { saveCodeErrorLog, saveLog, getCsvFilenamesFromDir, getCsvData, parseRow } from "./utils.js"

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
    const database = [];

    try {
        const filenames = await getCsvFilenamesFromDir(process.env.CSV_FILES_PATH);
    
        for (const filename of filenames) {
            const data = getCsvData(process.env.CSV_FILES_PATH.concat(filename));
            let lastPersonName = "";

            for await (const row of data) {
                const person = parseRow(row, filename);

                if (person.place !== process.env.DEFAULT_PLACE && lastPersonName !== person.name.toLowerCase()) {
                    lastPersonName = person.name.toLowerCase();
                    database.push(person);
                }
            }
        }
    } catch (error) {
        saveCodeErrorLog(error);
        console.log(error.message);
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
            const idObservationInput = `${idPopUp} #obs`;
            const idSubmitButton = `${idPopUp} .ladda-button.btn.btn-warning`;
            const idPostSubmitButton = ".sa-button-container .confirm";
    
            await page.waitForSelector(idNameInput);
            await page.type(idNameInput, person.name);
            await page.type(idAgeInput, person.age);
            await page.type(idCityInput, person.city);
            await page.type(idPlaceInput, person.place);
            await page.type(idObservationInput, person.observation);
            
            await page.waitForSelector(idSubmitButton);
            await page.tap(idSubmitButton);
    
            await page.waitForSelector(idPostSubmitButton);
            await page.tap(idPostSubmitButton);

            person.id = counter;

            saveLog("success", person.filename, person);
            console.log(person.name);
            counter++;
        } catch (error) {
            saveLog("error", person.filename, {
                error: error.message,
                person: person
            });
            console.log(`${error.message} => ${person.name}`);
        }
    }, 3000);
}

app();
