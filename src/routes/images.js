const express = require("express");

const {
  createImage,
  getImages,
} = require("../controllers/image.controller");

const router = express.Router();

router.post("/", createImage);
router.get("/", getImages);

module.exports = router;