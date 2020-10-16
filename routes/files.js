const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const File = require('../models/file');
const { v4: uuidv4 } = require('uuid');

let storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now())
  }
})
 
let upload = multer({ storage: storage })

router.post('/', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(500).send({ error: err.message });
        }
        const file = new File({
            filename: req.file.filename,
            uuid: uuidv4(),
            path: req.file.path,
            size: req.file.size
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
