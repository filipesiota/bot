import { configDotenv } from "dotenv";
import puppeteer from "puppeteer";

const app = () => {
    configDotenv.apply();
    initBot();
}

const initBot = async () => {    
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto("https://tosalvo.ong.br/login.php");

    const credentials = {
        username: process.env.LOGIN_USERNAME,
        password: process.env.LOGIN_PASSWORD
    }

    await page.type("#login_s", credentials.username);
    await page.type("#senha_s", credentials.password);

    // await browser.close();
}

app();
