const express = require("express");
const fs = require("fs");
const request = require("request");
const multer = require("multer");
const path = require("path");
const ejs = require("ejs");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.urlencoded({
    extended: true
}));
app.use(express.json());
app.use(express.static("public"));
app.set("view engine", "ejs");

const storage = multer.diskStorage({
    destination: "./public/uploads/",
    filename: function (req, file, cb) {
        cb(
            null,
            file.fieldname + "-" + Date.now() + path.extname(file.originalname)
        );
    },
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2000000
    },
    fileFilter: function (req, file, cb) {
        checkFiletype(file, cb);
    },
}).single("picture");

const checkFiletype = (file, cb) => {
    const filetypes = /png||jpg/;

    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    const mimetime = filetypes.test(file.mimetime);

    if (mimetime && extname) {
        return cb(null, true);
    } else {
        cb("Error: jpg or png only");
    }
};


async function generateAvatar(fileName) {
    const options = {
        method: "POST",
        url: "https://mojipop.p.rapidapi.com/api/FaceDetection/CreateAvatar",
        headers: {
            "content-type": "multipart/form-data; boundary=---011000010111000001101001",
            "x-rapidapi-host": "mojipop.p.rapidapi.com",
            "x-rapidapi-key": process.env.API_KEY,
            useQueryString: true,
        },
        formData: {
            photo: {
                value: fs.createReadStream(`public/uploads/${fileName}`),
                options: {
                    filename: `public/uploads/${fileName}`,
                    contentType: "application/octet-stream",
                },
            },
        },
    };
    return new Promise((resolve,reject) => request(options, async function (error, response, body) {
        if (error) reject(new Error(error));
        const avatar = JSON.parse(body);
        const avatarId = avatar.Result.AvatarId;
        console.log(avatarId);
        const picurl = await generateCaricature(avatarId);
        console.log(picurl);
        resolve(picurl);
    }));
}

async function generateCaricature(avatarid){
    const options = {
        method: 'POST',
        url: 'https://mojipop.p.rapidapi.com/api/Render/Caricature',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'x-rapidapi-host': 'mojipop.p.rapidapi.com',
            'x-rapidapi-key': process.env.API_KEY,
            useQueryString: true
        },
        form: {
            AvatarID: avatarid,
            TemplateID: '00510010816921',
            BackgroundLayer: 'true',
            Format: 'jpg'
        }
    };

    return new Promise((resolve, reject) => {
        request(options, function (error, response, body) {
            if (error) reject(new Error(error));
            finalPic = JSON.parse(body);
            console.log(finalPic);
            resolve(finalPic.Result.PreviewUrl)
        });
    });
}

app.get("/", (req, res) => {
    res.render("index");
});

app.post("/", (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            res.render("index", {
                msg: err
            });
        } else {
            if (req.file === undefined) {
                res.render("index", {
                    msg: err
                });
            } else {
                let picurl = await generateAvatar(req.file.filename);
                console.log(picurl);
                res.render("index", {
                    msg: "Image Uploaded!",
                    picture: picurl,
                });
            }
        }
    });
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});