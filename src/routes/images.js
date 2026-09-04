const express = require("express");

const {
  createImage,
  getImages,
  processImageController,
} = require("../controllers/image.controller");

const router = express.Router();

// Create image
router.post("/", createImage);

// Get all images
router.get("/", getImages);

// Process image
router.post("/:id/process", processImageController);

module.exports = router;