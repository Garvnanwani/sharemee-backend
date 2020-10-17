const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const File = require('../models/file');
const { v4: uuidv4 } = require('uuid');

let storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName)
    },
});

let upload = multer({ storage, limits: { fileSize: 1000000 * 100 }, }).any(); //100mb

router.post('/', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(500).send({ error: err.message });
        }

        const uploaded_file = req.files[0];

        const file = new File({
            filename: uploaded_file.filename,
            uuid: uuidv4(),
            path: uploaded_file.path,
            size: uploaded_file.size
        });
        const response = await file.save();
        res.json({ file: `${process.env.APP_BASE_URL}/files/${response.uuid}` });
    });
});

router.post('/send', async (req, res) => {
    const { uuid, emailTo, emailFrom } = req.body;
    if (!uuid || !emailTo || !emailFrom) {
        return res.status(422).send({ error: 'All fields are required except expiry.' });
    }
    // Get data from db
    try {
        const file = await File.findOne({ uuid: uuid });
        file.sender = emailFrom;
        file.receiver = emailTo;
        const response = await file.save();
        // send mail
        const sendMail = require('../services/mailService');
        sendMail({
            from: emailFrom,
            to: emailTo,
            subject: 'sharemee file sharing',
            text: `${emailFrom} shared a file with you.`,
            html: require('../services/emailTemplate')({
                emailFrom,
                downloadLink: `${process.env.APP_BASE_URL}/files/${file.uuid}`,
                size: parseInt(file.size / 1000) + ' KB',
                expires: '24 hours'
            })
        }).then(() => {
            return res.json({ success: true });
        }).catch(err => {
            console.log(err);
            return res.status(500).json({ error: 'Error in email sending.' });
        });
    } catch (err) {
        return res.status(500).send({ error: 'Something went wrong.' });
    }

});

module.exports = router;
