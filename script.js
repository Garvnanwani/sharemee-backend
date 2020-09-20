const File = require('./models/file')
const fs = require('fs');
const connectDB = require('./config/db')

connectDB();

async function deleteData() {
    const date = new Date(Date.now() - (24 * 60 * 60 * 1000));
    const files = await File.find({ createdAt: { $lt: date } });
    if (files.length) {
        for (const file of files) {
            try {
                fs.unlinkSync(file.path);
                await file.remove();
                console.log(`succesfully deleted ${file.fileName}`);
            }
            catch (err) {
                console.log(`Error while deleting file ${err}`);
            }
        }
        console.log("The task is complete")
    }
}

deleteData().then(process.exit);