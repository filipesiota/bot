import fs from 'fs';
import CsvReadableStream from 'csv-reader';
import AutoDetectDecoderStream from 'autodetect-decoder-stream';
import momentTz from "moment-timezone";

export const saveLog = (type, filename, content) => {
    if (!fs.existsSync("logs")) {
        fs.mkdirSync("logs");
    }

    const log = {
        type: type,
        content: content
    }

    const logFilePath = `logs/${getLogFilename(filename)}.json`;

    if (!fs.existsSync(logFilePath)) {
        fs.writeFileSync(logFilePath, JSON.stringify([log]));
    } else {
        const logs = JSON.parse(fs.readFileSync(logFilePath));

        logs.push(log);

        fs.writeFileSync(logFilePath, JSON.stringify(logs));
    }
}

export const saveCodeErrorLog = (error) => {
    if (!fs.existsSync("logs")) {
        fs.mkdirSync("logs");
    }

    const timestamp = momentTz(new Date(), "America/Sao Paulo");

    const log = {
        timestamp: timestamp.format("DD/MM/YYYY HH:mm:ss"),
        error: error
    }

    const logFilePath = `logs/${timestamp.format("YYYY_MM_DD")}_code_errors.json`;

    if (!fs.existsSync(logFilePath)) {
        fs.writeFileSync(logFilePath, JSON.stringify([log]));
    } else {
        const logs = JSON.parse(fs.readFileSync(logFilePath));

        logs.push(log);

        fs.writeFileSync(logFilePath, JSON.stringify(logs));
    }
}

const getLogFilename = (filename) => {
    const currentDate = momentTz(new Date(), "America/Sao Paulo");

    return `${currentDate.format("YYYY_MM_DD")}_${filename.replace(".csv", "")}`;
}

export const getCsvFilenamesFromDir = async (dirPath) => {
    try {
        const filenames = await readDir(dirPath);

        return filenames.filter(filename => filename.includes(".csv"));
    } catch (error) {
        throw error;
    }
}

const readDir = (dirPath) => {
    return new Promise((resolve, reject) => {
        fs.readdir(dirPath, (error, filenames) => {
            if (error) {
                reject(error);
            } else {
                resolve(filenames);
            }
        })
    });
}

export const getCsvData = (filePath) => {
    const decoderStream = new AutoDetectDecoderStream({ defaultEncoding: '1255' });
    const csvStream = new CsvReadableStream({ trim: true });

    return fs.createReadStream(filePath)
        .pipe(decoderStream)
        .pipe(csvStream);
}

export const parseRow = (row, filename) => {
    const columns = {
        name: 0,
        birthDate: 1,
        age: 2,
        city: 3,
        place: 4,
        observation: 5
    }

    let name = row[columns.name];
    let birthDate = row[columns.birthDate];
    let age = row[columns.age];
    let city = row[columns.city];
    let place = row[columns.place];
    let observation = row[columns.observation];

    if (age === "") {
        age = birthDate !== "" ? calculateAge(birthDate) : "";
    }

    if (city === "") {
        city = process.env.DEFAULT_CITY;
    }

    if (place === "") {
        place = process.env.DEFAULT_PLACE;
    }

    return {
        name,
        age,
        city,
        place,
        observation,
        filename
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