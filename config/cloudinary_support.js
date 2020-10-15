const {
    config,
    uploader
} = require('cloudinary');
const cloudinaryConfig = () => config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

function parseImage(req, res, next) {
    if (req.file) {
        const Datauri = require('datauri');
        const datauri = new Datauri();
        datauri.format(path.extname(req.file.originalname).toString(), req.file.buffer);
        req.file.encodedUri = datauri.content;
    } else {
        res.status(400).json({
            error: 'Please include image in the request'
        });
    }
}
module.exports = {
    cloudinaryConfig,
    uploader,
    parseImage
};