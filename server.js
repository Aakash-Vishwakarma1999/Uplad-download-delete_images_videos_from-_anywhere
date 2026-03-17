require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const AWS = require("aws-sdk");

const app = express();
app.use(cors());

const upload = multer({ storage: multer.memoryStorage() });

// ✅ YOUR CONFIG
// const BUCKET = "kokanpublicbucket";
const BUCKET = process.env.BUCKET;

const s3 = new AWS.S3({
    endpoint: "https://gateway.storjshare.io",
    //   accessKeyId: "jubckv2ys6sowf56a346l4mltvva",        
    //   secretAccessKey: "j2jmysjnwecwihf4a3iae2zebf5egqzakwx6atj64r4qy2tfngnsm",  
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY,
    s3ForcePathStyle: true,
    signatureVersion: "v4"
});


// =======================
// 📤 UPLOAD FILE
// =======================
app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).send("No file uploaded");
        }

        const cleanName = file.originalname.replace(/\s+/g, "_");

        const params = {
            Bucket: BUCKET,
            Key: Date.now() + "-" + cleanName,
            Body: file.buffer,
            ContentType: file.mimetype
        };

        await s3.upload(params).promise();

        res.send({ message: "Upload successful" });

    } catch (err) {
        console.error(err);
        res.status(500).send("Upload failed");
    }
});


// =======================
// 📄 LIST FILES
// =======================
app.get("/files", async (req, res) => {
    try {
        const data = await s3.listObjectsV2({
            Bucket: BUCKET
        }).promise();

        const files = data.Contents
            .filter(item => !item.Key.includes(".file_placeholder"))
            .map(item => ({
                key: item.Key,
                // url: `http://localhost:5000/file?key=${encodeURIComponent(item.Key)}`
                url: `${req.protocol}://${req.get("host")}/file?key=${encodeURIComponent(item.Key)}`
            }));

        res.json(files);

    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching files");
    }
});



// =======================
// 📥 GET FILE (IMPORTANT FIX)
// =======================
app.get("/file", async (req, res) => {
    const key = req.query.key;

    if (!key) {
        return res.status(400).send("Missing key");
    }

    try {
        const data = await s3.getObject({
            Bucket: BUCKET,
            Key: key
        }).promise();

        res.writeHead(200, {
            "Content-Type": data.ContentType,
            "Content-Length": data.ContentLength
        });

        res.end(data.Body);

    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching file");
    }
});


// =======================
// 🗑 DELETE FILE
// =======================
app.delete("/delete", async (req, res) => {
    const key = req.query.key;

    try {
        await s3.deleteObject({
            Bucket: BUCKET,
            Key: key
        }).promise();

        res.send({ message: "Deleted successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).send("Delete failed");
    }
});


// =======================
// app.listen(5000, () => {
//     console.log("Server running on http://localhost:5000");
// });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});